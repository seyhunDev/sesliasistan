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
