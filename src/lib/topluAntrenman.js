// Toplu antrenman (Seyhun 2026-11-26): ay(lar) seçilip o aylardaki tüm hafta sonlarına, hafta içlerine ya da seçilen günlere
// (ör. Perşembe) tek seferde antrenman. İsterse bayram ve resmi tatiller de eklenir. Kurallar:
// - Günler küme olarak birleşir: hafta içine denk gelen bayram tek gün sayılır (aynı güne iki antrenman yok).
// - O gün zaten antrenman varsa (aynı saat ya da saatsiz) yeniden eklenmez, atlanır.
// - Tatiller seçilmediyse tam gün tatiller atlanır (arife eklenir).
// - Bugünden önceki günler eklenmez.
// Saf işlevler (test: scripts/asistan-test/yerel/asistan.mjs). Ekran features/calendar/TopluAntrenman.jsx, ses isler/topluAntrenman.js.
import { holidayOn, holidaysIn, isHoliday } from "./tatiller.js";
import { isTraining } from "./notifyRules.js";

export const MAX_BULK = 200; // tek seferde en çok
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
export const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const WEEKDAYS = [
  [1, "Pzt"],
  [2, "Sal"],
  [3, "Çar"],
  [4, "Per"],
  [5, "Cum"],
  [6, "Cmt"],
  [0, "Paz"],
];

const D = (s) => new Date(`${s}T12:00:00`);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;

// Bu aydan başlayan n ay: ["2026-11", "2026-12", …]
export function monthsAhead(today, n = 12) {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => ymOf(y + Math.floor((m - 1 + i) / 12), (m - 1 + i) % 12));
}
export const monthLabel = (ym) => `${MONTH_SHORT[+ym.slice(5) - 1]}${ym.slice(0, 4) !== String(new Date().getFullYear()) ? ` ${ym.slice(2, 4)}` : ""}`;

// Seçilen günler: mode "weekend" (Cmt, Paz), "weekday" (Pzt–Cum), "days" (days: [0-6])
export const daysOfMode = (mode, days = []) => (mode === "weekend" ? [6, 0] : mode === "weekday" ? [1, 2, 3, 4, 5] : days);

// Tarihler: { dates (sıralı), offHol (tatil olduğu için atlanan günler) }
export function bulkDates({ months = [], mode = "weekend", days = [], holidays = false, from = "" }) {
  const want = new Set(daysOfMode(mode, days));
  const set = new Set();
  const offHol = [];
  for (const ym of [...new Set(months)].sort()) {
    const [y, m] = ym.split("-").map(Number);
    const n = new Date(y, m, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const s = `${ym}-${String(d).padStart(2, "0")}`;
      if (from && s < from) continue;
      const hol = isHoliday(s);
      if (want.has(D(s).getDay())) {
        if (hol && !holidays) offHol.push(s);
        else set.add(s);
      }
    }
    if (holidays) holidaysIn(`${ym}-01`, `${ym}-${String(n).padStart(2, "0")}`).forEach((h) => !h.half && (!from || h.date >= from) && set.add(h.date));
  }
  return { dates: [...set].sort(), offHol };
}

// Var olan antrenmanla çakışan günler atlanır: aynı gün, iptal edilmemiş antrenman, saatler aynı ya da biri saatsiz
const hm = (t) => (/^\d{1,2}:\d{2}/.test(t || "") ? t.slice(0, 5).padStart(5, "0") : "");
export function clashOf(date, time, plans = []) {
  return plans.find((p) => p.date === date && p.status !== "cancelled" && isTraining(p) && (!hm(p.time) || !hm(time) || hm(p.time) === hm(time))) || null;
}

// Önizleme: { add: [tarih], skip: [tarih] (zaten antrenman var), offHol, holidays: [{date,name}] (eklenenler arasındaki tatiller), over }
export function bulkPlan(opts, plans = []) {
  const { dates, offHol } = bulkDates(opts);
  const add = [];
  const skip = [];
  for (const d of dates) (clashOf(d, opts.time, plans) ? skip : add).push(d);
  const over = add.length > MAX_BULK;
  return { add: add.slice(0, MAX_BULK), skip, offHol, over, holidays: add.map(holidayOn).filter((h) => h && !h.half) };
}

// Kayıt taslakları (DataProvider.saveDrafts; bulk: hepsi tek seri, Geri al hepsini siler)
export function bulkDrafts(dates, { title, time, endTime, place, assignees = [] }) {
  return [{ type: "plan", cat: "Antrenman", title: (title || "").trim() || "Antrenman", date: dates[0], dates, time: hm(time), endTime: hm(endTime), place: place || "", assignees }];
}

// "26 antrenman eklenecek" + "2 gün zaten antrenman var, atlanır · 15 Temmuz tatil, atlanır"
const dm = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
export function bulkSummary(r) {
  const n = r.add.length;
  const parts = [];
  if (r.holidays.length) parts.push(`${r.holidays.length === 1 ? `${dm(r.holidays[0].date)} ${r.holidays[0].name}` : `${r.holidays.length} tatil günü`} dahil`);
  if (r.skip.length) parts.push(`${r.skip.length} gün zaten antrenman var, atlanır`);
  if (r.offHol.length) parts.push(r.offHol.length === 1 ? `${dm(r.offHol[0])} tatil, atlanır` : `${r.offHol.length} tatil günü atlanır`);
  if (r.over) parts.push(`en çok ${MAX_BULK}`);
  return { head: n ? `${n} antrenman eklenecek` : "Eklenecek gün yok", sub: parts.join(" · ") };
}

// ---- Sesle: "Aralık ve Ocak'ın hafta sonlarına 10:30'da antrenman ekle", "Temmuz hafta içlerine antrenman koy",
// "Kasım'dan Ocak'a kadar bütün perşembelere 16:00 antrenman", "bayramlar dahil" ----
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const DAY_RE = /(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cumartesi|cuma|pazar)(?:ları|leri|lara|lere|günleri|günlerine|günlerini)?/gu;
const DAY_N = { pazar: 0, pazartesi: 1, salı: 2, sali: 2, çarşamba: 3, carsamba: 3, perşembe: 4, persembe: 4, cuma: 5, cumartesi: 6 };
// Cümledeki aylar (sıralı "YYYY-AA"): "aralık ve ocak", "kasım'dan ocak'a kadar", "temmuz ayının"; geçmiş ay gelecek yılındır
export function monthsIn(text, today) {
  const t = low(text);
  // Ay(lar): "aralık ve ocak", "kasım'dan ocak'a", "temmuz ayının"
  const found = [];
  for (const m of t.matchAll(/(?<![\p{L}])(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)(?:'?(?:dan|den|tan|ten|a|e|ın|in|un|ün|ta|te|da|de|ı|i|u|ü))?(?![\p{L}])/gu)) found.push({ m: MONTHS.indexOf(m[1]), at: m.index, raw: m[0] });
  if (!found.length) return [];
  const range = found.length === 2 && /(dan|den|tan|ten)$/.test(found[0].raw.replace(/'/g, "")) && /(kadar|a|e)$/.test(t.slice(found[1].at, found[1].at + found[1].raw.length + 7).replace(/'/g, "").trim());
  const [ty, tm] = today.split("-").map(Number);
  const ym = (m) => ymOf(m + 1 < tm ? ty + 1 : ty, m);
  let months = [...new Set(found.map((f) => ym(f.m)))];
  if (range) {
    const a = ym(found[0].m);
    const b = ym(found[1].m);
    const all = monthsAhead(a + "-01", 13);
    months = all.slice(0, all.indexOf(b) + 1 || 1);
  }
  return months;
}

export function bulkCommand(text, today) {
  const t = low(text);
  if (!/(antre?nman|idman)/u.test(t) || !/(ekle|koy|oluştur|yerleştir|planla|yaz)/u.test(t)) return null;
  const months = monthsIn(t, today);
  if (!months.length) return null;
  // Günler
  let mode = "";
  const days = new Set();
  if (/hafta ?son/u.test(t)) mode = "weekend";
  else if (/hafta ?iç|iş günler/u.test(t)) mode = "weekday";
  for (const m of t.matchAll(DAY_RE)) days.add(DAY_N[m[1]]);
  if (!mode && days.size) mode = "days";
  const holidays = /(bayram|resmi tatil|tatiller)/u.test(t) && !/(bayram|tatil)\p{L}*\s+(hariç|olmasın|olmadan|atla)/u.test(t);
  if (!mode && !holidays) return null;
  // Saat: "10:30", "10.30", "saat 10", "10'da"; aralık "10:30-13:00", "10:30'dan 13:00'e"
  const times = [...t.matchAll(/(?<!\d)([01]?\d|2[0-3])(?:[:.]([0-5]\d))?(?:'?(?:da|de|ta|te|dan|den|tan|ten|a|e|ye|ya))?(?!\d)/gu)].filter((m) => m[2] || /saat\s*$/.test(t.slice(0, m.index)) || /'?(da|de|ta|te|dan|den)$/.test(m[0]));
  const fmt = (m) => `${m[1].padStart(2, "0")}:${m[2] || "00"}`;
  return { months, mode: mode || "days", days: [...days], holidays, time: times[0] ? fmt(times[0]) : "", endTime: times[1] ? fmt(times[1]) : "" };
}

// "velilere antrenman takvimi hazırla", "Aralık–Mart veli takvimi PDF'i çıkar": veli takvimi penceresi o aylarla açılır
export function parentsCommand(text, today) {
  const t = low(text);
  if (!/veli/u.test(t) || !/(takvim|program|plan|pdf)/u.test(t) || !/(hazırla|oluştur|çıkar|yap|gönder|aç)/u.test(t)) return null;
  return { months: monthsIn(t, today) };
}
