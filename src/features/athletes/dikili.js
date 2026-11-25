"use client";

// Kulübün sporcu verisi ayrı bir Firebase projesinde (dikili-c7cc8). Kulüp uygulaması gibi tarayıcıdan
// doğrudan bağlanırız: ikinci bir Firebase uygulaması, o projenin kendi hesabıyla giriş ve kendi kuralları.
// Bu yapılandırma herkese açık web ayarlarıdır (gizli değil); erişimi o projenin güvenlik kuralları belirler.
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const CONFIG = {
  apiKey: "AIzaSyDhxbRGM5pic2CxZD8ukTeEaLlq4vk63Sg",
  authDomain: "dikili-c7cc8.firebaseapp.com",
  projectId: "dikili-c7cc8",
  storageBucket: "dikili-c7cc8.firebasestorage.app",
  messagingSenderId: "593047135133",
  appId: "1:593047135133:web:e6fca886f76d59451d8574",
};
const NAME = "dikili";

// Yalnız yerel testte (lib/firebase/clientApp.js ile aynı): kulüp verisi de sahte Firebase'den (emülatör) okunur, gerçek sporcu
// verisine dokunulmaz (yarış sayfası testi sporcu seçili açılır). Yayında (production derlemesi) bu blok hiç çalışmaz.
const EMU = process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_TEST_EMULATOR : "";
const app = () => {
  const old = getApps().find((a) => a.name === NAME);
  if (old) return old;
  const a = initializeApp(CONFIG, NAME);
  if (EMU && typeof window !== "undefined") {
    const [authHost, fsHost] = EMU.split(",");
    connectAuthEmulator(getAuth(a), `http://${authHost}`, { disableWarnings: true });
    const [h, port] = fsHost.split(":");
    connectFirestoreEmulator(getFirestore(a), h, Number(port));
  }
  return a;
};

// Oturum bu cihazda kalır (bir kez giriş yeter). Veri önbelleği yalnızca bellekte (sağlık/kimlik bilgisi cihaza yazılmaz).
export const dikiliAuth = () => getAuth(app());
export const dikiliDb = () => getFirestore(app());
