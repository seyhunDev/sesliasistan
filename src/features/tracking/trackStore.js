"use client";

// Tekne takibinin Firestore işleri (lib/boatTrack.js). takip/{yarış}: ana hesap açar/kapatır; takip/{yarış}/tekne/{yelken}: teknedeki
// telefon anahtarla yazar (giriş yok), ana hesap canlı dinler. Herkese açık yayın konumları /api/canli üzerinden okur.
import { collection, doc, onSnapshot, setDoc as fsSet } from "firebase/firestore";
import { readServer } from "@/lib/firebase/fastRead";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { KEY, cleanBoats, cleanFix, cleanSail, newKey } from "@/lib/boatTrack";

const head = (raceId) => doc(db, "takip", raceId);
const boats = (raceId) => collection(db, "takip", raceId, "tekne");

// { on, map, k } (yoksa kapalı, anahtarsız)
export async function loadTrack(raceId) {
  const snap = await readServer(head(raceId)).catch(() => null);
  const d = snap?.exists?.() ? snap.data() : {};
  return { on: d.on === true, map: d.map !== false, k: KEY.test(d.k || "") ? d.k : "" };
}
// Takibi aç/kapat (ilk açılışta anahtar üretilir; kapatınca anahtar kalır, link yeniden açılınca çalışır)
export async function saveTrack(orgId, raceId, cur, patch) {
  const k = cur?.k || newKey();
  const next = { on: !!(patch.on ?? cur?.on), map: patch.map ?? cur?.map ?? true, k };
  await setDoc(head(raceId), { org: orgId, ...next, at: new Date().toISOString() });
  return next;
}
// Ana hesap: teknelerin son konumları canlı (her konum bir okuma)
export function watchBoats(raceId, cb) {
  return onSnapshot(
    boats(raceId),
    (snap) => cb(cleanBoats(snap.docs.map((d) => ({ sail: d.id, ...d.data() })))),
    () => cb([]),
  );
}
// Teknedeki telefon: konumu yazar (bekletmeden; internet yoksa Firestore sıraya alır, son konum gider)
export function sendFix(raceId, sail, k, fix) {
  const s = cleanSail(sail);
  const f = cleanFix(fix);
  if (!s || !f || !KEY.test(k || "")) return Promise.reject(new Error("bad"));
  return fsSet(doc(db, "takip", raceId, "tekne", s), { k, ...f });
}
