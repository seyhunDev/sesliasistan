// Firebase Auth tabanlı oturum yönetimi
import { loginEmail } from "@/lib/kinds";
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";
import { clearWarm } from "@/lib/warmStart";
import { clearPlace } from "@/lib/place";

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

// E-posta ya da kullanıcı adı (e-postası olmayan çocuk/sporcu hesapları: "ege.demir")
export async function login(emailOrUser, password) {
  await signInWithEmailAndPassword(auth, loginEmail(emailOrUser), password);
}

// extra: profile eklenecek alanlar (ör. { via: "sailing" }: Velora Sailing bağlantısından kaydoldu, bkz. lib/sailingReturn.js)
// Kayıt sürerken AuthProvider "profil yok" görüp boş profil açmasın: yoksa kayıttaki spor ve via yazılamaz (kurallar via'yı
// sonradan değiştirtmez) ve yeni antrenöre yeniden "Hangi spor?" sorulur (uçtan uca test, 2026-11-27).
let kayit = 0;
export const kayitSuruyor = () => kayit > 0;

export async function register(name, email, password, sport = "sailing", extra) {
  kayit++;
  try {
    await kayitYap(name, email, password, sport, extra);
  } finally {
    kayit--;
  }
}

async function kayitYap(name, email, password, sport, extra) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

  // Firebase Auth profilini güncelle
  await updateProfile(cred.user, { displayName: name.trim() });

  // Firestore'da /users/{uid} belgesi oluştur (güvenlik kurallarınıza göre)
  await setDoc(doc(db, "users", cred.user.uid), {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: "owner",
    orgId: cred.user.uid, // Güvenlik kurallarınıza göre orgId = uid
    sport, // kayıtta seçilen spor (src/sports)
    ...(extra || {}),
    dogrula: true, // e-posta doğrulanana kadar uygulama DogrulaGate'te bekler; sunucu sporcu ve paket isteğini almaz
    createdAt: new Date().toISOString(),
  });
  await dogrulamaGonder(cred.user).catch(() => {});
}

// E-posta doğrulama bağlantısı (Türkçe); kayıtta ve "Tekrar gönder"de
export async function dogrulamaGonder(user = auth.currentUser) {
  if (!user) return;
  auth.languageCode = "tr";
  await sendEmailVerification(user);
}

// Şifre sıfırlama bağlantısı e-postayla gider (Türkçe)
export async function resetPassword(email) {
  auth.languageCode = "tr";
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logout() {
  clearWarm(); // anında açılış kopyası (lib/warmStart.js) başka hesaba kalmasın
  clearPlace();
  await signOut(auth);
}

export const authErrorMessage = (e) => {
  const code = e?.code || "";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
    return "E-posta veya şifre hatalı.";
  if (code === "auth/email-already-in-use") return "Bu e-posta ile zaten bir hesap var.";
  if (code === "auth/weak-password") return "Şifre en az 6 karakter olmalı.";
  if (code === "auth/invalid-email" || code === "auth/missing-email") return "Geçerli bir e-posta adresi yaz.";
  if (code === "auth/too-many-requests") return "Çok fazla deneme. Lütfen biraz bekle.";
  if (code === "auth/network-request-failed") return "İnternet bağlantısı yok. Bağlantını kontrol edip tekrar dene.";
  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") return "Yeni kayıt şu an kapalı.";
  if (code === "auth/user-disabled") return "Bu hesap devre dışı bırakılmış.";
  if (code.startsWith("auth/api-key") || code === "auth/invalid-api-key") return "Uygulamanın bağlantı ayarı hatalı, işlem yapılamadı.";
  return "Bir hata oluştu, işlem yapılamadı. Tekrar dene.";
};
