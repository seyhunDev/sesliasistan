// Asistana eklenen fotoğraf (Seyhun 2026-10-23): kişinin fotoğrafı, kimlik/kartvizit ya da Velora kişi kare kodu.
// Önce kare kod aranır (telefonda, yapay zekasız); yoksa fotoğraf küçültülüp yapay zekaya gider (/api/person).
import { compressImage } from "@/lib/image";
import { parseContactQr } from "@/lib/contactQr";

const load = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Fotoğraf açılamadı"));
    i.src = src;
  });

// Fotoğraftaki kare kodun yazısı ya da "" (iki boyda denenir: büyük kod da uzaktan çekilmiş kod da okunsun)
export async function qrInPhoto(dataUrl) {
  const [{ default: jsQR }, img] = await Promise.all([import("@/lib/vendor/jsQR.cjs"), load(dataUrl)]);
  for (const side of [1280, 720]) {
    const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
    if (hit?.data) return hit.data;
  }
  return "";
}

// Profil fotoğrafı için 400×400 kare: ortadan, dikey fotoğrafta yüz üstte olduğu için biraz yukarıdan
export async function squarePhoto(dataUrl, size = 400) {
  const img = await load(dataUrl);
  const w = img.naturalWidth, h = img.naturalHeight, side = Math.min(w, h);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(img, (w - side) / 2, Math.max(0, (h - side) * 0.3), side, side, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.85);
}

// Dosya → { qr: kişi taslağı | null, qrText, image: { mimeType, data } (yapay zekaya), dataUrl }
export async function readPhoto(file) {
  const img = await compressImage(file, 1600, 0.8);
  const qrText = await qrInPhoto(img.dataUrl).catch(() => "");
  const small = await compressImage(file, 1280, 0.72);
  return { qr: qrText ? parseContactQr(qrText) : null, qrText, image: { mimeType: small.mimeType, data: small.base64 }, dataUrl: small.dataUrl };
}
