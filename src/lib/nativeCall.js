// Android uygulamasında (mobil/) arama: ses ahize/hoparlör yönü ve bildirimdeki "Aç" düğmesi.
// Yerel kısım AsistanDosya eklentisinde (audioRoute, takeAnswer, "answer" olayı). Eski APK'da ya da tarayıcıda
// bu yöntemler yoktur; o zaman hiçbir şey yapılmaz.
const plugin = () => {
  const C = typeof window !== "undefined" ? window.Capacitor : null;
  return C?.isNativePlatform?.() ? C.Plugins?.AsistanDosya : null;
};

export const nativeRouting = () => typeof plugin()?.audioRoute === "function";

// Sesi ahizeye (speaker false) ya da hoparlöre ver. WebView mikrofon açılınca kendi ayarını yazabildiği için kısa
// aralarla yeniden uygulanır.
let timers = [];
export function nativeRoute(speaker) {
  const p = plugin();
  if (!p?.audioRoute) return false;
  timers.forEach(clearTimeout);
  const go = () => p.audioRoute({ on: true, speaker: !!speaker }).catch(() => {});
  go();
  timers = [700, 2000].map((ms) => setTimeout(go, ms));
  return true;
}

// Arama bitti: telefon normal ses kipine döner
export function nativeRouteOff() {
  timers.forEach(clearTimeout);
  timers = [];
  plugin()?.audioRoute?.({ on: false }).catch(() => {});
}

// Uygulama bildirimdeki "Aç" ile açıldıysa o aramanın kimliği (bir kez verilir)
export async function takeAnswer() {
  const p = plugin();
  if (!p?.takeAnswer) return "";
  try {
    return (await p.takeAnswer())?.id || "";
  } catch {
    return "";
  }
}

// Uygulama açıkken bildirimdeki "Aç"a basıldı
export function onAnswer(fn) {
  const p = plugin();
  if (!p?.addListener || !p.takeAnswer) return () => {};
  const h = p.addListener("answer", (e) => fn(e?.id || ""));
  return () => Promise.resolve(h).then((x) => x?.remove?.());
}
