export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// Ana ekrana eklenmiş uygulama modu (iOS'ta Web Speech burada çalışmaz)
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.navigator.standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches);

export const webSpeechAvailable = () =>
  typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const recorderAvailable = () =>
  typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

// "webspeech": canlı yazı  |  "server": kayıt + sunucuda çeviri  |  "none": destek yok
// NEXT_PUBLIC_STT_MODE: "auto" (varsayılan) | "server" (her yerde kayıt + sunucu; iPhone'da en güvenilir,
// OPENAI_API_KEY gerekir) | "browser" (yalnızca tarayıcı ses tanıma)
const MODE = process.env.NEXT_PUBLIC_STT_MODE || "auto";
export function pickProvider() {
  if (MODE === "server" && recorderAvailable()) return "server";
  if (MODE === "browser") return webSpeechAvailable() ? "webspeech" : "none";
  if (webSpeechAvailable() && !isStandalone()) return "webspeech";
  if (recorderAvailable()) return "server";
  return "none";
}
