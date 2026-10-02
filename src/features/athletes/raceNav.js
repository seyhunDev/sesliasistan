// Asistandan tek yarışı açma: "D'Azur yarışına git", "Foça yarışını aç", "sıradaki yarışı göster".
// Söylenen ad kayıtlı yarışlarla (ad ve ilçe kelimeleri) eşleştirilir; birden çok uyarsa en yakın tarihli seçilir.
// Ekleme/not/bütçe gibi işler buraya düşmez (assistRace.js).

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const bare = (s) => low(s).replace(/[^\p{L}\p{N}]+/gu, "");
// Yarış adlarında sık geçen, tek başına bir yarışı göstermeyen kelimeler
const COMMON = new Set(["optimist", "laser", "ilca", "yelken", "yarış", "yarışı", "regatta", "regata", "kupa", "kupası", "trofesi", "open", "cup", "trophy", "türkiye", "şampiyonası", "ayak", "ayağı", "yelkenli", "kulübü"]);
const OPEN = /(^|\s)(aç\S*|göster\S*|git|gid\S*|geç|geçelim|götür\S*|gir|girelim|getir|bak|bakalım|görmek|görelim)(?=\s|$)/;
const JOB = /(ekle|oluştur|kaydet|planla|sil|çıkar|not al|not ekle|not düş|bütçe|masraf|katıl|gönder|yaz(?!ış))/;
const NEXT = /(sıradaki|yaklaşan|sonraki|gelecek|ilk) yarış/;

const RACE_W = /(yarış|regat|kupa|trofe|ayağ|ligi)/;

// Bir yarışı açma isteği mi? (açma fiili var, ekleme/not gibi bir iş yok)
export function wantsRaceOpen(text) {
  const t = low(text).trim();
  return OPEN.test(t) && !JOB.test(t) && !/\?$/.test(t);
}

const keys = (r) =>
  [...low(r.name).split(/\s+/), low(r.district)]
    .map(bare)
    .filter((w) => w.length >= 3 && !COMMON.has(w) && !/^\d+$/.test(w));

// En yakın tarih: bugün ve sonrası önce (yakından uzağa), sonra geçmiş (yeniden eskiye)
const soonest = (list, today) => {
  const up = list.filter((r) => (r.endDate || r.startDate || "") >= today).sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  const past = list.filter((r) => !up.includes(r)).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  return up[0] || past[0] || null;
};

// races: [{ id, name, district, startDate, endDate }] → eşleşen yarış ya da null
export function findRace(text, races, today = "") {
  if (!races?.length) return null;
  const t = low(text);
  const words = t.split(/\s+/).map(bare).filter(Boolean);
  let best = [];
  let top = 0;
  for (const r of races) {
    const score = keys(r).filter((k) => words.some((w) => w.startsWith(k) || (k.length >= 5 && w.length >= 5 && k.startsWith(w)))).length;
    if (!score) continue;
    if (score > top) (top = score), (best = [r]);
    else if (score === top) best.push(r);
  }
  // "yarış" kelimesi geçmiyorsa ad en az iki kelimeyle eşleşmeli ("Dikili hava durumunu göster" yarış açmasın)
  if (best.length && (RACE_W.test(t) || top >= 2)) return soonest(best, today);
  if (NEXT.test(t)) return soonest(races, today);
  return null;
}

// Yarış sayfasındayken yarış adı söylenmeden yapılan iş: "Mehmet'i de ekle", "not al: otelde kalınacak",
// "bütçeye otel kişi başı 3500 ekle". Başka kayıt türleri (plan, görev, mesaj…) ve sorular buraya düşmez.
const HERE_JOB = /(ekle|çıkar|katıl\S*|gel\S*cek|gid\S*cek|not al|not ekle|not düş|notu|bütçe|masraf|ücret|otel|konaklama|tarih\S* .*(değiş|oldu|yap))/;
const OTHER = /(görev|plan\S*|hatırlat|mesaj|ekibe|aileye|alışveriş|market|fiş|doğum gün|toplantı|antrenman|saat \d|\d{1,2}[:.]\d{2})/;
export function raceJobHere(text) {
  const t = low(text).trim();
  return !!t && !/\?$/.test(t) && HERE_JOB.test(t) && !OTHER.test(t);
}
