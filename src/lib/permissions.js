import { isIOS } from "@/lib/speech/detect";

// Kamera ve mikrofon izinleri: durumu sorgular, ister ve sonucu bu cihazda hatırlar.
// Asıl izin tarayıcıda (site ayarları) saklanır; buradaki kayıt, tarayıcı durumu
// sorgulanamadığında (Firefox, eski Safari) ve ilk açılış isteminde kullanılır.
const KEY = "sa-perms";
export const PERM_NAMES = ["camera", "microphone"];
export const PERM_LABEL = { camera: "Kamera", microphone: "Mikrofon" };

// state: "granted" | "denied" | "prompt" | "ask" (iPhone: Safari her kullanımda sorar) | "missing" (cihaz yok) | "unsupported"
export function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function savePermission(name, state) {
  try {
    const s = loadSaved();
    s[name] = { state, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

// Uygulama içi açma/kapama: tarayıcı izni verilmiş olsa bile kapalıysa uygulama bu cihazı kullanmaz.
// (Tarayıcılar verilen izni sitenin kendisinin geri almasına izin vermez; tamamen kaldırmak için permissionHelp(name, true).)
export const appAllowed = (name) => !loadSaved().off?.[name];
export function setAppAllowed(name, on) {
  try {
    const s = loadSaved();
    s.off = { ...(s.off || {}), [name]: !on };
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
export const offMessage = (name) => `${PERM_LABEL[name]} uygulama ayarlarından kapalı. Hesap › İzinler'den açabilirsin.`;

// İlk açılıştaki izin kartı kapatıldı mı
export const promptDismissed = () => !!loadSaved().dismissed;
export const dismissPrompt = () => savePermission("dismissed", "yes");

export const mediaSupported = () =>
  typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

export const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
export const isMobile = () => isIOS() || isAndroid() || (typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);

export async function queryPermission(name) {
  if (!mediaSupported()) return "unsupported";
  const saved = loadSaved()[name]?.state;
  try {
    const st = await navigator.permissions.query({ name });
    // iPhone Safari'de site ayarı varsayılan "Sor"dur: izin verilmiş olsa da her açılışta yeniden sorar ve durum hep "prompt" döner.
    // Bu cihazda bir kez verildiyse "verildi", hiç verilmediyse "kullanırken sorar" göster ("sorulmadı" yanıltıcı olur)
    const state = st.state === "prompt" && isIOS() ? (saved === "granted" ? "granted" : "ask") : st.state;
    if (st.state !== "prompt") savePermission(name, st.state);
    return state;
  } catch {
    return saved || "prompt";
  }
}

// getUserMedia hatasını izin durumuna çevirir
export function errorState(e) {
  if (e?.name === "NotAllowedError" || e?.name === "SecurityError") return "denied";
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") return "missing";
  return "error";
}

// İzin ister (tarayıcı sorusu çıkar), akışı hemen kapatır ve sonucu kaydeder
export async function requestPermissions(names = PERM_NAMES) {
  if (!mediaSupported()) return Object.fromEntries(names.map((n) => [n, "unsupported"]));
  const want = { video: names.includes("camera"), audio: names.includes("microphone") };
  try {
    const s = await navigator.mediaDevices.getUserMedia(want);
    s.getTracks().forEach((t) => t.stop());
    names.forEach((n) => savePermission(n, "granted"));
    return Object.fromEntries(names.map((n) => [n, "granted"]));
  } catch (e) {
    // İkisi birlikte istendiyse biri eksik olabilir (örn. kamerasız bilgisayar): tek tek dene
    if (names.length > 1 && errorState(e) === "missing") {
      const out = {};
      for (const n of names) Object.assign(out, await requestPermissions([n]));
      return out;
    }
    const state = errorState(e);
    if (state !== "error") names.forEach((n) => savePermission(n, state));
    return Object.fromEntries(names.map((n) => [n, state]));
  }
}

// Fiş için arka kamerayı açar (yoksa bilgisayarın kamerası). Hata olursa açıklamalı Error fırlatır.
export async function openCamera() {
  if (!appAllowed("camera")) {
    const err = new Error(offMessage("camera"));
    err.state = "off";
    throw err;
  }
  if (!mediaSupported()) {
    const err = new Error(typeof window !== "undefined" && !window.isSecureContext ? "Kamera için HTTPS gerekir. Tünel adresini (https://…) kullan." : "Bu tarayıcı kamerayı desteklemiyor.");
    err.state = "unsupported";
    throw err;
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } },
    });
    savePermission("camera", "granted");
    return s;
  } catch (e) {
    const state = errorState(e);
    if (state !== "error") savePermission("camera", state);
    const err = new Error(
      state === "denied" ? `Kamera izni verilmedi. ${permissionHelp("camera")}`
        : state === "missing" ? "Bu cihazda kamera bulunamadı. Galeriden seçebilirsin."
          : e?.name === "NotReadableError" ? "Kamera başka bir uygulamada açık. Onu kapatıp tekrar dene."
            : "Kamera açılamadı.",
    );
    err.state = state;
    throw err;
  }
}

// İzni cihaza göre nasıl açacağını (revoke=true: tamamen nasıl kaldıracağını) anlatır
export function permissionHelp(name, revoke = false) {
  const what = PERM_LABEL[name] || "İzin";
  if (isIOS()) return `iPhone/iPad: Safari'de adres çubuğundaki “aA” › Web Sitesi Ayarları › ${what} › ${revoke ? "Reddet" : "İzin Ver"}. Ana ekrandaki uygulamada: Ayarlar › Safari › ${what} › ${revoke ? "Reddet" : "İzin Ver"}.`;
  if (isAndroid()) return `Android: adres çubuğundaki ayar simgesi › İzinler › ${what} › ${revoke ? "Engelle" : "İzin ver"}. Olmazsa Ayarlar › Uygulamalar › Chrome › İzinler › ${what}.`;
  return `Bilgisayar: adres çubuğundaki kilit simgesi › ${what} › ${revoke ? "Engelle" : "İzin ver"}, sonra sayfayı yenile.${revoke ? "" : " Mac'te ayrıca Sistem Ayarları › Gizlilik ve Güvenlik › " + what + " › tarayıcını aç."}`;
}
