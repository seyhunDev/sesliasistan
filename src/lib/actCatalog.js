// Numaralı iş kataloğu (Seyhun: "yapılabilirler listemiz var, numaralandıralım; yapay zeka '1'i yap, 1, 3, 4'ü yap,
// içeriği bunlar olsun' desin", 2026-10-12). Görev listesinde yapay zeka (/api/tasks) uygulamanın bildiği işlerden birini
// numarasıyla ve alanlarıyla seçer; uygulama komutu kendi kalıbından yazar (say). Böylece yapay zekanın yazdığı serbest
// cümle yeniden yorumlanmaz: aynı numara her zaman aynı akışa gider (testi: yönlendirme › "Numaralı iş kataloğu").
// Katalogda olmayan iş 0: eskisi gibi tür (kind) + yapay zekanın cümlesi.

const S = (v, n = 80) => String(v ?? "").replace(/[\n\r"]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const list = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\s*(?:,|\sve\s)\s*/u) : []).map((x) => S(x, 40)).filter(Boolean).slice(0, 30);
const and = (xs) => (xs.length < 2 ? xs[0] || "" : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
// Türkçe ek: Ali → Ali'nin / Ali'den / Ali'yi (son ünlüye ve harfe göre)
function suffix(name, kind) {
  const w = S(name, 60);
  if (!w) return "";
  const v = (w.match(/[aeıioöuü](?=[^aeıioöuü]*$)/iu) || ["e"])[0].toLowerCase();
  const back = "aıou".includes(v);
  const round = "ouöü".includes(v);
  const endsV = /[aeıioöuü]$/iu.test(w);
  const hard = /[çfhkpsştÇFHKPSŞT]$/u.test(w);
  const i4 = back ? (round ? "u" : "ı") : round ? "ü" : "i";
  const a2 = back ? "a" : "e";
  if (kind === "gen") return `${w}'${endsV ? "n" : ""}${i4}n`;
  if (kind === "abl") return `${w}'${hard ? "t" : "d"}${a2}n`;
  if (kind === "acc") return `${w}'${endsV ? "y" : ""}${i4}`;
  return w;
}

// Alanların açıklaması yapay zeka içindir; say(a) uygulamanın kendi akışının tanıdığı kalıbı yazar
export const ACTS = [
  { no: 1, id: "race_create", kind: "race", name: "Yarış oluştur", fields: "name (yarış adı), date (söylendiği gibi: '7-11 Ekim'), place, athletes [ad]",
    say: (a) => S(a.name) && [`${S(a.name)} adında yarış oluştur`, S(a.date), S(a.place), list(a.athletes).length && `${and(list(a.athletes))} katılacak`].filter(Boolean).join(", ") },
  { no: 2, id: "race_add", kind: "race", name: "Yarışa sporcu ekle", fields: "race (yarış adı), athletes [ad]",
    say: (a) => S(a.race) && list(a.athletes).length && `${S(a.race)} yarışına ${and(list(a.athletes))} ekle` },
  { no: 3, id: "attendance", kind: "attendance", name: "Yoklama", fields: "day ('bugün', 'dün' ya da tarih), came [ad], absent [ad], excused [ad]",
    say: (a) => {
      const parts = [list(a.came).length && `${and(list(a.came))} geldi`, list(a.absent).length && `${and(list(a.absent))} gelmedi`, list(a.excused).length && `${and(list(a.excused))} izinli`].filter(Boolean);
      return parts.length && `yoklama: ${S(a.day, 20) || "bugün"} ${parts.join(", ")}`;
    } },
  { no: 4, id: "dues_cash", kind: "income", name: "Aidat nakit alındı", fields: "who (sporcu adı), month (ay adı, söylendiyse), amount (TL, söylendiyse)",
    say: (a) => S(a.who) && `${suffix(a.who, "gen")} ${S(a.month, 12) ? `${S(a.month, 12).toLocaleLowerCase("tr")} ` : ""}aidatı nakit ${num(a.amount) ? `${num(a.amount)} TL ` : ""}alındı` },
  { no: 5, id: "income", kind: "income", name: "Nakit gelir / bağış", fields: "who (kimden), amount (TL), cat ('bağış', 'kano eğitimi'…; söylenmediyse 'gelir')",
    say: (a) => num(a.amount) && (S(a.who) ? `${suffix(a.who, "abl")} ${num(a.amount)} lira ${S(a.cat, 30) || "bağış"} geldi` : `${num(a.amount)} lira nakit ${S(a.cat, 30) || "gelir"} alındı`) },
  { no: 6, id: "post", kind: "post", name: "Instagram gönderisi", fields: "topic (konu ya da yarış adı), type ('yarış duyurusu', 'sonuç', 'kutlama'…), color, size ('hikâye', 'kare'…)",
    say: (a) => S(a.topic) && [`${S(a.topic)} için Instagram gönderisi hazırla`, S(a.type, 30), S(a.color, 20) && `rengi ${S(a.color, 20)} olsun`, S(a.size, 20) && `${S(a.size, 20)} boyutunda`].filter(Boolean).join(", ") },
  { no: 7, id: "shopping", kind: "shopping", name: "Alışveriş listesine ekle", fields: "items [ne]",
    say: (a) => list(a.items).length && `listeye ${and(list(a.items))} ekle` },
  { no: 8, id: "call", kind: "call", name: "Ara", fields: "who (ad)",
    say: (a) => S(a.who) && `${suffix(a.who, "acc")} ara` },
  { no: 9, id: "nav", kind: "nav", name: "Sayfa aç", fields: "page (sayfanın adı: Planlar, Aidatlar, Yarışlar…)",
    say: (a) => S(a.page, 30) && `${S(a.page, 30)} sayfasını aç` },
  { no: 10, id: "invoice_paid", kind: "invoice", name: "Fatura ödendi", fields: "seller (firma), cash (nakit ödendiyse true)",
    say: (a) => S(a.seller, 40) && `${S(a.seller, 40)} faturası ${a.cash === true || a.cash === "true" ? "nakit " : ""}ödendi` },
  { no: 11, id: "athlete_add", kind: "athlete", name: "Sporcu ekle", fields: "name (ad soyad), year (doğum yılı, söylendiyse)",
    say: (a) => S(a.name, 60) && `yeni sporcu ekle: ${S(a.name, 60)}${/^\d{4}$/.test(S(a.year, 4)) ? `, ${S(a.year, 4)} doğumlu` : ""}` },
  { no: 12, id: "log", kind: "log", name: "Antrenman günlüğü", fields: "text (antrenmanın anlatımı: rüzgâr, çalışılanlar, süre)",
    say: (a) => S(a.text, 300) && `antrenman günlüğüne yaz: ${S(a.text, 300)}` },
  { no: 13, id: "fitness", kind: "fitness", name: "Fitness", fields: "text (program isteği ya da yapılan fitness antrenmanı)",
    say: (a) => S(a.text, 300) && `fitness: ${S(a.text, 300)}` },
  { no: 14, id: "dues_remind", kind: "dues", name: "Aidat hatırlatması gönder", fields: "",
    say: () => "aidat hatırlatması gönder" },
  { no: 15, id: "dues_unpaid", kind: "dues", name: "Aidatı kim ödemedi", fields: "",
    say: () => "bu ay kim aidat ödemedi" },
];

export const ACT = Object.fromEntries(ACTS.map((x) => [x.no, x]));
// Yapay zekaya giden alanlar (tek düz nesne: her işin alanları bunlardan)
export const ARG_KEYS = ["name", "date", "place", "race", "athletes", "day", "came", "absent", "excused", "who", "month", "amount", "cat", "topic", "type", "color", "size", "items", "page", "seller", "cash", "year", "text"];
const ARRAYS = new Set(["athletes", "came", "absent", "excused", "items"]);
export const ARGS_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(ARG_KEYS.map((k) => [k, ARRAYS.has(k) ? { type: "array", items: { type: "string" } } : k === "cash" ? { type: "boolean" } : { type: "string" }])),
};

// İstem için katalog satırları
export const actsPrompt = () => ACTS.map((x) => `${x.no}. ${x.name}${x.fields ? ` — alanlar: ${x.fields}` : ""}`).join("\n");

// Numara + alanlar → { act, kind, say } ya da null (numara yok ya da gerekli alan eksik: eski yol)
export function actSay(no, args) {
  const a = ACT[Number(no)];
  if (!a) return null;
  const say = a.say(args && typeof args === "object" ? args : {});
  return say ? { act: a.no, kind: a.kind, say: S(say, 400) } : null;
}
