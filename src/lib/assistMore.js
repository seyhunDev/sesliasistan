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

// ---- Sporcu kartı: "Ali Kaya'nın sporcu kartını aç", "Zeynep'in kartını göster" ----
export function athleteOpenCommand(raw) {
  const t = low(raw);
  const m = t.match(/^(.+?)['’]?(?:n?[ıiuü]n)? (?:sporcu )?(?:kartını|kartı|sayfasını|profilini|bilgilerini) (?:aç|göster|getir)$/u);
  if (!m || QUESTION.test(t)) return null;
  const name = nameOf(m[1].replace(/^sporcu /u, ""));
  return name && name.split(" ").length <= 3 ? { name } : null;
}

// ---- Yarışa otel (yarış sayfasında): "otel ekle: Foça Palas, 0232 812 34 56", "Foça Palas otelini ekle, telefonu 0532…" ----
export function hotelAddCommand(raw) {
  const t = low(raw);
  if (!/otel/u.test(t) || !/(^| )ekle(?=[\s,:]|$)/u.test(t) || QUESTION.test(t) || /bütçe|kişi başı|gece/u.test(t)) return null;
  const ph = String(raw || "").match(/(\+?\d[\d\s()-]{6,}\d)/);
  const phone = ph ? ph[1].replace(/\s+/g, " ").trim() : "";
  const rest = String(raw || "")
    .replace(ph ? ph[1] : /$^/, " ")
    .replace(/[,:;.]+/g, " ")
    .replace(/(^|\s)(yeni\s+)?otel(i|ini|ler\p{L}*)?(?=\s|$)/giu, " ")
    .replace(/(^|\s)(ekle|telefonu|telefon|numarası|numara|yarışa|yarışına|konaklama\p{L}*|olarak|de|da)(?=\s|$)/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!rest) return null;
  const name = rest.split(" ").map((w) => cap(w.replace(/['’].*$/u, ""))).join(" ");
  return { name, phone };
}

// ---- Fatura: "Turkcell faturasını Ali'ye ver", "elektrik faturasını Gökhan ödesin", "Turkcell faturasını sil" ----
export function invoiceTaskCommand(raw) {
  const t = low(raw);
  if (!/fatura/u.test(t) || QUESTION.test(t)) return null;
  if (/(^| )sil(?:\p{L}*)?( |$)/u.test(t) && !/ödendi/u.test(t)) return { op: "delete", t };
  const m = String(raw || "").match(/(\p{L}+(?:\s\p{L}+)?)['’]?(?:y?[ae])\s+(?:ver|ata|devret|görev olarak ver|yönlendir)\p{L}*\s*$/iu) || String(raw || "").match(/(\p{L}+(?:\s\p{L}+)?)\s+(?:ödesin|halletsin|yatırsın)\s*$/iu);
  if (!m) return null;
  const who = m[1].replace(/^(faturayı|faturasını|faturası)\s+/iu, "").replace(/\s*fatura\p{L}*$/iu, "");
  return who ? { op: "assign", who: who.replace(/['’].*$/u, ""), t } : null;
}

// ---- Fiş ödemesi (çalışanın fişi): "F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim", "fişi ödendi işaretle" ----
export function receiptPayCommand(raw) {
  const t = low(raw);
  if (!/(^| )fiş/u.test(t) || QUESTION.test(t) || /(yükle|fotoğraf|çek|excel|mail|aç)( |$)/u.test(t)) return null;
  const unpaid = /(ödenmedi|ödenmemiş|geri al)/u.test(t);
  if (!unpaid && !/(ödendi|ödedim|ödedik|öde|ödeme yapıldı|parasını verdim)( |$)/u.test(t)) return null;
  const no = t.match(/(?:^| )f[- ]?(\d{1,5})(?: |$|['’])|(\d{1,5}) (?:numaralı|nolu|no'?lu) fiş/u);
  const w = String(raw || "").match(/(\p{Lu}\p{Ll}+(?:\s\p{Lu}\p{Ll}+)?)['’](?:n?[ıiuü]n)\s+fiş/u);
  return { paid: !unpaid, no: no ? Number(no[1] || no[2]) : 0, who: w ? w[1] : "" };
}

// ---- Yoklama sonrası: "gelmeyenlerin velilerine haber ver", "devamsızların velilerine bildir" (bugün; "dün" denirse dün) ----
export function absentNotifyCommand(raw) {
  const t = low(raw);
  if (!/(gelmeyenler|gelmeyenlerin|gelmeyen sporcu|devamsız)/u.test(t) || !/veli/u.test(t) || !/(haber|bildir|bildirim|hatırlat)/u.test(t) || QUESTION.test(t)) return null;
  return { day: /(^| )dün/u.test(t) ? -1 : 0 };
}

// ---- Alışveriş: "alınanları temizle", "alınmışları listeden sil" ----
export const shopClearCommand = (raw) => /(alınanları|alınmışları|alınanlar|işaretlileri|aldıklarımı) (temizle|sil|kaldır|listeden sil)/u.test(low(raw));

// ---- Doğum günü silme: "Ayşe'nin doğum gününü sil" ----
export function birthdayDeleteCommand(raw) {
  const t = low(raw);
  const m = t.match(/^(.+?) doğum gün(?:ü|ünü|leri) (?:sil|kaldır|takvimden sil)$/u);
  if (!m || /not/u.test(t)) return null;
  const name = nameOf(m[1]);
  return name ? { name } : null;
}

// ---- Gönderi ekranında: "gönderiyi sil" ----
export const postDeleteCommand = (raw) => /^(bu )?(gönderiyi|postu|paylaşımı) sil(\p{L}*)?$/u.test(low(raw));

// ---- Yarış sayfasında (açık yarış): sporcu çıkar, sonuç, ödeme, sil, planlara ekle ----
const ORD = { birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5, altıncı: 6, yedinci: 7, sekizinci: 8, dokuzuncu: 9, onuncu: 10 };
export function raceHereCommand(raw) {
  const t = low(raw);
  if (QUESTION.test(t)) return null;
  if (/^(bu )?(yarışı|yarış kaydını) sil\p{L}*$/u.test(t)) return { op: "delete" };
  if (/(yarışı )?(planlara|takvime|planlarıma) ekle/u.test(t) && !/\d/.test(t) && t.split(" ").length <= 5) return { op: "plan" };
  const fleet = t.match(/tekne sayısı (\d{1,3})|(\d{1,3}) tekne (yarıştı|katıldı|vardı)/u);
  if (fleet) return { op: "fleet", n: Number(fleet[1] || fleet[2]) };
  let m = t.match(/^(.+?)['’]?(?:y?[ıiuü])? (?:yarıştan |listeden |kafileden )?çıkar\p{L}*$/u);
  if (m && /(yarıştan|listeden|kafileden)/u.test(t)) return { op: "remove", name: nameOf(m[1]) };
  m = t.match(/^(.+?) (\d{1,3})\.? ?(?:oldu|sırada|olarak bitirdi|bitirdi)$/u) || t.match(/^(.+?) (birinci|ikinci|üçüncü|dördüncü|beşinci|altıncı|yedinci|sekizinci|dokuzuncu|onuncu) (?:oldu|bitirdi)$/u);
  if (m) return { op: "result", name: nameOf(m[1]), place: Number(m[2]) || ORD[m[2]] };
  m = t.match(/^(.+?) (?:yarış ücretini |ücretini |bütçesini |payını )?(ödedi|ödemedi)$/u);
  if (m && !/aidat|fatura|fiş/u.test(t)) return { op: "paid", name: nameOf(m[1].replace(/['’].*$/u, "")), paid: m[2] === "ödedi" };
  return null;
}

// ---- Mesaj grubu: "Ali, Ayşe ve Mehmet ile Yelken Ekibi adında grup kur", "Yelken Ekibi diye grup oluştur" ----
export function groupCreateCommand(raw) {
  const t = low(raw);
  if (!/(grup|grubu) (kur|oluştur|aç)/u.test(t) || QUESTION.test(t)) return null;
  const m = String(raw || "").match(/([\p{L}\d][\p{L}\d ]{1,40}?)\s+(?:adında|adlı|isimli|diye)\s+(?:bir\s+)?(?:yeni\s+)?grub?u?/iu);
  return { name: m ? m[1].trim().replace(/^.*\s(ile|ve)\s/iu, "").trim() : "", t };
}

// ---- Kişi silme (hesabı olmayan kişi): "Ayşe Yılmaz'ı kişilerden sil" ----
export function personDeleteCommand(raw) {
  const t = low(raw);
  const m = t.match(/^(.+?) (?:kişilerden|rehberden|kişi listesinden) (?:sil|çıkar|kaldır)\p{L}*$/u) || t.match(/^(?:kişilerden|rehberden) (.+?) (?:sil|çıkar|kaldır)\p{L}*$/u);
  const name = m ? nameOf(m[1]) : "";
  return name ? { name } : null;
}
