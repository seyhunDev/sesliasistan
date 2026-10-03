// Fiş modeli ve hesaplar. Tutarlar TAMSAYI KURUŞ olarak saklanır (642,90 ₺ = 64290).
export const CAT = {
  Market: { icon: "cart", color: "#10b981" },
  Yakıt: { icon: "fuel", color: "#f59e0b" },
  Yemek: { icon: "utensils", color: "#ef4444" },
  Ekipman: { icon: "anchor", color: "#2f7d6b" },
  Fatura: { icon: "zap", color: "#06b6d4" },
  Ulaşım: { icon: "nav", color: "#8b5cf6" },
  Bakım: { icon: "wrench", color: "#64748b" },
  Diğer: { icon: "box", color: "#94a3b8" },
};
export const CATS = Object.keys(CAT);
export const PAYS = ["Kart", "Nakit", "Havale"];
export const DOC = { fis: "Fiş", fatura: "Fatura" };
export const VATS = [0, 1, 10, 20];
export const catOf = (c) => CAT[c] || CAT["Diğer"];

// "1.234,56" | "1234.56" | "1234,5" | "3.500" (binlik nokta) | 12.5 -> kuruş (tamsayı). Geçersizse NaN.
export function parseTL(v) {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  let s = String(v ?? "").replace(/[₺\s]/g, "").replace(/TL/gi, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // "3.500" = üç bin beş yüz
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
// kuruş -> "1234,56" (form alanı için)
export const toInput = (k) => (k == null || Number.isNaN(k) ? "" : (k / 100).toFixed(2).replace(".", ","));
// kuruş -> "₺1.234,56"
export const TLk = (k) => ((k || 0) / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
export const parseQty = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
};

// Kalemlerden toplamlar (birim fiyat KDV dahil). items: [{ n, q, u (kuruş), r }]
export function calcTotals(items = []) {
  const by = {};
  let gross = 0;
  for (const i of items) {
    const line = Math.round((Number(i.q) || 0) * (i.u || 0));
    gross += line;
    by[i.r] = (by[i.r] || 0) + line;
  }
  const byRate = Object.keys(by)
    .map(Number)
    .sort((a, b) => a - b)
    .map((r) => {
      const base = Math.round(by[r] / (1 + r / 100));
      return { r, base, vat: by[r] - base };
    });
  const vat = byRate.reduce((a, b) => a + b.vat, 0);
  return { gross, vat, net: gross - vat, byRate };
}

// Fişin geçerli toplamı (kuruş): fişte yazan toplam, yoksa kalemler toplamı
export const totalOf = (r) => (r?.declared > 0 ? r.declared : r?.totals?.gross || 0);
export const totalTL = (r) => totalOf(r) / 100;
// Kalemler toplamı ile fişteki toplam uyuşmuyor mu (5 kuruş tolerans)
export const mismatch = (r) => r?.declared > 0 && Math.abs(r.declared - (r.totals?.gross ?? calcTotals(r.items).gross)) > 5;
// Yapay zeka düşük güven verdi mi
export const lowConf = (conf, key) => !!conf && typeof conf[key] === "number" && conf[key] < 0.8;
export const confAvg = (conf) => {
  const v = Object.values(conf || {}).filter((x) => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
