// Yapay zeka harcaması (Ayarlar › Yapay zeka kullanımı): Google'ın her yanıtta bildirdiği token sayısından tahmini tutar.
// Seyhun (2026-10-20): "faturalandırmayı açtım, günlük ve aylık ne kadar harcanıyor görmek istiyorum". Fiyatlar
// milyon token başına dolar (girdi, çıktı; düşünme çıktı sayılır). Model adında geçen ilk eşleşme kullanılır.
// Netlify GEMINI_PRICES ile değiştirilebilir: {"flash-lite":[0.1,0.4],"flash":[0.3,2.5]}. Gerçek tutar Google faturasında.
export const PRICES = [
  ["flash-lite", 0.1, 0.4],
  ["lite", 0.1, 0.4],
  ["pro", 1.25, 10],
  ["flash", 0.3, 2.5],
  ["gemma", 0, 0],
];
export const USD_TRY = 42; // varsayılan kur (Netlify USD_TRY ile değişir)

export function priceOf(model, table = PRICES) {
  const m = String(model || "").toLowerCase();
  const hit = table.find(([k]) => m.includes(k));
  return hit ? { in: hit[1], out: hit[2] } : { in: 0.3, out: 2.5 };
}

export function parsePrices(json) {
  try {
    const o = JSON.parse(json || "");
    const rows = Object.entries(o)
      .filter(([k, v]) => k && Array.isArray(v) && v.length === 2 && v.every((x) => Number.isFinite(Number(x))))
      .map(([k, v]) => [k.toLowerCase(), Number(v[0]), Number(v[1])]);
    return rows.length ? [...rows, ...PRICES] : PRICES;
  } catch {
    return PRICES;
  }
}

// usageMetadata: { promptTokenCount, candidatesTokenCount, thoughtsTokenCount } → dolar
export function costUsd(model, u, table = PRICES) {
  const p = priceOf(model, table);
  const inTok = Number(u?.promptTokenCount) || 0;
  const outTok = (Number(u?.candidatesTokenCount) || 0) + (Number(u?.thoughtsTokenCount) || 0);
  return (inTok * p.in + outTok * p.out) / 1e6;
}

// Ayın belgesinden (usage/ai_{org}_{ay}) harcama özeti: bugün, bu ay, son günler (TL)
// doc: { usd, usdDay: { "20": 0.01 } }; today: "YYYY-MM-DD" (İstanbul)
export function spendOf(doc, today, rate = USD_TRY) {
  const tl = (usd) => (Number(usd) || 0) * rate;
  const days = Object.entries(doc?.usdDay || {})
    .map(([d, v]) => [Number(d), tl(v)])
    .filter(([d, v]) => d > 0 && v > 0)
    .sort((a, b) => b[0] - a[0]);
  const dd = Number(String(today).slice(8, 10));
  const sameMonth = String(doc?.month || "") === String(today).slice(0, 7);
  return { today: sameMonth ? tl(doc?.usdDay?.[String(dd).padStart(2, "0")]) : 0, month: tl(doc?.usd), days };
}

export const tlText = (n) =>
  `${(Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
