// iPhone ana ekran widget'ının planları (mobil/ios VeloraWidget/SiradakiWidget.swift): bugünden sonraki, bitmemiş ve
// iptal edilmemiş, bu kişiye ait (sorumlu, ana hesap ya da ekleyen) ilk 8 plan. Widget geçenleri kendisi düşer.
import { planRecipients } from "./reminders.js";

export function widgetPlans(plans, { uid, ownerId, today }) {
  return (plans || [])
    .filter((p) => p?.date && (p.endDate || p.date) >= today && !p.done && p.status !== "cancelled" && (planRecipients(p, ownerId).includes(uid) || p.createdByUid === uid))
    .map((p) => ({ title: String(p.title || "Plan").slice(0, 60), date: p.date < today ? today : p.date, time: p.date < today ? "" : p.time || "", important: !!p.important }))
    .sort((a, b) => `${a.date} ${a.time || "00:00"}`.localeCompare(`${b.date} ${b.time || "00:00"}`))
    .slice(0, 8);
}
