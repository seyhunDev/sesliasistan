// Android uygulamasında (mobil/, Capacitor) bildirimler: Web Push yerine Firebase Cloud Messaging.
// Uygulama kayıt anahtarını (token) verir, users/{uid}.push.<cihaz> = { fcm, at, ua, app } olarak saklanır;
// sunucu bu cihazlara FCM ile gönderir (lib/server/sendDevice.js). Tarayıcıda hiçbiri çalışmaz.

const cap = () => (typeof window !== "undefined" ? window.Capacitor : null);
const plugins = () => cap()?.Plugins || {};

export const isNativeApp = () => !!cap()?.isNativePlatform?.();

// Uygulama bildirimlerle (google-services.json) derlendiyse true
let ready = null;
export function nativePushReady() {
  if (!isNativeApp() || !plugins().PushNotifications) return Promise.resolve(false);
  if (!ready)
    ready = (plugins().AsistanDosya?.pushReady?.() || Promise.resolve({ ready: false })).then(
      (r) => !!r?.ready,
      () => false,
    );
  return ready;
}

// İzin durumu: "granted" | "denied" | "prompt"
export async function nativePermission(ask) {
  const PN = plugins().PushNotifications;
  let st = (await PN.checkPermissions())?.receive;
  if (ask && st !== "granted" && st !== "denied") st = (await PN.requestPermissions())?.receive;
  return st === "granted" ? "granted" : st === "denied" ? "denied" : "prompt";
}

// Kayıt anahtarını al (izin verilmiş olmalı)
export function nativeToken() {
  const PN = plugins().PushNotifications;
  return new Promise((resolve, reject) => {
    let done = false;
    const hs = [];
    const end = (fn, v) => {
      if (done) return;
      done = true;
      hs.forEach((h) => Promise.resolve(h).then((x) => x?.remove?.()));
      fn(v);
    };
    hs.push(PN.addListener("registration", (t) => end(resolve, t?.value)));
    hs.push(PN.addListener("registrationError", (e) => end(reject, new Error(e?.error || "Bildirim kaydı olmadı"))));
    setTimeout(() => end(reject, new Error("Bildirim kaydı zaman aşımına uğradı")), 15000);
    PN.register().catch((e) => end(reject, e));
  });
}

// Bildirime dokununca ilgili sayfayı aç; uygulama açıkken gelen bildirimi de göster (Android açık uygulamada göstermez)
let wired = false;
export function wireNativePush(go) {
  if (wired || !isNativeApp()) return;
  const { PushNotifications: PN, LocalNotifications: LN } = plugins();
  if (!PN) return;
  wired = true;
  PN.addListener("pushNotificationActionPerformed", (a) => go(a?.notification?.data?.url || "/"));
  LN?.addListener?.("localNotificationActionPerformed", (a) => go(a?.notification?.extra?.url || "/"));
  PN.addListener("pushNotificationReceived", (n) => {
    if (!LN) return;
    const id = Math.floor(Math.random() * 2e9);
    LN.schedule({
      notifications: [{ id, title: n?.title || n?.data?.title || "Asistan", body: n?.body || "", channelId: "genel", extra: { url: n?.data?.url || "/" } }],
    }).catch(() => {});
  });
}
