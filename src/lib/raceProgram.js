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
// Günün program maddeleri (Seyhun 2026-11-02 "antrenör toplantısı, her gün ilk start, son gün son start saati"): { at "HH:MM" ya da "", text }, saat sırasıyla
export function cleanItems(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ at: hmOf(x?.at), text: String(x?.text || "").replace(/\s+/g, " ").trim().slice(0, 40) }))
    .filter((x) => x.text)
    .slice(0, 12)
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => (a.at && b.at ? a.at.localeCompare(b.at) : 0) || a.i - b.i)
    .map(({ at, text }) => ({ at, text }));
}
// Plan içindeki program: { "2026-11-08": [{ at, text }] } (en çok 20 gün)
export function cleanAgenda(a) {
  return Object.fromEntries(
    Object.entries(a && typeof a === "object" ? a : {})
      .filter(([d]) => DAY.test(d))
      .map(([d, v]) => [d, cleanItems(v)])
      .filter(([, v]) => v.length)
      .sort((x, y) => x[0].localeCompare(y[0]))
      .slice(0, 20),
  );
}
// Ekrandaki program (Seyhun 2026-11-02 "yarış öncesi ise bütün programı, o günde ise o gün ne varsa; süresi geçtiyse soluklaştır"):
// bugün programda varsa { mode: "day", rows: [{ at, text, state }] } (state "done" saati geçti, "next" sıradaki); bugün ilk günden önceyse
// { mode: "all", days: [{ day, rows }] }; yoksa null. hm şimdiki saat "HH:MM" (Türkiye)
export function agendaView(agenda, today, hm) {
  const a = cleanAgenda(agenda);
  const days = Object.keys(a);
  if (!days.length) return null;
  if (a[today]) {
    const rows = a[today].map((x) => ({ ...x, state: "" }));
    let last = -1;
    rows.forEach((x, i) => {
      if (x.at && x.at <= hm) last = i;
    });
    rows.forEach((x, i) => {
      if (i <= last) x.state = "done";
    });
    const nx = rows.find((x) => x.state !== "done");
    if (nx) nx.state = "next";
    return { mode: "day", rows };
  }
  if (today < days[0]) return { mode: "all", days: days.map((day) => ({ day, rows: a[day] })) };
  return null;
}
export function cleanProgram(raw) {
  const seen = new Set();
  const days = (Array.isArray(raw?.days) ? raw.days : [])
    .map((d) => ({ day: DAY.test(d?.date || "") ? d.date : "", at: hmOf(d?.first), race: d?.race !== false, note: String(d?.note || "").trim().slice(0, 60), items: cleanItems(d?.items) }))
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
  const agenda = cleanAgenda(Object.fromEntries(days.map((d) => [d.day, d.items || []])));
  return { plan: { daily, times, off, agenda }, startDate, endDate };
}

// Elle düzenleme (Seyhun 2026-11-04 "Program sekmesi çok karışık, yeniden tasarla"): bir günün maddeleri değişir (boş kalan gün düşer)
export function agendaPut(agenda, day, items) {
  const a = { ...cleanAgenda(agenda) };
  const v = DAY.test(day || "") ? cleanItems(items) : [];
  if (v.length) a[day] = v;
  else delete a[day];
  return cleanAgenda(a);
}
// İlk start saati değişince programdaki "İlk start" / "İlk uyarı işareti" maddesi de aynı saate geçer (canlı ekranda iki ayrı saat görünmesin)
export const FIRST_ITEM = /[iİI]lk\s*(start|uyar)/i;
export function agendaFirst(agenda, days, at) {
  const a = cleanAgenda(agenda);
  if (!HM.test(at || "")) return a;
  for (const d of days) if (a[d]) a[d] = cleanItems(a[d].map((x) => (FIRST_ITEM.test(x.text) ? { ...x, at } : x)));
  return a;
}
// Gün ekle / kaldır (Program sekmesi): yarışın tarihleri. Yarışın tarihi yoksa bugün ve yarın; en çok 10 gün. Yalnız ilk ya da son gün kalkar.
const plusDay = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export function datesAdd(start, end, today) {
  if (!DAY.test(start || "")) return DAY.test(today || "") ? { startDate: today, endDate: plusDay(today, 1) } : null;
  const e = DAY.test(end || "") && end >= start ? end : start;
  const next = plusDay(e, 1);
  return Math.round((Date.parse(next) - Date.parse(start)) / 864e5) >= 10 ? null : { startDate: start, endDate: next };
}
export function datesDrop(start, end, day) {
  if (!DAY.test(start || "")) return null;
  const e = DAY.test(end || "") && end >= start ? end : start;
  if (e === start) return null;
  if (day === start) return { startDate: plusDay(start, 1), endDate: e };
  if (day === e) return { startDate: start, endDate: plusDay(e, -1) };
  return null;
}
