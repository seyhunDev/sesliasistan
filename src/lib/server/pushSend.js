// Sunucu: bir kişinin kayıtlı tüm cihazlarına Web Push gönderir; geçersiz abonelikleri siler.
import crypto from "node:crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { unseenNotes } from "@/lib/people";
import { GROUP_IDS, inGroup } from "@/lib/kinds";

export const pushReady = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

// Uygulama simgesindeki sayı: ana sayfadaki "Yenilikler" kartıyla aynı — bu kişinin henüz açmadığı, başkasının
// eklediği/ona verdiği kayıtlar (son 14 gün) + başkalarının yazdığı görülmemiş notu olan kayıtlar (kayıt başına 1).
// Ana hesap işletmedeki bütün kayıtları görür; kişi yalnızca içinde olduğu kayıtları. Okunmamış sohbetler de eklenir.
export async function unreadCount(orgId, uid) {
  if (!orgId || !uid) return 0;
  const since = Date.now() - 14 * 864e5;
  const owner = orgId === uid;
  const cols = await Promise.all(
    ["plans", "tasks", "notes"].map((k) => {
      const c = adminDb().collection("orgs").doc(orgId).collection(k);
      return (owner ? c : c.where("people", "array-contains", uid)).get().catch(() => null);
    }),
  );
  // Okunmamış sohbetler (sessize alınanlar hariç): sohbet başına 1
  const chats = adminDb().collection("orgs").doc(orgId).collection("chats");
  // Sabit gruplardan (Ekip, Aile, Sporcular) yalnızca kişinin türüne uyanlar
  const prof = owner ? null : (await adminDb().collection("users").doc(uid).get().catch(() => null))?.data();
  const kind = owner ? "owner" : prof?.kind || "staff";
  const fixed = GROUP_IDS.filter((g) => inGroup(g, kind));
  const [mine, ...groups] = await Promise.all([chats.where("members", "array-contains", uid).get().catch(() => null), ...fixed.map((g) => chats.doc(g).get().catch(() => null))]);
  let n = 0;
  for (const c of [...(mine?.docs || []), ...groups.filter((g) => g?.exists)]) {
    const d = c.data();
    if (!d.muted?.[uid] && (d.seq || 0) > (d.read?.[uid] || 0)) n++;
  }
  cols.forEach((snap, i) => {
    snap?.forEach((d) => {
      const r = d.data();
      if (i === 1 && r.done) return; // bitmiş görev sayılmaz
      const t = Date.parse(r.createdAt || "");
      const isNew = r.createdByUid && r.createdByUid !== uid && !r.ack?.[uid]?.r && !r.doneBy?.[uid] && (!t || t > since);
      if (isNew || unseenNotes(r, uid).length) n++;
    });
  });
  return Math.min(n, 99);
}

export async function sendTo(uid, payload) {
  const ref = adminDb().collection("users").doc(uid);
  const user = (await ref.get()).data() || {};
  const push = user.push || {};
  if (!Object.keys(push).length) return 0;
  if (payload.badge === undefined) payload = { ...payload, badge: await unreadCount(user.orgId || uid, uid).catch(() => undefined) };
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
