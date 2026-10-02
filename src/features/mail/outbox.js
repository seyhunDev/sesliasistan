"use client";

// Kendine mail: uygulama dosyayı orgs/{uid}/outbox'a bırakır, Gmail betiği (script.js › gonder) 5 dakikada bir
// alır, betiğin çalıştığı Gmail hesabına ekli mail olarak gönderir ve kaydı siler. Sunucu ve gizli anahtar yok.
// Belge 1 MB sınırına takılmasın diye dosya parçalara bölünür (outbox/{id}/parts/{0..n}); ana kayıt en son yazılır,
// betik yarım kaydı görmez.
import { collection, doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

const PART = 700_000; // base64 karakter (Firestore belge sınırı 1 MiB)
const MAX = 15 * 1024 * 1024; // Gmail ek sınırı 25 MB; telefondan yüklemeyi makul tut

const toBase64 = (blob) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1] || "");
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(blob);
  });

// file: File (PDF). Gönderim betiğe kalır; dönen değer kayıt kimliği.
export async function mailToMe(uid, { subject, text, file }) {
  if (file.size > MAX) throw new Error("Dosya çok büyük, Paylaş ile gönder");
  const data = await toBase64(file);
  const ref = doc(collection(db, "orgs", uid, "outbox"));
  const parts = [];
  for (let i = 0; i < data.length; i += PART) parts.push(data.slice(i, i + PART));
  // Parçalar birkaç toplu yazımda (her biri ~10 MB altında)
  for (let i = 0; i < parts.length; i += 8) {
    const batch = writeBatch(db);
    parts.slice(i, i + 8).forEach((p, j) => batch.set(doc(ref, "parts", String(i + j).padStart(3, "0")), { data: p }));
    await batch.commit();
  }
  await setDoc(ref, {
    subject: String(subject || "").slice(0, 200),
    text: String(text || "").slice(0, 5000),
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    parts: parts.length,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
