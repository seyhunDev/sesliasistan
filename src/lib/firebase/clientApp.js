import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  throw new Error(`Firebase ayarı eksik: ${missing.join(", ")}. .env.local dosyasını doldurup sunucuyu yeniden başlat.`);
}

// Tek uygulama örneği (sıcak yenilemede tekrar başlatılmaz)
// (Aynı sayfada ikinci bir Firebase uygulaması da olabilir: sporcular için "dikili")
export const app = getApps().some((a) => a.name === "[DEFAULT]") ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// iPhone/iPad (Safari ve ana ekran uygulaması): tek sekme. Çok sekmeli önbellek WebKit'te uygulama arkaya gidip dönünce
// IndexedDB'de "Failed to delete record from object store" (INTERNAL ASSERTION b815) ile bozulabiliyor; telefonda zaten tek pencere var.
const appleMobile = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) || navigator.standalone === true);

// undefined alanlar yok sayılır (kaydetme düşmez); tarayıcıda çevrimdışı önbellek
function makeDb() {
  const opts = { ignoreUndefinedProperties: true };
  if (typeof window !== "undefined") {
    try {
      opts.localCache = persistentLocalCache({ tabManager: appleMobile() ? persistentSingleTabManager({ forceOwnership: true }) : persistentMultipleTabManager() });
    } catch {}
  }
  try {
    return initializeFirestore(app, opts);
  } catch {
    return getFirestore(app); // zaten başlatılmışsa mevcut örneği kullan
  }
}
export const db = makeDb();

// Firestore iç hatası (INTERNAL ASSERTION FAILED) olunca istemci bir daha çalışmaz; uygulama bir kez kendini yeniler.
// Telefondaki bekleyen kayıtlar IndexedDB'de durur, yenileyince gider. En çok 2 dakikada bir (yenileme döngüsü olmasın).
export const isFsBroken = (e) => /INTERNAL ASSERTION FAILED/.test(String(e?.message || e || ""));
let healing = false;
export function healFirestore() {
  if (healing || typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem("sa-fs-heal") || 0);
    if (Date.now() - last < 120e3) return;
    sessionStorage.setItem("sa-fs-heal", String(Date.now()));
  } catch {
    return;
  }
  healing = true;
  setTimeout(() => window.location.reload(), document.visibilityState === "hidden" ? 0 : 2500);
}
if (typeof window !== "undefined" && !globalThis.__saHeal) {
  globalThis.__saHeal = true;
  window.addEventListener("unhandledrejection", (e) => isFsBroken(e.reason) && healFirestore());
  window.addEventListener("error", (e) => isFsBroken(e.error || e.message) && healFirestore());
  // Firestore iç hatayı konsola da yazar (söz yakalanmış olsa bile)
  const orig = console.error;
  console.error = (...a) => {
    if (a.some(isFsBroken)) healFirestore();
    return orig.apply(console, a);
  };
}

// Yalnız yerel testte (scripts/asistan-arayuz-test): sahte Firebase'e (emülatör) bağlanır, gerçek veriye dokunulmaz.
// Yayında (production derlemesi) bu blok hiç çalışmaz.
const EMU = process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_TEST_EMULATOR : "";
if (EMU && typeof window !== "undefined" && !globalThis.__saEmu) {
  globalThis.__saEmu = true;
  const [authHost, fsHost] = EMU.split(",");
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const [h, port] = fsHost.split(":");
  connectFirestoreEmulator(db, h, Number(port));
}
