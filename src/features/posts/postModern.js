"use client";

import { imagePeople, modernOf, safeOf, tallOf } from "./postModel";

// Modern tasarım: her türün kendine has, akışta tek bakışta tanınan düzeni var (spor kulüplerinin "maç günü", "skor",
// "antrenman programı", "kampanya" ve "haber" kartları gibi). Renk seçimi Modern'de kullanılmaz; her türün rengi sabit:
// race (yarış duyurusu): fotoğraf + lacivert, dev dar büyük harf başlık (son satır sarı), büyük sarı tarih, altta sarı kayan şerit.
// result (yarış sonucu): üstte fotoğraf, altta eğik kesimli sarı pano; lacivert başlık ve sıra rozetli sporcu listesi.
// training (antrenman): açık yeşil zemin, yuvarlak köşeli fotoğraf kartı, GÜN / SAAT / YER kutuları (program kartı).
// school (kayıt / yelken okulu): gök mavisi zemin, yuvarlak fotoğraf, dönük sarı çıkartma, altta kum dalgası ve düğme.
// news (duyuru, kulüp haberi, kutlama, diğer): beyaz zemin, üstte lacivert künye, tam genişlik fotoğraf, kırmızı etiket.
// Özel günde Modern de Afiş'i kullanır. Çizim yardımcıları postImage.js'ten "kit" olarak gelir.

const NAVY = "#0b1f3f";
const YELLOW = "#f6c445";
const RED = "#d7262e";
const DISPLAY = (s) => `400 ${s}px "Post Display", Impact, "Arial Narrow Bold", sans-serif`;
const up = (t) => String(t || "").toLocaleUpperCase("tr-TR");
const spacing = (ctx, px) => {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
};
const hexA = (hex, a) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

// Yazıyı verilen yazı tipinde en büyük boyutta sığdırır
// Başlık: kaldırıldıysa boş (satırı yok, yeri kalmaz); boyu ayardan (headSize)
function headF(K, ctx, post, text, maxW, maxLines, big, small, font) {
  if (!post.headline) return { size: small, lines: [] };
  const k = K.sizeK(post.headSize);
  return fitF(K, ctx, text, maxW, maxLines, Math.round(big * k), Math.round(small * k), font);
}
// Alt satır boyu ayardan (subSize)
const subK = (K, post) => K.sizeK(post.subSize);
function fitF(K, ctx, text, maxW, maxLines, big, small, font) {
  for (let s = big; s >= small; s -= 4) {
    ctx.font = font(s);
    const lines = K.wrap(ctx, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size: s, lines };
  }
  ctx.font = font(small);
  return { size: small, lines: K.wrap(ctx, text, maxW).slice(0, maxLines) };
}
const sans = (K, w) => (s) => `${w} ${s}px ${K.FONT}`;

// Fotoğrafı bir kutuya kaplar (büyütme ve kaydırma ayarlarıyla)
function coverRect(ctx, photo, x, y, w, h, post) {
  const s = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * ((post.zoom || 100) / 100);
  const dw = photo.naturalWidth * s;
  const dh = photo.naturalHeight * s;
  ctx.drawImage(photo, x + (w - dw) * ((post.fx ?? 50) / 100), y + (h - dh) * ((post.focus ?? 50) / 100), dw, dh);
}

// Logo + iki satır kulüp adı (yükseklik 2R)
async function brand(K, post, ctx, x, y, R, ink, shadow) {
  // Logo ve kulüp adı kapatılabilir (noBrand)
  if (post.noBrand) return;
  const logo = await K.loadLogo();
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + R, y + R, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (logo) {
    ctx.clip();
    ctx.drawImage(logo, x + 5, y + 5, R * 2 - 10, R * 2 - 10);
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = ink;
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 8;
  }
  ctx.font = `700 ${Math.round(R * 0.5)}px ${K.FONT}`;
  spacing(ctx, 3);
  ctx.textBaseline = "middle";
  ctx.fillText("DİKİLİ YELKEN", x + R * 2 + 22, y + R * 0.64);
  ctx.fillText("SPOR KULÜBÜ", x + R * 2 + 22, y + R * 1.4);
  spacing(ctx, 0);
  ctx.restore();
}

// "Foça · 12-14 Ekim 2026 · 10:00" → parçalar ve türleri (tarih, saat, yer)
const DAYS = /(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|bugün|yarın|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|\d{1,2}[./-]\d{1,2})/i;
function partsOf(info) {
  return String(info || "")
    .split(/\s*[·•|]\s*/)
    .filter(Boolean)
    .map((t) => ({ t, kind: /\b\d{1,2}[:.]\d{2}\b/.test(t) && t.length < 14 ? "time" : DAYS.test(t) || /\d{4}/.test(t) ? "date" : "place" }));
}

// Görselde vurgulanacak adlar ve sporcu satırları
function namesFor(K, post) {
  const people = imagePeople(post.people) ? imagePeople(post.people).split("\n") : [];
  return { people, names: K.namesOf(post, people) };
}

function arrowRight(ctx, x, y, s, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s, y);
  ctx.moveTo(x + s * 0.6, y - s * 0.38);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s * 0.6, y + s * 0.38);
  ctx.stroke();
  ctx.restore();
}

// Düğme gibi dilek: dolu hap, sağında daire içinde ok
function cta(K, ctx, x, y, text, size, h, bg, ink, dot, dotInk, maxW) {
  ctx.save();
  ctx.font = `800 ${size}px ${K.FONT}`;
  const w = Math.min(maxW, ctx.measureText(text).width + h * 1.9);
  ctx.shadowColor = "rgba(0,0,0,.18)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = bg;
  K.pill(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + h * 0.48, y + h / 2 + 1, w - h * 1.7);
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(x + w - h / 2, y + h / 2, h / 2 - 9, 0, Math.PI * 2);
  ctx.fill();
  arrowRight(ctx, x + w - h / 2 - 13, y + h / 2, 26, dotInk, 4);
  ctx.restore();
  return w;
}

// Sığmazsa her şeyi birlikte küçültür: build(k) → { h, draw(y) }
function shrink(build, room) {
  let b = build(1);
  for (let k = 0.94; b.h > room && k >= 0.55; k -= 0.05) b = build(k);
  return b;
}

// ─── 1. Yarış duyurusu: maç günü afişi ───
async function drawRace(K, ctx, post, photo, W, H, S) {
  const k0 = post.shade / 100;
  if (photo) {
    coverRect(ctx, photo, 0, 0, W, H, post);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(170,190,225)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    K.fade(ctx, W, H, false, "rgb(7,21,44)", 0.9 + k0 * 0.1, 0.62 + k0 * 0.15);
    const g = ctx.createLinearGradient(0, 0, 0, 360 + S.t);
    g.addColorStop(0, "rgba(7,21,44,.65)");
    g.addColorStop(1, "rgba(7,21,44,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 360 + S.t);
  } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, "#18386b");
    g.addColorStop(1, "#050f22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Arkada büyük yelken silüeti ve iki ince sarı çizgi
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.beginPath();
    ctx.moveTo(W * 0.62, H * 0.08);
    ctx.lineTo(W * 1.02, H * 0.62);
    ctx.lineTo(W * 0.6, H * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(YELLOW, 0.5);
    ctx.lineWidth = 3;
    for (const d of [0, 26]) {
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + d, 0);
      ctx.lineTo(W + d, H * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  }
  const x = S.x;
  const maxW = S.w;
  await brand(K, post, ctx, x, S.t + 70, 46, "#ffffff", !!photo);
  // Sağ üstte sınıflar (ILCA · OPTIMIST)
  const cls = up(String(post.classes || "").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 2).join(" · "));
  if (cls) {
    ctx.save();
    ctx.font = `700 26px ${K.FONT}`;
    spacing(ctx, 3);
    const w = ctx.measureText(cls).width + 48;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 3;
    K.pill(ctx, x + maxW - w, S.t + 70 + 46 - 28, w, 56, 28);
    ctx.stroke();
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = "middle";
    ctx.fillText(cls, x + maxW - w + 24, S.t + 70 + 47);
    spacing(ctx, 0);
    ctx.restore();
  }

  // Altta sarı kayan şerit: dilek tekrar tekrar
  const T = 78;
  const ty = H - S.b - T;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, ty, W, T);
  if (S.b) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, ty + T, W, S.b);
  }
  const word = up(post.wish || post.tag || "YARIŞ GÜNÜ");
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ty, W, T);
  ctx.clip();
  ctx.font = DISPLAY(40);
  ctx.fillStyle = NAVY;
  ctx.textBaseline = "middle";
  spacing(ctx, 2);
  let cx = -60;
  while (cx < W) {
    ctx.fillText(word, cx, ty + T / 2 + 2);
    cx += ctx.measureText(word).width + 34;
    ctx.save();
    ctx.translate(cx, ty + T / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    cx += 34;
  }
  spacing(ctx, 0);
  ctx.restore();

  const { names } = namesFor(K, post);
  const parts = partsOf(post.meta ? post.info : "");
  const date = parts.find((p) => p.kind === "date");
  const rest = parts.filter((p) => p !== date).map((p) => p.t);
  const lines = tallOf(post.format) ? 4 : 3;
  const top = S.t + 70 + 92 + 50;
  const b = shrink((k) => {
    const z = (n) => Math.round(n * k);
    const head = headF(K, ctx, post, up(post.headline), maxW, lines, z(176), z(84), DISPLAY);
    const hl = Math.round(head.size * 0.98);
    const sub = post.sub ? K.fitRich(ctx, post.sub, names, maxW, 3, z(30 * subK(K, post)), z(22 * subK(K, post)), 400) : null;
    const sl = sub ? Math.round(sub.size * 1.4) : 0;
    let dh = 0;
    let dfit = null;
    if (date || rest.length) {
      dfit = date ? fitF(K, ctx, up(date.t.replace(/\s*-\s*/, "–")), maxW * 0.6, 1, z(96), z(52), DISPLAY) : null;
      dh = dfit ? Math.round(dfit.size * 1.05) : z(56);
    }
    const kick = post.tag ? z(34) : 0;
    const h = kick + (kick ? z(24) : 0) + head.lines.length * hl + (sub ? z(24) + sub.lines.length * sl : 0) + (dh ? z(40) + dh : 0);
    return {
      h,
      draw(y) {
        if (kick) {
          ctx.fillStyle = YELLOW;
          ctx.fillRect(x, y + kick / 2 - z(3), z(56), z(6));
          ctx.font = `800 ${z(30)}px ${K.FONT}`;
          spacing(ctx, z(6));
          ctx.textBaseline = "middle";
          ctx.fillText(up(post.tag), x + z(76), y + kick / 2 + 1);
          spacing(ctx, 0);
          y += kick + z(24);
        }
        ctx.textBaseline = "top";
        ctx.font = DISPLAY(head.size);
        for (const [i, l] of head.lines.entries()) {
          ctx.fillStyle = i === head.lines.length - 1 && head.lines.length > 1 ? YELLOW : "#ffffff";
          ctx.fillText(l, x - 2, y + i * hl);
        }
        y += head.lines.length * hl;
        if (sub) {
          y += z(24);
          ctx.globalAlpha = 0.92;
          for (const [i, l] of sub.lines.entries()) K.drawRich(ctx, l, x, y + i * sl, sub.size, 400, sub.space, "#ffffff", YELLOW);
          ctx.globalAlpha = 1;
          y += sub.lines.length * sl;
        }
        if (dh) {
          y += z(40);
          let px = x;
          if (dfit) {
            ctx.font = DISPLAY(dfit.size);
            ctx.fillStyle = YELLOW;
            ctx.fillText(dfit.lines[0], x, y);
            px = x + ctx.measureText(dfit.lines[0]).width + z(30);
            ctx.fillStyle = "rgba(255,255,255,.5)";
            ctx.fillRect(px, y + dh * 0.12, 3, dh * 0.72);
            px += z(30);
          }
          if (rest.length) {
            const pw = x + maxW - px;
            const p1 = fitF(K, ctx, up(rest[0]), pw, 1, z(40), z(22), sans(K, 800));
            ctx.fillStyle = "#ffffff";
            ctx.font = `800 ${p1.size}px ${K.FONT}`;
            spacing(ctx, z(2));
            const two = rest.length > 1;
            ctx.fillText(p1.lines[0] || "", px, y + (two ? dh * 0.12 : (dh - p1.size) / 2));
            if (two) {
              ctx.globalAlpha = 0.8;
              const p2 = fitF(K, ctx, rest.slice(1).join(" · "), pw, 1, z(30), z(20), sans(K, 400));
              ctx.font = `400 ${p2.size}px ${K.FONT}`;
              ctx.fillText(p2.lines[0] || "", px, y + dh * 0.12 + p1.size * 1.25);
              ctx.globalAlpha = 1;
            }
            spacing(ctx, 0);
          }
        }
      },
    };
  }, ty - 56 - top);
  ctx.save();
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 14;
  }
  b.draw(ty - 56 - b.h);
  ctx.restore();
}

// ─── 2. Yarış sonucu: skor kartı ───
async function drawResult(K, ctx, post, photo, W, H, S) {
  const x = S.x;
  const maxW = S.w;
  const { names } = namesFor(K, post);
  const rows = (post.race?.athletes || []).filter((a) => a.res).slice(0, 4);
  const pad = 56;
  const panel = shrink((k) => {
    const z = (n) => Math.round(n * k);
    const head = headF(K, ctx, post, up(post.headline), maxW, 3, z(122), z(64), DISPLAY);
    const hl = Math.round(head.size * 0.98);
    const rh = z(74);
    const sub = !rows.length && post.sub ? K.fitRich(ctx, post.sub, names, maxW, 3, z(30 * subK(K, post)), z(22 * subK(K, post)), 400) : null;
    const sl = sub ? Math.round(sub.size * 1.4) : 0;
    const info = post.meta && post.info ? fitF(K, ctx, up(post.info.replace(/\s*·\s*/g, " • ")), maxW, 1, z(26), z(18), sans(K, 700)) : null;
    const wish = post.wish ? fitF(K, ctx, post.wish, maxW, 1, z(36), z(24), sans(K, 800)) : null;
    const h = (info ? z(26) + z(26) : 0) + head.lines.length * hl + (rows.length ? z(30) + rows.length * rh : 0) + (sub ? z(24) + sub.lines.length * sl : 0) + (wish ? z(30) + wish.size * 1.2 : 0);
    return {
      h,
      draw(y) {
        ctx.textBaseline = "top";
        if (info) {
          ctx.fillStyle = hexA(NAVY, 0.75);
          ctx.font = `700 ${info.size}px ${K.FONT}`;
          spacing(ctx, z(3));
          ctx.fillText(info.lines[0], x, y);
          spacing(ctx, 0);
          y += z(52);
        }
        ctx.fillStyle = NAVY;
        ctx.font = DISPLAY(head.size);
        for (const [i, l] of head.lines.entries()) ctx.fillText(l, x - 2, y + i * hl);
        y += head.lines.length * hl;
        if (rows.length) {
          y += z(30);
          for (const a of rows) {
            ctx.fillStyle = hexA(NAVY, 0.15);
            ctx.fillRect(x, y + rh - 2, maxW, 2);
            const b = z(54);
            ctx.fillStyle = NAVY;
            K.pill(ctx, x, y + (rh - b) / 2 - 1, b, b, z(12));
            ctx.fill();
            ctx.fillStyle = YELLOW;
            ctx.font = DISPLAY(z(34));
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(a.res).replace(/\s*\.?\s*$/, "").slice(0, 3), x + b / 2, y + rh / 2);
            ctx.textAlign = "left";
            ctx.fillStyle = NAVY;
            ctx.font = `800 ${z(34)}px ${K.FONT}`;
            ctx.fillText(a.name, x + b + z(24), y + rh / 2, maxW - b - z(200));
            if (a.cls) {
              ctx.font = `600 ${z(26)}px ${K.FONT}`;
              ctx.textAlign = "right";
              ctx.fillStyle = hexA(NAVY, 0.7);
              ctx.fillText(up(a.cls), x + maxW, y + rh / 2);
              ctx.textAlign = "left";
            }
            ctx.textBaseline = "top";
            y += rh;
          }
        }
        if (sub) {
          y += z(24);
          for (const [i, l] of sub.lines.entries()) K.drawRich(ctx, l, x, y + i * sl, sub.size, 400, sub.space, NAVY, NAVY);
          y += sub.lines.length * sl;
        }
        if (wish) {
          y += z(30);
          ctx.fillStyle = NAVY;
          ctx.font = `800 ${wish.size}px ${K.FONT}`;
          ctx.fillText(wish.lines[0], x, y);
        }
      },
    };
  }, H - S.b - H * 0.36 - 90 - pad * 2);
  const cut = 90;
  const py = Math.max(H * 0.36, H - S.b - pad - panel.h - pad - cut / 2);
  // Üstte fotoğraf (yoksa lacivert + kupa çizimi)
  if (photo) coverRect(ctx, photo, 0, 0, W, py + cut, post);
  else {
    const g = ctx.createLinearGradient(0, 0, 0, py + cut);
    g.addColorStop(0, "#18386b");
    g.addColorStop(1, "#06132a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, py + cut);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, py);
    ctx.clip();
    K.decor(ctx, W, py + cut * 3, true, "rgba(255,255,255,.1)", "sonuc");
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, 0, 0, 320 + S.t);
  g.addColorStop(0, "rgba(7,21,44,.6)");
  g.addColorStop(1, "rgba(7,21,44,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 320 + S.t);
  // Eğik kesimli sarı pano
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.3)";
  ctx.shadowBlur = 30;
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(W, py + cut);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Panonun üst kenarında lacivert etiket
  if (post.tag) {
    ctx.save();
    ctx.font = `800 28px ${K.FONT}`;
    spacing(ctx, 4);
    const w = ctx.measureText(up(post.tag)).width + 56;
    const ly = py + ((x + w / 2) / W) * cut - 30;
    ctx.translate(x, ly + 30);
    ctx.rotate(Math.atan2(cut, W));
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, -30, w, 60);
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = "middle";
    ctx.fillText(up(post.tag), 28, 2);
    spacing(ctx, 0);
    ctx.restore();
  }
  await brand(K, post, ctx, x, S.t + 70, 46, "#ffffff", true);
  panel.draw(py + cut + pad - 10);
}

// ─── 3. Antrenman: program kartı ───
async function drawTraining(K, ctx, post, photo, W, H, S) {
  const G = "#0f3d33";
  const GM = "#13805f";
  ctx.fillStyle = "#eef4f0";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = hexA(G, 0.05);
  ctx.lineWidth = 2;
  for (let i = -H; i < W; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, H);
    ctx.lineTo(i + H * 0.6, 0);
    ctx.stroke();
  }
  ctx.restore();
  const x = S.x;
  const maxW = S.w;
  const hy = S.t + 64;
  await brand(K, post, ctx, x, hy, 42, G, false);
  if (post.tag) {
    ctx.save();
    ctx.font = `800 26px ${K.FONT}`;
    spacing(ctx, 4);
    const w = ctx.measureText(up(post.tag)).width + 52;
    ctx.fillStyle = GM;
    K.pill(ctx, x + maxW - w, hy + 42 - 29, w, 58, 29);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(up(post.tag), x + maxW - w + 26, hy + 43);
    spacing(ctx, 0);
    ctx.restore();
  }
  const { names } = namesFor(K, post);
  const parts = partsOf(post.meta ? post.info : "").slice(0, 3);
  const LABEL = { date: "GÜN", time: "SAAT", place: "YER" };
  const block = shrink((k) => {
    const z = (n) => Math.round(n * k);
    const head = headF(K, ctx, post, post.headline, maxW, tallOf(post.format) ? 4 : 3, z(92), z(52), sans(K, 800));
    const hl = Math.round(head.size * 1.06);
    const bh = parts.length ? z(118) : 0;
    const sub = post.sub ? K.fitRich(ctx, post.sub, names, maxW, 3, z(29 * subK(K, post)), z(22 * subK(K, post)), 400) : null;
    const sl = sub ? Math.round(sub.size * 1.42) : 0;
    const wish = post.wish ? fitF(K, ctx, post.wish, maxW - z(60), 1, z(34), z(24), sans(K, 800)) : null;
    const h = head.lines.length * hl + (bh ? z(32) + bh : 0) + (sub ? z(26) + sub.lines.length * sl : 0) + (wish ? z(28) + wish.size * 1.2 : 0);
    return {
      h,
      draw(y) {
        ctx.textBaseline = "top";
        ctx.fillStyle = G;
        ctx.font = `800 ${head.size}px ${K.FONT}`;
        spacing(ctx, -Math.round(head.size * 0.01));
        for (const [i, l] of head.lines.entries()) ctx.fillText(l, x - 2, y + i * hl);
        spacing(ctx, 0);
        y += head.lines.length * hl;
        if (bh) {
          y += z(32);
          const gap = z(14);
          const bw = (maxW - gap * (parts.length - 1)) / parts.length;
          for (const [i, p] of parts.entries()) {
            const bx = x + i * (bw + gap);
            ctx.fillStyle = "#ffffff";
            K.pill(ctx, bx, y, bw, bh, z(22));
            ctx.fill();
            ctx.strokeStyle = hexA(G, 0.12);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = GM;
            ctx.fillRect(bx + z(24), y + z(24), z(28), z(5));
            ctx.font = `800 ${z(22)}px ${K.FONT}`;
            spacing(ctx, z(3));
            ctx.fillText(LABEL[p.kind], bx + z(62), y + z(15));
            spacing(ctx, 0);
            const v = fitF(K, ctx, p.t, bw - z(48), 1, z(36), z(20), sans(K, 800));
            ctx.fillStyle = G;
            ctx.font = `800 ${v.size}px ${K.FONT}`;
            ctx.fillText(v.lines[0] || "", bx + z(24), y + bh - z(24) - v.size);
          }
          y += bh;
        }
        if (sub) {
          y += z(26);
          for (const [i, l] of sub.lines.entries()) K.drawRich(ctx, l, x, y + i * sl, sub.size, 400, sub.space, hexA(G, 0.85), GM);
          y += sub.lines.length * sl;
        }
        if (wish) {
          y += z(28);
          arrowRight(ctx, x, y + wish.size * 0.58, z(36), GM, z(5));
          ctx.fillStyle = GM;
          ctx.font = `800 ${wish.size}px ${K.FONT}`;
          ctx.fillText(wish.lines[0], x + z(56), y);
        }
      },
    };
  }, H * 0.5);
  const by = H - S.b - 80 - block.h;
  const cy = hy + 84 + 44;
  const ch = by - 50 - cy;
  if (ch > 180) {
    ctx.save();
    ctx.shadowColor = "rgba(15,61,51,.25)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = G;
    K.pill(ctx, x, cy, maxW, ch, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.clip();
    if (photo) coverRect(ctx, photo, x, cy, maxW, ch, post);
    else {
      const g = ctx.createLinearGradient(x, cy, x + maxW, cy + ch);
      g.addColorStop(0, "#1f8a68");
      g.addColorStop(1, G);
      ctx.fillStyle = g;
      ctx.fillRect(x, cy, maxW, ch);
      ctx.translate(x, cy);
      K.decor(ctx, maxW, ch, true, "rgba(255,255,255,.16)", "antrenman");
    }
    ctx.restore();
  }
  block.draw(by);
}

// ─── 4. Kayıt / yelken okulu: yaz kampanyası ───
async function drawSchool(K, ctx, post, photo, W, H, S) {
  const SKY = ["#5cc8f0", "#1b7fc8"];
  const SAND = "#ffd45c";
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SKY[0]);
  g.addColorStop(1, SKY[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Güneş ışığı
  const r = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.7);
  r.addColorStop(0, "rgba(255,255,255,.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  const x = S.x;
  const maxW = S.w;
  await brand(K, post, ctx, x, S.t + 64, 42, "#ffffff", false);
  const { names } = namesFor(K, post);
  const parts = partsOf(post.meta ? post.info : "").slice(0, 3);

  // Üstte başlık (beyaz, dar büyük harf)
  const top = S.t + 64 + 84 + 40;
  const head = shrink((k) => {
    const z = (n) => Math.round(n * k);
    const f = headF(K, ctx, post, up(post.headline), maxW, 3, z(150), z(76), DISPLAY);
    const hl = Math.round(f.size * 1);
    const sub = post.sub ? K.fitRich(ctx, post.sub, names, maxW, 3, z(30 * subK(K, post)), z(22 * subK(K, post)), 600) : null;
    const sl = sub ? Math.round(sub.size * 1.4) : 0;
    return {
      h: f.lines.length * hl + (sub ? z(20) + sub.lines.length * sl : 0),
      draw(y) {
        ctx.save();
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(8,50,90,.35)";
        ctx.shadowOffsetY = 6;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = DISPLAY(f.size);
        for (const [i, l] of f.lines.entries()) ctx.fillText(l, x - 2, y + i * hl);
        ctx.restore();
        y += f.lines.length * hl;
        if (sub) {
          y += z(20);
          ctx.textBaseline = "top";
          for (const [i, l] of sub.lines.entries()) K.drawRich(ctx, l, x, y + i * sl, sub.size, 600, sub.space, "#ffffff", SAND);
        }
      },
    };
  }, H * 0.3);
  head.draw(top);

  // Altta kum dalgası: bilgi hapları + düğme
  const ch = 64;
  const bottom = H - S.b - 64;
  const ctaY = post.wish ? bottom - 88 : bottom;
  const chipY = parts.length ? ctaY - (post.wish ? 30 : 0) - ch : ctaY;
  const sandTop = Math.min(chipY - 70, H * 0.8);
  ctx.fillStyle = SAND;
  ctx.beginPath();
  ctx.moveTo(0, sandTop + 40);
  ctx.bezierCurveTo(W * 0.3, sandTop - 30, W * 0.62, sandTop + 70, W, sandTop);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, sandTop + 22);
  ctx.bezierCurveTo(W * 0.3, sandTop - 48, W * 0.62, sandTop + 52, W, sandTop - 18);
  ctx.stroke();
  if (parts.length) {
    ctx.save();
    ctx.font = `700 30px ${K.FONT}`;
    ctx.textBaseline = "middle";
    let cx = x;
    for (const p of parts) {
      const w = Math.min(maxW - (cx - x), ctx.measureText(p.t).width + 52);
      if (w < 120) break;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      K.pill(ctx, cx, chipY, w, ch, ch / 2);
      ctx.stroke();
      ctx.fillStyle = NAVY;
      ctx.fillText(p.t, cx + 26, chipY + ch / 2 + 1, w - 52);
      cx += w + 14;
    }
    ctx.restore();
  }
  if (post.wish) cta(K, ctx, x, ctaY, post.wish, 34, 88, NAVY, "#ffffff", SAND, NAVY, maxW);

  // Ortada yuvarlak fotoğraf (yoksa yelkenli çizimi) ve dönük sarı çıkartma
  const midTop = top + head.h + 40;
  const midBot = sandTop + 10;
  const D = Math.min(maxW * 0.78, midBot - midTop);
  if (D > 160) {
    const cx = x + maxW - D / 2 - (maxW - D) * 0.15;
    const cy = midTop + (midBot - midTop) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(8,50,90,.35)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2 - 12, 0, Math.PI * 2);
    ctx.clip();
    if (photo) coverRect(ctx, photo, cx - D / 2, cy - D / 2, D, D, post);
    else {
      const s = ctx.createLinearGradient(0, cy - D / 2, 0, cy + D / 2);
      s.addColorStop(0, "#9fe0f7");
      s.addColorStop(0.62, "#9fe0f7");
      s.addColorStop(0.62, "#2a8fd6");
      s.addColorStop(1, "#1569b0");
      ctx.fillStyle = s;
      ctx.fillRect(cx - D / 2, cy - D / 2, D, D);
      const u = D / 10;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.2, cy - u * 3.6);
      ctx.lineTo(cx - u * 0.2, cy + u * 0.9);
      ctx.lineTo(cx - u * 2.8, cy + u * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.moveTo(cx + u * 0.2, cy - u * 2.6);
      ctx.lineTo(cx + u * 0.2, cy + u * 0.9);
      ctx.lineTo(cx + u * 2.2, cy + u * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.moveTo(cx - u * 3.2, cy + u * 1.2);
      ctx.lineTo(cx + u * 2.8, cy + u * 1.2);
      ctx.lineTo(cx + u * 2.1, cy + u * 1.9);
      ctx.lineTo(cx - u * 2.6, cy + u * 1.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (post.tag) {
      // Dönük sarı çıkartma: etiket iki satıra bölünür
      const R = Math.min(118, D * 0.3);
      const bx = cx - D / 2 + R * 0.35;
      const byy = cy - D / 2 + R * 0.75;
      const words = up(post.tag).split(" ");
      const l = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [words[0]];
      ctx.save();
      ctx.translate(bx, byy);
      ctx.rotate(-0.22);
      ctx.shadowColor = "rgba(8,50,90,.3)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = SAND;
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const rr = i % 2 ? R : R * 0.92;
        ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const f = fitF(K, ctx, l.reduce((a, b) => (a.length > b.length ? a : b)), R * 1.5, 1, Math.round(R * 0.42), 16, DISPLAY);
      ctx.font = DISPLAY(f.size);
      const lh = f.size * 1.02;
      for (const [i, t] of l.entries()) ctx.fillText(t, 0, (i - (l.length - 1) / 2) * lh + 2);
      ctx.restore();
    }
  }
}

// ─── 5. Duyuru / kulüp haberi: haber bülteni ───
async function drawNews(K, ctx, post, photo, W, H, S) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const x = S.x;
  const maxW = S.w;
  // Üstte lacivert künye
  const band = S.t + 170;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, band);
  await brand(K, post, ctx, x, S.t + 42, 43, "#ffffff", false);
  ctx.save();
  ctx.fillStyle = YELLOW;
  ctx.font = `800 26px ${K.FONT}`;
  spacing(ctx, 5);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(post.kind === "kulup" ? "KULÜPTEN HABER" : post.kind === "kutlama" ? "KUTLAMA" : "DUYURU", x + maxW, S.t + 85);
  spacing(ctx, 0);
  ctx.restore();
  ctx.fillStyle = RED;
  ctx.fillRect(0, band, W, 8);

  const { names } = namesFor(K, post);
  const info = post.meta ? String(post.info || "").replace(/\s*·\s*/g, " • ") : "";
  const foot = 70;
  const block = shrink((k) => {
    const z = (n) => Math.round(n * k);
    const head = headF(K, ctx, post, post.headline, maxW, tallOf(post.format) ? 4 : 3, z(88), z(48), sans(K, 800));
    const hl = Math.round(head.size * 1.08);
    const sub = post.sub ? K.fitRich(ctx, post.sub, names, maxW, 3, z(30 * subK(K, post)), z(22 * subK(K, post)), 400) : null;
    const sl = sub ? Math.round(sub.size * 1.42) : 0;
    const inf = info ? fitF(K, ctx, info, maxW - z(40), 1, z(30), z(20), sans(K, 700)) : null;
    const wish = post.wish ? fitF(K, ctx, post.wish, maxW - z(28), 1, z(34), z(22), sans(K, 800)) : null;
    const h = head.lines.length * hl + (inf ? z(24) + inf.size * 1.3 : 0) + (sub ? z(22) + sub.lines.length * sl : 0) + (wish ? z(30) + wish.size * 1.3 : 0);
    return {
      h,
      draw(y) {
        ctx.textBaseline = "top";
        ctx.fillStyle = NAVY;
        ctx.font = `800 ${head.size}px ${K.FONT}`;
        spacing(ctx, -Math.round(head.size * 0.01));
        for (const [i, l] of head.lines.entries()) ctx.fillText(l, x - 2, y + i * hl);
        spacing(ctx, 0);
        y += head.lines.length * hl;
        if (inf) {
          y += z(24);
          K.pin(ctx, x + z(12), y + inf.size * 0.38, z(12), RED);
          ctx.fillStyle = NAVY;
          ctx.font = `700 ${inf.size}px ${K.FONT}`;
          ctx.fillText(inf.lines[0], x + z(40), y);
          y += inf.size * 1.3;
        }
        if (sub) {
          y += z(22);
          for (const [i, l] of sub.lines.entries()) K.drawRich(ctx, l, x, y + i * sl, sub.size, 400, sub.space, "#4a5568", NAVY);
          y += sub.lines.length * sl;
        }
        if (wish) {
          y += z(30);
          ctx.fillStyle = YELLOW;
          ctx.fillRect(x, y - z(4), z(8), wish.size * 1.3);
          ctx.fillStyle = NAVY;
          ctx.font = `800 ${wish.size}px ${K.FONT}`;
          ctx.fillText(wish.lines[0], x + z(28), y);
        }
      },
    };
  }, H * 0.48);
  const by = H - S.b - foot - 30 - block.h;
  const tagH = post.tag ? 66 : 0;
  const ph = by - 40 - tagH / 2 - (band + 8);
  const py = band + 8;
  if (ph > 120) {
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, py, W, ph);
      ctx.clip();
      coverRect(ctx, photo, 0, py, W, ph, post);
      ctx.restore();
    } else {
      const g = ctx.createLinearGradient(0, py, W * 0.4, py + ph);
      g.addColorStop(0, "#1d4c86");
      g.addColorStop(1, NAVY);
      ctx.fillStyle = g;
      ctx.fillRect(0, py, W, ph);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, py, W, ph);
      ctx.clip();
      ctx.translate(0, py);
      K.decor(ctx, W, ph, true, "rgba(255,255,255,.12)", post.kind);
      ctx.restore();
    }
  }
  if (post.tag) {
    // Fotoğrafın alt kenarında kırmızı etiket (haber alt yazısı gibi)
    ctx.save();
    ctx.font = `800 28px ${K.FONT}`;
    spacing(ctx, 4);
    const w = ctx.measureText(up(post.tag)).width + 56;
    const ty = (ph > 120 ? py + ph : py + 30) - tagH / 2;
    ctx.fillStyle = RED;
    ctx.fillRect(x, ty, w, tagH);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(up(post.tag), x + 28, ty + tagH / 2 + 1);
    spacing(ctx, 0);
    ctx.restore();
  }
  block.draw(by);
  // Altta ince çizgi ve kulüp adı
  const fy = H - S.b - foot;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(x, fy, maxW, 2);
  ctx.save();
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 22px ${K.FONT}`;
  spacing(ctx, 3);
  ctx.textBaseline = "middle";
  if (!post.noBrand) ctx.fillText("DİKİLİ YELKEN SPOR KULÜBÜ", x, fy + foot / 2);
  ctx.textAlign = "right";
  ctx.fillText(up(new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })), x + maxW, fy + foot / 2);
  spacing(ctx, 0);
  ctx.restore();
}

const DRAW = { race: drawRace, training: drawTraining, school: drawSchool, news: drawNews };

// Modern'de çizilemeyen tür (özel gün) için false döner; çağıran Afiş'e düşer
export async function drawModern(K, ctx, post, photo, W, H) {
  const lay = modernOf(post.kind);
  if (!lay) return false;
  const s = safeOf(post.format);
  const S = { t: s.t, b: s.b, x: K.PAD + s.l, w: W - K.PAD * 2 - s.l - s.r };
  await (post.kind === "sonuc" ? drawResult : DRAW[lay])(K, ctx, post, photo, W, H, S);
  return true;
}
