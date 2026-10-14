// Sporcunun boy ve kilo ölçümleri (saf, test edilir: scripts/asistan-test/yerel/elle.mjs › "Sporcu boy ve kilo").
// Kayıt kulüp projesinde sporcu belgesinde: body [{ d: "YYYY-MM-DD", h: cm, kg }], tarih sırasıyla, en çok 60.
// Bir ölçümde yalnız boy ya da yalnız kilo olabilir; son boy ve son kilo ayrı ayrı bulunur.
// Asistan cümlesi: "Mete'nin kilosu 52", "Mete'nin boyu 150", "Mete'nin boyu 1.52 kilosu 43", "Mete 52 kilo".

export const BODY_MAX = 60;

const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
// Boy cm (80-230); "1.52" metre yazılırsa cm'ye çevrilir. Kilo 15-200, bir ondalık.
export function heightOf(v) {
  let n = num(v);
  if (n > 0 && n < 3) n = n * 100;
  n = Math.round(n);
  return n >= 80 && n <= 230 ? n : 0;
}
export function weightOf(v) {
  const n = Math.round(num(v) * 10) / 10;
  return n >= 15 && n <= 200 ? n : 0;
}

export function cleanBody(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => ({ d: /^\d{4}-\d{2}-\d{2}$/.test(x?.d) ? x.d : "", h: heightOf(x?.h), kg: weightOf(x?.kg) }))
    .filter((x) => x.d && (x.h || x.kg))
    .map((x) => {
      const o = { d: x.d };
      if (x.h) o.h = x.h;
      if (x.kg) o.kg = x.kg;
      return o;
    })
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(-BODY_MAX);
}

// Yeni ölçüm: aynı güne yazılan ölçüm o günün kaydıyla birleşir (söylenen değer eskisinin yerine geçer)
export function addBody(list, m) {
  const cur = cleanBody(list);
  const h = heightOf(m?.h), kg = weightOf(m?.kg);
  if (!m?.d || (!h && !kg)) return cur;
  const same = cur.find((x) => x.d === m.d);
  const rest = cur.filter((x) => x.d !== m.d);
  return cleanBody([...rest, { d: m.d, h: h || same?.h, kg: kg || same?.kg }]);
}

export function dropBody(list, d) {
  return cleanBody(list).filter((x) => x.d !== d);
}

// Son boy ve son kilo (ayrı ayrı; tarihleriyle)
export function lastBody(list) {
  const l = cleanBody(list);
  const h = [...l].reverse().find((x) => x.h);
  const k = [...l].reverse().find((x) => x.kg);
  return { h: h?.h || 0, hd: h?.d || "", kg: k?.kg || 0, kd: k?.d || "" };
}

const tr = (n) => String(n).replace(".", ",");
export function bodyText(m) {
  return [m?.h ? `${m.h} cm` : "", m?.kg ? `${tr(m.kg)} kg` : ""].filter(Boolean).join(" · ");
}

// ---- Asistan cümlesi ----
const QUESTION = /\?|(^| )(kaç|ne kadar|ne|mı|mi|mu|mü)( |$)/u;
const cap = (w) => (w ? w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1) : w);
const nameOf = (s) =>
  String(s || "")
    .replace(/[,:;]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/['’`´].*$/u, ""))
    .filter((w) => w && /^\p{L}+$/u.test(w))
    .map((w) => cap(w))
    .join(" ");
const KG = /(?:kilo(?:su|sunu)?|ağırlığı(?:nı)?)\s*(?:şu an\s*|artık\s*)?(\d{2,3}(?:[.,]\d)?)(?!\d)|(\d{2,3}(?:[.,]\d)?)\s*(?:kilo|kg)(?![\p{L}])/u;
const H = /boy(?:u|unu)?\s*(?:şu an\s*|artık\s*)?(\d[.,]\d{1,2}|\d{2,3})(?!\d)|(\d[.,]\d{2}|\d{3})\s*(?:cm|santim\p{L}*|boy\p{L}*)(?![\p{L}])/u;
// Üçüncü kişi iyelik: "boyu", "kilosu", "ağırlığı" (kendi kilon "kilom" beslenmedir)
const OWN = /(^| )(boyu|boyunu|kilosu|kilosunu|ağırlığı|ağırlığını)( |$)/u;
const NOT_BODY = /(listeye|alışveriş|fitness|program|antrenman|beslenme|yemek|tekne|yelken|mesaj|yaz ona|söyle)/u;

// Dönüş: { name, h, kg, explicit } (kaydet) | { name, op: "ask" } | null
export function bodyCommand(raw) {
  const t = String(raw || "").toLocaleLowerCase("tr-TR").replace(/[.!…]+$/u, "").replace(/\s+/g, " ").trim();
  if (!t || NOT_BODY.test(t)) return null;
  const own = OWN.test(t);
  const cut = t.search(/(?:^| )(?:sporcu\p{L}* )?(?:boy|kilo|ağırlı|\d)/u);
  if (cut <= 0) return null;
  const head = t.slice(0, cut).replace(/^(sporcu|sporcumuz)\s+/u, "");
  // Ad iyelik ekiyle bitmeli ("Mete'nin", "Ali Kaya'nın", ses tanımada "metenin") ya da "Mete 52 kilo"
  const poss = /(?:['’]?n?[ıiuü]n)$/u.test(head.trim());
  const name = nameOf(poss && !/['’]/u.test(head) ? head.trim().replace(/n?[ıiuü]n$/u, "") : head);
  if (!name || name.split(" ").length > 3) return null;
  if (own && QUESTION.test(t) && !/\d/.test(t)) return poss ? { name, op: "ask" } : null;
  if (QUESTION.test(t.replace(/\b\d+\b/g, ""))) return null;
  const km = t.match(KG), hm = t.match(H);
  const kg = km ? weightOf(km[1] || km[2]) : 0;
  const h = hm ? heightOf(hm[1] || hm[2]) : 0;
  if (!kg && !h) return null;
  if (!own && !/^[\p{L}' ]+ \d{2,3}(?:[.,]\d)? ?(?:kilo|kg|cm)( (geldi|oldu|çıktı))?$/u.test(t)) return null;
  return { name, h, kg, explicit: own && poss };
}
