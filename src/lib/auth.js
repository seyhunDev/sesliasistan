// Firebase Auth tabanlı oturum yönetimi
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";

const EVENT = "sa-auth";

// Bir kez Firebase Auth başlatıldığında tarayıcıda oturum otomatik kalıcıdır.
// Ancak hızlı (senkron) getSession() çağrıları için currentUser kullanıyoruz.

export function getSession() {
  if (typeof window === "undefined") return null;
  const u = auth.currentUser;
  if (!u) return null;
  return {
    uid: u.uid,
    name: u.displayName || u.email?.split("@")[0] || "Kullanıcı",
    email: u.email,
    role: "owner", // Şimdilik herkes "owner". Firestore'dan çekilebilir ileride.
  };
}

export function subscribe(cb) {
  // Firebase Auth durum değişikliklerini dinler (giriş / çıkış / token yenileme)
  return onAuthStateChanged(auth, () => cb());
}

export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function register(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

  // Firebase Auth profilini güncelle
  await updateProfile(cred.user, { displayName: name.trim() });

  // Firestore'da /users/{uid} belgesi oluştur (güvenlik kurallarınıza göre)
  await setDoc(doc(db, "users", cred.user.uid), {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: "owner",
    orgId: cred.user.uid, // Güvenlik kurallarınıza göre orgId = uid
    createdAt: new Date().toISOString(),
  });
}

export async function logout() {
  await signOut(auth);
}

export const authErrorMessage = (e) => {
  const code = e?.code || "";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
    return "E-posta veya şifre hatalı.";
  if (code === "auth/email-already-in-use") return "Bu e-posta ile zaten bir hesap var.";
  if (code === "auth/weak-password") return "Şifre en az 6 karakter olmalı.";
  if (code === "auth/invalid-email") return "Geçersiz e-posta adresi.";
  if (code === "auth/too-many-requests") return "Çok fazla deneme. Lütfen bekle.";
  return e?.message || "Bir hata oluştu. Tekrar dene.";
};
