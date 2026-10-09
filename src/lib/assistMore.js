// Son eklenen özelliklerin asistan cümleleri (saf, test edilir; scripts/asistan-test/yerel/asistan.mjs › "Yeni görevler").
// Arama ("Ali'yi ara", "oteli ara"), sporcu ekleme / arşiv / silme, Hesaplar'a nakit gelir, aidat hatırlatması ve
// "aidatını kim ödemedi" sorusu, Instagram gönderisini arşive kaldırma. Yalnız kalıba uyan cümleler; uymayan yapay zekaya gider.
// Geri alınamayan işler (sporcu silme, arama, velilere hatırlatma gönderme) AssistantSheet'te onay sorar.

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!…]+$/u, "").replace(/\s+/g, " ").trim();
const cap = (w) => (w ? w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1) : w);
const QUESTION = /\?|(^| )(mı|mi|mu|mü|mısın|misin|mıyım|miyim)( |$)/u;
// Ad sonundaki ekler ("Ali'yi", "Kaya'nın", "Ayşe'ye"): kesme işaretinden sonrası atılır
const bare = (w) => String(w || "").replace(/['’`´].*$/u, "");
const nameOf = (s) =>
  String(s || "")
    .replace(/[,:;]+/g, " ")
    .split(/\s+/)
    .map(bare)
    .filter((w) => w && /^\p{L}+$/u.test(w))
    .slice(0, 4)
    .map((w) => cap(w.toLocaleLowerCase("tr-TR")))
    .join(" ");

// ---- Arama: "Ali'yi ara", "Ali Kaya'yı arar mısın", "Ali'ye arama yap", "oteli ara", "Foça otelini ara" ----
const CALL = /^(?:hemen |şimdi |bir )?(.+?)\s+(?:telefonla |sesli )?(?:ara|arar mısın|arayabilir misin|arayalım|arasana|aramanı istiyorum|ile görüş(?:mek istiyorum)?)$/u;
const CALL2 = /^(?:hemen |şimdi )?(.+?)['’]?(?:y?[ae])? (?:sesli )?arama (?:yap|başlat)$/u;
const NOT_CALL = /(fatura|fiş|not|görev|plan|kayıt|mail|dosya|internette|google|sayfa|listede|listesinde|takvimde|mesajlarda)/u;
export function callCommand(raw) {
  const t = low(raw);
  const m = t.match(CALL2) || t.match(CALL);
  if (!m) return null;
  const who = m[1].replace(/^(beni|bana) /u, "").trim();
  if (!who || who.split(" ").length > 4 || NOT_CALL.test(who)) return null;
  return { who, hotel: /otel/u.test(who) };
}

// ---- Sporcu: "yeni sporcu ekle: Ali Kaya, 2014 doğumlu", "Ali Kaya'yı sporcu olarak ekle",
//      "Ali Kaya'yı arşive al", "Ali'yi arşivden çıkar", "Ali Kaya sporcusunu sil", "sporculardan Ali'yi sil" ----
const BIRTH = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})|(?:^| )((?:19|20)\d{2})(?: yılında)? doğumlu/u;
const ADD_ATH = /(yeni sporcu( ekle| kaydı aç| kaydet)?|sporcu (olarak )?(ekle|kaydet)|sporculara (ekle|kaydet)|sporcu kaydı aç|kulübe (yeni )?sporcu ekle)/u;
export function athleteCommand(raw) {
  const t = low(raw);
  if (QUESTION.test(t)) return null;
  const explicit = /sporcu/u.test(t);
  if (/(not|görev|gönderi|post|plan|fatura|fiş|envanter)/u.test(t.replace(/sporcu\p{L}*/gu, ""))) return null;
  let op = "";
  if (/arşivden (çıkar|al|geri al)|tekrar aktif (yap|et)|aktife al/u.test(t)) op = "unarchive";
  else if (/arşive (al|kaldır|koy|taşı|gönder)|pasife al|pasif yap/u.test(t)) op = "archive";
  else if (explicit && /(^| )sil(?:\p{L}*)?( |$)/u.test(t)) op = "delete";
  else if (ADD_ATH.test(t)) op = "add";
  if (!op) return null;
  let rest = t
    .replace(/[,:;]+/g, " ")
    .replace(BIRTH, " ")
    .replace(/doğumlu/gu, " ")
    .replace(/(yeni sporcu|sporcu olarak|sporcusunu|sporcuyu|sporculardan|sporculara|sporcu kaydı aç|sporcu|kulübe|kulüpten)/gu, " ")
    .replace(/(arşivden (çıkar|al|geri al)|arşive (al|kaldır|koy|taşı|gönder)|tekrar aktif (yap|et)|aktife al|pasife al|pasif yap)/gu, " ")
    .replace(/(^| )(ekle|kaydet|sil|kaydı|aç|lütfen|bir|de|da|ve|olarak|kaydını)(?= |$)/gu, " ");
  const name = nameOf(rest);
  if (!name) return op === "add" ? { op, name: "", birth: "", explicit } : null;
  if (!explicit && name.split(" ").length > 3) return null;
  const b = t.match(BIRTH);
  const birth = b ? (b[3] ? `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}` : `${b[4]}-01-01`) : "";
  return { op, name, birth, explicit };
}

// ---- Nakit gelir (Hesaplar): "Ali Kaya'nın ekim aidatı nakit 1500 alındı", "Ahmet'ten 2000 lira bağış geldi",
//      "kano eğitimi için 3 bin lira nakit aldım", "hesaplara 500 lira gelir ekle" ----
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
export function amountOf(raw) {
  const t = low(raw);
  const m = t.match(/(\d[\d.,]*)\s*(bin)?\s*(tl|lira|₺)?/u);
  if (!m) return 0;
  let n = m[1].replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  n = Number(n);
  if (!Number.isFinite(n)) return 0;
  return Math.round((m[2] ? n * 1000 : n) * 100) / 100;
}
const CAT = [
  [/aidat/u, "Aidat"],
  [/bağış/u, "Bağış"],
  [/kano/u, "Kano eğitimi"],
  [/\bsup\b|sup eğitim/u, "SUP eğitimi"],
  [/yetişkin/u, "Yetişkin eğitimi"],
  [/amatör|denizcilik/u, "Amatör denizcilik eğitimi"],
];
export function incomeCommand(raw, today = "") {
  const t = low(raw);
  if (QUESTION.test(t) || /(^| )(fatura\p{L}*|fiş\p{L}*|ödemedi|ödemeyen\p{L}*|kim|kimler|kaç|ne kadar|hatırlat\p{L}*|gider\p{L}*|harca\p{L}*)( |$)/u.test(t)) return null;
  if (!/(nakit|gelir|bağış|aidat|eğitim)/u.test(t)) return null;
  if (!/(aldım|aldık|alındı|geldi|ödedi|verdi|yatırdı|ekle|yaz|kaydet|gelir olarak)/u.test(t)) return null;
  const amount = amountOf(t.replace(/(19|20)\d{2} yılı/gu, ""));
  if (!(amount > 0)) return null;
  const cat = (CAT.find(([re]) => re.test(t)) || [null, "Diğer"])[1];
  // Kimden: "Ahmet'ten", "Ali Kaya'dan", "Ali Kaya'nın", "Ali Kaya ödedi"
  const words = String(raw || "").replace(/[,.;:!]/g, " ").split(/\s+/).filter(Boolean);
  let who = "";
  const i = words.findIndex((w) => /['’](n?[ıiuü]n|[dt][ae]n)$/iu.test(w));
  if (i >= 0) {
    const prev = i > 0 && /^\p{Lu}/u.test(words[i - 1]) ? `${words[i - 1]} ` : "";
    who = nameOf(prev + words[i]);
  } else {
    // İlk büyük harfli kelime dizisi ("Deniz Şahin aidatını ödedi"); TL gibi kısaltmalar sayılmaz
    const up = (w) => /^\p{Lu}\p{Ll}/u.test(w);
    const k = words.findIndex(up);
    if (k >= 0) {
      let e = k;
      while (e < words.length && e < k + 3 && up(words[e])) e++;
      who = nameOf(words.slice(k, e).join(" "));
    }
  }
  const mi = MONTHS.findIndex((m) => new RegExp(`(^| )${m}( |$|\\p{L})`, "u").test(t));
  const y = Number(String(today).slice(0, 4)) || new Date().getFullYear();
  const cur = Number(String(today).slice(5, 7)) || new Date().getMonth() + 1;
  const ym = mi >= 0 ? `${mi + 1 > cur + 1 ? y - 1 : y}-${String(mi + 1).padStart(2, "0")}` : `${y}-${String(cur).padStart(2, "0")}`;
  const note = cat === "Diğer" ? nameOf(t.replace(/\d[\d.,]*|(tl|lira|nakit|gelir|olarak|ekle|aldım|aldık|alındı|geldi|hesaplara|hesaba|için|yaz|kaydet)/gu, " ")).slice(0, 60) : "";
  return { cat, amount, who, ym, note };
}

// ---- Aidat: "aidat hatırlatması gönder", "aidatını ödemeyenlere hatırlat" · soru: "bu ay kim aidat ödemedi" ----
export function duesCommand(raw) {
  const t = low(raw);
  if (!/aidat/u.test(t)) return null;
  if (/(hatırlat|hatırlatma)/u.test(t) && !/(hatırlattın mı|hatırlatıldı mı)/u.test(t)) return { op: "remind" };
  if (/(kim|kimler|kaç kişi|kaç sporcu|hangi sporcu|kimin)/u.test(t) && /(ödemedi|ödemeyen|ödemiş|ödedi|eksik|borç)/u.test(t)) return { op: "ask", paid: /(ödedi|ödemiş)/u.test(t) && !/ödemedi|ödemeyen/u.test(t) };
  return null;
}

// ---- Instagram gönderisi ekranında: "gönderiyi arşive kaldır", "arşivden çıkar" ----
export function postArchiveCommand(raw) {
  const t = low(raw);
  if (/arşivden (çıkar|al|geri al)/u.test(t)) return { archived: false };
  if (/(arşive (al|kaldır|koy|taşı)|arşivle)/u.test(t)) return { archived: true };
  return null;
}
