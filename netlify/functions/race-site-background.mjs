// Yarış sitesi belgeleri, arka plan (en çok 15 dk): race-site.mjs (10 dk zamanlayıcı) ve /api/race-site (yarışı alınca) çağırır.
// Saatte bir sitede yeni yarış var mı bakar (scan). İzlenen yarışın yeni belgelerini indirir, Storage'a koyar, hemen kullanır (renk/sporcu listesi, talimat, ek talimat;
// lib/server/raceSiteTake.js) ve ana hesaba bildirir. İstek imzalı: { ids, t, s } (lib/server/ackSign.js).
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { cleanEmail, cleanKey } from "../../src/lib/pemKey.js";
import { ackOk } from "../../src/lib/server/ackSign.js";
import { recordInbox } from "../../src/lib/inbox.js";
import { sendDevice } from "../../src/lib/server/sendDevice.js";
import { docNote, newRaces, newRacesNote } from "../../src/lib/siteDocs.js";
import { notifyDocs, pageCache, scanNew, syncRace } from "../../src/lib/server/raceSiteSync.js";
import { makeTake } from "../../src/lib/server/raceSiteTake.js";
import { callGemini } from "../../src/lib/ai/gemini.js";
import { readNoticeAi } from "../../src/lib/ai/raceNoticeAi.js";

export default async function raceSiteRun(req) {
  let a = {};
  try {
    a = await req.json();
  } catch {}
  const ids = (Array.isArray(a.ids) ? a.ids : []).map(String).filter((x) => /^[A-Za-z0-9]{6,40}_[A-Za-z0-9]{6,40}$/.test(x)).slice(0, 20);
  const scan = a.scan === true;
  if ((!ids.length && !scan) || Math.abs(Date.now() - Number(a.t)) > 10 * 60e3 || !ackOk({ o: "race-site", c: scan ? "scan" : "run", i: String(a.t), u: ids.join(","), s: a.s })) return new Response("izin yok", { status: 403 });
  const env = process.env;
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
  const get = pageCache();
  const ai = { callGemini, readNoticeAi };
  let n = 0;
  // Sitede yeni yarış (saatte bir, zamanlayıcı scan ile çağırır)
  if (scan) n += await scanNew({ db, get, recordInbox, sendDevice, newRaces, newRacesNote }).catch((e) => (console.warn("[yarış sitesi] tarama", e.message), 0));
  for (const id of ids) {
    const ref = db.collection("raceSite").doc(id);
    const snap = await ref.get();
    const entry = snap.data();
    if (!entry?.on) continue;
    // Önceki çalışma sürüyorsa (12 dakikadan yeni) atlanır
    if (Date.now() - (Date.parse(entry.busy || "") || 0) < 12 * 60e3) continue;
    await ref.set({ busy: new Date().toISOString() }, { merge: true });
    try {
      const race = (await db.collection("orgs").doc(entry.orgId).collection("races").doc(entry.raceId).get()).data() || {};
      const e = { ...entry, name: race.name || entry.name, startDate: race.startDate || entry.startDate, endDate: race.endDate || entry.endDate };
      // İlk alışta eski belgeler sessiz (bildirim yalnız sonradan gelenlere)
      const first = !(entry.seen || []).length;
      const got = await syncRace({ db, bucket, ref, entry: e, get, take: makeTake({ db, orgId: e.orgId, raceId: e.raceId, ai }) });
      n += got.length;
      if (!first) await notifyDocs({ db, entry: e, got, recordInbox, sendDevice, docNote }).catch((x) => console.warn("[yarış sitesi] bildirim", x.message));
    } catch (x) {
      console.warn("[yarış sitesi]", entry.name, x.message);
    }
    await ref.set({ busy: "" }, { merge: true }).catch(() => {});
  }
  return new Response(`ok ${n}`);
}
