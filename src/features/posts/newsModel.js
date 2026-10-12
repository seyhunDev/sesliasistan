// Afişi kulübün sitesindeki "Kulüpten haberler"e ekleme: saf yardımcılar (Firebase'siz, testlenir).
// Kayıt Dikili Yelken projesinde news/{id} (clubNews.js); burada yalnız metin temizliği ve sesli komutlar.

// Emoji ve görünmez birleştiriciler
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}\u{200D}\u{20E3}]/gu;
// Sosyal medya kalıpları: haberde anlamsız ("linki biyografide", "bizi takip edin", "DM'den yazın")
const SOCIAL = /(link\p{L}*\s+(bio|biyo)\p{L}*|(bio|biyo)\p{L}*\s*('?da|'?daki|de)\s+link|takip\s*(et|edin|etmeyi|te\s*kal)\p{L}*|beğen\p{L}*\s*(ve|,)?\s*paylaş\p{L}*|dm\p{L}*\s*('?den|'?den)?\s*(yaz|ulaş)\p{L}*|kaydır\p{L}*\s*(ve|,)?\s*(gör|bak)\p{L}*|swipe)/iu;

const squeeze = (s) => s.replace(/[ \t]+/g, " ").replace(/ +([.,!?;:])/g, "$1").trim();

// Başlık: en çok 70 harf, etiket ve emoji yok; uzunsa kelime sınırında kesilir
export function newsTitle(raw = "") {
  const s = squeeze(String(raw).replace(EMOJI, "").replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " "));
  if (s.length <= 70) return s;
  const cut = s.slice(0, 70);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).replace(/[\s,;:–-]+$/u, "").replace(/\s+(ve|ile|için|de|da|bir)$/u, "");
}

// Gövde: paragraflar boş satırla; etiket satırları, satır içi etiketler, sosyal medya cümleleri ve emoji atılır
export function newsBody(raw = "") {
  const paras = String(raw)
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .map((line) => line.replace(EMOJI, ""))
        .filter((line) => !/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(line))
        .map((line) => line.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1"))
        // Sosyal medya cümlesi: o cümle çıkar, satırın kalanı kalır
        .map((line) => (line.match(/[^.!?]+[.!?]*/g) || []).filter((c) => !SOCIAL.test(c)).join(" "))
        .map(squeeze)
        .filter((line) => line && !/^[.,!?;:\-–•·]+$/.test(line))
        .join("\n"),
    )
    .filter(Boolean);
  return paras.join("\n\n").slice(0, 20000);
}

// Gönderiden ilk taslak: başlık görseldeki başlık (yoksa açıklamanın ilk cümlesi), gövde açıklama
export function newsDraft(post = {}, today = "") {
  const body = newsBody(post.caption || "");
  const first = (body.match(/^[^.!?\n]+/) || [""])[0];
  return { title: newsTitle(post.headline || post.topic || first || "Kulüpten haber"), body, date: today, published: true };
}

// Kaydedilecek alanlar (sunucu zamanları ve fotoğraflar clubNews.js'te eklenir)
export function newsFields(d = {}, postId = "") {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : "";
  return { title: newsTitle(d.title), body: newsBody(d.body), date, published: !!d.published, source: "afis-asistani", sourceId: String(postId || "") };
}

export const NEWS_MAX_PHOTOS = 8;

// Ana asistana gönderi ekranında söylenen: "haber olarak ekle", "haberi yayınla", "yayından al", "haberden kaldır"
export function newsCommand(raw = "") {
  const t = String(raw).toLocaleLowerCase("tr").replace(/[.!?]+$/g, "").trim();
  if (!/haber/u.test(t)) return null;
  if (/haber(ler)?(den|lerden)\s+(kaldır|çıkar|sil)|haberi\s+(kaldır|sil)|haberlerden\s+çıkar/u.test(t)) return { op: "remove" };
  if (/yayından\s+(al|kaldır|çek)/u.test(t)) return { op: "unpublish" };
  if (/haberi?\s+(yayınla|yayına\s+al)|yayınla/u.test(t) && !/ekle/u.test(t)) return { op: "publish" };
  if (/haberi\s+(düzenle|güncelle|değiştir|aç)/u.test(t)) return { op: "edit" };
  if (/haber(ler)?\s*(olarak|e|ler[ei])?\s*(ekle|koy|paylaş|gönder|at|yap)|kulüpten\s+haberlere|haberlere\s+(ekle|koy|at|gönder)/u.test(t)) return { op: "add" };
  return null;
}
