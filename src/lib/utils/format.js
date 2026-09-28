export const TL = (n) => (n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export const initials = (name = "") =>
  name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const D = (s) => new Date(`${s}T00:00`);

export const todayStr = () => fmt(new Date());
export const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export function rel(s) {
  const n = Math.round((D(s) - D(todayStr())) / 864e5);
  if (n === 0) return "Bugün";
  if (n === 1) return "Yarın";
  if (n === -1) return "Dün";
  return D(s).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
}

export const short = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export const fdate = (s) =>
  D(s).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
};

// Plan tarih etiketi: aralık varsa "3 Eki – 7 Eki", yoksa "Yarın · 09:00"
export const when = (p) =>
  p.endDate && p.endDate !== p.date ? `${short(p.date)} – ${short(p.endDate)}` : `${rel(p.date)} · ${p.time || "Tüm gün"}`;

export const isUpcoming = (p) => (p.endDate || p.date) >= todayStr();
export const byStart = (a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`);
