"use client";

// Fiş fotoğrafı Firebase Storage'da: orgs/{org}/receiptImages/{ekleyen uid}/{fiş id}_{zaman}.jpg
// (kural storage.rules: ana hesap hepsini, çalışan kendi eklediğini okur/yazar). Fişte imgPath + imgUrl durur.
// Eski fişlerin fotoğrafı Firestore'da (orgs/{org}/receiptImages/{id} { data }) kalır, oradan okunmaya devam eder.
// Fotoğraf değişince yeni ad alır (eski adres tarayıcı önbelleğinden eski fotoğrafı göstermesin), eskisi silinir.
// Yükleme bitene kadar fotoğraf bellekte tutulur (pending), fiş ekranı beklemeden gösterir.
// İnternet yoksa ya da yükleme olmazsa çağıran eski yola (Firestore belgesi) döner.
import { deleteObject, getStorage, ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase/clientApp";

const pending = new Map();
const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 30e3; // zayıf bağlantıda 10 dk beklemesin, eski yola düşsün
  return s;
};

export const receiptPhotoPath = (orgId, by, id, at = Date.now()) => `orgs/${orgId}/receiptImages/${by || "x"}/${id}_${at.toString(36)}.jpg`;
export const pendingPhoto = (id) => pending.get(id) || null;

async function blobOf(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

// Yükler, { imgPath, imgUrl } döndürür. Olmazsa hata fırlatır.
export async function uploadReceiptPhoto(orgId, by, id, dataUrl) {
  pending.set(id, dataUrl);
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("çevrimdışı");
    const path = receiptPhotoPath(orgId, by, id);
    const r = sref(store(), path);
    const blob = await blobOf(dataUrl);
    await uploadBytes(r, blob, { contentType: blob.type || "image/jpeg", cacheControl: "private, max-age=31536000" });
    return { imgPath: path, imgUrl: await getDownloadURL(r) };
  } finally {
    // fiş belgesine adres yazılana kadar kısa süre bellekte kalsın
    setTimeout(() => pending.get(id) === dataUrl && pending.delete(id), 60e3);
  }
}

export async function dropReceiptPhoto(path) {
  if (!path) return;
  try {
    await deleteObject(sref(store(), path));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") console.warn("[receiptPhoto] silinemedi", e?.code || e);
  }
}

export function forgetPending(id) {
  pending.delete(id);
}
