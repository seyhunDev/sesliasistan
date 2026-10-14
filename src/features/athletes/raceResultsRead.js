"use client";

// Yarış sonuç belgesi: PDF ya da fotoğraf yapay zekayla okunur (/api/race-results), bizim sporcular bulunur,
// kategori ve kızlar sırası hesaplanır (lib/resultSheet.js). Belgenin kendisi talimat gibi saklanır (noticeFile.js: Storage, olmazsa Firestore'da parçalı).
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { cleanSheet } from "@/lib/resultSheet";
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
  if (kind === "pdf") {
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
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || (res.status >= 500 ? "Sonuçlar okunamadı (uzun sürdü). Tekrar dene." : "Sonuçlar okunamadı"));
  return { kind, fleets: cleanSheet(p.fleets) };
}
