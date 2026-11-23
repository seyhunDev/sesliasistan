// Yönet'teki çalışma o günün antrenmanı olarak (Seyhun 2026-11-23 "antrenmanın bilgi ekranı burası olacak; o çalışmayı o günün
// antrenmanı olarak ekleyeceğim"): kanalın açılış ve kapanış saati, kanala katılanlar (teknelerin yelken no'su ya da adı sporculara
// eşlenir, eşlenenler yoklamada "geldi"), verilen start sayısı ve kanal (tekne izi). Antrenman planının `ant` alanına yazılır.
const TZ = "Europe/Istanbul";
export const hmOf = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const dayOf = (ms) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: TZ });
const norm = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const digits = (s) => String(s || "").replace(/\D/g, "");

// Kanala katılan tekneler (cihaz başına bir kez): [{ dev, sail, name }]
export function crewOf(boats, ch) {
  const seen = new Set();
  const out = [];
  for (const b of boats || []) {
    if (!ch || b.ch !== ch || seen.has(b.id)) continue;
    seen.add(b.id);
    out.push({ dev: b.id, sail: String(b.sail || "").trim(), name: String(b.name || "").trim() });
  }
  return out;
}

// Tekne → sporcu: önce yelken no (rakamları aynı), sonra tam ad, sonra yalnız ad bir sporcuya uyuyorsa. Dönüş sporcu id ya da ""
export function athleteOf(c, athletes) {
  const list = athletes || [];
  const sd = digits(c.sail);
  if (sd) {
    const a = list.find((x) => digits(x.sailNo) === sd);
    if (a) return a.id;
  }
  const n = norm(c.name);
  if (!n) return "";
  const full = list.filter((x) => norm(x.studentName) === n);
  if (full.length === 1) return full[0].id;
  if (n.length < 3) return "";
  const first = list.filter((x) => norm(x.studentName).split(" ")[0] === n.split(" ")[0] && (!n.includes(" ") || norm(x.studentName).startsWith(n)));
  return first.length === 1 ? first[0].id : "";
}

// Kaydedilecek özet. kanal: { id, name, at, end, starts }, boats: bilgiTekne listesi, athletes: aktif sporcular
export function antOzet({ kanal, boats, athletes, now = Date.now() }) {
  const at = Number(kanal?.at) || now;
  const end = Number(kanal?.end) || now;
  const crew = crewOf(boats, kanal?.id || "");
  const present = [];
  const names = [];
  for (const c of crew) {
    const id = athleteOf(c, athletes);
    const a = id && (athletes || []).find((x) => x.id === id);
    if (id && !present.includes(id)) present.push(id);
    const name = a ? a.studentName : c.name || c.sail;
    if (name && !names.includes(name)) names.push(name);
  }
  const starts = [...new Set((kanal?.starts || []).filter((x) => Number.isFinite(x)))].length;
  return { date: dayOf(at), at, end, time: hmOf(at), endTime: hmOf(end), starts, crew: names.slice(0, 40), present, kanal: kanal?.id || "" };
}

// Plan'a yazılan alan (temiz): { at, end, starts, crew, kanal }
export const antField = (o) => ({ at: o.at, end: o.end, starts: o.starts, crew: o.crew, kanal: o.kanal });

// Günlük listesindeki kısa satır: "15:10–17:05 · 6 sporcu · 4 start"
export function antLine(ant) {
  if (!ant?.at) return "";
  const n = ant.crew?.length || 0;
  return [`${hmOf(ant.at)}–${hmOf(ant.end || ant.at)}`, n ? `${n} sporcu` : "", ant.starts ? `${ant.starts} start` : ""].filter(Boolean).join(" · ");
}
