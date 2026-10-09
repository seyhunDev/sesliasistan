// Gelen arama bildirimi (yalnız Android uygulaması; tarayıcı ve iPhone'da arama uygulama açıkken çalar).
// Arayan kaydı yazınca /api/call-ring çağırır: arananın Android cihazlarına zil çalan arama bildirimi gider.
// Arayan kapatınca ya da cevap gelmeyince "call-end" gider, zil susar. Bildirimdeki Reddet oturumsuz çalışır:
// imza (sig) arama kimliğinden sunucuda üretilir, telefon yalnız o aramayı reddedebilir.
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, profileOf } from "@/lib/server/admin";
import { callEndMessage, callMessage } from "@/lib/fcmMessage";
import { sendFcm } from "@/lib/server/sendDevice";
import { STATUS } from "@/lib/call";

const secret = () => process.env.ACK_SECRET || process.env.VAPID_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || "";
export const callSig = (org, id, to) => crypto.createHmac("sha256", secret()).update(`call|${org}|${id}|${to}`).digest("base64url").slice(0, 24);
const okId = (id) => /^[A-Za-z0-9]{10,40}$/.test(String(id || ""));
const callRef = (org, id) => adminDb().collection("orgs").doc(org).collection("calls").doc(id);

// Kişinin Android cihazlarına mesaj; kaydı bitmiş cihaz silinir
async function toPhones(uid, build) {
  const ref = adminDb().collection("users").doc(uid);
  const push = (await ref.get()).data()?.push || {};
  const phones = Object.entries(push).filter(([, d]) => d?.fcm);
  let sent = 0;
  await Promise.all(
    phones.map(async ([key, d]) => {
      try {
        await sendFcm(build(d.fcm));
        sent++;
      } catch (e) {
        if (e.statusCode === 410) await ref.update({ [`push.${key}`]: FieldValue.delete() }).catch(() => {});
        else console.error("[call-ring] gönderilemedi:", uid, key, String(e.body || e.message).slice(0, 200));
      }
    }),
  );
  return sent;
}

// Arayan (uid) aramayı başlattı ya da bitirdi (end)
export async function ringCall(uid, id, end) {
  if (!okId(id)) return { error: "Geçersiz arama" };
  const me = await profileOf(uid);
  const c = (await callRef(me.orgId, id).get()).data();
  if (!c || c.from !== uid) return { error: "Arama bulunamadı" };
  if (end) return { sent: await toPhones(c.to, (t) => callEndMessage(t, id)) };
  if (c.status !== STATUS.ringing) return { sent: 0 };
  const sig = callSig(me.orgId, id, c.to);
  return { sent: await toPhones(c.to, (t) => callMessage(t, { id, name: me.name || "Biri", org: me.orgId, sig })) };
}

// Bildirimdeki Reddet (oturumsuz, imzayla)
export async function declineCall(org, id, sig) {
  if (!okId(id) || !okId(org) || !secret()) return { error: "Geçersiz" };
  const ref = callRef(org, id);
  return adminDb().runTransaction(async (tx) => {
    const c = (await tx.get(ref)).data();
    if (!c) return { error: "Arama bulunamadı" };
    const want = Buffer.from(callSig(org, id, c.to));
    const got = Buffer.from(String(sig || ""));
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return { error: "Geçersiz" };
    if (c.status !== STATUS.ringing) return { ok: true };
    tx.update(ref, { status: STATUS.declined, endedAt: FieldValue.serverTimestamp(), endedBy: c.to });
    return { ok: true };
  });
}
