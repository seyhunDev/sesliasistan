// Bildirim kutusu: gönderilen her bildirim kişinin profiline (users/{uid}.inbox) de yazılır. Ana sayfadaki "Bildirimler"
// kartı bu listeyi gösterir; uygulama simgesindeki sayı bu listedeki okunmamışların sayısıdır (ikisi hep aynı).
// Ana sayfa görülünce inboxSeen yazılır: hepsi okundu, sayı sıfırlanır. Saf: sunucu, zamanlayıcı ve uygulama aynısını kullanır.
//   kayıt: { id, tag, title, body, url, at }  — aynı etiketli (aynı kayıt/sohbet) yeni bildirim öncekinin yerine geçer
export const INBOX_MAX = 30;

const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

export function inboxAdd(list, payload, now = new Date().toISOString()) {
  const tag = clip(payload?.tag, 120);
  const item = { id: `${tag || "n"}-${Date.parse(now) || 0}`, tag, title: clip(payload?.title, 120), body: clip(payload?.body, 200), url: clip(payload?.url, 300) || "/", at: now };
  const rest = (Array.isArray(list) ? list : []).filter((x) => x && (!tag || x.tag !== tag));
  return [item, ...rest].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, INBOX_MAX);
}

export const isUnread = (x, seen) => !!x?.at && (!seen || String(x.at) > String(seen));
export const inboxUnread = (list, seen) => (Array.isArray(list) ? list.filter((x) => isUnread(x, seen)) : []);
export const inboxBadge = (list, seen) => Math.min(inboxUnread(list, seen).length, 99);

// Firestore yönetici SDK'sıyla: kutuya ekler (okuma + yazma tek işlemde, aynı anda gelen iki bildirim birbirini silmez),
// simgede gösterilecek sayıyı döndürür. Hata olursa bildirim yine gider (sayı gönderilmez).
export async function recordInbox(db, uid, payload) {
  try {
    const ref = db.collection("users").doc(uid);
    return await db.runTransaction(async (t) => {
      const u = (await t.get(ref)).data() || {};
      const inbox = inboxAdd(u.inbox, payload);
      t.update(ref, { inbox });
      return inboxBadge(inbox, u.inboxSeen);
    });
  } catch (e) {
    console.error("[inbox]", uid, e?.message);
    return undefined;
  }
}
