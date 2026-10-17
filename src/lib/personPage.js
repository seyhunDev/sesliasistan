// Kişi sayfası (/people/p/[uid]) için hesaplar: doğum günü satırı, alt satır, yapılacaklar, fişler, yoklama.
// Arayüzden bağımsız (testlerde doğrudan denenir).
import { KIND_LABEL, kindOf } from "@/lib/kinds";
import { assigneesOf } from "@/lib/people";
import { birthdayIn, daysBetween, nextBirthday } from "@/lib/agenda";
import { payOf, totalOf } from "@/lib/receipts";

export const personPath = (uid) => `/people/p/${uid}`;

// Sporcu tarafı (aidat, yarış, yoklama satırları olan): sporcu ve öğrenci; çalışan, aile, veli, diğer değil
export const clubSide = (m) => ["athlete", "student"].includes(kindOf(m));

// Doğum günü: Kişiler'deki bağlı doğum günü kaydı, yoksa kişi kaydındaki doğum tarihi (YYYY-AA-GG)
export function birthOf(m, birthdays = []) {
  const b = m && birthdays.find((x) => x.memberUid === m.uid);
  if (b?.month && b?.day) return { month: +b.month, day: +b.day, year: b.year ? +b.year : null };
  const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(m?.birth || "");
  return x ? { month: +x[2], day: +x[3], year: +x[1] } : null;
}

// Yaşı (yıl biliniyorsa)
export function ageOf(b, today) {
  if (!b?.year) return null;
  const y = +today.slice(0, 4);
  return y - b.year - (birthdayIn(b, y) > today ? 1 : 0);
}

// Üstteki vurgulu satır: yalnız bugün ve yarın ("Bugün doğum günü · 14 yaşına giriyor")
export function bdayLine(b, today) {
  if (!b) return "";
  const n = nextBirthday(b, today);
  const d = daysBetween(today, n.date);
  if (d > 1) return "";
  const head = d === 0 ? "Bugün doğum günü" : "Yarın doğum günü";
  return n.age ? `${head} · ${n.age} yaşına giriyor` : head;
}

// Bilgiler'deki satır: "12 Mart 1990" ve kalan gün
export function bdayInfo(b, today) {
  if (!b) return "";
  const n = nextBirthday(b, today);
  const d = daysBetween(today, n.date);
  const day = new Date(`${n.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const left = d === 0 ? "bugün" : d === 1 ? "yarın" : `${d} gün sonra`;
  return `${day}${b.year ? ` ${b.year}` : ""} · ${left}`;
}

// Ad altındaki satır: "Sporcu · Optimist · 13 yaş", "Çalışan · Antrenör", "Aile bireyi · Eş"
export function subLine(m, age) {
  const k = kindOf(m);
  return [KIND_LABEL[k], k === "family" ? m.relation : m.title, age != null ? `${age} yaş` : ""].filter(Boolean).join(" · ");
}

const byDue = (a, b) => (a.due || "9999").localeCompare(b.due || "9999");
const byStart = (a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`);

// Kişiye verilmiş açık işler: görevler (son tarihe göre), gelen planlar (bitti/iptal hariç), arşivlenmemiş notlar
export function todoOf(uid, { tasks = [], plans = [], notes = [] } = {}, today) {
  const mine = (r) => assigneesOf(r).includes(uid);
  return {
    tasks: tasks.filter((t) => !t.done && mine(t)).sort(byDue),
    plans: plans.filter((p) => !p.done && p.status !== "cancelled" && (p.endDate || p.date || "") >= today && mine(p)).sort(byStart),
    notes: notes.filter((n) => !n.archived && mine(n)),
  };
}

// Kişinin eklediği fişler: ödenen, ödeme bekleyen ve bekleyenlerin toplamı (kuruş)
export function receiptsOf(uid, receipts = []) {
  const list = receipts.filter((r) => r.createdByUid === uid);
  const pending = list.filter((r) => payOf(r) === "pending");
  return { list, paid: list.length - pending.length, pending: pending.length, pendingTotal: pending.reduce((s, r) => s + totalOf(r), 0) };
}

// Yoklama (sporcu kartı attendance_YYYY = { "AA-GG": present|absent|excused }): bu yılın sayıları ve son 5 kayıt
export function attendanceOf(a, year) {
  const att = a?.[`attendance_${year}`] || {};
  const c = { present: 0, absent: 0, excused: 0 };
  Object.values(att).forEach((v) => c[v] != null && c[v]++);
  const total = c.present + c.absent + c.excused;
  const last = Object.keys(att)
    .sort()
    .reverse()
    .slice(0, 5)
    .map((k) => ({ day: `${year}-${k}`, st: att[k] }));
  return { ...c, total, pct: total ? Math.round((c.present / total) * 100) : 0, last };
}
