// Ana sayfadaki büyük kartların (Aidatlar, Yarışlar, Instagram, Antrenman günlüğü) yazıları.
// Firestore'a ek okuma yok: aidat ve gönderi özeti ilgili sayfa açılınca bu cihazda saklanır (sa-home-sum),
// yarış bilgisi raceHome.js'in zaten yaptığı okumadan, antrenman bellekteki planlardan gelir.
import { canLog, monthLog } from "./trainingLog";

const KEY = "sa-home-sum";
export function readSum() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}
export function saveSum(part, value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readSum(), [part]: value }));
  } catch {}
}

const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const dayGap = (ms, now) => Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);

// Aidat özeti: { ym, paidCount, count, pending } (aidat sayfası yazar). Her kart: { big, sub, warn }
export function duesTile(sum, ym) {
  if (!sum || sum.ym !== ym) return { big: cap(monthName(ym)), sub: "Kim ödedi, dokun bak" };
  const left = Math.max(0, sum.count - sum.paidCount);
  return {
    big: `${sum.paidCount}/${sum.count}`,
    sub: sum.pending > 0 ? `${sum.pending} banka ödemesi bekliyor` : left > 0 ? `${cap(monthName(ym))} · ${left} kişi ödemedi` : `${cap(monthName(ym))} · hepsi ödedi`,
    warn: sum.pending > 0,
  };
}

// Yarış: nextInfo (raceHome.js) { name, when, left } ve yaklaşan sayısı
export function raceTile(next, up) {
  if (!next) return { big: up > 0 ? `${up} yarış` : "Yarış yok", sub: up > 0 ? "Yaklaşan" : "Yeni yarış ekle" };
  return { big: next.name, sub: [next.when, next.left > 0 ? `${next.left} iş` : "hazır"].join(" · "), warn: next.left > 0 };
}

// Gönderi özeti: { count, last: { title, at } } (Instagram sayfası yazar)
export function postsTile(sum, now = Date.now()) {
  if (!sum?.count) return { big: "Gönderi", sub: "Yeni gönderi hazırla" };
  const g = sum.last?.at ? dayGap(sum.last.at, now) : null;
  const when = g == null ? "" : g <= 0 ? "bugün" : g === 1 ? "dün" : `${g} gün önce`;
  return { big: `${sum.count} gönderi`, sub: [when && `Son: ${when}`, sum.last?.title].filter(Boolean).join(" · ") };
}

// Antrenman: bu ayın antrenman ve günlük sayısı; günü geçmiş, günlüğü yazılmamış antrenman uyarı olur
export function trainingTile(plans, today) {
  const m = monthLog(plans, today.slice(0, 7));
  const missing = plans.filter((p) => canLog(p, today) && !p.log && p.date >= `${today.slice(0, 7)}-01`).length;
  return {
    big: `${m.total} antrenman`,
    sub: missing > 0 ? `${missing} günlük yazılmadı` : m.logged.length ? `${m.logged.length} günlük · ${cap(monthName(today.slice(0, 7)))}` : cap(monthName(today.slice(0, 7))),
    warn: missing > 0,
  };
}
