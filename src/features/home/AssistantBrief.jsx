import { planState } from "@/lib/agenda";
import { dayItems } from "@/lib/summary";
import { todayStr } from "@/lib/utils/format";

// ["2 plan", "1 görev"] → "2 plan ve 1 görev"
const join = (xs) => (xs.length < 2 ? xs[0] || "" : `${xs.slice(0, -1).join(", ")} ve ${xs.at(-1)}`);

// Asistan sahnesindeki selamın yanındaki tek cümlelik gün özeti:
// "Bugün 2 plan ve 1 görev var. 1 görev gecikmiş ve 2 sohbette okunmamış mesaj var."
export function briefLine({ plans = [], tasks = [], uid, unread = 0, now = new Date() }) {
  const d = dayItems({ plans, tasks, date: todayStr(), uid, late: true });
  const left = d.plans.filter((p) => planState(p, now) !== "past").length;
  const items = [left && `${left} plan`, d.due.length && `${d.due.length} görev`].filter(Boolean);
  const extra = [d.late.length && `${d.late.length} görev gecikmiş`, unread && `${unread} sohbette okunmamış mesaj var`].filter(Boolean);
  return [items.length ? `Bugün ${join(items)} var.` : "Bugün için plan ya da görev yok.", extra.length ? `${join(extra)}.` : ""].filter(Boolean).join(" ");
}
