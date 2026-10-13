"use client";

// Fitness hareketine eklenen fotoğraf ve kısa video (hareketin nasıl yapıldığı). Firebase Storage yok (Blaze ister);
// envanter belgeleri gibi Firestore'da 900 KB'lık parçalar: orgs/{org}/fitMedia/{id}/parts/{000..} { data: Bytes }.
// Harekette yalnız künye durur: media [{ id, type, size, parts, kind photo|video }] (en çok 3). Sporcu kendi planındaki
// hareketin dosyasını okur (kural: fitMedia çalışan/sporcuya okumaya açık). Dosya bir kez okunur, sonra bu cihazda (IndexedDB) kalır.
// Fotoğraf 1280 px JPEG'e küçültülür. Video en çok 60 sn; 6 MB'tan büyükse telefonda 640 px'e küçültülerek yeniden kaydedilir
// (video süresi kadar sürer); küçültülemezse en çok 20 MB kabul edilir.
import { Bytes, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { compressImage } from "@/lib/image";
import { dropRaceFile, getRaceFile, saveRaceFile } from "@/features/athletes/raceFiles";

const PART = 900_000;
export const MEDIA_MAX = 3;
const VIDEO_SEC = 60;
const VIDEO_OK = 6 * 1024 * 1024;
const VIDEO_MAX = 20 * 1024 * 1024;
const col = (orgId) => collection(db, "orgs", orgId, "fitMedia");
const cacheKey = (id) => `fitm:${id}`;

export const isVideoFile = (f) => /^video\//.test(f?.type || "") || /\.(mov|mp4|m4v|webm)$/i.test(f?.name || "");
const isImageFile = (f) => /^image\//.test(f?.type || "") || /\.(jpe?g|png|heic|heif|webp)$/i.test(f?.name || "");

function videoMeta(url) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => res(v);
    v.onerror = () => rej(new Error("Video açılamadı"));
    v.src = url;
  });
}

function recType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}

// Videoyu 640 px'e küçültüp yeniden kaydeder (sessiz; hareket gösterimi). onProg(0..1)
async function shrinkVideo(v, onProg) {
  const type = recType();
  const c = document.createElement("canvas");
  if (!type || !c.captureStream) throw new Error("no-shrink");
  const k = Math.min(1, 640 / Math.max(v.videoWidth || 640, v.videoHeight || 640));
  c.width = Math.max(2, Math.round((v.videoWidth || 640) * k / 2) * 2);
  c.height = Math.max(2, Math.round((v.videoHeight || 360) * k / 2) * 2);
  const ctx = c.getContext("2d");
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: 900_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  let on = true;
  const draw = () => {
    if (!on) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    onProg?.(Math.min(1, v.currentTime / (v.duration || 1)));
    requestAnimationFrame(draw);
  };
  v.currentTime = 0;
  rec.start(1000);
  await v.play();
  draw();
  await new Promise((res) => (v.onended = res));
  on = false;
  rec.stop();
  await done;
  const blob = new Blob(chunks, { type: type.split(";")[0] });
  if (!blob.size) throw new Error("no-shrink");
  return blob;
}

// Seçilen dosyayı saklanacak hâle getirir: { blob, type, kind }
export async function prepMedia(file, onProg) {
  if (isImageFile(file)) {
    const img = await compressImage(file, 1280, 0.75);
    const bytes = Uint8Array.from(atob(img.base64), (ch) => ch.charCodeAt(0));
    return { blob: new Blob([bytes], { type: "image/jpeg" }), type: "image/jpeg", kind: "photo" };
  }
  if (!isVideoFile(file)) throw new Error("Fotoğraf ya da video seç.");
  const url = URL.createObjectURL(file);
  try {
    const v = await videoMeta(url);
    if (v.duration && isFinite(v.duration) && v.duration > VIDEO_SEC + 1) throw new Error(`Video en çok ${VIDEO_SEC} saniye olabilir.`);
    if (file.size <= VIDEO_OK) return { blob: file, type: file.type || "video/mp4", kind: "video" };
    try {
      const blob = await shrinkVideo(v, onProg);
      if (blob.size < file.size) return { blob, type: blob.type, kind: "video" };
    } catch (e) {
      if (e.message !== "no-shrink") console.warn("[fitMedia] küçültülemedi", e);
    }
    if (file.size > VIDEO_MAX) throw new Error("Video çok büyük (en çok 20 MB). Daha kısa çek.");
    return { blob: file, type: file.type || "video/mp4", kind: "video" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Parça parça yazar, künyeyi döndürür
export async function saveMedia(orgId, m) {
  const bytes = new Uint8Array(await m.blob.arrayBuffer());
  const ref = doc(col(orgId));
  const parts = Math.max(1, Math.ceil(bytes.length / PART));
  for (let i = 0; i < parts; i += 8) {
    const batch = writeBatch(db);
    for (let j = i; j < Math.min(parts, i + 8); j++) batch.set(doc(ref, "parts", String(j).padStart(3, "0")), { data: Bytes.fromUint8Array(bytes.subarray(j * PART, (j + 1) * PART)) });
    await batch.commit();
  }
  await setDoc(ref, { kind: m.kind, type: m.type, size: bytes.length, parts, createdAt: serverTimestamp() });
  await saveRaceFile({ id: cacheKey(ref.id), blob: m.blob, name: ref.id });
  return { id: ref.id, kind: m.kind, type: m.type, size: bytes.length, parts };
}

// Dosyayı getirir: önce bu cihazdan, yoksa Firestore'dan (parça sayısı kadar okuma)
export async function loadMedia(orgId, meta) {
  const hit = await getRaceFile(cacheKey(meta.id));
  if (hit?.blob) return hit.blob;
  const snap = await getDocs(collection(db, "orgs", orgId, "fitMedia", meta.id, "parts"));
  const list = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map((d) => d.data().data?.toUint8Array?.());
  if (!list.length || list.length < (meta.parts || 1) || list.some((x) => !x)) throw new Error("Dosya bulunamadı");
  const blob = new Blob(list, { type: meta.type || (meta.kind === "video" ? "video/mp4" : "image/jpeg") });
  saveRaceFile({ id: cacheKey(meta.id), blob, name: meta.id });
  return blob;
}

// Siler; hata sessiz
export async function dropMedia(orgId, meta) {
  if (!meta?.id) return;
  try {
    const ref = doc(col(orgId), meta.id);
    const batch = writeBatch(db);
    for (let j = 0; j < (meta.parts || 1); j++) batch.delete(doc(ref, "parts", String(j).padStart(3, "0")));
    await batch.commit();
    await deleteDoc(ref);
  } catch {}
  dropRaceFile(cacheKey(meta.id));
}
