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
export function pickProvider() {
  if (webSpeechAvailable() && !isStandalone()) return "webspeech";
  if (recorderAvailable()) return "server";
  return "none";
}
