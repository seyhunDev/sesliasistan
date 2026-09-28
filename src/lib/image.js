// Fotoğrafı tarayıcıda küçültür ve JPEG'e çevirir: { dataUrl, base64, mimeType, width, height }
export async function compressImage(file, maxSide = 1280, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Fotoğraf açılamadı"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.split(",")[1], mimeType: "image/jpeg", width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Kayıt için daha küçük kopya (Firestore belgesi 1 MB sınırının altında kalsın)
export async function thumbFromDataUrl(dataUrl, maxSide = 1000, quality = 0.6) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Fotoğraf açılamadı"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
