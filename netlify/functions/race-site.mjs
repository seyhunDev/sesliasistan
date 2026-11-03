// Yarış sitesi belgeleri (Seyhun 2026-11-03 "siteye yüklendiğinde hemen alıp kullanmamız gerekiyor"): 10 dakikada bir çalışır.
// İzlenen yarışlar raceSite/{org}_{yarış} kayıtlarında (Yarışlar › Siteden ekranından seçilir, /api/race-site yazar).
// Yarış günlerinde (başlangıçtan bir gün önce – bitişten bir gün sonra) her çalışmada, diğer günlerde günde bir bakılır;
// yeni belge Storage'a ve yarışın site listesine yazılır, ana hesaba bildirim gider (lib/server/raceSiteSync.js).
// Gerekli ortam değişkenleri: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { cleanEmail, cleanKey } from "../../src/lib/pemKey.js";
import { recordInbox } from "../../src/lib/inbox.js";
import { sendDevice } from "../../src/lib/server/sendDevice.js";
import { docNote } from "../../src/lib/siteDocs.js";
import { dueNow, notifyDocs, pageCache, syncRace } from "../../src/lib/server/raceSiteSync.js";

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
  const bucket = getStorage().bucket(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  if (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
    try {
      webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    } catch (e) {
      console.warn("[yarış sitesi] VAPID", e.message);
    }
  const snap = await db.collection("raceSite").where("on", "==", true).get();
  const get = pageCache();
  let n = 0;
  for (const d of snap.docs) {
    let entry = d.data();
    // Yarışın güncel adı ve tarihleri (yarış silinmişse izleme biter)
    const race = await db.collection("orgs").doc(entry.orgId).collection("races").doc(entry.raceId).get().catch(() => null);
    if (race && !race.exists) {
      await d.ref.set({ on: false }, { merge: true });
      continue;
    }
    const r = race?.data() || {};
    entry = { ...entry, name: r.name || entry.name, startDate: r.startDate || entry.startDate, endDate: r.endDate || entry.endDate };
    if (!dueNow(entry)) continue;
    try {
      const got = await syncRace({ db, bucket, ref: d.ref, entry, get });
      n += got.length;
      await notifyDocs({ db, entry, got, recordInbox, sendDevice, docNote }).catch((e) => console.warn("[yarış sitesi] bildirim", e.message));
    } catch (e) {
      console.warn("[yarış sitesi]", entry.name, e.message);
    }
  }
  return new Response(`ok ${n}`);
}
