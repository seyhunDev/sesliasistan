// Ek bildirimler (zamanlanmış Netlify fonksiyonu gönderir). Saf fonksiyonlar: test edilebilir.
//   Doğum günü     (users.birthdayAt, "HH:MM"): o gün doğum günü olanlar
//   Rüzgâr uyarısı (users.windAt, "HH:MM"; users.windKn eşik, varsayılan 20): antrenman/yarış saatinde rüzgâr eşiği geçerse
//   Haftalık özet  (users.weeklyAt, "HH:MM"): pazartesi sabahı haftanın planları ve açık görevler
// Gönderildiği gün users.birthdaySent / windSent / weeklySent olarak yazılır (günde bir kez; saat kontrolü summary.js `due`).
import { addDay, dayItems } from "./summary.js";

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 pazar … 1 pazartesi
const first = (name) => String(name || "").split(" ")[0];

// ---- Doğum günü ----
export function birthdaysOn(list = [], date) {
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return list.filter((b) => Number(b.month) === m && Number(b.day) === d && String(b.name || "").trim());
}

export function birthdayText(list, date) {
  const hits = birthdaysOn(list, date);
  if (!hits.length) return null;
  const y = Number(date.slice(0, 4));
  const one = (b) => {
    const age = Number(b.year) > 1900 && Number(b.year) < y ? y - Number(b.year) : 0;
    return `${String(b.name).trim()}${age ? ` (${age} yaşında)` : ""}`;
  };
  return {
    title: hits.length === 1 ? `Bugün doğum günü: ${first(hits[0].name)}` : `Bugün ${hits.length} doğum günü var`,
    body: `${hits.map(one).join(", ")}. Kutlamayı unutma.`,
  };
}

// ---- Rüzgâr uyarısı ----
export const WIND_KN = 20; // varsayılan eşik (knot)
export const WIND_KNS = [12, 15, 18, 20, 22, 25, 28];
export const WIND_CATS = ["Antrenman", "Yarış"];
const GUST_EXTRA = 10; // sağanak, eşiğin bu kadar üstündeyse de uyarır

// Bugünkü antrenman ve yarış planları (çok günlü yarışlar dahil)
export const windPlans = (plans, today) => dayItems({ plans, date: today }).plans.filter((p) => WIND_CATS.includes(p.cat || p.category));

// Bir planın saatlerindeki en sert rüzgâr ve sağanak (rows: o günün saatleri [{ hh: "07", wind, gust }]).
// Saatli planda planın 1 saat öncesinden 3 saat sonrasına, saatsiz planda 08:00–19:00 arasına bakılır. Saat yoksa null.
export function planWind(rows = [], p) {
  const h0 = p.time ? Number(p.time.slice(0, 2)) : 8;
  const from = p.time ? h0 - 1 : 8;
  const to = p.time ? h0 + 3 : 19;
  const win = rows.filter((r) => Number(r.hh) >= from && Number(r.hh) <= to);
  if (!win.length) return null;
  return { wind: Math.max(...win.map((r) => r.wind)), gust: Math.max(...win.map((r) => r.gust)) };
}

// Eşik geçildi mi: rüzgâr eşiği ya da sağanak eşik+10
export const overWind = (x, kn = WIND_KN) => !!x && (x.wind >= (Number(kn) || WIND_KN) || x.gust >= (Number(kn) || WIND_KN) + GUST_EXTRA);

// Bugünkü antrenman/yarış planlarında eşik geçilirse uyarı metni; geçilmezse null.
export function windAlert({ rows = [], plans = [], today, kn = WIND_KN }) {
  const lim = Number(kn) || WIND_KN;
  const hits = [];
  for (const p of windPlans(plans, today)) {
    const x = planWind(rows, p);
    if (overWind(x, lim)) hits.push({ p, ...x });
  }
  if (!hits.length) return null;
  const line = ({ p, wind, gust }) => `${p.time ? `${p.time} ` : ""}${p.title}: rüzgâr ${wind} kn, sağanak ${gust} kn`;
  return { title: "Rüzgâr uyarısı", body: `${hits.map(line).join("\n")}\nEşik ${lim} kn. Denize çıkmadan kontrol et.` };
}

// ---- Haftalık özet ----
export const isMonday = (date) => weekday(date) === 1;

export function weeklyText({ plans = [], tasks = [], today, uid, name }) {
  const days = Array.from({ length: 7 }, (_, i) => addDay(today, i));
  const end = days[6];
  const ps = plans
    .filter((p) => p.date <= end && (p.endDate || p.date) >= today)
    .sort((a, b) => `${a.date}${a.time || "99"}`.localeCompare(`${b.date}${b.time || "99"}`));
  const open = tasks.filter((t) => !(t.done || t.doneBy?.[uid]));
  const due = open.filter((t) => t.due && t.due >= today && t.due <= end);
  const late = open.filter((t) => t.due && t.due < today);
  const head = [`${ps.length} plan`, `${due.length} görev`, late.length && `${late.length} geciken`].filter(Boolean).join(" · ");
  const shown = ps.slice(0, 4).map((p) => `${DAYS[weekday(p.date < today ? today : p.date)]} ${p.time ? `${p.time} ` : ""}${p.title}`);
  const more = ps.length > 4 ? [`ve ${ps.length - 4} plan daha`] : [];
  return {
    title: `Bu hafta${first(name) ? `, ${first(name)}` : ""}`,
    body: ps.length || due.length || late.length ? [head, ...shown, ...more].join("\n") : "Bu hafta için plan ya da görev yok",
  };
}

// Open-Meteo saatlik yanıtından bir günün saatleri: [{ hh, wind, gust }]
export function windRows(j, date) {
  const h = j?.hourly;
  if (!h?.time) return [];
  return h.time
    .map((t, i) => ({ t, wind: Math.round(h.wind_speed_10m[i]), gust: Math.round(h.wind_gusts_10m[i]) }))
    .filter((r) => r.t.startsWith(date))
    .map((r) => ({ hh: r.t.slice(11, 13), wind: r.wind, gust: r.gust }));
}

export const windUrl = (p) =>
  `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
    latitude: String(p.lat),
    longitude: String(p.lon),
    timezone: "Europe/Istanbul",
    wind_speed_unit: "kn",
    forecast_days: "1",
    hourly: "wind_speed_10m,wind_gusts_10m",
  })}`;
