// Sunucuda Firebase yönetici erişimi (çalışan hesabı açma, bildirim gönderme).
// FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (hizmet hesabı) ve NEXT_PUBLIC_FIREBASE_PROJECT_ID gerekir.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { cleanEmail, cleanKey } from "@/lib/pemKey";

export const adminReady = () =>
  !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// Varsayılan uygulama (aynı süreçte başka projeye bağlanan ikinci bir uygulama da olabilir: sporcular)
function app() {
  const found = getApps().find((a) => a.name === "[DEFAULT]");
  if (found) return found;
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: cleanEmail(process.env.FIREBASE_CLIENT_EMAIL),
      privateKey: cleanKey(process.env.FIREBASE_PRIVATE_KEY), // tırnak, "\n", \r gibi yapıştırma bozulmalarına dayanıklı
    }),
  });
}

export const adminDb = () => getFirestore(app());
export const adminAuth = () => getAuth(app());

// Kullanıcının profili: { role, orgId, name } (profil yoksa kendi işletmesinin sahibi sayılır)
export async function profileOf(uid) {
  const snap = await adminDb().collection("users").doc(uid).get();
  const d = snap.exists ? snap.data() : {};
  return { role: d.role || "owner", orgId: d.orgId || uid, name: d.name || "" };
}
