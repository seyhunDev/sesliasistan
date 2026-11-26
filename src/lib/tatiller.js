// Türkiye resmi tatilleri (adlar kısa: PDF'te ay kutusuna sığsın) ve dini bayramlar (takvim, toplu antrenman, veli takvimi PDF'i).
// Sabit günler her yıl aynı; Ramazan ve Kurban Bayramı yıla göre (Diyanet takvimi). Arife yarım gündür (half).
// Yeni yıl gelince BAYRAM tablosuna o yılın tarihleri eklenir (tabloda olmayan yılın bayramı bilinmez).
const FIXED = [
  ["01-01", "Yılbaşı"],
  ["04-23", "Çocuk Bayramı"],
  ["05-01", "Emek ve Dayanışma Günü"],
  ["05-19", "Gençlik ve Spor Bayramı"],
  ["07-15", "Demokrasi ve Milli Birlik Günü"],
  ["08-30", "Zafer Bayramı"],
  ["10-29", "Cumhuriyet Bayramı"],
];
// [yıl]: { ramazan: 1. gün, kurban: 1. gün } (Ramazan 3 gün, Kurban 4 gün; arifeleri bir gün önce)
export const BAYRAM = {
  2025: { ramazan: "2025-03-30", kurban: "2025-06-06" },
  2026: { ramazan: "2026-03-20", kurban: "2026-05-27" },
  2027: { ramazan: "2027-03-09", kurban: "2027-05-16" },
};

const D = (s) => new Date(`${s}T12:00:00`);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

// Bir yılın tatil günleri: [{ date, name, half?, kind: "resmi" | "bayram" }]; aynı güne iki ad düşerse birleşir
// (2027-05-19: "Kurban Bayramı · 19 Mayıs")
const cache = new Map();
export function holidaysOf(year) {
  if (cache.has(year)) return cache.get(year);
  const m = new Map();
  const put = (date, name, kind, half = false) => {
    const o = m.get(date);
    if (o) {
      o.name = `${o.name} · ${name}`;
      o.half = o.half && half;
      if (kind === "bayram") o.kind = "bayram";
    } else m.set(date, { date, name, kind, ...(half ? { half: true } : {}) });
  };
  FIXED.forEach(([md, name]) => put(`${year}-${md}`, name, "resmi"));
  put(`${year}-10-28`, "Cumhuriyet Bayramı arifesi", "resmi", true);
  const b = BAYRAM[year];
  if (b) {
    put(plus(b.ramazan, -1), "Ramazan arifesi", "bayram", true);
    for (let i = 0; i < 3; i++) put(plus(b.ramazan, i), "Ramazan Bayramı", "bayram");
    put(plus(b.kurban, -1), "Kurban arifesi", "bayram", true);
    for (let i = 0; i < 4; i++) put(plus(b.kurban, i), "Kurban Bayramı", "bayram");
  }
  const out = [...m.values()].filter((h) => h.date.startsWith(`${year}-`)).sort((a, b) => a.date.localeCompare(b.date));
  cache.set(year, out);
  return out;
}

// İki tarih arasındaki (dahil) tatiller
export function holidaysIn(from, to) {
  if (!from || !to || to < from) return [];
  const out = [];
  for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) out.push(...holidaysOf(y).filter((h) => h.date >= from && h.date <= to));
  return out;
}

// O günün tatili (yoksa null). Arife de döner (half: true)
export const holidayOn = (date) => (date ? holidaysOf(+date.slice(0, 4)).find((h) => h.date === date) || null : null);
// Tam gün tatil mi (arife sayılmaz)
export const isHoliday = (date) => {
  const h = holidayOn(date);
  return !!h && !h.half;
};
// Bayram tablosunda bu yıl var mı (yoksa ekran "bayram tarihleri henüz yok" der)
export const knowsYear = (year) => !!BAYRAM[year];
