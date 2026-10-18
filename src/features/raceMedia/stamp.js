"use client";

// Fotoğrafın/videonun üstüne basılan yazı (Seyhun 2026-10-18: "bu süreleri videonun, fotoğrafın bir yerinde yazmalıyız"):
// sol altta yarı saydam koyu kutu; üstte an ("2. yarış · Son 1 dakika · 0:42 kala"), altta yarış adı ve saat.
export function drawStamp(ctx, w, h, lines) {
  const list = lines.filter(Boolean);
  if (!list.length) return;
  const fs = Math.max(14, Math.round(Math.min(w, h) * 0.045));
  const pad = Math.round(fs * 0.6);
  ctx.save();
  ctx.textBaseline = "alphabetic";
  const fonts = list.map((_, i) => `${i ? 400 : 600} ${i ? Math.round(fs * 0.75) : fs}px -apple-system, "SF Pro Text", Roboto, sans-serif`);
  const widths = list.map((l, i) => ((ctx.font = fonts[i]), ctx.measureText(l).width));
  const lh = list.map((_, i) => (i ? Math.round(fs * 0.75) : fs) * 1.25);
  const bw = Math.min(w - pad * 2, Math.max(...widths) + pad * 2);
  const bh = lh.reduce((a, b) => a + b, 0) + pad;
  const x = pad;
  const y = h - pad - bh;
  ctx.fillStyle = "rgba(20,22,24,.55)";
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, Math.round(fs * 0.4));
  ctx.fill();
  ctx.fillStyle = "#fff";
  let ty = y + pad * 0.5;
  list.forEach((l, i) => {
    ty += lh[i];
    ctx.font = fonts[i];
    ctx.fillText(l, x + pad, ty - lh[i] * 0.22, bw - pad * 2);
  });
  ctx.restore();
}

// Hazır JPEG'e yazı basar (telefonun kendi kamerasıyla çekilen ya da seçilen fotoğraf için)
export async function stampBlob(blob, lines) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    drawStamp(ctx, c.width, c.height, lines);
    return await new Promise((res) => c.toBlob((b) => res(b || blob), "image/jpeg", 0.82));
  } catch {
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
