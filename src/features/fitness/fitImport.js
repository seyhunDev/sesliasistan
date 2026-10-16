"use client";

// Hazır programı (PDF, fotoğraf ya da yapıştırılan metin) yapay zekaya okutur; açık programa yazılı değişiklik gönderir.
// Sunucu: /api/fitness-import. Sonuç kaydedilmez, düzenleme ekranında açılır.
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";
import { kindOf } from "@/features/athletes/raceNotice";

const MAX = 4 * 1024 * 1024;

const toBase64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(file);
  });

// who: { age, sport }; ask: antrenörün ek isteği (günler, saat, hafta…)
export async function importFile(file, { ask = "", age, sport } = {}) {
  const kind = await kindOf(file);
  let body;
  if (kind === "pdf") {
    if (file.size > MAX) throw new Error("PDF 4 MB'tan büyük. Metni kopyalayıp yapıştırabilirsin.");
    body = { mimeType: "application/pdf", data: await toBase64(file) };
  } else if (kind === "image") {
    const img = await compressImage(file, 2200, 0.8);
    body = { mimeType: img.mimeType, data: img.base64 };
  } else if (kind === "text") {
    body = { text: (await file.text()).slice(0, 60000) };
  } else if (kind === "docx") {
    throw new Error("Word dosyası okunamıyor. PDF olarak kaydet ya da metni kopyalayıp yapıştır.");
  } else throw new Error("PDF, fotoğraf ya da metin seç");
  return send({ ...body, ask, age, sport });
}

export function importText(text, { ask = "", age, sport } = {}) {
  const t = String(text || "").trim();
  if (t.length < 30) throw new Error("Program metni çok kısa");
  return send({ text: t.slice(0, 60000), ask, age, sport });
}

// Açık programda değişiklik: tam program geri gelir
export function editProgram(program, ask, { age, sport } = {}) {
  if (!String(ask || "").trim()) throw new Error("Ne değişsin, yaz.");
  return send({ program, ask, age, sport });
}

async function send(body) {
  const res = await authFetch("/api/fitness-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, today: todayStr() }),
    timeout: 65000,
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || (res.status >= 500 ? "Program okunamadı (uzun sürdü). Tekrar dene ya da metni yapıştır." : "Program okunamadı"));
  return p;
}
