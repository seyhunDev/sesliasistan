// Sunucu: bir kişinin kayıtlı tüm cihazlarına Web Push gönderir; geçersiz abonelikleri siler.
import crypto from "node:crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";

export const pushReady = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export async function sendTo(uid, payload) {
  const ref = adminDb().collection("users").doc(uid);
  const push = (await ref.get()).data()?.push || {};
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("[push] VAPID anahtarları geçersiz:", e.message);
    return 0; // bildirim gitmez ama kayıt işlemi sürer
  }
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    Object.entries(push).map(async ([key, sub]) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 86400 });
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await ref.update({ [`push.${key}`]: FieldValue.delete() });
      }
    }),
  );
  return sent;
}

// "İletildi" onayı için imza: bildirimi alan telefon, oturum olmadan yalnızca kendi onayını yazabilsin
const secret = () => process.env.ACK_SECRET || process.env.VAPID_PRIVATE_KEY || "";
export const ackSig = (o, c, i, u) => crypto.createHmac("sha256", secret()).update(`${o}|${c}|${i}|${u}`).digest("base64url").slice(0, 24);
export const ackOk = (a) => {
  if (!secret() || !a?.s) return false;
  const want = Buffer.from(ackSig(a.o, a.c, a.i, a.u));
  const got = Buffer.from(String(a.s));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
};
