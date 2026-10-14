"use client";

// Envanterdeki belge ve fotoğraflar (kütük belgesi, ruhsat, fatura, ürün fotoğrafı): Firebase Storage'da
// orgs/{org}/invFiles/{id} (lib/firebase/fileStore.js). Üründe künye durur: files [{ id, name, type, size, path, url, label, at }].
// Yükleme olmazsa (internet, kural) eski yol: Firestore'da 900 KB'lık parçalar orgs/{org}/invFiles/{id}/parts/{000..}
// (künyede parts; parçalı dosya açılınca bu cihazda saklanır). Eski dosyalar parçalı yoldan okunmaya devam eder.
// Fotoğraflar telefonda küçültülür (en çok 1600 px, ~200-400 KB).
import { Bytes, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { dropStored, getStored, putStored } from "@/lib/firebase/fileStore";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";
import { dropRaceFile, getRaceFile, saveRaceFile } from "@/features/athletes/raceFiles";

const PART = 900_000;
const MAX_PDF = 4 * 1024 * 1024;
const col = (orgId) => collection(db, "orgs", orgId, "invFiles");
const cacheKey = (id) => `inv:${id}`;

export const FILE_LABELS = ["Fotoğraf", "Kütük belgesi", "Ruhsat / tescil", "Fatura", "Garanti belgesi", "Sigorta", "Bakım kaydı", "Diğer belge"];

const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");

// Seçilen dosyayı saklanacak hâle getirir: fotoğraf küçültülmüş JPEG, PDF olduğu gibi.
// { blob, name, type, base64 (yapay zekaya gidecek), label }
export async function prepFile(file) {
  if (isPdf(file)) {
    if (file.size > MAX_PDF) throw new Error("PDF en çok 4 MB olabilir.");
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { blob: new Blob([buf], { type: "application/pdf" }), name: file.name || "belge.pdf", type: "application/pdf", base64: btoa(bin), label: "Diğer belge" };
  }
  if (!/^image\//.test(file.type || "") && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name || "")) throw new Error("Fotoğraf ya da PDF seç.");
  const img = await compressImage(file, 1600, 0.75);
  const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
  const name = `${(file.name || "fotograf").replace(/\.[^.]+$/, "")}.jpg`;
  return { blob: new Blob([bytes], { type: "image/jpeg" }), name, type: "image/jpeg", base64: img.base64, label: "Fotoğraf" };
}

// Dosyayı Storage'a yükler (olmazsa parçalar halinde Firestore'a); künyeyi döndürür (ürünün files listesine)
export async function saveInvFile(orgId, f) {
  try {
    const s = await putStored(orgId, "invFiles", f.blob, f.type);
    return { id: s.id, name: String(f.name || "dosya").slice(0, 120), type: f.type, size: s.size, path: s.path, url: s.url, label: f.label || "", at: todayStr() };
  } catch (e) {
    console.warn("[invFiles] Storage'a yüklenemedi, Firestore'a yazılıyor", e?.code || e);
  }
  const bytes = new Uint8Array(await f.blob.arrayBuffer());
  const ref = doc(col(orgId));
  const parts = Math.max(1, Math.ceil(bytes.length / PART));
  for (let i = 0; i < parts; i += 8) {
    const batch = writeBatch(db);
    for (let j = i; j < Math.min(parts, i + 8); j++) batch.set(doc(ref, "parts", String(j).padStart(3, "0")), { data: Bytes.fromUint8Array(bytes.subarray(j * PART, (j + 1) * PART)) });
    await batch.commit();
  }
  const meta = { id: ref.id, name: String(f.name || "dosya").slice(0, 120), type: f.type, size: bytes.length, parts, label: f.label || "", at: todayStr() };
  await setDoc(ref, { name: meta.name, type: meta.type, size: meta.size, parts, createdAt: serverTimestamp() });
  await saveRaceFile({ id: cacheKey(ref.id), blob: f.blob, name: meta.name });
  return meta;
}

// Dosyayı getirir: Storage'dakini indirir; eskisini önce bu cihazdan, yoksa Firestore'dan (parça sayısı kadar okuma)
export async function loadInvFile(orgId, meta) {
  if (meta.path) return getStored(meta, meta.type);
  const hit = await getRaceFile(cacheKey(meta.id));
  if (hit?.blob) return hit.blob;
  const snap = await getDocs(collection(db, "orgs", orgId, "invFiles", meta.id, "parts"));
  const list = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map((d) => d.data().data?.toUint8Array?.());
  if (!list.length || list.length < (meta.parts || 1) || list.some((x) => !x)) throw new Error("Dosya bulunamadı");
  const blob = new Blob(list, { type: meta.type || "application/octet-stream" });
  saveRaceFile({ id: cacheKey(meta.id), blob, name: meta.name });
  return blob;
}

// Dosyayı açar (yeni sekmede; iPhone'da önizleme)
export async function openInvFile(orgId, meta) {
  const win = window.open("", "_blank");
  const blob = await loadInvFile(orgId, meta);
  const url = URL.createObjectURL(blob);
  if (win) win.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Siler (ürün ya da dosya silinince); hata sessiz
export async function dropInvFile(orgId, meta) {
  if (!meta?.id) return;
  if (meta.path) return dropStored(meta.path);
  try {
    const ref = doc(col(orgId), meta.id);
    const batch = writeBatch(db);
    for (let j = 0; j < (meta.parts || 1); j++) batch.delete(doc(ref, "parts", String(j).padStart(3, "0")));
    await batch.commit();
    await deleteDoc(ref);
  } catch {}
  dropRaceFile(cacheKey(meta.id));
}

export const sizeText = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
