// Asistanın beyninde ortak kurallar ve yazılar
// Yapay zekanın gerçekte olmayan gönderimi anlatması ("gönderdim", "ilettim")
export const ASKED = /\?|\s(m[ıiuü])(\s|$)|gönderdin mi|gitti mi/i;
export const SENT_CLAIM = /(^|\s)(gönderdim|ilettim|yolladım|haber verdim|mesaj(ı|ınız)? gönderildi)/i;
// Yapay zeka yokken mesaj metni: komut sözcükleri atılır, baş harf büyür
export const focusBody = (s) => {
  const t = s
    .replace(/^\s*(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)\s*[:,]?\s*/i, "")
    .replace(/\s*(diye|şeklinde)?\s*(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)[.!]?\s*$/i, "")
    .trim();
  return t ? t[0].toLocaleUpperCase("tr-TR") + t.slice(1) : s;
};
export const MORE = "Başka bir isteğin var mı?";
// Taslak varken kaydetme / vazgeçme
export const SAVE = /^(?!.*(?:\s(?:ama|fakat|ancak|da|de)\s|(?:^|\s)değil(?:\s|$)))(kaydet|kaydedebilirsin|evet|tamam|olur|onayla|ekle|ekleyebilirsin|kaydet gitsin|aynen|he|hı hı)(?=$|[\s.,!?])/i;
export const DROP = /^(?!.*(?:\s(?:ama|fakat|ancak|da|de)\s|(?:^|\s)değil(?:\s|$)))(vazgeç|vazgeçtim|iptal|hayır|kaydetme|sil|boş ?ver|yok)(?=$|[\s.,!?])/i;
// Kullanıcı vazgeçti ya da iş yapılmadan bırakıldı: öğrenme deposuna yazılmaz
export const DROPPED = /vazgeç|bıraktım|silmedim|göndermedim/iu;
