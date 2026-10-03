// Planları iPhone/Mac takvimine abonelik olarak vermek için iCalendar (.ics) metni. Saf fonksiyonlar (test edilir).
// Türkiye yaz saati uygulamadığı için saatler UTC+3 kabul edilip UTC'ye çevrilir.
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const day = (s) => s.replace(/-/g, "");
const nextDay = (s) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
// "2026-10-06" + "16:00" (İstanbul) → "20261006T130000Z"
export function utcStamp(date, time, addMin = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, h - 3, mi + addMin));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
}
// 75 bayttan uzun satırlar katlanır (RFC 5545; Türkçe harfler 2 bayt, harf ortadan bölünmez)
const fold = (line) => {
  const out = [];
  let cur = "";
  let n = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (n + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      n = 0;
    }
    cur += ch;
    n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
};

export function icsOf(plans, { name = "Sesli Asistan", now = new Date() } = {}) {
  const stamp = `${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const ev = plans
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date || ""))
    .map((p) => {
      const timed = /^\d{2}:\d{2}$/.test(p.time || "") && !p.endDate;
      const lines = [
        "BEGIN:VEVENT",
        `UID:${p.id}@sesliasistan`,
        `DTSTAMP:${stamp}`,
        timed ? `DTSTART:${utcStamp(p.date, p.time)}` : `DTSTART;VALUE=DATE:${day(p.date)}`,
        timed ? `DTEND:${utcStamp(p.date, p.time, Number(p.durationMin) || 60)}` : `DTEND;VALUE=DATE:${day(nextDay(p.endDate || p.date))}`,
        `SUMMARY:${esc(p.status === "cancelled" ? `İPTAL: ${p.title}` : p.title)}`,
        ...(p.place ? [`LOCATION:${esc(p.place)}`] : []),
        ...(p.cat && p.cat !== "Genel" ? [`CATEGORIES:${esc(p.cat)}`] : []),
        ...(p.status === "cancelled" ? ["STATUS:CANCELLED"] : []),
        "END:VEVENT",
      ];
      return lines.map(fold).join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sesli Asistan//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Europe/Istanbul", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", ...ev, "END:VCALENDAR", ""].join("\r\n");
}
