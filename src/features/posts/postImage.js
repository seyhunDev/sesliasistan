"use client";

import { formatOf, themeOf } from "./postModel";

// Gönderi görseli telefonda çizilir (canvas, 1080 genişlik): fotoğraf ya da kulüp renkli zemin, logo, etiket, başlık, alt satır.
// Sunucuya ya da yapay zekaya görsel gitmez; ücretli görüntü üretimi yok.
const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif`;
const CLUB = "DİKİLİ YELKEN SPOR KULÜBÜ";
const PAD = 84;

export const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Görsel açılamadı"));
    i.src = src;
  });

let logoP;
const loadLogo = () => (logoP ||= loadImg("/club-logo.png").catch(() => null));

function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of String(text || "").split("\n")) {
    let line = "";
    for (const w of para.split(" ").filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (!line || ctx.measureText(t).width <= maxW) line = t;
      else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Yazıyı en büyük boyutta sığdırır (satır sayısı ve genişlik); sığmazsa en küçük boyutta keser
function fit(ctx, text, maxW, maxLines, big, small, weight) {
  for (let s = big; s >= small; s -= 4) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size: s, lines };
  }
  ctx.font = `${weight} ${small}px ${FONT}`;
  return { size: small, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
}

// Yelkenli ve dalga süsü (fotoğraf yokken), yazının karşı yarısında
function decor(ctx, W, H, top, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const y0 = top ? H * 0.5 : H * 0.1;
  const y1 = top ? H * 0.84 : H * 0.46;
  const mx = W * 0.74;
  const h = y1 - y0;
  ctx.beginPath();
  ctx.moveTo(mx, y0);
  ctx.quadraticCurveTo(mx - h * 0.5, y0 + h * 0.55, mx - h * 0.62, y1);
  ctx.lineTo(mx, y1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(mx + 18, y0 + h * 0.16);
  ctx.lineTo(mx + 18, y1);
  ctx.lineTo(mx + h * 0.42, y1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(mx - h * 0.66, y1 + 26);
  ctx.lineTo(mx + h * 0.48, y1 + 26);
  ctx.quadraticCurveTo(mx + h * 0.4, y1 + 74, mx + h * 0.28, y1 + 78);
  ctx.lineTo(mx - h * 0.5, y1 + 78);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    const y = y1 + 120 + i * 36;
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 40) {
      const yy = y + Math.sin((x + i * 60) / 70) * 9;
      if (x === -40) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function pill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// post: cleanPost; photo: yüklenmiş Image ya da null
export async function drawPost(canvas, post, photo) {
  const [, , W, H] = formatOf(post.format);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const [, , c1, c2, accent] = themeOf(post.theme);
  const light = !photo && post.theme === "kum";
  const ink = light ? "#123c33" : "#ffffff";
  const top = post.pos === "top";
  // Hikâyede Instagram'ın üstteki profil satırı ve alttaki yanıt kutusu yazının üstüne binmesin
  const story = post.format === "story";
  const safeT = story ? 200 : 0;
  const safeB = story ? 280 : 0;

  if (photo) {
    const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
    const w = photo.naturalWidth * s;
    const h = photo.naturalHeight * s;
    const f = post.focus / 100;
    ctx.drawImage(photo, (W - w) * f, (H - h) * f, w, h);
    const g = top ? ctx.createLinearGradient(0, 0, 0, H * 0.66) : ctx.createLinearGradient(0, H, 0, H * 0.34);
    g.addColorStop(0, "rgba(6,22,18,.84)");
    g.addColorStop(0.55, "rgba(6,22,18,.45)");
    g.addColorStop(1, "rgba(6,22,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const g2 = top ? ctx.createLinearGradient(0, H, 0, H - 280) : ctx.createLinearGradient(0, 0, 0, 280);
    g2.addColorStop(0, "rgba(0,0,0,.38)");
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.45, H);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    decor(ctx, W, H, top, light ? "rgba(31,90,75,.13)" : "rgba(255,255,255,.1)");
  }

  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 14;
  }

  // Logo + kulüp adı (yazının karşı köşesinde)
  const logo = await loadLogo();
  const ly = top ? H - PAD - 104 - safeB : PAD - 20 + safeT;
  const R = 52;
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(PAD + R, ly + R, R, 0, Math.PI * 2);
  ctx.fill();
  if (logo) {
    ctx.clip();
    ctx.drawImage(logo, PAD + 6, ly + 6, R * 2 - 12, R * 2 - 12);
  }
  ctx.restore();
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(CLUB, PAD + R * 2 + 24, ly + R);

  // Yazı bloğu: etiket, başlık, alt satır, sporcular
  const maxW = W - PAD * 2;
  const people = post.people ? post.people.split("\n").slice(0, 4) : [];
  const head = fit(ctx, post.headline || " ", maxW, story ? 5 : post.format === "portrait" ? 4 : 3, people.length ? 76 : 88, 50, 800);
  const lh = Math.round(head.size * 1.1);
  // Alt satır uzun olabilir (yarış cümlesi): en çok 4 satır, sığmazsa yazı küçülür
  const sub = post.sub ? fit(ctx, post.sub, maxW, 4, 38, 28, 500) : { size: 38, lines: [] };
  const subLines = sub.lines;
  const sh = Math.round(sub.size * 1.32);
  const pp = fit(ctx, people.join("\n") || " ", maxW - 34, people.length, 36, 26, 600);
  const pLines = people.length ? pp.lines : [];
  const ph = Math.round(pp.size * 1.42);
  const tagH = post.tag ? 54 : 12;
  const block = tagH + 28 + head.lines.length * lh + (subLines.length ? 22 + subLines.length * sh : 0) + (pLines.length ? 34 + pLines.length * ph : 0);
  let y = top ? PAD + 10 + safeT : H - PAD - block - safeB;

  ctx.textBaseline = "top";
  if (post.tag) {
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.font = `800 26px ${FONT}`;
    const t = post.tag.toLocaleUpperCase("tr-TR");
    const tw = ctx.measureText(t).width + 48;
    ctx.fillStyle = light ? "#1f5a4b" : accent;
    pill(ctx, PAD, y, tw, tagH, tagH / 2);
    ctx.fill();
    ctx.fillStyle = light ? "#ffffff" : "#10231e";
    ctx.textBaseline = "middle";
    ctx.fillText(t, PAD + 24, y + tagH / 2 + 1);
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = light ? "#1f5a4b" : accent;
    pill(ctx, PAD, y, 120, tagH, tagH / 2);
    ctx.fill();
    ctx.restore();
  }
  y += tagH + 28;

  ctx.fillStyle = ink;
  ctx.font = `800 ${head.size}px ${FONT}`;
  for (const l of head.lines) {
    ctx.fillText(l, PAD - 3, y);
    y += lh;
  }
  if (subLines.length) {
    y += 22;
    ctx.globalAlpha = 0.9;
    ctx.font = `500 ${sub.size}px ${FONT}`;
    for (const l of subLines) {
      ctx.fillText(l, PAD, y);
      y += sh;
    }
    ctx.globalAlpha = 1;
  }
  // Sporcular: ince çizgi + her satırın başında renkli nokta
  if (pLines.length) {
    y += 14;
    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = light ? "rgba(18,60,51,.25)" : "rgba(255,255,255,.35)";
    ctx.fillRect(PAD, y, 160, 3);
    ctx.restore();
    y += 20;
    ctx.font = `600 ${pp.size}px ${FONT}`;
    for (const l of pLines) {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = light ? "#1f5a4b" : accent;
      ctx.beginPath();
      ctx.arc(PAD + 9, y + ph / 2 - 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = ink;
      ctx.fillText(l, PAD + 34, y + (ph - pp.size) / 2 - 2);
      y += ph;
    }
  }
  ctx.shadowColor = "transparent";
  return canvas;
}

// Instagram'a gidecek dosya (JPEG)
export function postFile(canvas, name = "gonderi") {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(new File([b], `${name}.jpg`, { type: "image/jpeg" })) : rej(new Error("Görsel hazırlanamadı"))), "image/jpeg", 0.92),
  );
}

// Listede görünen küçük kopya (~15 KB, gönderi belgesinde durur)
export function thumbOf(canvas, w = 240) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round((canvas.height / canvas.width) * w);
  c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

// Kaydırmalı gönderinin ek sayfası: yalnız fotoğraf (kırpılıp ortalanır) + köşede küçük logo
export async function drawSlide(canvas, format, photo) {
  const [, , W, H] = formatOf(format);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
  const w = photo.naturalWidth * s;
  const h = photo.naturalHeight * s;
  ctx.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
  const logo = await loadLogo();
  if (logo) {
    const R = 34;
    const x = W - PAD - R * 2;
    const y = H - PAD - R * 2 - (format === "story" ? 280 : 0);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + R, y + R, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logo, x + 4, y + 4, R * 2 - 8, R * 2 - 8);
    ctx.restore();
  }
}
