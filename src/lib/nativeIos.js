// iPhone uygulamasında (mobil/ios, Capacitor) yerel işler: bas-konuş, kilit ekranında sayaç (Canlı Etkinlik), plan alarmları.
// Yerel kısım mobil/ios/App/App/VeloraPlugin.swift. Tarayıcıda, Android'de ya da bu parça olmadan kurulmuş eski iPhone
// uygulamasında eklenti yoktur; o zaman hiçbir şey yapılmaz.
const plugin = () => {
  const C = typeof window !== "undefined" ? window.Capacitor : null;
  return C?.isNativePlatform?.() && C.getPlatform?.() === "ios" ? C.Plugins?.Velora || null : null;
};

export const iosApp = () => typeof plugin()?.alarmSync === "function";

// Uygulamanın dışından gelen istek: "talk" (Siri, Eylem tuşu, Denetim Merkezi: asistan dinlesin) ya da "timer" (kilit
// ekranındaki sayaca dokunuldu). Uygulama kapalıyken gelen istek sayfa yüklenince bir kez alınır.
export async function takeOpen() {
  try {
    return (await plugin()?.takeOpen?.())?.what || "";
  } catch {
    return "";
  }
}
export function onOpen(fn) {
  const p = plugin();
  if (!p?.addListener) return () => {};
  const h = p.addListener("open", (e) => fn(e?.what || ""));
  return () => Promise.resolve(h).then((x) => x?.remove?.());
}

// Sayaç: { end (ms), paused, left (sn), title }; null gelirse kilit ekranındaki sayaç kalkar
export function showTimer(t) {
  const p = plugin();
  if (!p?.timerShow) return;
  (t ? p.timerShow(t) : p.timerEnd()).catch(() => {});
}

// Plan alarmları: [{ key, at (ms), title }] (lib/planAlarm.js alarmItems). Sonuç { kind: "alarm" | "notification", count }
// (count -1: izin verilmedi)
export async function syncAlarms(items) {
  try {
    return (await plugin()?.alarmSync?.({ items })) || null;
  } catch {
    return null;
  }
}

// Titreşim: iPhone'da navigator.vibrate yok (Safari desteklemez). Uygulamada eklentide haptic varsa navigator.vibrate ona
// bağlanır; böylece uygulamanın her yerindeki kısa titreşimler iPhone uygulamasında da hissedilir. Süreye göre:
// ≤10 ms hafif, ≤20 ms orta, daha uzun ya da dizi (bip-bip) "tamam" titreşimi.
export function hapticKind(p) {
  if (Array.isArray(p)) return p.length > 1 ? "success" : hapticKind(p[0]);
  const ms = Number(p) || 0;
  if (ms <= 0) return "";
  return ms <= 10 ? "light" : ms <= 20 ? "medium" : "heavy";
}
export function bindHaptics() {
  const p = plugin();
  if (!p?.haptic || typeof navigator === "undefined" || navigator.__veloraHaptic) return;
  const vib = (pattern) => {
    const kind = hapticKind(pattern);
    if (kind) p.haptic({ kind }).catch?.(() => {});
    return true;
  };
  try {
    Object.defineProperty(navigator, "vibrate", { value: vib, configurable: true, writable: true });
    navigator.__veloraHaptic = true;
  } catch {}
}
