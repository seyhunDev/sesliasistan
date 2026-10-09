export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// Ana ekrana eklenmiş uygulama modu (iOS'ta Web Speech burada çalışmaz)
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.navigator.standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches);

// Chrome / Edge / Android: tarayıcı ses tanıması istenen dili (tr-TR) kullanır.
// Safari ve Firefox cihazın dikte dilini kullanabildiği için (cihaz İngilizceyse İngilizce yazar) onlarda sunucu yolu seçilir.
export const isChromium = () =>
  typeof navigator !== "undefined" && (!!navigator.userAgentData?.brands?.some((b) => /Chromium|Google Chrome|Edge/i.test(b.brand)) || /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent));

export const webSpeechAvailable = () =>
  typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Mağaza/APK uygulaması içinde mi (mobil/, Capacitor; Android WebView "; wv)" yazar)
export const isNativeApp = () =>
  typeof window !== "undefined" && (!!window.Capacitor?.isNativePlatform?.() || window.__asistanApp === "android" || /; wv\)/.test(navigator.userAgent || ""));

export const recorderAvailable = () =>
  typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

// "webspeech": canlı yazı  |  "server": kayıt + sunucuda çeviri  |  "none": destek yok
// NEXT_PUBLIC_STT_MODE: "auto" (varsayılan) | "server" (her yerde kayıt + sunucu; iPhone'da en güvenilir,
// OPENAI_API_KEY gerekir) | "browser" (yalnızca tarayıcı ses tanıma)
const MODE = process.env.NEXT_PUBLIC_STT_MODE || "auto";
export function pickProvider() {
  if (MODE === "server" && recorderAvailable()) return "server";
  if (MODE === "browser") return webSpeechAvailable() ? "webspeech" : "none";
  // Android uygulaması (Capacitor WebView): tarayıcı ses tanıması nesnesi görünür ama WebView'da çalışmaz; kayıt yolu (denetim A5)
  if (isNativeApp() && recorderAvailable()) return "server";
  // iPhone/iPad: Safari'nin ses tanıması dokunuş dışında başlatılınca sessizce çalışmıyor; kayıt yolu daha güvenilir
  if (isIOS() && recorderAvailable()) return "server";
  // Tarayıcı ses tanıması yalnızca Türkçeyi güvenle uygulayan tarayıcılarda (Chrome/Edge); diğerlerinde kayıt + sunucu (her zaman Türkçe)
  if (webSpeechAvailable() && !isStandalone() && isChromium()) return "webspeech";
  if (recorderAvailable()) return "server";
  if (webSpeechAvailable()) return "webspeech"; // kayıt yoksa son çare
  return "none";
}
