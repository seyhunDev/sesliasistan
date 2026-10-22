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

// Antrenman: bugünkü ya da sıradaki antrenman planı (dokununca /training/day?id=… Süre ekranı): { id, title, date, time, place }
export function widgetTraining(plans, { uid, ownerId, today }) {
  const p = upcoming(plans, { uid, ownerId, today })
    .filter((x) => isTraining(x) && x.date >= today)
    .sort((a, b) => when(a).localeCompare(when(b)))[0];
  return p ? { id: p.id, title: String(p.title || "Antrenman").slice(0, 40), date: p.date, time: p.time || "", place: String(p.place || "").slice(0, 30) } : null;
}

// Hesap: ana sayfadaki Hesap satırının aynısı (features/home/TeamMoney.jsx useMoney().bank): { big, label, sub }
export const widgetMoney = (bank) => (bank ? { big: bank.big, label: bank.label, sub: bank.sub || "" } : null);

// Aidat: bu ayın özeti (aidat sayfası ve ana sayfa bu cihazda saklar, homeTiles readSum().dues): { paid, count }
export const widgetDues = (sum, ym) => (sum && sum.ym === ym && sum.count > 0 ? { paid: sum.paidCount, count: sum.count } : null);
