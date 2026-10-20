// Yoklama hatırlatması (ana hesap): bugün antrenman planı varsa ve bugünün yoklaması bu uygulamada girilmediyse
// antrenman bitince (saat + süre) bir kez bildirim; bitiş saati yoksa gün batımında.
// Sunucu kulüp projesindeki yoklamayı okuyamaz: yoklama kaydedilince uygulama users/{uid}.attLast = bugün yazar (athletes/mirror.js).
// Sunucudaki zamanlayıcı (netlify/functions/plan-reminders.mjs) ve testler kullanır; "@/" yok.
import { isTraining } from "./trainingLog.js";

const rad = Math.PI / 180;
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
const mins = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
};

// Gün batımı (yerel "HH:MM"): klasik güneş hesabı (Almanac for Computers), dakikalık doğruluk yeter
export function sunsetHM(date, { lat, lon }, tz = "Europe/Istanbul") {
  const [y, mo, d] = date.split("-").map(Number);
  const n = Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
  const lngHour = lon / 15;
  const t = n + (18 - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = (((M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634) % 360) + 360) % 360;
  let RA = (((Math.atan(0.91764 * Math.tan(L * rad)) / rad) % 360) + 360) % 360;
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
  const sinDec = 0.39782 * Math.sin(L * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
  if (cosH < -1 || cosH > 1) return "19:00"; // kutup günü/gecesi: olmaz ama güvenli
  const H = Math.acos(cosH) / rad / 15;
  const ut = (((H + RA - 0.06571 * t - 6.622 - lngHour) % 24) + 24) % 24;
  const at = new Date(Date.UTC(y, mo - 1, d) + ut * 3600e3);
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

// Bugünün antrenmanları (iptal edilenler hariç)
export const trainingsOn = (plans, today) => (plans || []).filter((p) => p.date === today && isTraining(p) && p.status !== "cancelled");

// Bitiş saati: saat + süre; saat ya da süre yoksa gün batımı. Birden çok antrenmanda en geç biten.
export function attRemindAt(plans, today, sunset) {
  const list = trainingsOn(plans, today);
  if (!list.length) return "";
  const ends = list.map((p) => (p.time && !p.allDay && Number(p.durationMin) > 0 ? hm(mins(p.time) + Number(p.durationMin)) : sunset));
  return ends.sort().at(-1);
}

// Gönderilsin mi: saat geldi, bugün gönderilmedi, bugünün yoklaması girilmedi
export function attRemindDue({ plans, today, nowHM, sunset, sent, taken }) {
  if (sent === today || taken === today) return "";
  const at = attRemindAt(plans, today, sunset);
  return at && nowHM >= at ? at : "";
}

// Bildirim metni; dokununca o günün yoklaması açılır
export function attRemindText(plans, today) {
  const list = trainingsOn(plans, today);
  const p = list[0];
  // "Bugünkü antrenmanın yoklamasını almadın (Optimist antrenmanı 16:00)"
  const what = list.length > 1 ? `Bugünkü ${list.length} antrenmanın yoklamasını almadın` : `Bugünkü antrenmanın yoklamasını almadın${p?.title && !/^antre?nman$/i.test(p.title) ? ` (${[p.title, p.time].filter(Boolean).join(" ")})` : ""}`;
  return { title: what, body: "", tag: `att-remind-${today}`, url: `/athletes/attendance?gun=${today}` };
}

// Kulüp sitesinden girilen yoklama: sporcular okununca o güne yoklama yazılmışsa alındı sayılır (athletes/data.js)
// athletes: [{ att: { 2026: { "10-13": "present" } } }]
export function attTakenIn(athletes, date) {
  const y = String(date || "").slice(0, 4);
  const md = String(date || "").slice(5);
  return !!date && (athletes || []).some((a) => a?.att?.[y]?.[md]);
}
