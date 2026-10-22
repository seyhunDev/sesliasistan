// Dokunsal titreşim, uygulamanın her yerinden: haptic("light" | "medium" | "heavy" | "select" | "success" | "warning" | "error").
// iPhone uygulamasında gerçek Taptic (mobil/ios VeloraPlugin.haptic); Android'de navigator.vibrate; iPhone tarayıcısında yok.
const VIB = { light: 8, select: 5, medium: 14, heavy: 22, success: [10, 40, 10], warning: [20, 60, 20], error: [30, 50, 30, 50, 30] };

const ios = () => {
  const C = typeof window !== "undefined" ? window.Capacitor : null;
  return C?.isNativePlatform?.() && C.getPlatform?.() === "ios" ? C.Plugins?.Velora : null;
};

export function haptic(kind = "light") {
  const p = ios();
  if (typeof p?.haptic === "function") return void p.haptic({ kind }).catch(() => {});
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && !navigator.vibrate.velora) navigator.vibrate(VIB[kind] ?? VIB.light);
}

// navigator.vibrate kalıbını en yakın türe çevirir: [10,40,10] başarı, daha uzun dizi hata; tek sayı süresine göre
export function kindOf(pattern) {
  if (Array.isArray(pattern)) return pattern.length <= 1 ? kindOf(pattern[0]) : pattern.length <= 3 ? "success" : "error";
  const ms = Number(pattern) || 0;
  return ms <= 0 ? "" : ms <= 10 ? "light" : ms <= 18 ? "medium" : "heavy";
}

// iPhone uygulamasında eski navigator.vibrate çağrıları (WebView'da yok) Taptic'e bağlanır (IosBridge bir kez çağırır)
export function bridgeVibrate() {
  const p = ios();
  if (typeof p?.haptic !== "function" || navigator.vibrate?.velora) return;
  const v = (pattern) => {
    const k = kindOf(pattern);
    if (k) p.haptic({ kind: k }).catch(() => {});
    return true;
  };
  v.velora = true;
  try {
    navigator.vibrate = v;
  } catch {}
}
