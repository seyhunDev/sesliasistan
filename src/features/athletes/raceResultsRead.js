"use client";

// Yarış sonuç belgesi: PDF ya da fotoğraf yapay zekayla okunur (/api/race-results), bizim sporcular bulunur,
// kategori ve kızlar sırası hesaplanır (lib/resultSheet.js). Belgenin kendisi talimat gibi saklanır (noticeFile.js: Storage, olmazsa Firestore'da parçalı).
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { cleanSheet } from "@/lib/resultSheet";
import { resultTableOf } from "@/lib/pdfLines";
import { pdfPages } from "@/lib/pdfText";
import { kindOf } from "./raceNotice";

const MAX = 4 * 1024 * 1024;

const toBase64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(file);
  });

// names: bizim sporcuların adları (yapay zeka bu satırları dikkatli okusun). Dönen: { kind, fleets }
export async function readResults(file, names = []) {
  const kind = await kindOf(file);
  let body;
  let npg = 0;
  if (kind === "pdf") {
    // Yazılı PDF'te sütun başlıkları (Rank, Y.NO, AD SOYAD, Q1…F2, Nett) tanınırsa yapay zekasız okunur (Seyhun 2026-11-03)
    const pages = await pdfPages(file).catch(() => []);
    npg = pages.length;
    const fleets = cleanSheet(resultTableOf(pages));
    if (fleets.reduce((n, f) => n + f.rows.length, 0) >= 3) return { kind, fleets };
    if (file.size > MAX) throw new Error("PDF 4 MB'tan büyük. Yalnız sonuç sayfalarını ayrı PDF yap ya da fotoğrafını yükle.");
    body = { mimeType: "application/pdf", data: await toBase64(file) };
  } else if (kind === "image") {
    const img = await compressImage(file, 2400, 0.85);
    body = { mimeType: img.mimeType, data: img.base64 };
  } else throw new Error("PDF ya da fotoğraf seç");
  const res = await authFetch("/api/race-results", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, names }),
    timeout: 65000,
  }).catch((e) => {
    throw new Error(`Sonuçlar okunamadı: ${kind === "pdf" ? `${npg ? `${npg} sayfalık PDF'te ` : ""}sonuç tablosunun sütunları tanınmadı, yapay zeka da` : "yapay zeka"} zamanında yanıt vermedi (${e?.message || "bağlantı"}).`);
  });
  const p = await res.json().catch(() => ({}));
  // Gerçek nedeni söyle (Seyhun 2026-11-04 "okunamadı diyor"): tablo tanınmadı mı, yapay zeka mı yetişemedi
  const why = kind === "pdf" ? `${npg ? `${npg} sayfalık PDF'te ` : ""}sonuç tablosunun sütunları tanınmadı; yapay zekaya gönderildi` : "Fotoğraf yapay zekaya gönderildi";
  if (!res.ok) throw new Error(p.error ? `${p.error} (${why})` : res.status >= 500 || res.status === 0 ? `Sonuçlar okunamadı: ${why}, yanıt zamanında gelmedi.` : `Sonuçlar okunamadı: ${why}.`);
  return { kind, fleets: cleanSheet(p.fleets) };
}
