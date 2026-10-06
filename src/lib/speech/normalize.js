// Ses tanıma ve günlük yazım farklarını kural motorunun anladığı tek biçime çevirir.
//   "yarin saat on buçukta antrenman ekli" -> "yarın saat 10:30 antrenman ekle"
//   "yarın akşam 6 toplantı koy"           -> "yarın saat 18:00 toplantı ekle"
// Yalnızca kural motorundan (yapay zekasız) önce kullanılır; aynı metne iki kez uygulanabilir.

const L = "\\p{L}";
const W = (s) => new RegExp(`(?<![${L}\\d])(?:${s})(?![${L}])`, "giu");
const pad = (n) => String(n).padStart(2, "0");

// Türkçe karaktersiz yazım ve sık yanlış duyulanlar
const FIX = {
  yarin: "yarın", bugun: "bugün", "öbur": "öbür", gorev: "görev", gorevi: "görevi", gorevler: "görevler",
  olustur: "oluştur", toplanti: "toplantı", toplantisi: "toplantısı", antreman: "antrenman", antremen: "antrenman", antirenman: "antrenman",
  aksam: "akşam", ogle: "öğle", oglen: "öğlen", ogleden: "öğleden", sali: "salı", carsamba: "çarşamba", persembe: "perşembe",
  hatirlat: "hatırlat", yaris: "yarış", kulup: "kulüp", buçuk: "buçuk", bucuk: "buçuk", saaat: "saat",
};

// Cümle sonundaki ekleme fiilinin farklı söylenişleri -> "ekle"
const VERB_END = new RegExp(
  `\\s+(?:ekli|ekler|ekler mi(?:sin|siniz)|eklermisin|ekleyebilir mi(?:sin|siniz)|eklesene|ekleyin|ekleyelim|ekleyiver|ekle bakalım|ekle lütfen|ekle|` +
    `koy|koyar mısın|koyalım|koysana|koyun|yaz|yazar mısın|yazalım|yazsana|gir|girer misin|kaydet|kaydeder misin|kaydedelim|` +
    `oluşturur musun|oluşturalım|oluştursana|oluşturun|oluşturabilir misin)\\s*[.!]*\\s*$`,
  "iu",
);

// Sayı kelimeleri (saat için 1-23)
const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const NUM = {};
ONES.forEach((w, i) => i && (NUM[w] = i));
NUM.on = 10;
ONES.forEach((w, i) => i && ((NUM[`on ${w}`] = 10 + i), (NUM[`on${w}`] = 10 + i)));
NUM.yirmi = 20;
["bir", "iki", "üç"].forEach((w, i) => (NUM[`yirmi ${w}`] = 21 + i));
const NUMW = Object.keys(NUM).sort((a, b) => b.length - a.length).join("|");
const LOC = "(?:['’]?\\s?(?:da|de|ta|te))"; // -da/-de: "onda", "on da", "10'da"
const FROM = "(?:['’]?\\s?(?:da|de|ta|te|dan|den|tan|ten))"; // "10'da", "10'dan (12'ye kadar)"
const DAT = "(?:['’]?\\s?(?:a|e|ya|ye|ye|dan|den|tan|ten))";
const POD = "(sabah|akşam|gece|öğleden sonra|öğlen|öğle)";
const MEAL = "(?!\\s+(?:yemeğ|kahvalt))"; // "akşam yemeği", "sabah kahvaltısı" saat sözü değil
const MONTHS = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";
const DAYW = "yarın|bugün|öbür gün|pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar";
const NOT_TIME = `(?!\\s*(?:${MONTHS}|gün|kişi|tane|adet|dakika|dk|saat|hafta|ay|yıl|numara|nolu))`;

function numberWords(t) {
  // "on buçuk" / "10 buçuk" -> 10:30
  t = t.replace(W(`(${NUMW}|\\d{1,2})\\s*buçuk\\S*`), (m, n) => `${NUM[n.toLocaleLowerCase("tr-TR")] ?? +n}:30`);
  // "saat on iki" -> "saat 12"
  t = t.replace(W(`saat\\s+(${NUMW})`), (m, n) => `saat ${NUM[n.toLocaleLowerCase("tr-TR")]}`);
  // "onda", "on da", "altıda" -> "10'da" ("bir de" = "ayrıca" olduğundan yalnızca saat/sabah vb. sonrasında)
  t = t.replace(W(`(saat\\s+|${POD}\\s+)?(${NUMW})${LOC}`), (m, pre, _p, n) => {
    const v = NUM[n.toLocaleLowerCase("tr-TR")];
    if (v === 1 && !pre) return m;
    return `${pre || ""}${v}'da`;
  });
  return t;
}

// Metindeki ilk saati bulur, "saat HH:MM" yapar; sabah/akşam kelimesini ve "12'ye kadar" gibi bitişi temizler
function canonicalTime(t) {
  const pats = [
    new RegExp(`saat\\s*(\\d{1,2})(?:[:.](\\d{2}))?${DAT}?${LOC}?(?![\\d${L}])`, "iu"),
    new RegExp(`(?<![\\d.:])(\\d{1,2}):(\\d{2})${DAT}?${LOC}?(?![\\d${L}])`, "iu"),
    // "10.30" saattir; "15.10" gibi ay olabilecekler tarih kalır
    new RegExp(`(?<![\\d.:])(\\d{1,2})\\.(00|15|30|45|1[3-9]|[2-5]\\d)${DAT}?${LOC}?(?![\\d.${L}])`, "iu"),
    new RegExp(`(?<![\\d.:])(\\d{1,2})${FROM}(?![${L}])${NOT_TIME}`, "iu"),
    new RegExp(`${POD}\\s+(\\d{1,2})${DAT}?(?![\\d${L}])${NOT_TIME}`, "iu"),
    new RegExp(`(?<![${L}])(?:${DAYW})\\S*\\s+(\\d{1,2})${FROM}?(?![\\d:.${L}])${NOT_TIME}`, "iu"),
  ];
  let m, idx;
  for (idx = 0; idx < pats.length; idx++) if ((m = pats[idx].exec(t))) break;
  if (!m) return t;
  const hh0 = idx === 4 ? +m[2] : +m[1];
  const mm = idx === 4 || idx === 3 || idx === 5 ? 0 : +(m[2] || 0);
  if (hh0 > 23 || mm > 59) return t;

  const pod = new RegExp(`${POD}${MEAL}`, "iu").exec(t)?.[1]?.toLocaleLowerCase("tr-TR") || "";
  let hh = hh0;
  if (pod === "gece" && hh === 12) hh = 0;
  else if (/akşam|gece|öğleden sonra/.test(pod) && hh < 12) hh += 12;
  else if (/öğle/.test(pod) && hh < 7) hh += 12;
  else if (!pod && hh >= 1 && hh <= 6) hh += 12; // "saat 3'te toplantı" gündüz kabul edilir

  // Gün kelimesiyle yakalandıysa ("yarın 10") günü koru, yalnızca sayıyı değiştir
  let rep = ` saat ${pad(hh)}:${pad(mm)} `;
  let start = m.index;
  let end = m.index + m[0].length;
  if (idx === 5) start = m.index + m[0].lastIndexOf(m[1]);
  if (idx === 4) rep = ` saat ${pad(hh)}:${pad(mm)} `;
  // Bitiş saati: "10 ile 12 arası", "10'dan 12'ye kadar", "10-12"
  const tail = new RegExp(`^\\s*(?:ile|-|–)?\\s*(?:saat\\s*)?\\d{1,2}(?:[:.]\\d{2})?${DAT}?\\s*(?:kadar|arası|arasında)?(?![\\d${L}])`, "iu").exec(t.slice(end));
  if (tail && /(ile|-|–|kadar|arası|dan|den|tan|ten)/iu.test(`${m[0]} ${tail[0]}`)) end += tail[0].length;
  t = `${t.slice(0, start)}${rep}${t.slice(end)}`;
  return t.replace(new RegExp(`(?<![${L}])${POD}(?![${L}])${MEAL}`, "giu"), " "); // "akşam yemeği" kalır
}

export function normalizeSpeech(text) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return t;
  t = t.replace(/[\p{L}]+/gu, (w) => {
    const f = FIX[w.toLocaleLowerCase("tr-TR")];
    if (!f) return w;
    return w[0] === w[0].toLocaleUpperCase("tr-TR") && w[0] !== w[0].toLocaleLowerCase("tr-TR") ? f[0].toLocaleUpperCase("tr-TR") + f.slice(1) : f;
  });
  // "not ol", "notal", "not alır mısın" -> "not al"
  t = t.replace(W("not\\s?(?:ol|all|alın|alsana|alır mısın|alabilir misin|alalım|al)|notal"), "not al");
  t = t.replace(VERB_END, " ekle");
  t = numberWords(t);
  t = canonicalTime(t);
  return t.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
}
