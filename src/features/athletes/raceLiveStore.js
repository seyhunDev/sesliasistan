"use client";

// Yarış multimedya sayfasının kaydı (lib/raceLive.js): orgs/{org}/raceLive/{yarışId} belgesi (rüzgâr, startlar, fotoğraf/video künyeleri)
// ve sonuç belgesinden okunan bütün liste orgs/{org}/raceLive/{yarışId}/sheets/{belgeId} (genel sıralama; kulüp, doğum yılı, puan).
// Yarış belgesinden ayrı durur: yarış sayfası kaydedince bu alanlar ezilmez. Fotoğraf ve video Storage'da orgs/{org}/raceMedia/{id}
// (kural storage.rules: yalnız ana hesap). Fotoğraf 2048 px JPEG; video (en çok 2 dk) iPhone'un çektiği gibi (sesli) saklanır, çok büyükse küçültülür (prepRaceMedia).
import { arrayUnion, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { deleteDoc, setDoc } from "@/lib/firebase/write";
import { deleteObject, getDownloadURL, getStorage, ref as sref, uploadBytesResumable } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { compressImage } from "@/lib/image";
import { cleanBuoys, cleanDays, cleanLive, cleanMedia, cleanStarts, cleanWind } from "@/lib/raceLive";
import { isVideoFile, shrinkVideo, videoMeta } from "@/features/fitness/fitMedia";

const VIDEO_SEC = 120;
const VIDEO_MAX = 58 * 1024 * 1024; // storage.rules raceMedia: 60 MB
const live = (orgId, id) => doc(db, "orgs", orgId, "raceLive", id);
const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3;
  return s;
};
const mpath = (orgId, id) => `orgs/${orgId}/raceMedia/${id}`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function loadLive(orgId, id) {
  const snap = await getDoc(live(orgId, id));
  return cleanLive(snap.exists() ? snap.data() : {});
}

export const addWind = (orgId, id, w) => setDoc(live(orgId, id), { wind: arrayUnion(cleanWind([w])[0]) }, { merge: true });
export const saveWind = (orgId, id, list) => setDoc(live(orgId, id), { wind: cleanWind(list) }, { merge: true });
export const saveBuoys = (orgId, id, list) => setDoc(live(orgId, id), { buoys: cleanBuoys(list) }, { merge: true });
export const saveDays = (orgId, id, list) => setDoc(live(orgId, id), { days: cleanDays(list) }, { merge: true });
export const saveStarts = (orgId, id, list) => setDoc(live(orgId, id), { starts: cleanStarts(list) }, { merge: true });
// Bütün künye listesi (sporcu etiketi değişince)
export const saveMedia = (orgId, id, list) => setDoc(live(orgId, id), { media: cleanMedia(list) }, { merge: true });

// Seçilen ya da çekilen dosya → saklanacak hâl: { blob, type, kind }. onProg(0..1) küçültme ilerlemesi
// Kurallar (Seyhun 2026-10-20: "iPhone'un kendi kamerası"): fotoğraf 2048 px JPEG; video en çok 2 dakika, iPhone'un çektiği dosya
// olduğu gibi saklanır (ses, kalite ve yön korunur). Storage sınırını (60 MB) aşarsa 1280 px'e sesli küçültülür (video süresi kadar sürer).
// Uygulama içi (sayaçlı) kameranın videosu zaten küçük ve sessizdir.
const RAW_MAX = 55 * 1024 * 1024;
export async function prepRaceMedia(file, onProg) {
  if (!isVideoFile(file)) {
    const img = await compressImage(file, 2048, 0.85);
    const bytes = Uint8Array.from(atob(img.base64), (ch) => ch.charCodeAt(0));
    return { blob: new Blob([bytes], { type: "image/jpeg" }), type: "image/jpeg", kind: "photo" };
  }
  const url = URL.createObjectURL(file);
  try {
    const v = await videoMeta(url);
    if (v.duration && isFinite(v.duration) && v.duration > VIDEO_SEC + 1) throw new Error("Video en çok 2 dakika olabilir. Daha kısa çek.");
    const dur = v.duration && isFinite(v.duration) ? Math.round(v.duration) : 0;
    const type = file.type || (/\.mov$/i.test(file.name || "") ? "video/quicktime" : "video/mp4");
    if (file.size <= RAW_MAX) return { blob: file, type, kind: "video", dur };
    let blob;
    try {
      blob = await shrinkVideo(v, onProg, 1280, 3_000_000, true);
    } catch (e) {
      if (e.message !== "no-shrink") console.warn("[raceMedia] küçültülemedi", e);
      throw new Error("Video çok büyük ve bu telefonda küçültülemedi. Daha kısa çek.");
    }
    if (blob.size > VIDEO_MAX) throw new Error("Video çok büyük. Daha kısa çek.");
    return { blob, type: blob.type, kind: "video", dur };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Paylaşmak için sessiz kopya (Seyhun 2026-10-20: "bazılarının sesini kapatmak isteyebilirim"): kayıttaki video sesli kalır.
// Telefon videoyu baştan oynatıp sessiz yeniden kaydeder (video süresi kadar sürer). onProg(0..1)
export async function mutedCopy(blob, onProg) {
  const url = URL.createObjectURL(blob);
  try {
    const v = await videoMeta(url);
    return await shrinkVideo(v, onProg, 1920, 6_000_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Yükler ve yarışa yazar; künyeyi döndürür. at: çekildiği an (ISO); extra: start sayacına göre an (lib/raceLive.js momentOf)
export async function addRaceMedia(orgId, id, m, at, onProg, extra = null) {
  const mid = newId();
  const r = sref(store(), mpath(orgId, mid));
  const task = uploadBytesResumable(r, m.blob, { contentType: m.type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProg?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
  const meta = cleanMedia([{ id: mid, kind: m.kind, type: m.type, size: m.blob.size, url: await getDownloadURL(r), at, ...extra }])[0];
  await setDoc(live(orgId, id), { media: arrayUnion(meta) }, { merge: true });
  return meta;
}

// rest: kalan liste (arrayRemove birebir aynı nesneyi ister; etiket alanı eklenince eski künyeler eşleşmez)
export async function dropRaceMedia(orgId, id, meta, rest) {
  await setDoc(live(orgId, id), { media: cleanMedia(rest) }, { merge: true });
  await deleteObject(sref(store(), mpath(orgId, meta.id))).catch(() => {});
}

// Sonuç belgesinin bütün listesi (genel sıralama)
const sheets = (orgId, id) => collection(db, "orgs", orgId, "raceLive", id, "sheets");
export const saveSheet = (orgId, id, fileId, fleets) => setDoc(doc(sheets(orgId, id), fileId), { fleets, at: new Date().toISOString() });
export const dropSheetDoc = (orgId, id, fileId) => deleteDoc(doc(sheets(orgId, id), fileId)).catch(() => {});
export async function loadSheets(orgId, id) {
  const snap = await getDocs(sheets(orgId, id));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// Denemeleri sıfırla: patch (lib/raceLive.js resetPatch) belgeye yazılır; media boşaltılıyorsa dosyalar da silinir
export async function resetLive(orgId, id, patch, media = []) {
  await setDoc(live(orgId, id), patch, { merge: true });
  if (patch.media) for (const m of media) await deleteObject(sref(store(), mpath(orgId, m.id))).catch(() => {});
}

// Yarış silinince: dosyalar, listeler ve kayıt
export async function dropLive(orgId, id) {
  const l = await loadLive(orgId, id).catch(() => null);
  for (const m of l?.media || []) await deleteObject(sref(store(), mpath(orgId, m.id))).catch(() => {});
  const sh = await getDocs(sheets(orgId, id)).catch(() => null);
  for (const d of sh?.docs || []) await deleteDoc(d.ref).catch(() => {});
  await deleteDoc(live(orgId, id)).catch(() => {});
}
