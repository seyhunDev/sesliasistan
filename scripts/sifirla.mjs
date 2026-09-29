// Firebase projesini sıfırlar ve tek ana hesap kurar. Yalnızca proje sahibi bilgisayarında, .env.local ile çalıştırır.
//
//   node --env-file=.env.local scripts/sifirla.mjs
//       -> yalnızca ne olduğunu gösterir (hiçbir şey silinmez)
//   node --env-file=.env.local scripts/sifirla.mjs --hepsini-sil
//       -> TÜM giriş hesaplarını ve TÜM Firestore verisini siler (geri alınamaz)
//   SA_SIFRE=... node --env-file=.env.local scripts/sifirla.mjs --ana-hesap ad@eposta.com --ad "Ad Soyad"
//       -> ana hesabı oluşturur: giriş hesabı + users/{uid} { role: "owner", orgId: uid }
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const wipe = args.includes("--hepsini-sil");
const ownerEmail = opt("--ana-hesap")?.trim().toLowerCase();
const ownerName = opt("--ad")?.trim() || "";

const need = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"].filter((k) => !process.env[k]);
if (need.length) {
  console.log(`.env.local içinde eksik: ${need.join(", ")}`);
  process.exit(1);
}
initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

async function allUsers() {
  const out = [];
  let token;
  do {
    const r = await auth.listUsers(1000, token);
    out.push(...r.users);
    token = r.pageToken;
  } while (token);
  return out;
}

console.log(`Proje: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);
const users = await allUsers();
const cols = await db.listCollections();
console.log(`Giriş hesapları: ${users.length}`);
users.forEach((u) => console.log(`  - ${u.email || u.uid}`));
console.log(`Firestore kök koleksiyonlar: ${cols.map((c) => c.id).join(", ") || "(yok)"}`);

if (wipe) {
  console.log("\nSiliniyor…");
  for (let i = 0; i < users.length; i += 1000) await auth.deleteUsers(users.slice(i, i + 1000).map((u) => u.uid));
  for (const c of cols) await db.recursiveDelete(c); // alt koleksiyonlarla birlikte
  console.log(`Tamam: ${users.length} hesap ve ${cols.length} koleksiyon silindi.`);
}

if (ownerEmail) {
  const pass = process.env.SA_SIFRE || "";
  if (pass.length < 6) {
    console.log("\nŞifre SA_SIFRE ile verilmeli ve en az 6 karakter olmalı.");
    process.exit(1);
  }
  const exists = await auth.getUserByEmail(ownerEmail).catch(() => null);
  const u = exists || (await auth.createUser({ email: ownerEmail, password: pass, displayName: ownerName || undefined, emailVerified: true }));
  if (exists) await auth.updateUser(u.uid, { password: pass, ...(ownerName ? { displayName: ownerName } : {}) });
  await db.collection("users").doc(u.uid).set({
    name: ownerName || u.displayName || ownerEmail.split("@")[0],
    email: ownerEmail,
    role: "owner",
    orgId: u.uid,
    createdAt: new Date().toISOString(),
  });
  console.log(`\nAna hesap hazır: ${ownerEmail} (${u.uid})`);
}

if (!wipe && !ownerEmail) console.log("\nHiçbir şey değiştirilmedi. Silmek için --hepsini-sil, ana hesap için --ana-hesap ekle.");
process.exit(0);
