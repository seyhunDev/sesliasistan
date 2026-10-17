import { money } from "@/lib/bankSheet";

// Hesaplar sekmelerindeki satırların ortak hesapları (HesapViews.jsx; test: scripts/asistan-test/yerel/elle.mjs)
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const AY3 = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const thisYear = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 4);
// "2026-10" → "Ekim" (bu yıl) ya da "Ekim 2025"
export const monthText = (ym) => (ym ? `${AY[Number(ym.slice(5, 7)) - 1]}${ym.slice(0, 4) === thisYear() ? "" : ` ${ym.slice(0, 4)}`}` : "Tarihsiz");
// "2026-10-17" → "17 Eki"
export const dayText = (d) => (/^\d{4}-\d{2}-\d{2}/.test(d || "") ? `${Number(d.slice(8, 10))} ${AY3[Number(d.slice(5, 7)) - 1]}` : "");
// Tutar: 1.200 (kuruş varsa 1.200,50)
export const para = (n) => money(n || 0).replace(/,00$/, "");
// İşaretli tutar: +1.200 / −300
export const amt = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${para(Math.abs(n || 0))}`;

// Satırları ayın başlığı altında toplar (en yeni önce); satır { id, day "YYYY-MM-DD", sort, amount, ... }
export function byMonth(rows) {
  const map = new Map();
  for (const r of [...rows].sort((a, b) => String(b.sort || b.day).localeCompare(String(a.sort || a.day)))) {
    const ym = String(r.day || "").slice(0, 7);
    if (!map.has(ym)) map.set(ym, { ym, in: 0, out: 0, rows: [] });
    const g = map.get(ym);
    if (r.amount > 0) g.in += r.amount;
    else g.out += Math.abs(r.amount || 0);
    g.rows.push(r);
  }
  return [...map.values()];
}
