// Yarış sitesi belgeleri (Seyhun 2026-11-03 "siteye yüklendiğinde hemen alıp kullanmamız gerekiyor"): 10 dakikada bir çalışır.
// İzlenen yarışlar raceSite/{org}_{yarış} kayıtlarında (Yarışlar › Siteden ekranından seçilir, /api/race-site yazar).
// Yarış günlerinde (başlangıçtan bir gün önce – bitişten bir gün sonra) her çalışmada, diğer günlerde günde bir bakılır.
// İş arka plan işlevinde (race-site-background.mjs: indirme, yapay zeka, bildirim 30 saniyeye sığmaz); burası yalnız sırası
// gelenleri seçer ve imzalı istekle onu çağırır. Saatte bir de sitede yeni yarış taraması ister (bildirim).
// Gerekli ortam değişkenleri: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, VAPID anahtarları (bildirim ve imza), GEMINI_API_KEY + GEMINI_MODEL (talimat okuma)
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { cleanEmail, cleanKey } from "../../src/lib/pemKey.js";
import { ackSig } from "../../src/lib/server/ackSign.js";
import { KNOWN, dueNow } from "../../src/lib/server/raceSiteSync.js";

export const config = { schedule: "*/10 * * * *" };

export default async function raceSite() {
  const env = process.env;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    console.warn("[yarış sitesi] ayar eksik");
    return new Response("ayar eksik");
  }
  if (!getApps().length)
    initializeApp({ credential: cert({ projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: cleanEmail(env.FIREBASE_CLIENT_EMAIL), privateKey: cleanKey(env.FIREBASE_PRIVATE_KEY) }) });
  const db = getFirestore();
  const snap = await db.collection("raceSite").where("on", "==", true).get();
  const ids = [];
  for (const d of snap.docs) {
    const e = d.data();
    // Yarışın güncel tarihleri (yarış silinmişse izleme biter)
    const race = await db.collection("orgs").doc(e.orgId).collection("races").doc(e.raceId).get().catch(() => null);
    if (race && !race.exists) {
      await d.ref.set({ on: false }, { merge: true });
      continue;
    }
    const r = race?.data() || {};
    if (dueNow({ ...e, startDate: r.startDate || e.startDate, endDate: r.endDate || e.endDate })) ids.push(d.id);
  }
  // Sitede yeni yarış taraması saatte bir
  const known = (await db.collection("raceSite").doc(KNOWN).get()).data() || {};
  const scan = Date.now() - (Date.parse(known.scanAt || "") || 0) >= 55 * 60e3;
  if (!ids.length && !scan) return new Response("sırası gelen yok");
  const base = env.URL || "https://sesliasistan.netlify.app";
  const t = String(Date.now());
  const res = await fetch(`${base}/.netlify/functions/race-site-background`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids, scan, t, s: ackSig("race-site", scan ? "scan" : "run", t, ids.join(",")) }) }).catch((e) => ({ status: e.message }));
  return new Response(`çağrıldı ${ids.length} (${res.status})`);
}
