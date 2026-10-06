// Sunucu: bir kişinin kayıtlı tüm cihazlarına Web Push gönderir; geçersiz abonelikleri siler.
import crypto from "node:crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { recordInbox } from "@/lib/inbox";
import { otherDevices } from "@/lib/pushDevices";

export const pushReady = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

// Gönderim hatasını kısa Türkçe açıklamaya çevirir (Ayarlar › Dene ve kayıt için)
export function pushError(e) {
  const c = e?.statusCode;
  const b = String(e?.body || "");
  if (c === 404 || c === 410) return "Bu cihazın aboneliği bitmiş; bildirimleri bu cihazda kapatıp yeniden aç.";
  if (c === 403 || c === 401 || /vapid|jwt|BadJwtToken|VapidPkHashMismatch/i.test(b))
    return "Bildirim anahtarı uyuşmuyor: Netlify'daki VAPID anahtarları ile uygulamanın derlendiği anahtar aynı olmalı.";
  if (c === 413) return "Bildirim çok uzun.";
  if (c === 429) return "Çok fazla bildirim gönderildi, biraz sonra dene.";
  if (!c) return `Bildirim sunucusuna ulaşılamadı (${String(e?.message || "").slice(0, 80)}).`;
  return `Bildirim gönderilemedi (kod ${c}).`;
}

// skip: gönderenin kendi cihaz anahtarları (lib/pushDevices)
export async function sendTo(uid, payload, skip) {
  const db = adminDb();
  const ref = db.collection("users").doc(uid);
  // Önce bildirim kutusuna (ana sayfadaki "Bildirimler"); simgedeki sayı oradaki okunmamışların sayısı (lib/inbox)
  const badge = await recordInbox(db, uid, payload);
  const user = (await ref.get()).data() || {};
  const push = otherDevices(user.push, skip);
  if (!Object.keys(push).length) return 0;
  if (payload.badge === undefined && badge !== undefined) payload = { ...payload, badge };
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
        if (sub.err) await ref.update({ [`push.${key}.err`]: FieldValue.delete() }).catch(() => {});
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await ref.update({ [`push.${key}`]: FieldValue.delete() });
        else {
          // Sessizce yutulmasın: Netlify işlev günlüğünde görünür (403/400 çoğunlukla VAPID anahtarı uyuşmazlığı)
          console.error("[push] gönderilemedi:", uid, key, e.statusCode, String(e.body || e.message).slice(0, 200));
          await ref.update({ [`push.${key}.err`]: { code: e.statusCode || 0, msg: pushError(e), at: new Date().toISOString() } }).catch(() => {});
        }
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
