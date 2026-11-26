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

// Yarışlar: yalnız yarışın kendisi (tür "Yarış"). Talimattan yazılan son tarihler ("İzmir Kupası: Kayıt son günü") ve
// diğer planlar PDF'e girmez (Seyhun 2026-11-26). Tarihler plandan; ext {id: {pre, post}} yalnız PDF'te gün ekler.
const DEADLINE = /son\s*g[üu]n|kay[ıi]t|ba[şs]vuru|[öo]deme|teslim|bildirim|toplant[ıi]|kapan[ıi][şs]/i;
export function isRacePlan(p, plans = []) {
  if ((p?.cat || p?.category) !== "Yarış" || p.status === "cancelled" || !p.date) return false;
  const t = String(p.title || "");
  const i = t.indexOf(": ");
  if (i > 0) {
    const head = t.slice(0, i);
    // Aynı yarışın asıl planı varsa "<yarış>: …" satırı bir son tarihtir
    if (plans.some((q) => q !== p && (q.cat || q.category) === "Yarış" && ((p.raceId && q.raceId === p.raceId && !q.title?.includes(": ")) || q.title === head))) return false;
    if (DEADLINE.test(t.slice(i + 2))) return false;
  }
  return !DEADLINE.test(t);
}
export const shiftDay = (d, n) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
// Ekstra günler: önce/sonra en çok 3
export const cleanExt = (e) => ({ pre: Math.max(0, Math.min(3, +e?.pre || 0)), post: Math.max(0, Math.min(3, +e?.post || 0)) });
export function raceDays(p, e) {
  const { pre, post } = cleanExt(e);
  const end = p.endDate && p.endDate >= p.date ? p.endDate : p.date;
  return { date: shiftDay(p.date, -pre), endDate: shiftDay(end, post) };
}
export function parentRaces(plans = [], months = [], sel = null, ext = {}) {
  const s = [...months].sort();
  if (!s.length) return [];
  const from = `${s[0]}-01`;
  const to = `${s.at(-1)}-31`;
  return plans
    .filter((p) => isRacePlan(p, plans) && audIncludes(sel, p.aud))
    .map((p) => ({ ...p, ...raceDays(p, ext?.[p.id]), plan: { date: p.date, endDate: p.endDate || p.date } }))
    .filter((p) => p.date <= to && p.endDate >= from)
    .sort((a, b) => a.date.localeCompare(b.date));
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
// başında kitle ("A takım: Cumartesi 10:30–13:00"); en çok 6 satır.
// Aynı günler farklı saatteyse (okulda 15:30, tatilde 10:00; Seyhun 2026-11-26) satıra tarih aralığı eklenir, gün adları kısalır:
// "Sal, Çar, Per 15:30 · 1 Ara – 16 Oca" / "Sal, Çar, Per 10:00 · 19 Oca – 30 Oca"
const SHORT_D = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const SHORT_M = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dm = (d) => `${+d.slice(8)} ${SHORT_M[+d.slice(5, 7) - 1]}`;
export function rangesOf(dates = []) {
  const s = [...new Set(dates)].sort();
  const runs = [];
  for (const d of s) {
    const last = runs.at(-1);
    if (last && (D(d) - D(last[1])) / 864e5 <= 10) last[1] = d;
    else runs.push([d, d]);
  }
  const txt = runs.map(([a, b]) => (a === b ? dm(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${dm(b)}` : `${dm(a)} – ${dm(b)}`));
  return txt.length > 2 ? `${txt.slice(0, 2).join(", ")}…` : txt.join(", ");
}
export function hoursLines(trainings = []) {
  const groups = audGroups(trainings);
  const out = [];
  for (const g of groups) {
    const key = new Map(); // "10:30–13:00" -> { m: Map(gün -> sayı), dates }
    trainings.forEach((p) => {
      const t = hm(p.time);
      if (!t || audKey(p) !== g) return;
      const k = hm(p.endTime) ? `${t}–${hm(p.endTime)}` : t;
      const e = key.get(k) || { m: new Map(), dates: [] };
      const wd = D(p.date).getDay();
      e.m.set(wd, (e.m.get(wd) || 0) + 1);
      e.dates.push(p.date);
      key.set(k, e);
    });
    const order = [1, 2, 3, 4, 5, 6, 0];
    const rows = [...key.entries()]
      .map(([t, e]) => ({ t, days: order.filter((d) => (e.m.get(d) || 0) >= 2), n: e.dates.length, dates: e.dates }))
      .filter((x) => x.days.length)
      .sort((a, b) => b.n - a.n);
    const pre = groups.length > 1 ? `${g}: ` : "";
    rows.forEach((x) => {
      const clash = rows.some((y) => y !== x && y.days.some((d) => x.days.includes(d)));
      out.push(clash ? `${pre}${x.days.map((d) => SHORT_D[d]).join(", ")} ${x.t} · ${rangesOf(x.dates.filter((d) => x.days.includes(D(d).getDay())))}` : `${pre}${x.days.map((d) => DAYS[d]).join(", ")} ${x.t}`);
    });
  }
  return out.slice(0, 6);
}

export const fileName = (months) => `Antrenman takvimi ${periodTitle(months)}.pdf`.replace(/[–]/g, "-");
