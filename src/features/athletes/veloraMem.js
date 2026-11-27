"use client";

// Sporcular Velora'nın kendi verisinde (orgs/{ana hesap}/athletes; Seyhun 2026-11-27 "artık Velora'dan yönetiyorum").
// Velora'nın ana bağlantısı veriyi telefona kaydeder (çevrimdışı önbellek); sporcu kartında T.C., veli telefonu, sağlık tarihi
// olduğu için sporcular ayrı bir bağlantıdan okunur: aynı Firebase projesi, yalnız bellek önbelleği (cihaza yazılmaz).
// Bu bağlantı aynı kişiyle sunucudan alınan özel anahtarla oturum açar (/api/sporcu-giris); ayrıca giriş istemez.
import { useEffect, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { inMemoryPersistence, initializeAuth, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { app as mainApp, auth as mainAuth, db as mainDb } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";

const NAME = "sporcu";
let A, F, U, signing;
const app = () => (A ||= getApps().find((a) => a.name === NAME) || initializeApp(mainApp.options, NAME));
export const memDb = () =>
  (F ||= initializeFirestore(app(), {
    ignoreUndefinedProperties: true,
    localCache: memoryLocalCache(),
  }));
const memAuth = () => (U ||= initializeAuth(app(), { persistence: inMemoryPersistence }));

const denied = (text) => Object.assign(new Error(text), { code: "velora-denied" });

// Bellek bağlantısında ana hesapla oturum; dönüş: işletme kimliği (ana hesabın uid'i)
export async function memReady() {
  await mainAuth.authStateReady();
  const me = mainAuth.currentUser;
  if (!me) throw denied("Önce Velora'ya giriş yap.");
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

// Sporcular Velora'ya taşındı mı? Ayarlar › Sporcuları Velora'ya taşı karşılaştırması "Hepsi aynı" çıkınca
// orgs/{uid}/sporcuTasima/son.active = true olur (bir daha kalkmaz); o andan sonra her sporcu işi Velora'dan yapılır. Taşınmadıysa kulüpten (eski yol).
let moved = null; // Promise<boolean>
export function onVelora() {
  if (!moved)
    moved = (async () => {
      await mainAuth.authStateReady();
      const u = mainAuth.currentUser;
      if (!u) return false;
      const s = await getDoc(doc(mainDb, "orgs", u.uid, "sporcuTasima", "son"));
      return s.exists() && s.data().active === true;
    })().catch(() => {
      moved = null;
      return false;
    });
  return moved;
}
export const movedNow = () => (moved = null);

// Ekranlar için: sporcular Velora'da mı (kulüp hesabı satırı ve girişi gizlensin)
export function useOnVelora() {
  const [v, setV] = useState(false);
  useEffect(() => {
    let alive = true;
    onVelora().then((x) => alive && setV(x));
    return () => {
      alive = false;
    };
  }, []);
  return v;
}
