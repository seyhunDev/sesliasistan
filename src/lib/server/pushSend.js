// Sunucu: bir kişinin kayıtlı tüm cihazlarına Web Push gönderir; geçersiz abonelikleri siler.
import crypto from "node:crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { badgeCount } from "@/lib/badge";
import { GROUP_IDS, inGroup } from "@/lib/kinds";

export const pushReady = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

// Uygulama simgesindeki sayı: uygulamadaki "Senin için" ile aynı kural (lib/badge). Ana hesap işletmedeki bütün
// kayıtları görür; kişi yalnızca içinde olduğu kayıtları. Okunmamış sohbetler (sessize alınan hariç) de eklenir.
export async function unreadCount(orgId, uid) {
  if (!orgId || !uid) return 0;
  const owner = orgId === uid;
  const org = adminDb().collection("orgs").doc(orgId);
  // Ana hesap bütün koleksiyonu okumaz (her bildirimde binlerce okuma olurdu): sayıya yalnız son 14 günde eklenen,
  // son 14 günde not yazılan (replyAt, /api/notify yazar) ya da silme isteği bekleyen kayıtlar girebilir (lib/people, lib/badge).
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const rows = (q) => q.get().then((s) => s.docs, () => []);
  const [plans, tasks, notes] = await Promise.all(
    ["plans", "tasks", "notes"].map(async (k) => {
      const c = org.collection(k);
      if (!owner) return rows(c.where("people", "array-contains", uid)).then((ds) => ds.map((d) => d.data()));
      const parts = await Promise.all([rows(c.where("createdAt", ">=", since)), rows(c.where("replyAt", ">=", since)), rows(c.where("deleteReq.by", ">", ""))]);
      return [...new Map(parts.flat().map((d) => [d.id, d.data()])).values()];
    }),
  );
  const receipts = await (owner ? org.collection("receipts").where("payStatus", "==", "pending") : org.collection("receipts").where("createdByUid", "==", uid))
    .get()
    .then((s) => s.docs.map((d) => d.data()), () => []);
  if (owner) {
    // Bekleyen silme istekleri (ödeme beklemeyen fişlerde de olabilir)
    const reqs = await org.collection("receipts").where("deleteReq.by", ">", "").get().then((s) => s.docs.map((d) => d.data()), () => []);
    for (const r of reqs) if (r.payStatus !== "pending") receipts.push(r);
  }
  // Okunmamış sohbetler: kişinin üye olduğu sohbetler + türüne uyan sabit gruplar (Ekip, Aile, Sporcular)
  const chats = org.collection("chats");
  const prof = owner ? null : (await adminDb().collection("users").doc(uid).get().catch(() => null))?.data();
  const kind = owner ? "owner" : prof?.kind || "staff";
  const fixed = GROUP_IDS.filter((g) => inGroup(g, kind));
  const [mine, ...groups] = await Promise.all([chats.where("members", "array-contains", uid).get().catch(() => null), ...fixed.map((g) => chats.doc(g).get().catch(() => null))]);
  let unreadChats = 0;
  for (const c of [...(mine?.docs || []), ...groups.filter((g) => g?.exists)]) {
    const d = c.data();
    if (!d.muted?.[uid] && (d.seq || 0) > (d.read?.[uid] || 0) && d.last?.by !== uid) unreadChats++;
  }
  return badgeCount({ uid, owner, plans, tasks, notes, receipts, unreadChats });
}

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
