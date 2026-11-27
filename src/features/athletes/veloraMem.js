"use client";

// Sporcular Velora'nın kendi verisinde (orgs/{ana hesap}/athletes; Seyhun 2026-11-27 "artık her şeyi Velora'dan yapacağız").
// Velora'nın ana bağlantısı veriyi telefona kaydeder (çevrimdışı önbellek); sporcu kartında T.C., veli telefonu, sağlık tarihi
// olduğu için sporcular ayrı bir bağlantıdan okunur: aynı Firebase projesi, yalnız bellek önbelleği (cihaza yazılmaz).
// Bu bağlantı aynı kişiyle sunucudan alınan özel anahtarla oturum açar (/api/sporcu-giris); ayrıca giriş istemez.
// Yerel testte (emülatör) ana bağlantı kullanılır (sunucu anahtarı yok); yayında bu yol hiç çalışmaz.
import { getApps, initializeApp } from "firebase/app";
import { inMemoryPersistence, initializeAuth, signInWithCustomToken } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { app as mainApp, auth as mainAuth, db as mainDb } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";

const EMU = process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_TEST_EMULATOR : "";
const NAME = "sporcu";
let A, F, U, signing;
const app = () => (A ||= getApps().find((a) => a.name === NAME) || initializeApp(mainApp.options, NAME));
export const memDb = () => (EMU ? mainDb : (F ||= initializeFirestore(app(), { ignoreUndefinedProperties: true, localCache: memoryLocalCache() })));
const memAuth = () => (U ||= initializeAuth(app(), { persistence: inMemoryPersistence }));

const denied = (text) => Object.assign(new Error(text), { code: "velora-denied" });

// Bellek bağlantısında ana hesapla oturum; dönüş: işletme kimliği (ana hesabın uid'i)
export async function memReady() {
  await mainAuth.authStateReady();
  const me = mainAuth.currentUser;
  if (!me) throw denied("Önce Velora'ya giriş yap.");
  if (EMU) return me.uid;
  const a = memAuth();
  if (a.currentUser?.uid === me.uid) return me.uid;
  signing ||= (async () => {
    const res = await authFetch("/api/sporcu-giris", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw denied(d.error || "Sporculara bağlanılamadı.");
    await signInWithCustomToken(a, d.token);
  })().finally(() => (signing = null));
  await signing;
  return me.uid;
}
