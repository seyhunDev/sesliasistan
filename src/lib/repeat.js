// Tekrarlayan plan: "her salı 16:00 antrenman" bir kez söylenir, haftalık kopyalar oluşturulur.
// Kopyalar ayrı plan kaydıdır (seriesId ortak); bildirim, takvim, ana sayfa olduğu gibi çalışır.

export const MAX_REPEAT = 26; // en çok yarım yıl
export const DEFAULT_WEEKS = 12; // bitiş söylenmezse ~3 ay

const DAYS = { pazar: 0, pazartesi: 1, salı: 2, sali: 2, çarşamba: 3, carsamba: 3, perşembe: 4, persembe: 4, cuma: 5, cumartesi: 6 };
const DAY_RE = "(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cumartesi|cuma|pazar)";
const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Cümlede haftalık tekrar var mı: "her salı", "her hafta", "haftada bir", "salıları", "her cumartesi ve pazar"
// Dönüş: null ya da { days: [0-6] } (gün söylenmediyse boş dizi)
export function repeatOf(text) {
  const t = lower(text);
  const days = new Set();
  const each = new RegExp(`\\bher\\s+${DAY_RE}((?:\\s*(?:,|ve)\\s*${DAY_RE})*)`, "g");
  for (const m of t.matchAll(each)) {
    days.add(DAYS[m[1]]);
    for (const d of (m[2] || "").matchAll(new RegExp(DAY_RE, "g"))) days.add(DAYS[d[1]]);
  }
  for (const m of t.matchAll(new RegExp(`\\b${DAY_RE}(?:ları|leri)\\b`, "g"))) days.add(DAYS[m[1]]);
  if (days.size) return { days: [...days].sort() };
  if (/\bher\s+hafta\b|\bhaftada\s+bir\b|\bhaftalık\s+(?:olarak|tekrar)/.test(t)) return { days: [] };
  return null;
}

const D = (s) => new Date(`${s}T12:00:00`);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const plusDays = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const defaultUntil = (start) => plusDays(start, DEFAULT_WEEKS * 7 - 7);

// Başlangıçtan bitişe (dahil) haftalık tarihler; en çok MAX_REPEAT
export function seriesDates(start, until) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "")) return [];
  const end = /^\d{4}-\d{2}-\d{2}$/.test(until || "") && until >= start ? until : defaultUntil(start);
  const out = [];
  for (let s = start; s <= end && out.length < MAX_REPEAT; s = plusDays(s, 7)) out.push(s);
  return out;
}

// Gün adından o güne denk gelen ilk tarih (bugün dahil): "her salı" denip tarih verilmediyse
export function nextWeekday(day, from) {
  const d = D(from);
  const diff = (day - d.getDay() + 7) % 7;
  return plusDays(from, diff);
}

// Yapay zeka ya da yerel kural tekrarı kaçırdıysa cümleden tamamlar. Birden çok gün söylendiyse
// ("her salı ve perşembe") plan her gün için ayrı seri olur.
export function applyRepeat(items, text, today) {
  const r = repeatOf(text);
  if (!r || items.some((x) => x.repeat === "week")) return items;
  const out = [];
  for (const it of items) {
    if (it.type !== "plan" || it.endDate) {
      out.push(it);
      continue;
    }
    const base = { ...it, repeat: "week", repeatUntil: it.repeatUntil || "" };
    if (r.days.length <= 1) {
      const day = r.days[0];
      const date = day === undefined ? it.date || today : it.date && D(it.date).getDay() === day ? it.date : nextWeekday(day, it.date && it.date > today ? it.date : today);
      out.push({ ...base, date });
    } else {
      const from = it.date && it.date >= today ? it.date : today;
      for (const day of r.days) out.push({ ...base, date: nextWeekday(day, from) });
    }
  }
  return out;
}

// "Her hafta · 26 Aralık'a kadar"
export function repeatLabel(until) {
  if (!until) return "Her hafta";
  const d = D(until);
  const ek = d.getMonth() === 8 || d.getMonth() === 9 ? "e" : "a"; // Eylül'e, Ekim'e; diğerleri 'a
  return `Her hafta · ${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}'${ek} kadar`;
}
