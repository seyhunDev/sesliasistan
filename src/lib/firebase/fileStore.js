"use client";

// Belgelerin (envanter, fatura, talimat, yarış sonucu) Firebase Storage'daki yeri: orgs/{org}/{tür}/{id}
// (kural storage.rules: yalnız ana hesap). Künyede path + url durur (storedOf, lib/storedFile.js).
// Telefonda kopya tutulmaz; dosya açılınca indirilir. Yükleme olmazsa (internet, kural yayınlanmamış) çağıran
// eski parçalı Firestore yoluna döner; eski dosyalar da oradan okunmaya devam eder.
import { deleteObject, getBlob, getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { app } from "@/lib/firebase/clientApp";

const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 30e3; // zayıf bağlantıda uzun beklemesin, eski yola düşsün
  return s;
};
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Yükler; { id, path, url, size } döndürür. Olmazsa hata fırlatır.
export async function putStored(orgId, kind, blob, type) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("çevrimdışı");
  const id = newId();
  const path = `orgs/${orgId}/${kind}/${id}`;
  const r = sref(store(), path);
  await uploadBytes(r, blob, { contentType: type || blob.type || "application/octet-stream", cacheControl: "private, max-age=31536000" });
  return { id, path, url: await getDownloadURL(r), size: blob.size };
}

// Dosyanın kendisi: önce indirme adresinden, olmazsa Storage'dan
export async function getStored(meta, type) {
  try {
    const res = await fetch(meta.url);
    if (!res.ok) throw new Error(String(res.status));
    const b = await res.blob();
    return type && b.type !== type ? new Blob([b], { type }) : b;
  } catch (e) {
    const b = await getBlob(sref(store(), meta.path));
    return type && b.type !== type ? new Blob([b], { type }) : b;
  }
}

export async function dropStored(path) {
  if (!path) return;
  try {
    await deleteObject(sref(store(), path));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") console.warn("[fileStore] silinemedi", e?.code || e);
  }
}
