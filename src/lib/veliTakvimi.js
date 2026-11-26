// Veli takvimi (Seyhun 2026-11-26): seçilen aylardaki antrenmanlar + bayram ve resmi tatiller, velilere gidecek A4 PDF için veri.
// Saf işlevler (test edilir); PDF çizimi features/calendar/veliPdf.js, pencere VeliTakvimi.jsx.
import { holidayOn, holidaysIn } from "./tatiller.js";
import { isTraining } from "./notifyRules.js";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const D = (s) => new Date(`${s}T12:00:00`);
const hm = (t) => (/^\d{1,2}:\d{2}/.test(t || "") ? t.slice(0, 5).padStart(5, "0") : "");
export const monthTitle = (ym) => `${MONTHS[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
export const periodTitle = (months) => {
  const s = [...months].sort();
  if (!s.length) return "";
  if (s.length === 1) return monthTitle(s[0]);
  const a = s[0];
  const b = s.at(-1);
  return a.slice(0, 4) === b.slice(0, 4) ? `${MONTHS[+a.slice(5) - 1]} – ${monthTitle(b)}` : `${monthTitle(a)} – ${monthTitle(b)}`;
};

// Velilere gidecek antrenmanlar: iptal edilmemiş, antrenman türünde; title verilirse adında o geçenler (ör. "Optimist")
export function parentTrainings(plans = [], months = [], filter = "") {
  const f = filter.trim().toLocaleLowerCase("tr-TR");
  return plans
    .filter((p) => isTraining(p) && p.status !== "cancelled" && months.includes((p.date || "").slice(0, 7)) && (!f || (p.title || "").toLocaleLowerCase("tr-TR").includes(f)))
    .sort((a, b) => (a.date + hm(a.time)).localeCompare(b.date + hm(b.time)));
}

// Bir ay: { ym, title, lead (Pazartesi'den önceki boş hücre), cells [{ date, day, train, hol }], count, notes }
// notes: tatiller (çok günlü bayram tek satır "9–11 Ramazan Bayramı") ve tatildeki antrenman işareti
export function monthOf(ym, trainings = []) {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const byDay = new Map();
  trainings.forEach((p) => p.date?.startsWith(ym) && byDay.set(p.date, [...(byDay.get(p.date) || []), p]));
  const cells = [];
  for (let d = 1; d <= n; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d, train: byDay.get(date) || [], hol: holidayOn(date) });
  }
  const notes = [];
  for (const h of holidaysIn(`${ym}-01`, `${ym}-${String(n).padStart(2, "0")}`)) {
    const last = notes.at(-1);
    const train = byDay.has(h.date);
    const name = h.half ? `${h.name} (yarım gün)` : h.name;
    if (last && last.name === name && last.to === +h.date.slice(8) - 1 && last.train === train) last.to++;
    else notes.push({ from: +h.date.slice(8), to: +h.date.slice(8), name, train, half: !!h.half });
  }
  return { ym, title: monthTitle(ym), lead, cells, count: [...byDay.values()].reduce((a, x) => a + x.length, 0), notes: notes.map((x) => ({ ...x, label: `${x.from === x.to ? x.from : `${x.from}–${x.to}`} ${x.name}${x.train ? " · antrenman" : ""}` })) };
}

// Saatler: aynı gün ve saatte tekrar eden antrenmanlar tek satır ("Cumartesi, Pazar 10:30–13:00"); en çok 4 satır
export function hoursLines(trainings = []) {
  const key = new Map(); // "10:30–13:00" -> Map(gün -> sayı)
  trainings.forEach((p) => {
    const t = hm(p.time);
    if (!t) return;
    const k = hm(p.endTime) ? `${t}–${hm(p.endTime)}` : t;
    const m = key.get(k) || new Map();
    const wd = D(p.date).getDay();
    m.set(wd, (m.get(wd) || 0) + 1);
    key.set(k, m);
  });
  const order = [1, 2, 3, 4, 5, 6, 0];
  return [...key.entries()]
    .map(([t, m]) => ({ t, days: order.filter((d) => (m.get(d) || 0) >= 2), n: [...m.values()].reduce((a, b) => a + b, 0) }))
    .filter((x) => x.days.length)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((x) => `${x.days.map((d) => DAYS[d]).join(", ")} ${x.t}`);
}

export const fileName = (months) => `Antrenman takvimi ${periodTitle(months)}.pdf`.replace(/[–]/g, "-");
