// iPhone widget'larının verisi (mobil/ios VeloraWidget/*.swift; uygulama yazar, widget'lar okur). Yalnız iPhone uygulamasında
// gönderilir (features/ios/WidgetFeed.jsx); Firestore'a ek okuma yok, bellekte ya da bu cihazda saklı olandan gelir.
import { planRecipients } from "./reminders.js";
import { isTraining } from "./trainingLog.js";

// Planlar: bugünden sonraki, bitmemiş ve iptal edilmemiş, bu kişiye ait (sorumlu, ana hesap ya da ekleyen) ilk 8 plan. Widget geçenleri kendisi düşer.
const upcoming = (plans, { uid, ownerId, today }) =>
  (plans || []).filter((p) => p?.date && (p.endDate || p.date) >= today && !p.done && p.status !== "cancelled" && (planRecipients(p, ownerId).includes(uid) || p.createdByUid === uid));
const when = (p) => `${p.date} ${p.time || "00:00"}`;

export function widgetPlans(plans, { uid, ownerId, today }) {
  return upcoming(plans, { uid, ownerId, today })
    .map((p) => ({ title: String(p.title || "Plan").slice(0, 60), date: p.date < today ? today : p.date, time: p.date < today ? "" : p.time || "", important: !!p.important }))
    .sort((a, b) => `${a.date} ${a.time || "00:00"}`.localeCompare(`${b.date} ${b.time || "00:00"}`))
    .slice(0, 8);
}

// Antrenmanlar: bugünkü ve sıradaki antrenman planları, en çok 3 (dokununca /training/day?id=… Süre ekranı): [{ id, title, date, time, place }].
// Ana sayfadaki gibi kime atandığına bakılmaz (antrenman sporculara atanır; Seyhun 2026-10-24: "yarın antrenman var, widget yok diyor").
// Bugünkü antrenman bitirilene (done) kadar gün boyu kalır; widget geçmiş günleri kendisi düşer.
export function widgetTrainings(plans, { today }) {
  return (plans || [])
    .filter((p) => isTraining(p) && p?.date >= today && !p.done && p.status !== "done" && p.status !== "cancelled")
    .sort((a, b) => when(a).localeCompare(when(b)))
    .slice(0, 3)
    .map((p) => ({ id: p.id, title: String(p.title || "Antrenman").slice(0, 40), date: p.date, time: p.time || "", place: String(p.place || "").slice(0, 30) }));
}
export const widgetTraining = (plans, opts) => widgetTrainings(plans, opts)[0] || null;

// Hesap: ana sayfadaki Hesap satırının aynısı (features/home/TeamMoney.jsx useMoney().bank): { big, label, sub }
export const widgetMoney = (bank) => (bank ? { big: bank.big, label: bank.label, sub: bank.sub || "" } : null);

// Aidat: bu ayın özeti (aidat sayfası ve ana sayfa bu cihazda saklar, homeTiles readSum().dues): { paid, count }
export const widgetDues = (sum, ym) => (sum && sum.ym === ym && sum.count > 0 ? { paid: sum.paidCount, count: sum.count } : null);

// Yarış günü (Seyhun 2026-10-27, örnek yaris-yeri-hava, ana sayfa #845 ile aynı kural): bugünü kapsayan yarışın yeri ev yerinden (hava yeri)
// 10 km'den uzaksa büyük widget'ta büyük rüzgâr ve grafik yarışın yerinin, ev yeri altta tek satır. r: homeTiles awayRace; at: yarışın yeri
// (raceWeather.loadRaceDay: { place, lat, lon }); home: getPlace(). Widget start–end dışında yarışı kendisi düşer.
export function widgetRace(r, at, home) {
  if (!r || !at || !Number.isFinite(at.lat) || !Number.isFinite(at.lon)) return null;
  if (home && Number.isFinite(home.lat) && Number.isFinite(home.lon) && kmBetween(at, home) < 10) return null;
  const place = String(at.place || r.district || "").split(",")[0].trim();
  return { name: String(r.name || "Yarış").slice(0, 40), place: place.slice(0, 30), lat: at.lat, lon: at.lon, start: r.startDate, end: r.endDate || r.startDate };
}
function kmBetween(a, b) {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
