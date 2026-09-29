import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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

// undefined alanlar yok sayılır (kaydetme düşmez); tarayıcıda çevrimdışı önbellek
function makeDb() {
  const opts = { ignoreUndefinedProperties: true };
  if (typeof window !== "undefined") {
    try {
      opts.localCache = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
    } catch {}
  }
  try {
    return initializeFirestore(app, opts);
  } catch {
    return getFirestore(app); // zaten başlatılmışsa mevcut örneği kullan
  }
}
export const db = makeDb();
