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

// ---- Bulanık arama: ses tanımanın bozduğu yabancı adlar ("dazur", "daz ur", "dö azur", "regata") ----
// Türkçe harfler ve yabancı yazımlar sadeleştirilir, kelimeler harf benzerliğiyle puanlanır; tarih yakınlığı küçük bir pay ekler.
const FOLD = [[/ç/g, "c"], [/ş/g, "s"], [/ğ/g, "g"], [/ı/g, "i"], [/ö/g, "o"], [/ü/g, "u"], [/[âà]/g, "a"], [/[éèê]/g, "e"], [/ph/g, "f"], [/th/g, "t"], [/ou/g, "u"], [/w/g, "v"], [/x/g, "ks"], [/q/g, "k"], [/y/g, "i"], [/(.)\1+/g, "$1"]];
export const fold = (s) => FOLD.reduce((a, [re, to]) => a.replace(re, to), low(s).normalize("NFC")).replace(/[^a-z0-9 ]+/g, "");

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// Söylenen kelime (ekli olabilir: "dazura", "foçadaki") ile yarış kelimesi benzerliği, 0..1
function sim(w, k) {
  if (!w || !k) return 0;
  if (w.startsWith(k)) return 1;
  const head = w.slice(0, Math.max(k.length, Math.min(w.length, k.length + 1)));
  return Math.max(0, 1 - lev(head, k) / Math.max(k.length, 3));
}

// Açma isteğinden geriye kalan arama kelimeleri; boşsa yalnız "yarışlar sayfası" isteniyor demektir
const FILLER = /^(aç\S*|göster\S*|git|gid\S*|geç|geçelim|götür\S*|gir|girelim|getir|bak|bakalım|görmek|görelim|sayfa\S*|ekran\S*|bölüm\S*|yarış|yarışa|yarışı|yarışın\S*|yarışına|yarışını|yarışlar\S*|evrak\S*|lütfen|bana|beni|hadi|şu|şunu|bir|bi|o|ve|ile|için|da|de)$/;
export function raceWords(text) {
  return low(text).split(/\s+/).filter((w) => w && !FILLER.test(w.replace(/[.,!?]/g, ""))).map(fold).filter((w) => w.length >= 2);
}

// Belirli bir yarışı açma isteği mi ("yarışlar sayfasına git" değil)
export function raceAsk(text) {
  const t = low(text);
  if (!wantsRaceOpen(t) || !(RACE_W.test(t) || NEXT.test(t))) return false;
  return raceWords(t).length > 0;
}

const days = (a, b) => (a && b ? Math.abs(new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 864e5 : 9999);
// Bugüne en yakın yarışlar (yaklaşan ya da geçmiş, gün farkına göre)
export const nearest = (races, today, n = 3) =>
  [...races].sort((a, b) => days(a.startDate, today) - days(b.startDate, today) || (b.startDate || "").localeCompare(a.startDate || "")).slice(0, n);

const COMMON_F = new Set([...COMMON].map(fold));

// [{ race, score }] puana göre: ad kelimeleri + ilçe + birleşik yazım ("daz ur" → "dazur"); tarih yakınlığı en çok 0,1
export function rankRaces(text, races, today = "") {
  const words = raceWords(text).filter((w) => !COMMON_F.has(w) && !COMMON_F.has(w.replace(/(ni|n[iı]n|na|ne|a|e|i|u|da|de)$/, "")) && w.length >= 3);
  const joined = raceWords(text).join("");
  return (races || [])
    .map((race) => {
      const ks = [...low(race.name).split(/\s+/), low(race.district)].map(fold).filter((k) => k.length >= 3 && !COMMON_F.has(k) && !/^\d+$/.test(k));
      let score = 0;
      for (const k of ks) {
        const best = Math.max(0, ...words.map((w) => sim(w, k)), joined.includes(k) ? 1 : 0);
        if (best >= 0.6) score += best;
      }
      const near = Math.max(0, 1 - days(race.startDate, today) / 120) * 0.1;
      return { race, score: score ? score + near : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Kesin mi: en iyisi yeterince yüksek ve ikinciden belirgin önde
export const sure = (ranked) => !!ranked[0] && ranked[0].score >= 0.8 && (!ranked[1] || ranked[0].score - ranked[1].score >= 0.3);

// Seçenekler arasından seçim: "ikincisi", "sonuncu", "Foça olan" → yarış ya da null
const ORD = [/(^|\s)(birinci\S*|ilk\S*|1\.?)(\s|$)/, /(^|\s)(ikinci\S*|2\.?)(\s|$)/, /(^|\s)(üçüncü\S*|3\.?)(\s|$)/];
export function pickChoice(text, choices, today = "") {
  const t = low(text).trim();
  if (!choices?.length || !t) return null;
  const i = ORD.findIndex((re) => re.test(t));
  if (i >= 0 && choices[i]) return choices[i];
  if (/(^|\s)son(uncu\S*)?(\s|$)/.test(t)) return choices[choices.length - 1];
  const r = rankRaces(t, choices, today);
  return r[0] && r[0].score >= 0.6 && (!r[1] || r[0].score - r[1].score >= 0.2) ? r[0].race : null;
}
