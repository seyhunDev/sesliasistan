// Bildirim testi (Ayarlar › Testler › Bildirim testi): /api/push-tests çağırır, deneme kaydının zamanını (30 sn)
// bekleyip telefona gönderir. Adı "-background" ile bittiği için Netlify bunu arka planda (en çok 15 dk) çalıştırır.
// Çalışmazsa 5 dakikalık zamanlayıcı (plan-reminders) aynı denemeyi gönderir; kayıtta hangi yoldan gittiği yazar.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { cleanEmail, cleanKey } from "../../src/lib/pemKey.js";
import { ackOk } from "../../src/lib/server/ackSign.js";
import { TEST_COL, sendTest } from "../../src/lib/server/pushTestSend.js";

const MAX_WAIT = 2 * 60e3;

const pushTestRun = async (req) => {
  let a = {};
  try {
    a = await req.json();
  } catch {}
  if (!ackOk({ o: a.u, c: `${TEST_COL}-run`, i: a.i, u: a.u, s: a.s })) return new Response("izin yok", { status: 403 });
  const env = process.env;
  if (!getApps().length)
    initializeApp({ credential: cert({ projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: cleanEmail(env.FIREBASE_CLIENT_EMAIL), privateKey: cleanKey(env.FIREBASE_PRIVATE_KEY) }) });
  const db = getFirestore();
  const t = (await db.collection("users").doc(String(a.u)).get()).data()?.pushTests?.[a.i];
  if (!t || t.sent || t.kind === "remind") return new Response("yok");
  const wait = Math.min(Math.max(Date.parse(t.due) - Date.now(), 0), MAX_WAIT);
  await new Promise((r) => setTimeout(r, wait));
  const n = await sendTest(db, String(a.u), String(a.i), "anında");
  return new Response(`ok ${n}`);
};
export default pushTestRun;
