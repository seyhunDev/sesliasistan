// Asistanda etkinlik planlama cümleleri (yapay zekaya gitmeden tanınır).
// "Kamp planı yapmak istiyorum, tavsiye ver", "İç Anadolu gezisi planla", "konsere gideceğiz ne lazım"
// Takvime tek plan yazan kısa cümleler ("haftaya salı kamp planla", "yarın 10'da kamp") buraya düşmez.

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?;:"“”()]/g, " ").replace(/\s+/g, " ").trim();

// Etkinlik türü sözcükleri
const ACT = /(^|\s)(kamp\S*|balık\S*|balığ\S*|olta\S*|gezi\S*|tatil\S*|konser\S*|piknik\S*|festival\S*|trekking\S*|yürüyüş\S*|seyahat\S*|kayak\S*|dalış\S*|tur(u|a|da)?|turu\S*|organizasyon\S*|etkinli\S*|karavan\S*|bisiklet\S*|tiyatro\S*|maç(a|ı)?)(?=\s|$)/;
// Planlama/öneri isteği (yalnız "planla" yetmez: o takvime tek plan olabilir)
const WANT =
  /(tavsiye|öneri|önerir|ihtiyaç|ne(ler)? (lazım|gerek|götür|al)|bütçe|organize|plan(ı|ını|ımı)? (yap|hazırla|çıkar|oluştur|kur)|planlamak|planlayalım|planlar m[ıi]s[ıi]n|planla(yalım|sana|yabilir|r mısın)|yapmak ist|gitmek ist|gideceğiz|gidiyoruz|gitmeyi düşün|yapmayı düşün|düşünüyoruz|düşünüyorum|hazırlık|listesi)/;
// Doğrudan: "etkinlik planla", "gezi planla", "etkinliklere ekle"
const DIRECT = /(^|\s)(etkinli\S*|organizasyon\S*|gezi\S*) (planla|oluştur|hazırla|ekle)\S*|etkinlikler(e|imize) .*ekle/;
// Takvime tek kayıt: saatli cümleler planlara gider
const TIMED = /(^|\s)saat \d|\d{1,2}[:.]\d{2}|\d{1,2}'?(de|da|te|ta)(?=\s|$)/;
const ADVICE = /(tavsiye|öneri|ihtiyaç|bütçe|organize|ne(ler)? (lazım|gerek|götür))/;
const NOT = /(yarış|regat|antrenman|toplantı|yoklama)/;

export function wantsEvent(text) {
  const t = lower(text);
  if (!t || t.split(" ").length > 40) return false;
  if (!ACT.test(t) || NOT.test(t)) return false;
  if (/\?$/.test(String(text).trim()) && /nedir|ne demek|nasıl yazılır/.test(t)) return false;
  if (TIMED.test(t) && !ADVICE.test(t)) return false;
  return WANT.test(t) || DIRECT.test(t);
}

// Soruya cevap yerine "bilmiyorum / genel yap / fark etmez"
export const isGeneric = (text) =>
  /^(bilmiyorum|bilmem|fark etmez|farketmez|genel|geç|atla|sen karar ver|sen seç|sen bil|hiç fark etmez|yok|belli değil|henüz belli değil|emin değilim|karar vermedim|boşver|boş ver)/.test(lower(text)) ||
  /genel (bir )?(plan|değerlendirme)|sen karar ver|fark etmez|belli değil|bilmiyorum/.test(lower(text));

// Vazgeçme
export const isDrop = (text) => /^(vazgeç|iptal|gerek yok|istemiyorum|kalsın)/.test(lower(text));

// Cümleden tür tahmini (yapay zekaya ulaşılamazsa ya da kartta simge için)
export function kindFromText(text) {
  const t = lower(text);
  if (/kamp|çadır|karavan/.test(t)) return "kamp";
  if (/balık|olta/.test(t)) return "balik";
  if (/konser|festival|tiyatro/.test(t)) return "konser";
  if (/piknik|mangal/.test(t)) return "piknik";
  if (/gezi|tatil|seyahat|tur|yürüyüş|trekking/.test(t)) return "gezi";
  return "diger";
}
