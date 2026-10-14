// Küçülen asistan küresinin yanındaki tek satır: dinlerken söylenen, çalışırken o anki iş, sonra son cevap
export function miniText(state, live = {}) {
  const one = (t) => String(t || "").replace(/\s+/g, " ").trim();
  if (state === "listening") return one(live.heard) || "Dinliyorum";
  if (state === "busy") return one(live.status || live.said) || "Çalışıyorum";
  return one(live.lastReply);
}

// Aşağı çekince: asistan boştaysa kapanır, dinliyor/çalışıyor/konuşuyorsa küçülür
export const pullAction = (state) => (state && state !== "idle" ? "mini" : "close");
