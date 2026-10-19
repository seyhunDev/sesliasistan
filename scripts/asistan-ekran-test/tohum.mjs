// Emülatöre test hesapları ve kayıtları yazar (emulator.mjs seed() çağırır; yalnız FIRESTORE_EMULATOR_HOST açıkken çalışır).
// Girdi (stdin JSON): { users: [{ key, email, password, name, doc }], docs: [{ path, data }] }; yollarda {anahtar} o hesabın kimliği.
// Çıktı: { anahtar: uid }
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("yalnız emülatörde");
const input = JSON.parse(await new Promise((r) => {
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => r(s));
}));
const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);
const ids = {};
for (const u of input.users || []) {
  let rec;
  try {
    rec = await auth.getUserByEmail(u.email);
  } catch {
    rec = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
  }
  ids[u.key] = rec.uid;
}
const fill = (v) => (typeof v === "string" ? v.replace(/\{(\w+)\}/g, (m, k) => ids[k] ?? m) : Array.isArray(v) ? v.map(fill) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
for (const u of input.users || []) if (u.doc) await db.doc(`users/${ids[u.key]}`).set(fill(u.doc));
for (const d of input.docs || []) await db.doc(fill(d.path)).set(fill(d.data));
console.log(JSON.stringify(ids));
process.exit(0);
