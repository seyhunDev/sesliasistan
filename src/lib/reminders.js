// Plan hatırlatmaları: hangi planın ne zaman hatırlatılacağını hesaplar.
// Hem sunucudaki zamanlanmış görev (netlify/functions) hem uygulama kullanır; bu yüzden "@/" içe aktarması yok.
import { reminderTextOf } from "./notifyText.js";

export const LEADS = [
  { min: 15, label: "15 dk önce" },
  { min: 30, label: "30 dk önce" },
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

// Zamanı gelmiş ve bu kişiye henüz gönderilmemiş hatırlatmalar.
// Zamanlayıcı bir turu kaçırırsa hatırlatma kaybolmasın: saatli planda plan başlayana kadar (en çok 60 dk) geç de gönderilir;
// tüm gün ve "1 gün önce" hatırlatmasında 60 dk. Gönderildi işareti tekrarı önler.
// uid: aynı plan birden fazla kişiye hatırlatılabilir; gönderildi işareti kişi başına (plan.reminded[uid]).
export const remindWindow = (lead) => Math.max(15, Math.min(Number(lead) || 0, 60));
export function dueReminders(plans, { lead, tz = DEFAULT_TZ, now = new Date(), windowMin = remindWindow(lead), uid }) {
  const n = localNow(tz, now).min;
  return plans.filter((p) => {
    const sent = uid ? p.reminded?.[uid] : p.remindedKey;
    if (!p.date || p.status === "cancelled" || p.done || sent === remindKey(p, lead)) return false;
    const at = reminderAt(p, lead);
    if (p.time && lead < 1440 && wall(p.date, p.time) <= n) return false; // plan başladı: geç hatırlatma anlamsız
    return at <= n && at > n - windowMin;
  });
}

// Bildirim metni. Geç gönderilirse ("1 saat sonra" yerine) kalan gerçek süre yazılır.
export function reminderText(plan, lead, { tz = DEFAULT_TZ, now = new Date() } = {}) {
  let use = lead;
  if (plan.time && lead < 1440) {
    const left = wall(plan.date, plan.time) - localNow(tz, now).min;
    if (left > 0 && left < 60 && left < lead - 5) use = Math.max(5, Math.round(left / 5) * 5);
  }
  // Etiket atama/değişiklik bildiriminden ("plan-<id>") ayrı: aynı etiket zilde okunmamış atama bildiriminin yerine geçiyor,
  // simgedeki sayı artmıyordu. Aynı planın sonraki hatırlatması yine öncekinin yerine geçer.
  return { ...reminderTextOf(plan, use), tag: `remind-${plan.id}`, url: `/?open=plan:${plan.id}` }; // dokununca o plan açılır
}

// Plana özel hatırlatma (plan formundaki "Hatırlat"): dakika. Yoksa null (kişinin kendi ayarı geçerli), 0 = bu plan hatırlatılmaz.
export function planRemind(p) {
  if (p?.remind === undefined || p?.remind === null || p.remind === "") return null;
  const n = Number(p.remind);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 2880) : null;
}
// Plana özel hatırlatma kime gider: sorumlular (people) ve ana hesap (kulübün sahibi). Fitness planı yalnız sporcusuna.
export function planRecipients(p, ownerId) {
  if (p?.fit?.for) return [p.fit.for];
  return [...new Set([...(p?.people || []), ownerId].filter(Boolean))];
}
// "Hatırlat" seçenekleri (plan formu): Yok + LEADS
export const REMIND_OPTS = [{ min: 0, label: "Yok" }, ...LEADS.map((l) => ({ min: l.min, label: l.label.replace(" önce", "") }))];
export const remindLabel = (min) => (min === 0 ? "hatırlatma yok" : `${(LEADS.find((l) => l.min === min) || { label: min % 60 ? `${min} dk önce` : `${min / 60} saat önce` }).label} hatırlat`);

// Cümledeki "… önce hatırlat" isteği (dakika): "yarım saat önce hatırlat" 30, "1 saat kala hatırlat" 60, "bir gün önce hatırlat" 1440,
// "hatırlatma olmasın" 0. Yoksa null.
const NUM = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, on: 10, yirmi: 20, otuz: 30, kırk: 40, kırkbeş: 45, "kırk beş": 45 };
export function remindOf(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (/hat[ıi]rlatma (olmas[ıi]n|yok|gönderme|istemiyorum)|hat[ıi]rlatmas[ıi]n/.test(t)) return 0;
  const m = /(yarım saat|çeyrek saat|(\d+|bir|iki|üç|dört|beş|on|yirmi|otuz|kırk beş|kırk)\s*(dk|dakika|saat|gün))\s*(önceden|önce|evvel|kala)?\s*hat[ıi]rlat/.exec(t);
  if (!m) return null;
  if (m[1] === "yarım saat") return 30;
  if (m[1] === "çeyrek saat") return 15;
  const n = /^\d+$/.test(m[2]) ? Number(m[2]) : NUM[m[2]] || 1;
  const v = m[3] === "gün" ? n * 1440 : m[3] === "saat" ? n * 60 : n;
  return v > 0 && v <= 2880 ? v : null;
}
// Taslak listesine uygular: yalnız planlara (plan yoksa olduğu gibi)
export function applyRemind(items, text) {
  const r = remindOf(text);
  if (r === null) return items;
  return items.map((x) => (x.type === "plan" && x.remind == null ? { ...x, remind: r } : x));
}
