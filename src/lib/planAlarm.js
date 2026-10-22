// Plan alarmı (Seyhun 2026-10-22: "antrenmanın bir saat öncesine alarm kur"): planın `alarm` alanı başlangıçtan kaç dakika
// önce çalacağı (0 = tam saatinde; alan yoksa alarm yok). Alarm yalnız iPhone uygulamasında çalar: iOS 26'da saat alarmı
// (AlarmKit, sessiz modda da), eski iOS'ta sesli bildirim (mobil/ios VeloraPlugin.alarmSync). Kurma işi src/features/ios/IosBridge.jsx.
// Bildirim hatırlatmasından (remind, lib/reminders.js) ayrıdır; ikisi birlikte olabilir.
import { ALLDAY_AT, leadMin, planRecipients } from "./reminders.js";

export const ALARM_OPTS = [
  { min: null, label: "Yok" },
  { min: 0, label: "Saatinde" },
  { min: 15, label: "15 dk" },
  { min: 30, label: "30 dk" },
  { min: 60, label: "1 saat" },
  { min: 1440, label: "1 gün" },
];
export const okAlarm = (v) => Number.isFinite(v) && v >= 0 && v <= 2880;
export const alarmText = (v) => (!okAlarm(v) ? "Yok" : v === 0 ? "Saatinde" : `${ALARM_OPTS.find((o) => o.min === v)?.label || (v % 60 ? `${v} dk` : `${v / 60} saat`)} önce`);
export const alarmLabel = (v) => (!okAlarm(v) ? "alarm yok" : v === 0 ? "saatinde alarm" : `${alarmText(v)} alarm`);

// Cümledeki alarm isteği: dakika (0 tam saatinde), -1 alarmı kaldır, istek yoksa null.
// "1 saat önce alarm kur", "bir saat öncesine alarm kur", "alarmı yarım saat önceye kur", "antrenmana alarm kur" (0), "alarmı kaldır" (-1)
const AMOUNT = "(yarım saat|çeyrek saat|(\\d+|bir|iki|üç|dört|beş|on|yirmi|otuz|kırk beş|kırk)\\s*(dk|dakika|saat|gün))\\s*(?:önceden|öncesine|önceye|önce|evvel|kala)";
const BEFORE = new RegExp(`${AMOUNT}\\s+(?:\\S+\\s+)?alarm`);
const AFTER = new RegExp(`alarm\\S*\\s+(?:\\S+\\s+)?${AMOUNT}`);
export function alarmOf(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (!/alarm/.test(t)) return null;
  if (/alarm\S*\s+(kaldır|sil|iptal|kapat|olmasın|istemiyorum)|alarm (kurma|olmasın)/.test(t)) return -1;
  const m = BEFORE.exec(t) || AFTER.exec(t);
  if (m) {
    const v = leadMin(m);
    return v > 0 && v <= 2880 ? v : null;
  }
  return /alarm\S*\s+(kur|koy|ayarla|ekle)/.test(t) ? 0 : null;
}
// Taslak listesine uygular: yalnız planlara
export function applyAlarm(items, text) {
  const a = alarmOf(text);
  if (a === null || a < 0) return items;
  return items.map((x) => (x.type === "plan" && x.alarm == null ? { ...x, alarm: a } : x));
}

// Alarmın anı (telefonun saati): saatli planda başlangıçtan önce; tüm gün planda o sabah (1 gün önce ise önceki sabah)
export function alarmAt(plan) {
  if (!okAlarm(plan?.alarm) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.date || "")) return null;
  const time = /^\d{2}:\d{2}$/.test(plan.time || "") ? plan.time : ALLDAY_AT;
  const start = new Date(`${plan.date}T${time}:00`).getTime();
  return start - (plan.time ? plan.alarm : plan.alarm >= 1440 ? 1440 : 0) * 60000;
}

// Bu telefonda kurulacak alarmlar: planın sorumlusu ya da ana hesap olan kişi için, ileriye dönük 30 gün, en çok 40
export function alarmItems(plans, { uid, ownerId, now = Date.now() } = {}) {
  return (plans || [])
    .filter((p) => okAlarm(p?.alarm) && !p.done && p.status !== "cancelled" && (planRecipients(p, ownerId).includes(uid) || p.createdByUid === uid))
    .map((p) => ({ p, at: alarmAt(p) }))
    .filter(({ at }) => at && at > now && at < now + 30 * 86400000)
    .sort((a, b) => a.at - b.at)
    .slice(0, 40)
    .map(({ p, at }) => {
      const title = `${p.title || "Plan"}${p.time ? ` · ${p.time}` : ""}`.slice(0, 80);
      return { key: `${p.id}|${at}|${title}`, at, title };
    });
}
