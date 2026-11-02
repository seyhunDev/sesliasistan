// Yarış programı (Seyhun 2026-11-02 "böyle bir program ekleyerek yarış günlerini ve programı oluşturabilmeliyim, yapay zekâ"):
// organizasyonun programı (fotoğraf, PDF ya da yazı) yapay zekâyla okunur → günler: tarih, o günün ilk uyarı işareti (ilk start), yarış var mı,
// kısa not (Kayıt, Ölçüm, Ödül töreni). Onaylanınca Yayın programına (daily, times, off) ve yarışın tarihlerine yazılır.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const hmOf = (v) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(v || "").trim());
  if (!m) return "";
  const t = `${m[1].padStart(2, "0")}:${m[2]}`;
  return HM.test(t) ? t : "";
};
export function cleanProgram(raw) {
  const seen = new Set();
  const days = (Array.isArray(raw?.days) ? raw.days : [])
    .map((d) => ({ day: DAY.test(d?.date || "") ? d.date : "", at: hmOf(d?.first), race: d?.race !== false, note: String(d?.note || "").trim().slice(0, 60) }))
    .filter((d) => d.day && !seen.has(d.day) && seen.add(d.day))
    .map((d) => (d.race ? d : { ...d, at: "" }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 20);
  return { days };
}
// Programdan Yayın planı ve yarış tarihleri: en sık saat her günün saati (daily), farklı olan günler times, yarış olmayan günler off.
// Yarış tarihleri yarışlı ilk ve son gün (yarışsız kayıt/ölçüm günü yarış günü sayılmaz, ama aradaysa off olarak kalır).
export function programPatch(days, plan = {}) {
  const race = days.filter((d) => d.race);
  if (!race.length) return null;
  const count = {};
  for (const d of race) if (d.at) count[d.at] = (count[d.at] || 0) + 1;
  const daily = Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || plan.daily || "";
  const times = Object.fromEntries(race.filter((d) => d.at && d.at !== daily).map((d) => [d.day, d.at]));
  const startDate = race[0].day, endDate = race.at(-1).day;
  const off = days.filter((d) => !d.race && d.day > startDate && d.day < endDate).map((d) => d.day);
  return { plan: { daily, times, off }, startDate, endDate };
}
