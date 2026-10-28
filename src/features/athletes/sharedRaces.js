"use client";

// Ortak yarışların Firestore tarafı (lib/sharedRace.js): sharedRaces/{id}, sheets/{dosya}, live/wind, course/{gün}.
// Kulübün yarışı kaydedilince ortak kısım yayınlanır (yalnız ekleyen ve ana hesap yazabilir; diğerlerinde sessizce atlanır),
// bağlı yarış açılınca ortaktaki yenilik ve yeni sonuç listeleri kulübün yarışına işlenir.
import { arrayUnion, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { auth, db } from "@/lib/firebase/clientApp";
import { canEditShared, sameRace, sameShared, sharedOf } from "@/lib/sharedRace";
import { cleanWind } from "@/lib/raceLive";
import { cleanCourse } from "@/lib/raceCourse";
import { mergeSheet, rankOurs } from "@/lib/resultSheet";
import { loadSheets, saveSheet } from "./raceLiveStore";
import { linkRace } from "./races";

const col = () => collection(db, "sharedRaces");
const one = (id) => doc(db, "sharedRaces", id);
const now = () => new Date().toISOString();
const seen = new Map(); // id → son okunan/yazılan ortak belge (aynı oturumda tekrar okunmaz)

export async function loadShared(id, fresh = false) {
  if (!id) return null;
  if (!fresh && seen.has(id)) return seen.get(id);
  const snap = await getDoc(one(id));
  const s = snap.exists() ? { id, ...snap.data() } : null;
  seen.set(id, s);
  return s;
}

// Yeni yarışta seçilebilecekler: bugünden 10 gün öncesinden başlayanlar
export async function loadSharedList(today) {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 10);
  const from = d.toISOString().slice(0, 10);
  const snap = await getDocs(query(col(), where("startDate", ">=", from)));
  return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
}

// Kulübün yarışını ortağa yazar. link: { shared, sharedAt } (yarışın şimdiki bağı).
// Dönüş yeni bağ { shared, sharedAt } ya da değişiklik yoksa null.
export async function publishRace({ orgId, uid, email, name, race, link }) {
  const data = sharedOf(race);
  if (!data) return null;
  if (link?.shared) {
    const s = await loadShared(link.shared).catch(() => undefined);
    if (s === undefined || (s && !canEditShared(s, uid, email))) return null;
    if (s) {
      if (sameShared(sharedOf(s), data)) return null;
      const at = now();
      await setDoc(one(s.id), { ...data, at }, { merge: true });
      seen.set(s.id, { ...s, ...data, at });
      return { shared: s.id, sharedAt: at };
    }
    // Ortak belge silinmiş: yeniden açılır
  }
  const same = (await getDocs(query(col(), where("startDate", "==", data.startDate)))).docs.map((x) => ({ id: x.id, ...x.data() })).find((s) => sameRace(s, data));
  if (same) {
    seen.set(same.id, same);
    return { shared: same.id, sharedAt: same.at || "" };
  }
  const ref = doc(col());
  const at = now();
  const s = { ...data, by: uid, byName: String(name || "").slice(0, 80), createdAt: at, at, sheets: [] };
  await setDoc(ref, s);
  seen.set(ref.id, { id: ref.id, ...s });
  // Önceden yüklenmiş sonuç listeleri de ortağa
  const files = (race.results?.files || []).filter((f) => f.url);
  const sheets = files.length && race.id ? await loadSheets(orgId, race.id).catch(() => []) : [];
  for (const f of files) {
    const sh = sheets.find((x) => x.id === f.id);
    if (sh?.fleets) await saveSharedSheet(ref.id, f, sh.fleets).catch(() => {});
  }
  return { shared: ref.id, sharedAt: at, created: true };
}

// Sonuç listesi ortağa (yalnız ekleyen ve ana hesap; diğerlerinde kural reddeder, sessiz)
export async function saveSharedSheet(sharedId, file, fleets) {
  if (!sharedId || !file?.id || !file.url) return;
  const meta = { id: file.id, name: String(file.name || "sonuç.pdf").slice(0, 120), size: Number(file.size) || 0, at: String(file.at || ""), path: file.path || "", url: file.url };
  await setDoc(doc(one(sharedId), "sheets", file.id), { fleets, file: meta, at: now() });
  await setDoc(one(sharedId), { sheets: arrayUnion(file.id) }, { merge: true }); // at değişmez: yalnız sonuç eklendi
  seen.delete(sharedId);
}

// Ortaktaki yeni sonuç listelerinden kulübün sporcularını bulur. ids: newSheets; pool: aranacak sporcular.
// Dönüş { results, extra } ya da yeni bir şey yoksa null. Bütün liste kulübün raceLive kaydına da yazılır (Genel sıralama).
export async function pullSheets({ orgId, race, sharedId, ids, pool }) {
  let res = race.results || { fleet: "", rows: {} };
  let got = false;
  for (const fid of ids) {
    const snap = await getDoc(doc(one(sharedId), "sheets", fid)).catch(() => null);
    const d = snap?.exists() ? snap.data() : null;
    if (!d?.fleets || !d.file?.id) continue;
    await saveSheet(orgId, race.id, d.file.id, d.fleets).catch(() => {});
    res = mergeSheet(res, rankOurs(d.fleets, pool), d.file);
    got = true;
  }
  if (!got) return null;
  const extra = Object.keys(res.rows || {}).filter((id) => !(race.athleteIds || []).includes(id));
  return { results: res, extra };
}

// Ölçülen rüzgâr ortağa (multimedya sayfası; yalnız ekleyen ve ana hesap). Parkur sharedRaces/{id}/course/{gün} (raceCourse.js biçimi) aynı kuralla yazılır.
export const shareWind = (sharedId, list) => sharedId && setDoc(doc(one(sharedId), "live", "wind"), { wind: cleanWind(list), at: now() }).catch(() => {});
export async function loadSharedWind(sharedId) {
  if (!sharedId) return [];
  const w = await getDoc(doc(one(sharedId), "live", "wind")).catch(() => null);
  return cleanWind(w?.exists() ? w.data().wind : []);
}

// Ortağa yazabilir mi (ekleyen kulüp ya da ana hesap): başkasının yazması kuralda reddedilir, ret ekranda "kaydedilemedi" uyarısı
// olurdu (firebase/write.js); bu yüzden yazmadan önce bakılır
export async function canShare(sharedId) {
  const u = auth.currentUser;
  if (!sharedId || !u) return false;
  const s = await loadShared(sharedId).catch(() => null);
  return canEditShared(s, u.uid, u.email);
}
// Parkur (Parkur sekmesi): gün gün sharedRaces/{id}/course/{gün}, kulübün kaydıyla aynı biçim (raceCourse.js cleanCourse; kişi bilgisi yok)
export const shareCourse = (sharedId, day, c) => sharedId && day && setDoc(doc(one(sharedId), "course", day), { ...cleanCourse(c), at: now() }).catch(() => {});
export async function loadSharedCourse(sharedId, day) {
  if (!sharedId || !day) return null;
  const s = await getDoc(doc(one(sharedId), "course", day)).catch(() => null);
  return s?.exists() ? cleanCourse(s.data()) : null;
}

// Yayınlar; kulübün yarışında kayıtlı bağ (race.shared) yeni bağdan farklıysa yazar. Dönüş yeni bağ ya da null
export async function shareRace({ orgId, uid, email, name, race, link }) {
  const l = await publishRace({ orgId, uid, email, name, race, link });
  const want = l || link;
  if (want?.shared && race.id && (want.shared !== race.shared || (want.sharedAt || "") !== (race.sharedAt || ""))) await linkRace(orgId, race.id, want);
  return l;
}

// Eski yarışlar ortağa (Yarışlar açılınca oturumda bir kez): bağı olmayan, adı ve tarihi olan yarışlar
let movedFor = "";
export async function shareAll({ orgId, uid, email, name, races }) {
  if (movedFor === orgId) return;
  movedFor = orgId;
  for (const r of races || []) {
    if (r.shared || !sharedOf(r)) continue;
    await shareRace({ orgId, uid, email, name, race: r, link: null }).catch((e) => console.warn("[ortak yarış] aktarılamadı", r.name, e?.code || e));
  }
}
