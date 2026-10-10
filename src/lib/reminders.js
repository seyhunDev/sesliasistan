// Plan hatırlatmaları: hangi planın ne zaman hatırlatılacağını hesaplar.
// Hem sunucudaki zamanlanmış görev (netlify/functions) hem uygulama kullanır; bu yüzden "@/" içe aktarması yok.
import { reminderTextOf } from "./notifyText.js";

export const LEADS = [
  { min: 15, label: "15 dk önce" },
  { min: 60, label: "1 saat önce" },
  { min: 1440, label: "1 gün önce" },
];
export const ALLDAY_AT = "08:00"; // tüm gün süren plan o sabah hatırlatılır
export const DEFAULT_TZ = "Europe/Istanbul";

// "Duvar saati" dakikası: yerel tarih ve saati saat diliminden bağımsız tek sayıya çevirir
const wall = (date, time) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
};

// Kullanıcının saat dilimindeki şu anki tarih ve dakika
export function localNow(tz = DEFAULT_TZ, now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, min: wall(date, `${p.hour}:${p.minute}`) };
}

// Hatırlatmanın zamanı: saatli planda başlangıçtan lead dk önce; tüm gün planda o sabah 08:00
export function reminderAt(plan, lead) {
  return plan.time ? wall(plan.date, plan.time) - lead : wall(plan.date, ALLDAY_AT) - (lead >= 1440 ? 1440 : 0);
}

// Aynı hatırlatma iki kez gitmesin: plan bu anahtarla işaretlenir
export const remindKey = (plan, lead) => `${plan.date}T${plan.time || "allday"}|${lead}`;

// Zamanı gelmiş (son windowMin dakika içinde) ve bu kişiye henüz gönderilmemiş hatırlatmalar.
// uid: aynı plan birden fazla kişiye hatırlatılabilir; gönderildi işareti kişi başına (plan.reminded[uid]).
export function dueReminders(plans, { lead, tz = DEFAULT_TZ, now = new Date(), windowMin = 15, uid }) {
  const n = localNow(tz, now).min;
  return plans.filter((p) => {
    const sent = uid ? p.reminded?.[uid] : p.remindedKey;
    if (!p.date || p.status === "cancelled" || p.done || sent === remindKey(p, lead)) return false;
    const at = reminderAt(p, lead);
    return at <= n && at > n - windowMin;
  });
}

// Bildirim metni
export function reminderText(plan, lead) {
  return { ...reminderTextOf(plan, lead), tag: `plan-${plan.id}`, url: "/plans" };
}
