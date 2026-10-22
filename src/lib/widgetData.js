// iPhone widget'larının verisi (mobil/ios VeloraWidget/*.swift; uygulama yazar, widget'lar okur). Yalnız iPhone uygulamasında
// gönderilir (features/ios/WidgetFeed.jsx); Firestore'a ek okuma yok, bellekte ya da bu cihazda saklı olandan gelir.
import { planRecipients } from "./reminders.js";

// Planlar: bugünden sonraki, bitmemiş ve iptal edilmemiş, bu kişiye ait (sorumlu, ana hesap ya da ekleyen) ilk 8 plan. Widget geçenleri kendisi düşer.
export function widgetPlans(plans, { uid, ownerId, today }) {
  return (plans || [])
    .filter((p) => p?.date && (p.endDate || p.date) >= today && !p.done && p.status !== "cancelled" && (planRecipients(p, ownerId).includes(uid) || p.createdByUid === uid))
    .map((p) => ({ title: String(p.title || "Plan").slice(0, 60), date: p.date < today ? today : p.date, time: p.date < today ? "" : p.time || "", important: !!p.important }))
    .sort((a, b) => `${a.date} ${a.time || "00:00"}`.localeCompare(`${b.date} ${b.time || "00:00"}`))
    .slice(0, 8);
}

const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : +new Date(t || 0) || 0);

// Mesajlar: okunmamış sohbetler (sessize alınmamış, son mesaj başkasından), en yeni 2'si: { unread, msgs: [{ from, text }] }
export function widgetMsgs(chats, uid) {
  const list = (chats || []).filter((c) => c.unread > 0 && !c.mutedByMe && c.last && !c.last.deleted && c.last.by !== uid);
  return {
    unread: list.reduce((a, c) => a + c.unread, 0),
    msgs: list
      .sort((a, b) => ms(b.last.at) - ms(a.last.at))
      .slice(0, 2)
      .map((c) => ({ from: String(c.title || "").slice(0, 30), text: String(c.last.text || "").slice(0, 80) })),
  };
}

// Hesap: ana sayfadaki Hesap satırının aynısı (features/home/TeamMoney.jsx useMoney().bank): { big, label, sub }
export const widgetMoney = (bank) => (bank ? { big: bank.big, label: bank.label, sub: bank.sub || "" } : null);

// Aidat: bu ayın özeti (aidat sayfası ve ana sayfa bu cihazda saklar, homeTiles readSum().dues): { paid, count }
export const widgetDues = (sum, ym) => (sum && sum.ym === ym && sum.count > 0 ? { paid: sum.paidCount, count: sum.count } : null);
