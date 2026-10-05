// Ders programı ana asistanla (sayfanın kendi dinleyicisi yok): bu cümle ders programı işi mi?
// Ders programı sayfasında soru olmayan her cümle ("salı 13:00 fizik B-204", "salı fiziği 14'e al") ders programıdır.
// Başka sayfada yalnız açıkça "ders programı" geçince ("ders programıma çarşamba 10'da kimya ekle").
// Yapay zekasız, yalnız sözcüklere bakar; testlerde de çalışır.
const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const QUESTION = /\?\s*$|(^| )(ne|neler|kaç|hangi|ne zaman|nerede)( |$)|(^| )(var|yok) m[ıi]( |$)/u;
const PROGRAM = /ders program\p{L}*/u;
// Ders programı sayfasında bile başka iş olan cümleler (mesaj, plan, görev, not) ana akışa gider
const OTHER = /(^| )(mesaj\p{L}*|yaz(?![\p{L}])|söyle\p{L}*|haber ver\p{L}*|gönder\p{L}*|görev\p{L}*|plan\p{L}*|takvim\p{L}*|not al\p{L}*|hatırlat\p{L}*|yoklama\p{L}*)/u;

export function wantsSchedule(raw, here = false) {
  const t = lower(raw).trim();
  if (!t || QUESTION.test(t)) return false;
  if (PROGRAM.test(t)) return true;
  return here && !OTHER.test(t);
}
