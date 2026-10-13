// Bildirim kutusu: gönderilen her bildirim kişinin profiline (users/{uid}.inbox) de yazılır. Ana sayfadaki "Bildirimler"
// kartı bu listeyi gösterir; uygulama simgesindeki sayı bu listedeki okunmamışların sayısıdır (ikisi hep aynı).
// Ana sayfa görülünce inboxSeen yazılır: hepsi okundu, sayı sıfırlanır. Saf: sunucu, zamanlayıcı ve uygulama aynısını kullanır.
//   kayıt: { id, tag, title, body, url, at }  — aynı etiketli (aynı kayıt/sohbet) yeni bildirim öncekinin yerine geçer
export const INBOX_MAX = 30;

const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

export function inboxAdd(list, payload, now = new Date().toISOString()) {
  const tag = clip(payload?.tag, 120);
  const item = { id: `${tag || "n"}-${Date.parse(now) || 0}`, tag, title: clip(payload?.title, 120), body: clip(payload?.body, 400), url: clip(payload?.url, 300) || "/", at: now };
  const rest = (Array.isArray(list) ? list : []).filter((x) => x && (!tag || x.tag !== tag));
  return [item, ...rest].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, INBOX_MAX);
}

// Listeden çıkarma (pencerede kaydırıp "Sil" ya da "Tümünü temizle"): ids yoksa hepsi
export const inboxDrop = (list, ids) => (ids ? (Array.isArray(list) ? list : []).filter((x) => x && !ids.includes(x.id)) : []);

// Dokununca gidilecek yer. Eski kayıtlarda adres "/" olabilir: günün/akşamın özeti ve rüzgâr uyarısı Planlar'a,
// haftalık özet Takvim'e, doğum günü Doğum günleri'ne gider. Hâlâ yer yoksa "" (pencerede tam metin açılır).
export function inboxLink(x) {
  const url = String(x?.url || "");
  if (url.startsWith("/?bildirim")) return ""; // gidecek sayfası yok (ör. veliye aidat hatırlatması): tam metni açılır
  if (url && url !== "/") return url;
  const tag = String(x?.tag || "");
  if (/^(summary|evening|wind)-/.test(tag)) return "/plans";
  if (/^weekly-/.test(tag)) return "/calendar";
  if (/^birthday-/.test(tag)) return "/birthdays";
  return "";
}

// Asistan: "bildirimleri temizle", "bildirimleri sil", "zildeki bildirimleri kaldır"
export function inboxClearAsk(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?]+/g, " ").replace(/\s+/g, " ").trim();
  return t.split(" ").length <= 7 && /bildirim\p{L}*/u.test(t) && /(temizle|sil|kaldır|boşalt)\p{L}*/u.test(t) && !/ m[iıuü](\s|$)|bildirim(ini|i) (aç|kapat)/u.test(t);
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
