import { addDate } from "@/lib/ai/digest";
import { byStart } from "@/lib/utils/format";

// Ana sayfa özeti ve Planlar sayfası için kayıtları günlere göre seçer / gruplar.

const D = (s) => new Date(`${s}T00:00`);
export const weekdayShort = (s) => D(s).toLocaleDateString("tr-TR", { weekday: "short" });
export const weekdayLong = (s) => D(s).toLocaleDateString("tr-TR", { weekday: "long" });
export const dayMonth = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
export const monthYear = (s) => D(s).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

// "Bugün", "Yarın", "Cuma" (bu hafta içindeyse) ya da "3 Ekim"
export function dayLabel(s, today) {
  if (s === today) return "Bugün";
  if (s === addDate(today, 1)) return "Yarın";
  const n = Math.round((D(s) - D(today)) / 864e5);
  if (n > 1 && n < 7) return weekdayLong(s);
  return dayMonth(s);
}

// Bugünden o güne kaç gün var (geçmişse eksi)
export const daysBetween = (from, to) => Math.round((D(to) - D(from)) / 864e5);
// "Bugün", "Yarın", "4 gün kaldı", "3 gün önce"
export function leftLabel(day, today) {
  const n = daysBetween(today, day);
  if (n === 0) return "Bugün";
  if (n === 1) return "Yarın";
  return n > 0 ? `${n} gün kaldı` : `${-n} gün önce`;
}
// Çok günlü, süren plan: "Son gün" ya da "2 gün daha"
export function remainLabel(p, today) {
  const n = daysBetween(today, p.endDate || p.date);
  return n <= 0 ? "Son gün" : `${n} gün daha`;
}

// Görev son tarihi: "3 gün gecikti" (late) ya da "Bugün", "Yarın", "4 gün kaldı"
export function dueLabel(due, today) {
  const n = daysBetween(today, due);
  return n < 0 ? { text: `${-n} gün gecikti`, late: true } : { text: leftLabel(due, today), late: false };
}

// Açık görevleri son tarihe göre gruplar: Gecikti, Bugün, Yarın, Bu hafta, Daha sonra, Tarihsiz
export function groupTasks(tasks, today) {
  const g = { late: [], today: [], tomorrow: [], week: [], later: [], none: [] };
  for (const t of tasks) {
    if (!t.due) g.none.push(t);
    else {
      const n = daysBetween(today, t.due);
      g[n < 0 ? "late" : n === 0 ? "today" : n === 1 ? "tomorrow" : n <= 6 ? "week" : "later"].push(t);
    }
  }
  const byDue = (a, b) => (a.due || "").localeCompare(b.due || "");
  const byNew = (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "");
  const LABELS = { late: "Gecikti", today: "Bugün", tomorrow: "Yarın", week: "Bu hafta", later: "Daha sonra", none: "Tarihsiz" };
  return Object.keys(LABELS)
    .filter((k) => g[k].length)
    .map((k) => ({ key: k, label: LABELS[k], items: g[k].sort(k === "none" ? byNew : byDue) }));
}

const inDay = (p, d) => p.date <= d && (p.endDate || p.date) >= d;

// Planın şu ana göre durumu: "past" (bitti), "now" (sürüyor), "next" (gelmedi).
// Saatli tek günlük plan süresi kadar (yoksa 60 dk) sürer; tüm gün ve çok günlü plan gün bitince biter.
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function planState(p, now = new Date()) {
  const today = ymd(now);
  const end = p.endDate || p.date;
  if (end < today) return "past";
  if (p.date > today) return "next";
  if (!p.time || (p.endDate && p.endDate !== p.date)) return "now";
  const [h, m] = p.time.split(":").map(Number);
  const start = h * 60 + m;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < start) return "next";
  return mins < start + (p.durationMin || 60) ? "now" : "past";
}
// Bugünkü saatli plana kalan süre: "45 dk sonra", "2 sa 10 dk sonra"
export function soonLabel(p, now = new Date()) {
  const [h, m] = p.time.split(":").map(Number);
  const mins = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  return mins < 60 ? `${mins} dk sonra` : `${Math.floor(mins / 60)} sa${mins % 60 ? ` ${mins % 60} dk` : ""} sonra`;
}
// Sıradaki plan: şu an süren saatli plan, yoksa en yakın başlayacak plan. { plan, state, when }
export function nextPlan(plans, now = new Date()) {
  const today = ymd(now);
  const timedNow = plans.filter((p) => p.time && planState(p, now) === "now" && !(p.endDate && p.endDate !== p.date)).sort(byStart)[0];
  if (timedNow) return { plan: timedNow, state: "now", when: "Şu an" };
  const p = plans.filter((x) => planState(x, now) === "next").sort(byStart)[0];
  if (!p) return null;
  let when;
  if (p.date === today) {
    when = soonLabel(p, now);
  } else {
    const n = daysBetween(today, p.date);
    when = `${dayLabel(p.date, today)}${p.time ? ` · ${p.time}` : ""}${n > 1 ? ` · ${n} gün kaldı` : ""}`;
  }
  return { plan: p, state: "next", when };
}

// Henüz bitmemiş (bugün kalan + ileri tarihli) plan sayısı
export const pendingPlans = (plans, now = new Date()) => plans.filter((p) => planState(p, now) !== "past").length;

// Planlar: bugün ve yarın; ikisi de boşsa en yakın gün. Dönüş: [{ key, label, items }]
export function pickPlans(plans, today) {
  const tomorrow = addDate(today, 1);
  const out = [];
  const t = plans.filter((p) => inDay(p, today)).sort(byStart);
  const y = plans.filter((p) => inDay(p, tomorrow) && !inDay(p, today)).sort(byStart);
  if (t.length) out.push({ key: "today", label: "Bugün", items: t });
  if (y.length) out.push({ key: "tomorrow", label: "Yarın", items: y });
  if (out.length) return out;
  const next = plans.filter((p) => p.date > tomorrow).sort(byStart)[0];
  if (!next) return [];
  return [{ key: "next", label: `En yakın · ${dayLabel(next.date, today)} · ${leftLabel(next.date, today)}`, items: plans.filter((p) => p.date === next.date).sort(byStart) }];
}

// Görevler (açık olanlar): bugün (gecikenler dahil) ve yarın; yoksa en yakın tarihli; o da yoksa son eklenen
export function pickTasks(tasks, today) {
  const tomorrow = addDate(today, 1);
  const open = tasks.filter((x) => !x.done);
  const byDue = (a, b) => (a.due || "").localeCompare(b.due || "");
  const out = [];
  const late = open.filter((x) => x.due && x.due < today).sort(byDue);
  const t = open.filter((x) => x.due === today);
  const y = open.filter((x) => x.due === tomorrow);
  if (late.length) out.push({ key: "late", label: "Geciken", items: late });
  if (t.length) out.push({ key: "today", label: "Bugün", items: t });
  if (y.length) out.push({ key: "tomorrow", label: "Yarın", items: y });
  if (out.length) return out;
  const next = open.filter((x) => x.due && x.due > tomorrow).sort(byDue)[0];
  if (next) return [{ key: "next", label: `En yakın · ${dayLabel(next.due, today)}`, items: open.filter((x) => x.due === next.due) }];
  const last = [...open].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  return last ? [{ key: "last", label: "Son eklenen", items: [last] }] : [];
}

export const latestNote = (notes) => [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;

// Planlar sayfası: gün gruplarına ayırır. Devam eden çok günlü plan bugünün altında görünür.
// upcoming=true: bugünden ileriye; false: geçmiş, yeniden eskiye.
export function groupByDay(plans, today, upcoming = true) {
  const map = new Map();
  for (const p of plans) {
    const end = p.endDate || p.date;
    if (upcoming ? end < today : end >= today) continue;
    const day = upcoming && p.date < today ? today : p.date;
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(p);
  }
  const days = [...map.keys()].sort();
  if (!upcoming) days.reverse();
  return days.map((day) => ({ day, items: map.get(day).sort(byStart) }));
}

// Takvim: o güne düşen planlar (çok günlüler dahil, saate göre) ve son tarihi o gün olan görevler
export function dayItems(plans, tasks, day) {
  return {
    plans: plans.filter((p) => p.date && p.date <= day && (p.endDate || p.date) >= day).sort(byStart),
    tasks: tasks.filter((t) => t.due === day).sort((a, b) => Number(a.done) - Number(b.done)),
  };
}

// Takvim ızgarası: ayın haftaları (pazartesi başlar); her hücre { day: "YYYY-MM-DD", inMonth }
export function monthGrid(ym) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7));
  const last = new Date(y, m, 0);
  const cells = [];
  for (let d = new Date(start); d <= last || cells.length % 7; d.setDate(d.getDate() + 1)) {
    cells.push({ day: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, inMonth: d.getMonth() === m - 1 });
  }
  return cells;
}

// ---- Doğum günleri (her yıl) ----
const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Doğum gününün verilen yıldaki tarihi (29 Şubat artık olmayan yılda 28 Şubat)
export function birthdayIn(b, year) {
  const day = b.month === 2 && b.day === 29 && !leap(year) ? 28 : b.day;
  return `${year}-${String(b.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export const birthdaysOn = (birthdays, day) => birthdays.filter((b) => birthdayIn(b, +day.slice(0, 4)) === day);
// Sıradaki doğum günü tarihi ve o gün kaç yaşına girdiği (yıl biliniyorsa)
export function nextBirthday(b, today) {
  const y = +today.slice(0, 4);
  const date = birthdayIn(b, y) >= today ? birthdayIn(b, y) : birthdayIn(b, y + 1);
  return { date, age: b.year ? +date.slice(0, 4) - b.year : null };
}
// Yaklaşan doğum günleri (en yakından), days gün içinde
export function upcomingBirthdays(birthdays, today, days = 30) {
  const limit = addDate(today, days);
  return birthdays
    .map((b) => ({ ...b, ...nextBirthday(b, today) }))
    .filter((b) => b.date <= limit)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Ders programı (her hafta) ----
// Gün numarası: 1 = pazartesi … 7 = pazar
export const weekdayOf = (day) => ((new Date(`${day}T00:00`).getDay() + 6) % 7) + 1;
export const lessonsOn = (lessons, day) =>
  lessons.filter((l) => l.day === weekdayOf(day)).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
