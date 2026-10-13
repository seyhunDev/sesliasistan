// Adım adım antrenman ekranı (FitGuided) açıkken ana asistana söylenenler ekrana gider:
// ekran açılınca işleyiciyi kaydeder, kapanınca siler. İşleyici ({ op, k }) → söylenecek cümle.
let handler = null;
export function setGuideHandler(h) {
  handler = h;
}
export const guideHandler = () => handler;

// Asistanla "antrenmana başla": antrenman açılınca adım adım ekran kendiliğinden açılır (FitWorkout okur)
const START = "sa-fit-start";
export function markStart(id) {
  try {
    sessionStorage.setItem(START, id);
  } catch {}
}
export function isStart(id) {
  try {
    return sessionStorage.getItem(START) === id;
  } catch {
    return false;
  }
}
export function clearStart() {
  try {
    sessionStorage.removeItem(START);
  } catch {}
}
