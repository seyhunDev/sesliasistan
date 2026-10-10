// Beslenme (Fitness › Beslenme): öğünler, su, kilo, günlük hedef (saf işlevler; testler de bunları sınar).
// Kayıtlar:
//   ay belgesi orgs/{org}/fitFood/{uid}_{YYYY-MM} { days: { "10": { meals [{ id, slot, name, qty, kcal, p, c, f, at }], water } } }
//     (ayın günü anahtar; bir ayı görmek 1 okuma)
//   kilo users/{uid}.fitW [{ d: "YYYY-MM-DD", kg }] (en çok 180; profil zaten okunuyor, ek okuma yok)
// Hedef profilden hesaplanır (Mifflin-St Jeor + hafta içi antrenman günleri + hedef), kaydedilmez.
import { fold } from "./exercises";

export const SLOTS = [
  ["kahvalti", "Kahvaltı"],
  ["ogle", "Öğle"],
  ["aksam", "Akşam"],
  ["ara", "Ara öğün"],
];
export const slotName = (k) => SLOTS.find(([x]) => x === k)?.[1] || "Ara öğün";
export const GLASS_ML = 250;

const S = (v, n = 60) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, min, max, step = 1) => {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min) return 0;
  return Math.min(max, Math.round(n / step) * step);
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const rid = () => Math.random().toString(36).slice(2, 10);

// Saate göre öğün: 04-11 kahvaltı, 11-16 öğle, 17-22 akşam, diğerleri ara öğün
export function slotOf(time = "") {
  const h = Number(String(time).slice(0, 2));
  if (!Number.isFinite(h) || !String(time)) return "ara";
  if (h >= 4 && h < 11) return "kahvalti";
  if (h >= 11 && h < 16) return "ogle";
  if (h >= 17 && h < 23) return "aksam";
  return "ara";
}
// Cümleden öğün: "kahvaltıda", "sabah", "öğlen", "akşam", "ara öğün / atıştırdım"
export function slotFromText(raw) {
  const t = fold(raw);
  if (/\b(kahvalti\w*|sabah\w*)\b/.test(t)) return "kahvalti";
  if (/\b(ogle\w*|oglen\w*)\b/.test(t)) return "ogle";
  if (/\b(aksam\w*)\b/.test(t)) return "aksam";
  if (/\b(ara ogun\w*|atistir\w*|gece\w*)\b/.test(t)) return "ara";
  return "";
}

export function cleanFood(x = {}) {
  const name = S(x.name, 60);
  if (!name) return null;
  const slot = SLOTS.some(([k]) => k === x.slot) ? x.slot : "ara";
  return {
    id: S(x.id, 20) || rid(),
    slot,
    name,
    qty: S(x.qty, 40),
    kcal: num(x.kcal, 0, 4000),
    p: num(x.p, 0, 400, 0.1),
    c: num(x.c, 0, 600, 0.1),
    f: num(x.f, 0, 400, 0.1),
    at: S(x.at, 30),
  };
}
export function cleanDay(d = {}) {
  const meals = (Array.isArray(d.meals) ? d.meals : []).map(cleanFood).filter(Boolean).slice(0, 60);
  return { meals, water: num(d.water, 0, 40) };
}
// Ay belgesinden bir gün (ayın günü anahtar)
export const dayKey = (date) => String(Number(String(date).slice(8, 10)));
export const monthKey = (date) => String(date).slice(0, 7);
export const dayOf = (month, date) => cleanDay(month?.days?.[dayKey(date)] || {});

const r1 = (n) => Math.round(n * 10) / 10;
export function totals(meals = []) {
  const t = meals.reduce((a, m) => ({ kcal: a.kcal + (m.kcal || 0), p: a.p + (m.p || 0), c: a.c + (m.c || 0), f: a.f + (m.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f) };
}

// Günlük hedef. profile: users/{uid}.fit; days: haftalık antrenman günü sayısı. Boy/kilo yoksa null.
//   kalori: Mifflin-St Jeor × hareket katsayısı (0-1 gün 1,3 · 2-3 gün 1,45 · 4-5 gün 1,6 · 6-7 gün 1,72) ± hedef
//   protein g/kg: kilo 1,8 · kas 2 · güç 1,8 · diğer 1,4 · yağ kalorinin %27'si · karbonhidrat kalan · su 35 ml/kg (bardak)
export function targets(profile = {}, days = 3) {
  const w = Number(profile.weight) || 0;
  const h = Number(profile.height) || 0;
  if (!w || !h) return null;
  const age = Number(profile.age) || 30;
  const bmr = 10 * w + 6.25 * h - 5 * age + (profile.sex === "k" ? -161 : 5);
  const act = days <= 1 ? 1.3 : days <= 3 ? 1.45 : days <= 5 ? 1.6 : 1.72;
  const goal = profile.goal || "";
  const adj = goal === "kilo" ? -450 : goal === "kas" ? 250 : goal === "guc" ? 150 : 0;
  const kcal = Math.max(profile.sex === "k" ? 1300 : 1500, Math.round((bmr * act + adj) / 10) * 10);
  const p = Math.round(w * (goal === "kas" ? 2 : goal === "kilo" || goal === "guc" ? 1.8 : 1.4));
  const f = Math.round((kcal * 0.27) / 9);
  const c = Math.max(50, Math.round((kcal - p * 4 - f * 9) / 4));
  const water = Math.min(16, Math.max(6, Math.round((w * 35) / GLASS_ML)));
  return { kcal, p, c, f, water };
}

// Kilo kayıtları: günde bir (aynı gün sonuncusu), tarih sırasıyla, en çok 180
export function cleanWeights(list = []) {
  const by = new Map();
  for (const x of Array.isArray(list) ? list : []) {
    const kg = num(x?.kg, 30, 250, 0.1);
    if (kg && DAY.test(String(x?.d))) by.set(x.d, { d: x.d, kg });
  }
  return [...by.values()].sort((a, b) => a.d.localeCompare(b.d)).slice(-180);
}
export const addWeight = (list, d, kg) => cleanWeights([...(list || []), { d, kg }]);
// Son kilo ve 30 gün önceye göre fark: { last, diff, since } | null
export function weightTrend(list = [], today = "") {
  const w = cleanWeights(list);
  if (!w.length) return null;
  const last = w[w.length - 1];
  const from = addDaysStr(today || last.d, -30);
  const base = w.find((x) => x.d >= from) || w[0];
  return { last, diff: base === last ? 0 : r1(last.kg - base.kg), since: base.d };
}
function addDaysStr(day, n) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Son 7 gün (bugün dahil): [{ date, kcal }]; months: { "YYYY-MM": ay belgesi }
export function weekKcal(months = {}, today) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysStr(today, i - 6);
    return { date, kcal: totals(dayOf(months[monthKey(date)], date).meals).kcal };
  });
}

// Bu ayda sık yenenler (hızlı ekleme): ad başına son kayıt, en sık önce, en çok n
export function frequent(months = {}, n = 8) {
  const count = new Map();
  for (const m of Object.values(months)) {
    for (const d of Object.keys(m?.days || {}).sort()) {
      for (const x of cleanDay(m.days[d]).meals) {
        const k = fold(x.name);
        const c = count.get(k);
        count.set(k, { n: (c?.n || 0) + 1, item: x });
      }
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n).slice(0, n).map((x) => x.item);
}

// ---- Söylenen cümle ----
// Beslenme cümlesi mi? Yemek/içmek geçmiş zamanda ("yedim", "içtim", "kahvaltı yaptım"), kalori/protein sorusu,
// su ("2 bardak su"), kilo ("kilom 82", "tartıldım"). "akşam yemeği planla" plandır (yemek geçmiş zamanda değil).
const ATE = /\b(yedim|yedik|yemistim|yiyorum|ictim|ictik|icmistim|atistirdim|atistirdik|kahvalti (yaptim|ettim|yaptik|ettik))\b/;
const ASK = /\b(kalori\w*|protein\w*|karbonhidrat\w*|makro\w*)\b/;
const WATER = /\b(\d+|bir|iki|uc|dort|bes|alti|yarim)?\s*(bardak|litre|lt|sise)\b.*\bsu\b|\bsu\b.*\b(ictim|ictik|ekle|icildi)\b/;
const OTHER = /\b(mesaj\w*|soyle\w*|haber ver\w*|gonder\w*|gorev\w*|not al\w*|notlara\w*|hatirlat\w*|planla\w*|takvim\w*|alisveris\w*|listeye)\b/;
export function wantsFood(raw, here = false) {
  const t = fold(raw).replace(/'/g, "");
  if (!t || OTHER.test(t)) return false;
  if (weightSaid(raw) || WATER.test(t)) return true;
  if (ATE.test(t) || ASK.test(t)) return true;
  // Beslenme sekmesinde yemek adı + öğün ("öğlen tavuk pilav") de yeterli
  return here && !!slotFromText(raw) && t.split(" ").length >= 2;
}

const WORD_N = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, yarim: 0.5 };
// "kilom 82", "82 kilo geldim", "tartıldım 81,5", "kilom 81.5 oldu" → 81.5 | 0
export function weightSaid(raw) {
  const s = String(raw || "").toLocaleLowerCase("tr-TR");
  const m =
    /kilom\s*(?:şu an\s*)?(\d{2,3}(?:[.,]\d)?)/.exec(s) ||
    /tartıl\p{L}*\s*(\d{2,3}(?:[.,]\d)?)/u.exec(s) ||
    /(\d{2,3}(?:[.,]\d)?)\s*(?:kilo|kg)\s*(?:geldim|oldum|çıktım|çıkıyorum|geliyorum)/.exec(s);
  const kg = m ? Number(m[1].replace(",", ".")) : 0;
  return kg >= 30 && kg <= 250 ? kg : 0;
}

// Yapay zekaya gitmeden yapılanlar. Dönüş: { op: "water", n } | { op: "weight", kg } | { op: "stats" } | null
export function foodLocal(raw) {
  const t = fold(raw).replace(/'/g, "");
  if (!t) return null;
  const kg = weightSaid(raw);
  if (kg) return { op: "weight", kg };
  if (/\b(bugun|dun)?\b.*\b(kac|ne kadar)\b.*\b(kalori|protein)\b|\b(bugun|dun)\b.*\bne(ler)? (yedim|yemisim)\b|\bkalan kalori\w*\b/.test(t)) return { op: "stats" };
  // Su: yemekle birlikte söylendiyse ("tavuk yedim, 2 bardak su içtim") yapay zeka ayırır
  if (WATER.test(t) && !/\b(yedim|yedik|atistir\w*|kahvalti)\b/.test(t)) {
    const dec = fold(String(raw).replace(/(\d)[.,](\d)/g, "$1x$2"));
    const m = /\b(\d+(?:x\d)?|bir|iki|uc|dort|bes|alti|yedi|sekiz|yarim)\s*(bardak|litre|lt|sise)\b/.exec(dec);
    const n0 = m ? WORD_N[m[1]] ?? Number(m[1].replace("x", ".")) : 1;
    const unit = m?.[2] || "bardak";
    const n = unit === "bardak" ? n0 : unit === "sise" ? n0 * 2 : (n0 * 1000) / GLASS_ML;
    return { op: "water", n: Math.max(1, Math.min(12, Math.round(n))) };
  }
  return null;
}

// Gün özeti cümlesi (asistan cevabı)
export function dayLine(day, tg) {
  const t = totals(day.meals);
  if (!day.meals.length && !day.water) return "Bugün henüz bir şey yazmadın.";
  const parts = [`${t.kcal} kalori${tg ? ` (hedef ${tg.kcal}, ${t.kcal <= tg.kcal ? `${tg.kcal - t.kcal} kaldı` : `${t.kcal - tg.kcal} fazla`})` : ""}`];
  if (t.p) parts.push(`${Math.round(t.p)} g protein${tg ? ` / ${tg.p}` : ""}`);
  if (day.water) parts.push(`${day.water} bardak su`);
  return `Bugün ${parts.join(", ")}.`;
}
export const mealText = (m) => `${m.name}${m.qty ? ` (${m.qty})` : ""}`;
