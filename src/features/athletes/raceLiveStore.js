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

// Küçük resim (Seyhun 2026-10-21: "sürekli video yüklemesi olmasın"): listede videonun kendisi yerine ilk karesinden 480 px JPEG.
// Çekilince telefonda hazırlanır, dosyanın yanına `<id>-k` adıyla yüklenir. Olmazsa null (liste eskisi gibi videodan gösterir).
export async function posterOf(blob, kind) {
  const url = URL.createObjectURL(blob);
  try {
    const src = await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("zaman")), 10000);
      const ok = (x) => (clearTimeout(t), res(x));
      const no = () => (clearTimeout(t), rej(new Error("açılamadı")));
      if (kind !== "video") {
        const im = new Image();
        im.onload = () => ok(im);
        im.onerror = no;
        im.src = url;
        return;
      }
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.onloadeddata = () => {
        v.onseeked = () => ok(v);
        v.currentTime = Math.min(0.3, (v.duration || 1) / 2);
      };
      v.onerror = no;
      v.src = url;
    });
    const w0 = src.videoWidth || src.naturalWidth;
    const h0 = src.videoHeight || src.naturalHeight;
    if (!w0 || !h0) return null;
    const k = Math.min(1, 480 / Math.max(w0, h0));
    const c = document.createElement("canvas");
    c.width = Math.round(w0 * k);
    c.height = Math.round(h0 * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.72));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
const tpath = (orgId, id) => `${mpath(orgId, id)}-k`;
async function putPoster(orgId, mid, poster) {
  if (!poster) return "";
  try {
    const r = sref(store(), tpath(orgId, mid));
    await uploadBytesResumable(r, poster, { contentType: "image/jpeg", cacheControl: "private, max-age=31536000" });
    return await getDownloadURL(r);
  } catch {
    return "";
  }
}

// Yükler ve yarışa yazar; künyeyi döndürür. at: çekildiği an (ISO); extra: start sayacına göre an (lib/raceLive.js momentOf)
export async function addRaceMedia(orgId, id, m, at, onProg, extra = null) {
  const mid = newId();
  const r = sref(store(), mpath(orgId, mid));
  const poster = await posterOf(m.blob, m.kind);
  const task = uploadBytesResumable(r, m.blob, { contentType: m.type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProg?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
  const thumb = await putPoster(orgId, mid, poster);
  const meta = cleanMedia([{ id: mid, kind: m.kind, type: m.type, size: m.blob.size, url: await getDownloadURL(r), at, thumb, ...extra }])[0];
  await setDoc(live(orgId, id), { media: arrayUnion(meta) }, { merge: true });
  return meta;
}

// rest: kalan liste (arrayRemove birebir aynı nesneyi ister; etiket alanı eklenince eski künyeler eşleşmez)
export async function dropRaceMedia(orgId, id, meta, rest) {
  await setDoc(live(orgId, id), { media: cleanMedia(rest) }, { merge: true });
  await deleteObject(sref(store(), mpath(orgId, meta.id))).catch(() => {});
  if (meta.thumb) await deleteObject(sref(store(), tpath(orgId, meta.id))).catch(() => {});
}

// Küçük resmi olmayan eski kayıt: dosya bir kez indirilir, küçük resim yapılıp yüklenir ve kayda yazılır. Küçük resmin adresini döndürür.
export async function backfillPoster(orgId, id, meta) {
  const res = await fetch(meta.url);
  if (!res.ok) return "";
  const thumb = await putPoster(orgId, meta.id, await posterOf(await res.blob(), meta.kind));
  if (!thumb) return "";
  const l = await loadLive(orgId, id);
  await saveMedia(orgId, id, l.media.map((x) => (x.id === meta.id ? { ...x, thumb } : x)));
  return thumb;
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
  if (patch.media) for (const m of media) for (const p of [mpath(orgId, m.id), tpath(orgId, m.id)]) await deleteObject(sref(store(), p)).catch(() => {});
}

// Yarış silinince: dosyalar, listeler ve kayıt
export async function dropLive(orgId, id) {
  const l = await loadLive(orgId, id).catch(() => null);
  for (const m of l?.media || []) for (const p of [mpath(orgId, m.id), tpath(orgId, m.id)]) await deleteObject(sref(store(), p)).catch(() => {});
  const sh = await getDocs(sheets(orgId, id)).catch(() => null);
  for (const d of sh?.docs || []) await deleteDoc(d.ref).catch(() => {});
  await deleteDoc(live(orgId, id)).catch(() => {});
}
