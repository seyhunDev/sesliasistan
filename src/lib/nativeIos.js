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

// Üstünde sayaç akan iPhone kamerası (Medya › Kayıt; VeloraKamera.swift). Bu parça olmadan kurulmuş eski uygulamada yok (false).
export const hasCamera = () => typeof plugin()?.camera === "function";
// t: { end (ms), paused, left (sn), title } ya da null (sayaç yok). Sonuç File (lastModified = kaydın bittiği an; asset = videonun
// Fotoğraflar'daki kimliği) ya da null (vazgeçildi)
// onTaken(kind): "Videoyu Kullan"a basılınca (uygulama "cameraTaken" der; eski kurulumda kamera dosyayı verince), dosya hazırlanmadan
export async function nativeCamera(t, onTaken) {
  const p = plugin();
  const h = onTaken && p.addListener ? p.addListener("cameraTaken", (e) => onTaken(e?.kind || "video")) : null;
  const off = () => Promise.resolve(h).then((x) => x?.remove?.()).catch(() => {});
  let r;
  try {
    r = await p.camera(t || {});
  } finally {
    off();
  }
  if (!r || r.cancel || (!r.path && !r.file)) return null;
  onTaken?.(r.kind || "video");
  const blob = r.file && typeof plugin().cameraRead === "function" ? await readNative(r) : await (await fetch(r.path)).blob();
  const f = new File([blob], r.name || (r.kind === "video" ? "video.mov" : "foto.jpg"), { type: r.type || blob.type, lastModified: Math.round(r.end || Date.now()) });
  if (r.asset) f.asset = r.asset;
  return f;
}

// Seyhun 2026-10-26: Velora'dan silinen video Fotoğraflar'dan da silinsin. iPhone kendisi onay sorar. Eski kurulumda yok (null).
export async function deletePhotos(ids) {
  const p = plugin();
  if (typeof p?.photosDelete !== "function" || !ids.length) return null;
  return p.photosDelete({ ids }).catch(() => null);
}

// Seyhun 2026-10-26: "Kayıt uygulamaya alınamadı". Sayfa canlı siteden açık, capacitor:// adresini fetch okuyamıyor; dosya
// eklentiden 2 MB'lık parçalarla (base64) alınır, son parçada telefondaki geçici dosya silinir.
async function readNative(r) {
  const parts = [];
  const len = 2 * 1024 * 1024;
  for (let off = 0; ; off += len) {
    const { data, done } = await plugin().cameraRead({ file: r.file, offset: off, length: len });
    const bin = atob(data || "");
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    parts.push(u);
    if (done || !bin.length) break;
  }
  return new Blob(parts, { type: r.type || "" });
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

// Widget verisi (lib/widgetData.js, features/ios/WidgetFeed.jsx): { plans, training, place, lat, lon, timer, money, dues, word }
export function widgetData(v) {
  plugin()?.widgetData?.({ json: JSON.stringify(v) }).catch(() => {});
}

// Apple Watch (mobil/ios/App/VeloraSaat, telefonda VeloraSaatKoprusu.swift). Saatten gelen istek: { id, tur: "sor", metin } ya da
// { id, tur: "sayac", is, sn }. Cevap watchReply ile verilir: sor için { metin, kaydedildi, soru }, sayaç için { ok, metin? }.
// Sayfa yüklenmeden gelen istekler watchTake ile bir kez alınır (cevapsız kalan istek telefonda 40 sn sonra saate "cevap yok" der).
export const watchOk = () => typeof plugin()?.watchReply === "function";
export function onWatch(fn) {
  const p = plugin();
  if (!p?.watchReply || !p.addListener) return () => {};
  const h = p.addListener("watch", (e) => fn(parseJson(e?.json)));
  return () => Promise.resolve(h).then((x) => x?.remove?.());
}
export async function watchTake() {
  try {
    return ((await plugin()?.watchTake?.())?.list || []).map(parseJson).filter(Boolean);
  } catch {
    return [];
  }
}
export function watchReply(id, v) {
  plugin()?.watchReply?.({ id, json: JSON.stringify(v) }).catch(() => {});
}
// Saatte görünen sayaç (lib/watchTimer.js watchTimerView)
export function watchState(v) {
  plugin()?.watchState?.({ json: JSON.stringify(v) }).catch(() => {});
}
const parseJson = (s) => {
  try {
    return JSON.parse(s || "null");
  } catch {
    return null;
  }
};

// Simgedeki sayı (VeloraPlugin.badge). Bu parça olmadan kurulmuş eski iPhone uygulamasında yok: false döner,
// o zaman sayıyı sunucu sessiz bir bildirimle düzeltir (/api/badge).
export const iosBadgeKind = () => {
  const C = typeof window !== "undefined" ? window.Capacitor : null;
  if (!C?.isNativePlatform?.() || C.getPlatform?.() !== "ios") return "";
  return typeof plugin()?.badge === "function" ? "plugin" : "server";
};
export function setIosBadge(count) {
  return plugin()?.badge?.({ count }).catch(() => {});
}
