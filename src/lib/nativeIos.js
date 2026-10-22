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

// Face ID / Touch ID: "faceID" | "touchID" | "" (yok ya da bu kurulumda eklenti yok)
export async function biometry() {
  try {
    return (await plugin()?.biometry?.())?.type || "";
  } catch {
    return "";
  }
}
// Kilidi aç (Face ID, olmazsa telefon şifresi): true/false
export async function unlock() {
  try {
    return !!(await plugin()?.unlock?.({ reason: "Velora'yı aç" }))?.ok;
  } catch {
    return false;
  }
}

// Ana ekran widget'ı: { plans: [{ title, date, time, important }], place, lat, lon }
export function widgetData(v) {
  plugin()?.widgetData?.({ json: JSON.stringify(v) }).catch(() => {});
}
