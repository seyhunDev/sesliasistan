"use client";

// Mesaj eki yükleme: fotoğraf telefonda küçültülür, dosya ve ses olduğu gibi; yol lib/chatFile.js'te.
import { deleteObject, getDownloadURL, getStorage, ref as sref, uploadBytesResumable } from "firebase/storage";
import { app } from "@/lib/firebase/clientApp";
import { cleanChatFile, kindOfFile, tooBig } from "@/lib/chatFile";

const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3;
  return s;
};
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const safeName = (n) => String(n || "dosya").replace(/[^\w.\-]+/g, "_").slice(-60);

// Fotoğrafı en çok 1600 px JPEG yapar; { blob, w, h }. Açılamazsa dosyanın kendisi.
async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("açılamadı"));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
    return blob ? { blob, w, h } : { blob: file, w, h };
  } catch {
    return { blob: file };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Yükler, mesaja yazılacak künyeyi döndürür. onProgress(0..1). Hata fırlatır (yazısı ekranda gösterilir).
export async function uploadChatFile(orgId, cid, uid, file, { sec, onProgress } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("İnternet bağlantısı yok.");
  const kind = kindOfFile(file.type);
  let blob = file;
  let type = file.type || "application/octet-stream";
  let dims = {};
  if (kind === "photo") {
    const s = await shrinkPhoto(file);
    blob = s.blob;
    type = blob.type || type;
    if (s.w) dims = { w: s.w, h: s.h };
  }
  const big = tooBig(kind, blob.size);
  if (big) throw new Error(big);
  const id = newId();
  const ext = kind === "photo" ? ".jpg" : kind === "voice" ? (/mp4|aac/.test(type) ? ".m4a" : /ogg/.test(type) ? ".ogg" : ".webm") : "";
  const path = `orgs/${orgId}/chatFiles/${cid}/${uid}/${id}${kind === "file" ? `_${safeName(file.name)}` : ext}`;
  const r = sref(store(), path);
  const task = uploadBytesResumable(r, blob, { contentType: type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) =>
    task.on(
      "state_changed",
      (s) => onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      (e) => rej(new Error(e?.code === "storage/unauthorized" ? "Dosya yükleme izni yok. Ana hesap Storage kurallarını yayınlamalı." : "Dosya yüklenemedi.")),
      res,
    ),
  );
  const url = await getDownloadURL(r);
  return cleanChatFile({ kind, name: kind === "file" ? file.name : "", type, size: blob.size, path, url, sec, ...dims });
}

export async function dropChatFile(path) {
  if (!path) return;
  try {
    await deleteObject(sref(store(), path));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") console.warn("[chat] ek silinemedi", e?.code || e);
  }
}
