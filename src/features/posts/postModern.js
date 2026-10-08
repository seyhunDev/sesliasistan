"use client";

import { formatOf, imagePeople, modernOf, safeOf, tallOf } from "./postModel";

// Modern tasarım (2026 çizgisi): dev ve sıkı başlık, büyük dış çizgili arka yazı, hafif kumlu doku, cam kutular/haplar,
// canlı tek vurgu rengi. Yerleşim türe göre değişir (modernOf): race, training, school, news.
// Çizim yardımcıları postImage.js'ten "kit" olarak gelir (döngüsel içe aktarma olmasın diye).

// Renk seçimine (tür değişince türün rengi) göre: a koyu ana renk, b en koyu, acc canlı vurgu, accInk vurgunun üstündeki yazı
const PAL = {
  deniz: { a: "#0e4a47", b: "#04201e", acc: "#c8f169" },
  gece: { a: "#16306a", b: "#050d22", acc: "#d6ff3d" },
  gun: { a: "#6a1d2e", b: "#1d0710", acc: "#ff8a5b" },
  kum: { a: "#1f5a4b", b: "#0b2a22", acc: "#ff7a45" },
  mor: { a: "#3a2a7a", b: "#0f0a26", acc: "#b9a6ff" },
  turkuaz: { a: "#0a5158", b: "#021d21", acc: "#7af0dc" },
  bordo: { a: "#6a1730", b: "#1c050c", acc: "#ffb3c7" },
  antrasit: { a: "#2a3039", b: "#0a0b0d", acc: "#e8ff5a" },
  al: { a: "#c8102e", b: "#4d0610", acc: "#ffffff", accInk: "#c8102e" },
};
export const modernPal = (theme) => PAL[theme] || PAL.deniz;
const PAPER = "#f4f0e8";
const CREAM = "#f8f2e6";
const INK = "#121417";

// Hafif kumlu doku (her çizimde aynı desen)
let grainC;
function grain(ctx, W, H, alpha) {
  if (typeof document === "undefined") return;
  if (!grainC) {
    grainC = document.createElement("canvas");
    grainC.width = grainC.height = 180;
    const g = grainC.getContext("2d");
    const d = g.createImageData(180, 180);
    let s = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      s = (s * 16807) % 2147483647;
      const v = s % 256;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainC, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};
const spacing = (ctx, px) => {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
};

// Fotoğrafı bir kutuya kaplar (büyütme ve kaydırma ayarlarıyla)
function coverRect(ctx, photo, x, y, w, h, post) {
  const s = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * ((post.zoom || 100) / 100);
  const dw = photo.naturalWidth * s;
  const dh = photo.naturalHeight * s;
  ctx.drawImage(photo, x + (w - dw) * ((post.fx ?? 50) / 100), y + (h - dh) * ((post.focus ?? 50) / 100), dw, dh);
}

// Koyu zemin: fotoğraf (renge çalar, yazının tarafı koyulaşır) ya da renk geçişi + iki yumuşak ışık lekesi
function darkBg(K, ctx, post, photo, W, H, p, top) {
  if (photo) {
    K.cover(ctx, photo, W, H, post);
    const k = post.shade / 100;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = K.mixRgb(p.a, "#ffffff", 0.55);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    K.fade(ctx, W, H, top, K.mixRgb(p.b, p.b, 0), 0.8 + k * 0.18, 0.58 + k * 0.2);
    const g = top ? ctx.createLinearGradient(0, H, 0, H - 320) : ctx.createLinearGradient(0, 0, 0, 340);
    g.addColorStop(0, rgba(p.b, 0.55 + k * 0.2));
    g.addColorStop(1, rgba(p.b, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, p.a);
    g.addColorStop(1, p.b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const [cx, cy, r, col] of [
      [0.88, 0.14, 0.62, rgba(p.acc === "#ffffff" ? "#ff8a8a" : p.acc, 0.26)],
      [0.05, 0.72, 0.7, rgba(p.a, 0.9)],
    ]) {
      const rg = ctx.createRadialGradient(W * cx, H * cy, 0, W * cx, H * cy, W * r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
  }
  grain(ctx, W, H, photo ? 0.05 : 0.09);
}

// Logo + iki satır kulüp adı; yüksekliği 2R
async function brand(K, post, ctx, x, y, R, ink, shadow) {
  // Logo ve kulüp adı kapatılabilir (noBrand)
  if (post.noBrand) return;
  const logo = await K.loadLogo();
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,.25)";
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
  ctx.font = `700 ${Math.round(R * 0.52)}px ${K.FONT}`;
  spacing(ctx, 3);
  ctx.textBaseline = "middle";
  ctx.fillText("DİKİLİ YELKEN", x + R * 2 + 22, y + R * 0.62);
  ctx.globalAlpha = 0.7;
  ctx.font = `400 ${Math.round(R * 0.46)}px ${K.FONT}`;
  ctx.fillText("SPOR KULÜBÜ", x + R * 2 + 22, y + R * 1.42);
  spacing(ctx, 0);
  ctx.restore();
}

// Arkada büyük dış çizgili yazı (YARIŞ, ANTRENMAN…); dikeyse sağ kenar boyunca
function outlineWord(K, ctx, word, { x, y, len, color, vertical, italic, max = 300 }) {
  ctx.save();
  const style = italic ? "italic 800" : "800";
  let size = max;
  ctx.font = `${style} ${size}px ${K.FONT}`;
  spacing(ctx, 6);
  const w = ctx.measureText(word).width;
  if (w > len) size = Math.max(90, Math.floor((size * len) / w));
  ctx.font = `${style} ${size}px ${K.FONT}`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.textBaseline = "top";
  ctx.translate(x, y);
  if (vertical) ctx.rotate(Math.PI / 2);
  ctx.strokeText(word, 0, 0);
  spacing(ctx, 0);
  ctx.restore();
  return size;
}

// Yazı bloğu: o = { head, lines, italic, kicker (etiket başta çizgiyle), sticker (eğik çıkartma etiket), info "box"|"chips"|"line", wish "arrow"|"cta"|"rule" }
function measure(K, ctx, post, maxW, k, o) {
  const z = (n) => Math.round(n * k);
  const people = imagePeople(post.people) ? imagePeople(post.people).split("\n") : [];
  const names = K.namesOf(post, people);
  const info = post.meta ? String(post.info || "").trim() : "";
  const items = [];
  const add = (it, gap) => items.push({ ...it, gap: items.length ? gap : 0 });
  if (post.tag && o.kicker) add({ t: "kicker", h: z(34) }, 0);
  if (post.tag && o.sticker) add({ t: "sticker", h: z(70) }, 0);
  const weight = o.italic ? "italic 800" : 800;
  const hk = K.sizeK(post.headSize);
  const sk = K.sizeK(post.subSize);
  if (post.headline) {
    const hi = z(o.head * hk);
    const head = K.fit(ctx, post.headline, maxW, o.lines, hi, z(Math.round(o.head * 0.45 * hk)), weight);
    const lh = Math.round(head.size * 0.98);
    add({ t: "head", ...head, weight, lh, h: head.lines.length * lh + Math.round(head.size * 0.08) }, z(o.kicker ? 26 : 30));
  }
  if (info) {
    if (o.info === "box") {
      const f = K.fit(ctx, info.replace(/\s*[·•]\s*/g, "  •  "), maxW - z(110), 1, z(36), z(24), 700);
      add({ t: "box", ...f, h: z(92) }, z(34));
    } else if (o.info === "chips") {
      ctx.font = `700 ${z(30)}px ${K.FONT}`;
      const parts = info.split(/\s*[·•]\s*/).filter(Boolean).slice(0, 4);
      const rows = [[]];
      let w = 0;
      for (const t of parts) {
        const cw = Math.min(maxW, ctx.measureText(t).width + z(56));
        if (rows.at(-1).length && w + z(14) + cw > maxW) {
          rows.push([]);
          w = 0;
        }
        rows.at(-1).push({ t, w: cw });
        w += (rows.at(-1).length > 1 ? z(14) : 0) + cw;
      }
      add({ t: "chips", rows, size: z(30), ch: z(64), h: rows.length * z(64) + (rows.length - 1) * z(12) }, z(30));
    } else {
      const f = K.fit(ctx, info.replace(/\s*[·•]\s*/g, " • "), maxW - z(44), 1, z(34), z(24), 700);
      add({ t: "line", ...f, h: Math.round(f.size * 1.3) }, z(24));
    }
  }
  if (post.sub) {
    const sub = K.fitRich(ctx, post.sub, names, maxW, sk > 1 ? 5 : 4, z(31 * sk), z(23 * sk), 400);
    const l = Math.round(sub.size * 1.42);
    add({ t: "sub", ...sub, lh: l, h: sub.lines.length * l }, z(info ? 26 : 30));
  }
  if (people.length) {
    const pp = K.fitRich(ctx, people.join("\n"), names, maxW - z(34), people.length, z(33), z(24), 600);
    const ph = Math.round(pp.size * 1.42);
    add({ t: "people", ...pp, ph, h: pp.lines.length * ph }, z(18));
  }
  if (post.wish) {
    if (o.wish === "cta") {
      const w = K.fit(ctx, post.wish, maxW - z(150), 1, z(36), z(24), 700);
      add({ t: "cta", ...w, h: z(84) }, z(36));
    } else {
      const w = K.fit(ctx, post.wish, maxW - (o.wish === "arrow" ? z(64) : 0), 2, z(38), z(26), 700);
      const l = Math.round(w.size * 1.28);
      if (o.wish === "rule") add({ t: "rule", h: z(5) }, z(32));
      add({ t: "wish", ...w, lh: l, h: w.lines.length * l, arrow: o.wish === "arrow" }, o.wish === "rule" ? z(26) : z(34));
    }
  }
  return { items, h: items.reduce((a, x) => a + x.h + x.gap, 0), z };
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
  ctx.moveTo(x + s * 0.62, y - s * 0.36);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s * 0.62, y + s * 0.36);
  ctx.stroke();
  ctx.restore();
}

// c = { ink, soft (ikincil yazı), acc, accInk, name (sporcu adı rengi), glass, glassLine, sticker, stickerInk, cta, ctaInk, maxW }
function paint(K, ctx, post, { items, z }, x, y, c) {
  ctx.textBaseline = "top";
  for (const it of items) {
    y += it.gap;
    ctx.save();
    if (it.t === "kicker") {
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.acc;
      ctx.fillRect(x, y + it.h / 2 - z(2), z(64), z(4));
      ctx.font = `700 ${z(28)}px ${K.FONT}`;
      spacing(ctx, z(5));
      ctx.textBaseline = "middle";
      ctx.fillText(post.tag.toLocaleUpperCase("tr-TR"), x + z(84), y + it.h / 2 + 1);
    } else if (it.t === "sticker") {
      ctx.shadowColor = "rgba(0,0,0,.18)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.font = `800 ${z(30)}px ${K.FONT}`;
      spacing(ctx, z(3));
      const label = post.tag.toLocaleUpperCase("tr-TR");
      const w = ctx.measureText(label).width + z(56);
      ctx.translate(x + w / 2, y + it.h / 2);
      ctx.rotate(-0.07);
      ctx.fillStyle = c.sticker;
      K.pill(ctx, -w / 2, -it.h / 2, w, it.h, z(18));
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.stickerInk;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(label, z(2), 2);
    } else if (it.t === "head") {
      ctx.fillStyle = c.ink;
      ctx.font = `${it.weight} ${it.size}px ${K.FONT}`;
      spacing(ctx, -Math.round(it.size * 0.025));
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x - 3, y + j * it.lh);
    } else if (it.t === "box") {
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.glass;
      K.pill(ctx, x, y, c.maxW, it.h, z(24));
      ctx.fill();
      ctx.strokeStyle = c.glassLine;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = c.acc;
      K.pill(ctx, x + z(14), y + z(14), z(64), it.h - z(28), z(16));
      ctx.fill();
      K.pin(ctx, x + z(46), y + it.h / 2 - z(9), z(11), c.accInk);
      ctx.fillStyle = c.ink;
      ctx.font = `700 ${it.size}px ${K.FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillText(it.lines[0] || "", x + z(100), y + it.h / 2 + 1);
    } else if (it.t === "chips") {
      ctx.shadowColor = "transparent";
      ctx.font = `700 ${it.size}px ${K.FONT}`;
      ctx.textBaseline = "middle";
      let cy = y;
      for (const row of it.rows) {
        let cx = x;
        for (const [i, ch] of row.entries()) {
          ctx.fillStyle = i === 0 ? c.acc : c.glass;
          K.pill(ctx, cx, cy, ch.w, it.ch, it.ch / 2);
          ctx.fill();
          if (i) {
            ctx.strokeStyle = c.glassLine;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.fillStyle = i === 0 ? c.accInk : c.ink;
          ctx.fillText(ch.t, cx + z(28), cy + it.ch / 2 + 1, ch.w - z(56));
          cx += ch.w + z(14);
        }
        cy += it.ch + z(12);
      }
    } else if (it.t === "line") {
      ctx.shadowColor = "transparent";
      K.pin(ctx, x + z(13), y + it.h / 2 - z(9), z(12), c.acc);
      ctx.fillStyle = c.ink;
      ctx.font = `700 ${it.size}px ${K.FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillText(it.lines[0] || "", x + z(44), y + it.h / 2 + 1);
    } else if (it.t === "sub") {
      for (const [j, l] of it.lines.entries()) K.drawRich(ctx, l, x, y + j * it.lh, it.size, 400, it.space, c.soft, c.name);
    } else if (it.t === "people") {
      let py = y;
      for (const l of it.lines) {
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = c.acc;
        ctx.fillRect(x, py + it.ph / 2 - z(4), z(18), z(5));
        ctx.restore();
        K.drawRich(ctx, l, x + z(34), py + (it.ph - it.size) / 2 - 2, it.size, 600, it.space, c.ink, c.name);
        py += it.ph;
      }
    } else if (it.t === "rule") {
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.acc;
      ctx.fillRect(x, y, z(90), it.h);
    } else if (it.t === "wish") {
      ctx.fillStyle = c.wish || c.acc;
      ctx.font = `700 ${it.size}px ${K.FONT}`;
      const dx = it.arrow ? z(64) : 0;
      if (it.arrow) arrowRight(ctx, x, y + it.size * 0.55, z(40), c.wish || c.acc, z(5));
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x + dx, y + j * it.lh);
    } else if (it.t === "cta") {
      ctx.shadowColor = "rgba(0,0,0,.18)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      ctx.font = `700 ${it.size}px ${K.FONT}`;
      const w = Math.min(c.maxW, ctx.measureText(it.lines[0] || "").width + z(150));
      ctx.fillStyle = c.cta;
      K.pill(ctx, x, y, w, it.h, it.h / 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.ctaInk;
      ctx.textBaseline = "middle";
      ctx.fillText(it.lines[0] || "", x + z(40), y + it.h / 2 + 1);
      ctx.fillStyle = c.acc;
      ctx.beginPath();
      ctx.arc(x + w - it.h / 2, y + it.h / 2, it.h / 2 - z(10), 0, Math.PI * 2);
      ctx.fill();
      arrowRight(ctx, x + w - it.h / 2 - z(14), y + it.h / 2, z(28), c.accInk, z(4));
    }
    ctx.restore();
    y += it.h;
  }
}

// Yazı bloğunu alana sığdırır (sığmazsa her şey birlikte küçülür)
function fitBlock(K, ctx, post, maxW, room, o) {
  let m = measure(K, ctx, post, maxW, 1, o);
  for (let k = 0.94; m.h > room && k >= 0.56; k -= 0.06) m = measure(K, ctx, post, maxW, k, o);
  return m;
}

const lines = (f) => (tallOf(f) ? 5 : f === "portrait" ? 4 : 3);

// Yarış duyurusu / sonucu: koyu zemin, sağ kenarda dikey dış çizgili YARIŞ / SONUÇ, sağ üstte dolu etiket hapı,
// dev başlık, tarih ve yer cam kutuda, ok ile dilek
async function drawRace(K, ctx, post, photo, W, H, p, S) {
  const top = post.pos === "top";
  darkBg(K, ctx, post, photo, W, H, p, top);
  const R = 46;
  const hy = PADY(S);
  outlineWord(K, ctx, post.kind === "sonuc" ? "SONUÇ" : "YARIŞ", {
    x: W - S.r - 26,
    y: hy + R * 2 + 46,
    len: H - hy - R * 2 - 46 - S.b - 60,
    color: rgba(p.acc === "#ffffff" ? "#ffffff" : p.acc, photo ? 0.22 : 0.2),
    vertical: true,
    max: 230,
  });
  await brand(K, post, ctx, S.x, hy, R, "#ffffff", !!photo);
  if (post.tag) {
    ctx.save();
    ctx.font = `800 26px ${K.FONT}`;
    spacing(ctx, 3);
    const label = post.tag.toLocaleUpperCase("tr-TR");
    const w = ctx.measureText(label).width + 52;
    const x = W - S.r - K.PAD - w;
    ctx.fillStyle = p.acc;
    K.pill(ctx, x, hy + R - 31, w, 62, 31);
    ctx.fill();
    ctx.fillStyle = p.accInk || p.b;
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 26, hy + R + 1);
    spacing(ctx, 0);
    ctx.restore();
  }
  const maxW = S.w - 70;
  const headTop = hy + R * 2 + 70;
  const room = H - headTop - K.PAD - S.b;
  const m = fitBlock(K, ctx, post, maxW, room, { head: post.kind === "sonuc" ? 124 : 136, lines: lines(post.format), info: "box", wish: "arrow" });
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 14;
  }
  paint(K, ctx, post, m, S.x, top ? headTop : H - K.PAD - S.b - m.h, { ...darkInk(p), maxW });
  ctx.shadowColor = "transparent";
}

// Antrenman: koyu zemin, ince eğik çizgiler, sağ üstte üç hız çubuğu, ortada eğik dış çizgili ANTRENMAN,
// çizgili etiket, eğik (italik) başlık, bilgi hapları
async function drawTraining(K, ctx, post, photo, W, H, p, S) {
  const top = post.pos === "top";
  darkBg(K, ctx, post, photo, W, H, p, top);
  if (!photo) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.lineWidth = 2;
    for (let i = -H; i < W; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, H);
      ctx.lineTo(i + H * 0.55, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Hız çubukları (sağ üst)
  ctx.save();
  ctx.fillStyle = p.acc;
  const bx = W - S.r - K.PAD;
  const by = PADY(S) + 6;
  for (const [i, [len, th]] of [[300, 26], [220, 18], [140, 12]].entries()) {
    const y = by + i * 34;
    ctx.globalAlpha = 1 - i * 0.22;
    ctx.beginPath();
    ctx.moveTo(bx - len + 14, y);
    ctx.lineTo(bx + 14, y);
    ctx.lineTo(bx, y + th);
    ctx.lineTo(bx - len, y + th);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const R = 46;
  const hy = PADY(S);
  const word = "ANTRENMAN";
  outlineWord(K, ctx, word, {
    x: S.x - 10,
    y: top ? H - S.b - K.PAD - H * 0.24 : hy + R * 2 + (H - hy - S.b) * 0.12,
    len: S.w + 40,
    color: photo ? "rgba(255,255,255,.18)" : rgba(p.acc === "#ffffff" ? "#ffffff" : p.acc, 0.16),
    italic: true,
    max: 220,
  });
  await brand(K, post, ctx, S.x, hy, R, "#ffffff", !!photo);
  const maxW = S.w;
  const headTop = hy + R * 2 + 80;
  const room = H - headTop - K.PAD - S.b;
  const m = fitBlock(K, ctx, post, maxW, room, { head: 128, lines: lines(post.format), italic: true, kicker: true, info: "chips", wish: "arrow" });
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 14;
  }
  paint(K, ctx, post, m, S.x, top ? headTop : H - K.PAD - S.b - m.h, { ...darkInk(p), maxW });
  ctx.shadowColor = "transparent";
}

// Kayıt / yelken okulu: krem zemin, büyük yumuşak daireler, fotoğraf kemerli çerçevede, eğik çıkartma etiket,
// koyu başlık, çizgili haplar, düğme gibi dilek (Kayıt için yaz →)
async function drawSchool(K, ctx, post, photo, W, H, p, S) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  const blob = p.acc === "#ffffff" ? rgba(p.a, 0.22) : rgba(p.acc, 0.85);
  ctx.fillStyle = blob;
  ctx.beginPath();
  ctx.arc(W * 0.94, H * 0.1, W * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.a, 0.1);
  ctx.beginPath();
  ctx.arc(W * 0.02, H * 0.52, W * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(p.a, 0.08);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.84);
  ctx.bezierCurveTo(W * 0.3, H * 0.78, W * 0.6, H * 0.92, W, H * 0.82);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // Küçük nokta ızgarası (sağ üst)
  ctx.fillStyle = rgba(p.b, 0.35);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.arc(W - S.r - K.PAD - j * 30, PADY(S) + 150 + i * 30, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, W, H, 0.06);
  const R = 44;
  const hy = PADY(S);
  await brand(K, post, ctx, S.x, hy, R, p.b, true);
  const maxW = S.w;
  const free = H - hy - R * 2 - 50 - K.PAD - S.b;
  const room = photo ? free * 0.58 : free;
  const m = fitBlock(K, ctx, post, maxW, room, { head: 120, lines: lines(post.format), sticker: true, info: "chips", wish: "cta" });
  const ty = H - K.PAD - S.b - m.h;
  if (photo) {
    const fy = hy + R * 2 + 44;
    const fh = ty - 46 - fy;
    if (fh > 140) {
      const fw = maxW;
      const r = Math.min(fw / 2, fh * 0.6);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(S.x, fy + fh);
      ctx.lineTo(S.x, fy + r);
      ctx.arcTo(S.x, fy, S.x + r, fy, r);
      ctx.lineTo(S.x + fw - r, fy);
      ctx.arcTo(S.x + fw, fy, S.x + fw, fy + r, r);
      ctx.lineTo(S.x + fw, fy + fh - 36);
      ctx.arcTo(S.x + fw, fy + fh, S.x + fw - 36, fy + fh, 36);
      ctx.lineTo(S.x + 36, fy + fh);
      ctx.arcTo(S.x, fy + fh, S.x, fy + fh - 36, 36);
      ctx.closePath();
      ctx.shadowColor = "rgba(0,0,0,.18)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.clip();
      coverRect(ctx, photo, S.x, fy, fw, fh, post);
      ctx.restore();
    }
  } else {
    K.decor(ctx, W, H, false, rgba(p.a, 0.08), post.kind);
  }
  paint(K, ctx, post, m, S.x, ty, {
    ink: p.b,
    soft: rgba(p.b, 0.78),
    acc: p.acc === "#ffffff" ? p.a : p.acc,
    accInk: p.acc === "#ffffff" ? "#ffffff" : p.b,
    name: p.a,
    glass: "rgba(255,255,255,.7)",
    glassLine: rgba(p.b, 0.18),
    sticker: p.a,
    stickerInk: "#ffffff",
    cta: p.b,
    ctaInk: "#ffffff",
    wish: p.a,
    maxW,
  });
}

// Haber / duyuru / kutlama / diğer: dergi düzeni. Kâğıt zemin, üstte künye (logo, kulüp adı, ay yıl, kalın + ince çizgi),
// ortada yuvarlak köşeli görsel (fotoğraf ya da renkli pano + türün çizimi), sol üstünde etiket hapı; altta başlık
async function drawNews(K, ctx, post, photo, W, H, p, S) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.07);
  const R = 34;
  const hy = PADY(S);
  await brand(K, post, ctx, S.x, hy, R, INK, false);
  const now = new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" }).toLocaleUpperCase("tr-TR");
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `700 22px ${K.FONT}`;
  spacing(ctx, 3);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(now, S.x + S.w, hy + R);
  spacing(ctx, 0);
  ctx.restore();
  const ry = hy + R * 2 + 22;
  ctx.fillStyle = INK;
  ctx.fillRect(S.x, ry, S.w, 5);
  ctx.fillRect(S.x, ry + 13, S.w, 1.5);
  const maxW = S.w;
  const free = H - ry - 50 - K.PAD - S.b;
  const m0 = fitBlock(K, ctx, post, maxW, free * 0.5, { head: 104, lines: lines(post.format), info: "line", wish: "rule" });
  const ty = H - K.PAD - S.b - m0.h;
  const py = ry + 44;
  const ph = ty - 44 - py;
  let m = m0;
  if (ph > 160) {
    ctx.save();
    K.pill(ctx, S.x, py, S.w, ph, 28);
    ctx.clip();
    if (photo) coverRect(ctx, photo, S.x, py, S.w, ph, post);
    else {
      const g = ctx.createLinearGradient(S.x, py, S.x + S.w * 0.4, py + ph);
      g.addColorStop(0, p.a);
      g.addColorStop(1, p.b);
      ctx.fillStyle = g;
      ctx.fillRect(S.x, py, S.w, ph);
      ctx.translate(S.x, py);
      K.decor(ctx, S.w, ph, true, "rgba(255,255,255,.14)", post.kind);
      ctx.translate(-S.x, -py);
      grain(ctx, W, H, 0.08);
    }
    ctx.restore();
    if (post.tag) {
      ctx.save();
      ctx.font = `800 24px ${K.FONT}`;
      spacing(ctx, 3);
      const label = post.tag.toLocaleUpperCase("tr-TR");
      const w = ctx.measureText(label).width + 48;
      ctx.fillStyle = p.acc;
      K.pill(ctx, S.x + 24, py + 24, w, 54, 27);
      ctx.fill();
      ctx.fillStyle = p.accInk || p.b;
      ctx.textBaseline = "middle";
      ctx.fillText(label, S.x + 48, py + 52);
      spacing(ctx, 0);
      ctx.restore();
    }
  } else {
    // Yazı çok: pano yok, etiket başlığın üstünde çizgili
    m = fitBlock(K, ctx, post, maxW, free, { head: 104, lines: lines(post.format), kicker: true, info: "line", wish: "rule" });
  }
  paint(K, ctx, post, m, S.x, H - K.PAD - S.b - m.h, {
    ink: INK,
    soft: "rgba(18,20,23,.72)",
    acc: p.a,
    accInk: "#ffffff",
    name: p.a,
    wish: p.a,
    maxW,
  });
}

const darkInk = (p) => ({
  ink: "#ffffff",
  soft: "rgba(255,255,255,.86)",
  acc: p.acc,
  accInk: p.accInk || p.b,
  name: p.acc,
  glass: "rgba(255,255,255,.1)",
  glassLine: "rgba(255,255,255,.22)",
});
const PADY = (S) => S.t + S.pad - 10;

// Modern'de çizilemeyen tür (özel gün) için false döner; çağıran Afiş'e düşer
export async function drawModern(K, ctx, post, photo, W, H) {
  const lay = modernOf(post.kind);
  if (!lay) return false;
  const s = safeOf(post.format);
  const S = { t: s.t, b: s.b, r: s.r, l: s.l, pad: K.PAD, x: K.PAD + s.l, w: W - K.PAD * 2 - s.l - s.r };
  const p = modernPal(post.theme);
  const fn = { race: drawRace, training: drawTraining, school: drawSchool, news: drawNews }[lay];
  await fn(K, ctx, post, photo, W, H, p, S);
  return formatOf(post.format)[0];
}
