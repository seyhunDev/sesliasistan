// Asistanın son oturumları bu cihazda (localStorage, hesap başına). Sunucuya yalnız istekle birlikte kısa özet gider.
import { addSession } from "./convoContext";

const key = (uid) => `sa-asst-sessions:${uid || "x"}`;
export function loadSessions(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(key(uid)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveSession(uid, s) {
  if (!s) return;
  try {
    localStorage.setItem(key(uid), JSON.stringify(addSession(loadSessions(uid), s)));
  } catch {}
}

// Asistan ekranında eski sohbetler (Ayarlar › Asistan › Geçmiş sohbetler). Gizliyken yalnız ekranda görünmez; yapay
// zekanın hafızası (son oturumlar) sürer. Bu cihazda saklanır, varsayılan açık (Seyhun, 2026-10-21)
const SHOWN = "sa-asst-past-shown";
export function pastShown() {
  try {
    return localStorage.getItem(SHOWN) !== "0";
  } catch {
    return true;
  }
}
export function setPastShown(on) {
  try {
    localStorage.setItem(SHOWN, on ? "1" : "0");
  } catch {}
}
// Geçmişi tamamen sil: bu cihazdaki tüm oturumlar ve açık asistanın az önceki konuşması (hafıza da gider)
export const PAST_CLEAR = "sa-past-clear";
export function clearSessions() {
  let n = 0;
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith("sa-asst-sessions:")) continue;
      n += loadSessions(k.slice("sa-asst-sessions:".length)).length;
      localStorage.removeItem(k);
    }
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PAST_CLEAR));
  return n;
}
