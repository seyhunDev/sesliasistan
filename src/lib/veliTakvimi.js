// Veli takvimi (Seyhun 2026-11-26): seçilen aylardaki antrenmanlar + bayram ve resmi tatiller, velilere gidecek A4 PDF için veri.
// Saf işlevler (test edilir); PDF çizimi features/calendar/veliPdf.js, pencere VeliTakvimi.jsx.
import { holidayOn, holidaysIn } from "./tatiller.js";
import { isTraining } from "./notifyRules.js";
import { audLabel, cleanAud } from "./kimler.js";

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

// Seçilen kitle (sel) bu planın kitlesini kapsıyor mu: kitlesiz plan herkese; planın belirttiği takım/sınıf, seçimde o boyut
// varsa aynı olmalı ("A takım" PDF'ine Herkes, A takım ve sınıf antrenmanları girer, B takım girmez)
export function audIncludes(sel, aud) {
  const s = cleanAud(sel);
  const a = cleanAud(aud);
  if (!s || !a) return true;
  return (!a.team || !s.team || a.team === s.team) && (!a.cls || !s.cls || a.cls === s.cls);
}

// Velilere gidecek antrenmanlar: iptal edilmemiş, antrenman türünde, seçilen kitleye uyan
export function parentTrainings(plans = [], months = [], sel = null) {
  return plans
    .filter((p) => isTraining(p) && p.status !== "cancelled" && months.includes((p.date || "").slice(0, 7)) && audIncludes(sel, p.aud))
    .sort((a, b) => (a.date + hm(a.time)).localeCompare(b.date + hm(b.time)));
}

// Yarışlar (tür "Yarış", yarış sayfasından eklenen plan): seçilen aylara değen, iptal edilmemiş, kitleye uyan
export const isRacePlan = (p) => (p?.cat || p?.category) === "Yarış" && p.status !== "cancelled";
export function parentRaces(plans = [], months = [], sel = null) {
  const s = [...months].sort();
  if (!s.length) return [];
  const from = `${s[0]}-01`;
  const to = `${s.at(-1)}-31`;
  return plans.filter((p) => isRacePlan(p) && p.date && p.date <= to && (p.endDate || p.date) >= from && audIncludes(sel, p.aud)).sort((a, b) => a.date.localeCompare(b.date));
}

// Bir ay: { ym, title, lead (Pazartesi'den önceki boş hücre), cells [{ date, day, train, hol }], count, notes }
// notes: tatiller (çok günlü bayram tek satır "9–11 Ramazan Bayramı") ve tatildeki antrenman işareti
export function monthOf(ym, trainings = [], races = []) {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const byDay = new Map();
  trainings.forEach((p) => p.date?.startsWith(ym) && byDay.set(p.date, [...(byDay.get(p.date) || []), p]));
  const cells = [];
  for (let d = 1; d <= n; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d, train: byDay.get(date) || [], hol: holidayOn(date), race: races.filter((r) => r.date <= date && (r.endDate || r.date) >= date) });
  }
  const notes = [];
  // Yarış satırları önce: "12–14 İzmir Kupası · A takım · Optimist"
  const last = `${ym}-${String(n).padStart(2, "0")}`;
  const raceNotes = races
    .filter((r) => r.date <= last && (r.endDate || r.date) >= `${ym}-01`)
    .map((r) => {
      const a = r.date < `${ym}-01` ? 1 : +r.date.slice(8);
      const b = (r.endDate || r.date) > last ? n : +(r.endDate || r.date).slice(8);
      return { label: `${a === b ? a : `${a}–${b}`} ${r.title}${r.aud ? ` · ${audLabel(r.aud)}` : ""}`, race: true };
    });
  for (const h of holidaysIn(`${ym}-01`, `${ym}-${String(n).padStart(2, "0")}`)) {
    const last = notes.at(-1);
    const train = byDay.has(h.date);
    const name = h.half ? `${h.name} (yarım gün)` : h.name;
    if (last && last.name === name && last.to === +h.date.slice(8) - 1 && last.train === train) last.to++;
    else notes.push({ from: +h.date.slice(8), to: +h.date.slice(8), name, train, half: !!h.half });
  }
  return { ym, title: monthTitle(ym), lead, cells, count: [...byDay.values()].reduce((a, x) => a + x.length, 0), races: raceNotes.length, notes: [...raceNotes, ...notes.map((x) => ({ ...x, label: `${x.from === x.to ? x.from : `${x.from}–${x.to}`} ${x.name}${x.train ? " · antrenman" : ""}` }))] };
}

// Kimler grupları (PDF'te her biri ayrı renk): "Herkes" önce, sonra adına göre
export const audKey = (p) => audLabel(p?.aud);
export function audGroups(trainings = []) {
  const set = [...new Set(trainings.map(audKey))];
  return [...set.filter((x) => x === "Herkes"), ...set.filter((x) => x !== "Herkes").sort((a, b) => a.localeCompare(b, "tr"))];
}

// Saatler: aynı gün ve saatte tekrar eden antrenmanlar tek satır ("Cumartesi, Pazar 10:30–13:00"); birden çok kitle varsa
// başında kitle ("A takım: Cumartesi 10:30–13:00"); en çok 6 satır
export function hoursLines(trainings = []) {
  const groups = audGroups(trainings);
  const out = [];
  for (const g of groups) {
    const key = new Map(); // "10:30–13:00" -> Map(gün -> sayı)
    trainings.forEach((p) => {
      const t = hm(p.time);
      if (!t || audKey(p) !== g) return;
      const k = hm(p.endTime) ? `${t}–${hm(p.endTime)}` : t;
      const m = key.get(k) || new Map();
      const wd = D(p.date).getDay();
      m.set(wd, (m.get(wd) || 0) + 1);
      key.set(k, m);
    });
    const order = [1, 2, 3, 4, 5, 6, 0];
    [...key.entries()]
      .map(([t, m]) => ({ t, days: order.filter((d) => (m.get(d) || 0) >= 2), n: [...m.values()].reduce((a, b) => a + b, 0) }))
      .filter((x) => x.days.length)
      .sort((a, b) => b.n - a.n)
      .forEach((x) => out.push(`${groups.length > 1 ? `${g}: ` : ""}${x.days.map((d) => DAYS[d]).join(", ")} ${x.t}`));
  }
  return out.slice(0, 6);
}

export const fileName = (months) => `Antrenman takvimi ${periodTitle(months)}.pdf`.replace(/[–]/g, "-");
