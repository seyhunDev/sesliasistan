"use client";

import { formatOf, imagePeople, moodOf, safeOf, tallOf, themeOf } from "./postModel";

// Gönderi görseli telefonda çizilir (canvas, 1080 genişlik): fotoğraf ya da kulüp renkli zemin, logo, etiket, başlık, alt satır.
// Sunucuya ya da yapay zekaya görsel gitmez; ücretli görüntü üretimi yok.
// Yazı tipleri: başlık ve metin Outfit (sade, modern), sporcu adları Lora eğik (OFL, public/fonts/post, Türkçe harflerle küçültülmüş)
const FONT = `"Post Sans", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif`;
const FACES = [
  ["Post Sans", "/fonts/post/Outfit-Regular.woff2", { weight: "400" }],
  ["Post Sans", "/fonts/post/Outfit-Bold.woff2", { weight: "700" }],
  ["Post Sans", "/fonts/post/Outfit-ExtraBold.woff2", { weight: "800" }],
  ["Post Serif", "/fonts/post/Lora-BoldItalic.woff2", { weight: "700", style: "italic" }],
];
let fontsP;
// İlk çizimde bir kez yüklenir; yüklenemezse (internet yok) sistem yazı tipiyle çizilir
const loadFonts = () =>
  (fontsP ||= Promise.race([
    Promise.all(
      FACES.map(([fam, url, d]) =>
        new FontFace(fam, `url(${url}) format("woff2")`, d)
          .load()
          .then((f) => document.fonts.add(f))
          .catch(() => null),
      ),
    ),
    new Promise((r) => setTimeout(r, 3000)),
  ]));
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

// Sporcu adları ayrı yazı tipinde (eğik, tırnaklı) ve renkte: kelime kelime ölçülür, satıra bölünür
const NAME_FONT = `"Post Serif", Georgia, "Times New Roman", serif`;
const low = (w) => w.toLocaleLowerCase("tr-TR");
const bareWord = (w) => low(w.replace(/['’].*$/, "").replace(/[^\p{L}\p{N}]/gu, ""));
const fontOf = (name, size, weight) => (name ? `italic 700 ${Math.round(size * 1.06)}px ${NAME_FONT}` : `${weight} ${size}px ${FONT}`);

function richWrap(ctx, text, names, maxW, size, weight) {
  const lines = [];
  ctx.font = `${weight} ${size}px ${FONT}`;
  const space = ctx.measureText(" ").width;
  for (const para of String(text || "").split("\n")) {
    let line = [];
    let w = 0;
    for (const t of para.split(" ").filter(Boolean)) {
      const n = names.has(bareWord(t));
      ctx.font = fontOf(n, size, weight);
      const tw = ctx.measureText(t).width;
      if (line.length && w + space + tw > maxW) {
        lines.push(line);
        line = [];
        w = 0;
      }
      w += (line.length ? space : 0) + tw;
      line.push({ t, n, w: tw });
    }
    if (line.length) lines.push(line);
  }
  return { lines, space };
}
function fitRich(ctx, text, names, maxW, maxLines, big, small, weight) {
  for (let s = big; s >= small; s -= 4) {
    const r = richWrap(ctx, text, names, maxW, s, weight);
    if (r.lines.length <= maxLines) return { size: s, ...r };
  }
  const r = richWrap(ctx, text, names, maxW, small, weight);
  return { size: small, ...r, lines: r.lines.slice(0, maxLines) };
}
function drawRich(ctx, line, x, y, size, weight, space, ink, nameInk) {
  let cx = x;
  for (const wd of line) {
    ctx.font = fontOf(wd.n, size, weight);
    ctx.fillStyle = wd.n ? nameInk : ink;
    ctx.fillText(wd.t, cx, y);
    cx += wd.w + space;
  }
}

// Yelkenli ve dalga süsü (fotoğraf yokken), yazının karşı yarısında
function sailDecor(ctx, W, H, top, color) {
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

// Dalga çizgileri (y'den başlayarak n satır)
function waves(ctx, W, y, n, gap = 36) {
  ctx.lineWidth = 4;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 40) {
      const yy = y + i * gap + Math.sin((x + i * 60) / 70) * 9;
      if (x === -40) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

// Sonuç: kupa silüeti ve arkasında ince halkalar (yıldız, ışın yok; sade)
function trophyDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.32;
  const cx = W * 0.74;
  const cy = top ? H * 0.66 : H * 0.3;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (const r of [1.05, 1.3]) {
    ctx.beginPath();
    ctx.arc(cx, cy, s * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.12, cx, cy + s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.12, cx - s * 0.42, cy - s * 0.5);
  ctx.fill();
  ctx.lineWidth = s * 0.07;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + d * s * 0.44, cy - s * 0.28, s * 0.16, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
    ctx.stroke();
  }
  ctx.fillRect(cx - s * 0.06, cy + s * 0.18, s * 0.12, s * 0.22);
  ctx.fillRect(cx - s * 0.26, cy + s * 0.4, s * 0.52, s * 0.1);
  ctx.fillRect(cx - s * 0.34, cy + s * 0.5, s * 0.68, s * 0.1);
  ctx.restore();
}

// Duyuru: deniz feneri, ışık huzmesi ve dalgalar
function lighthouseDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.32;
  const cx = W * 0.76;
  const base = top ? H * 0.86 : H * 0.58;
  const tip = base - s * 1.25;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Gövde (yukarı daralan) ve şeritler arası boşluk
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, base);
  ctx.lineTo(cx - s * 0.12, tip + s * 0.32);
  ctx.lineTo(cx + s * 0.12, tip + s * 0.32);
  ctx.lineTo(cx + s * 0.2, base);
  ctx.closePath();
  ctx.fill();
  // Fener odası ve kubbe
  ctx.fillRect(cx - s * 0.17, tip + s * 0.26, s * 0.34, s * 0.06);
  ctx.fillRect(cx - s * 0.1, tip + s * 0.1, s * 0.2, s * 0.14);
  ctx.beginPath();
  ctx.arc(cx, tip + s * 0.1, s * 0.1, Math.PI, 0);
  ctx.fill();
  // Işık huzmeleri
  ctx.globalAlpha = 0.6;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, tip + s * 0.17);
    ctx.lineTo(cx + d * s * 1.3, tip - s * 0.1);
    ctx.lineTo(cx + d * s * 1.3, tip + s * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  waves(ctx, W, base + 30, 3);
  ctx.restore();
}

// Kayıt / yelken okulu: farklı boyda üç küçük yelkenli (filo)
function fleetDecor(ctx, W, H, top, color) {
  const y = top ? H * 0.8 : H * 0.44;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const boat = (x, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y - s * 0.12);
    ctx.lineTo(x - s * 0.62, y - s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, y - s * 0.86);
    ctx.lineTo(x + 8, y - s * 0.12);
    ctx.lineTo(x + s * 0.38, y - s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.62, y);
    ctx.lineTo(x + s * 0.44, y);
    ctx.lineTo(x + s * 0.32, y + s * 0.12);
    ctx.lineTo(x - s * 0.5, y + s * 0.12);
    ctx.closePath();
    ctx.fill();
  };
  boat(W * 0.86, H * 0.2);
  boat(W * 0.66, H * 0.14);
  boat(W * 0.5, H * 0.1);
  waves(ctx, W, y + H * 0.06, 3);
  ctx.restore();
}

// Kutlama: üstten sarkan işaret bayrakları (iki sıra) ve dalgalar
function flagsDecor(ctx, W, H, top, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const row = (y0, sag, n, off) => {
    const pts = [];
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = -20 + ((W + 40) * i) / 40;
      const y = y0 + Math.sin((i / 40) * Math.PI) * sag;
      pts.push([x, y]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < n; k++) {
      const [x, y] = pts[Math.round(((k + off) / n) * 40)] || pts[40];
      const w = W / n / 1.7;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + w * 1.15);
      ctx.closePath();
      ctx.fill();
    }
  };
  const y = top ? H * 0.5 : H * 0.2;
  row(y, H * 0.1, 9, 0.5);
  row(y + H * 0.1, H * 0.12, 8, 0.5);
  waves(ctx, W, top ? H * 0.9 : H * 0.48, 3);
  ctx.restore();
}

// Antrenman: üçgen parkur, şamandıralar, rüzgâr okları
function courseDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.3;
  const cx = W * 0.64;
  const cy = top ? H * 0.68 : H * 0.36;
  const pts = [
    [cx, cy - s * 0.7],
    [cx + s * 0.75, cy + s * 0.45],
    [cx - s * 0.75, cy + s * 0.45],
  ];
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 3, y - s * 0.3, 6, s * 0.2);
  }
  // Rüzgâr okları (sol üstten)
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const x0 = cx - s * 1.25;
    const y0 = cy - s * 0.85 + i * s * 0.24;
    const x1 = x0 + s * 0.45;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.moveTo(x1 - 18, y0 - 12);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1 - 18, y0 + 12);
    ctx.stroke();
  }
  ctx.restore();
}

// Kulüp: çapa, halat halkası, alt tarafta dalgalar
function anchorDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.34;
  const cx = W * 0.74;
  const cy = top ? H * 0.64 : H * 0.28;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Halat halkası (noktalı daire)
  ctx.lineWidth = 8;
  ctx.setLineDash([4, 16]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Çapa
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.62, s * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.49);
  ctx.lineTo(cx, cy + s * 0.62);
  ctx.moveTo(cx - s * 0.32, cy - s * 0.28);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, s * 0.58, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  for (const d of [-1, 1]) {
    const x = cx + d * s * 0.57;
    const y = cy + s * 0.18;
    ctx.beginPath();
    ctx.moveTo(x - d * s * 0.02, y - s * 0.16);
    ctx.lineTo(x + d * s * 0.12, y + s * 0.02);
    ctx.lineTo(x - d * s * 0.14, y + s * 0.04);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineCap = "butt";
  waves(ctx, W, top ? H * 0.94 : cy + s * 1.3, 3);
  ctx.restore();
}

// Diğer: pusula gülü ve dalgalar
function compassDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.36;
  const cx = W * 0.74;
  const cy = top ? H * 0.66 : H * 0.3;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? s * 0.5 : s * 0.95;
    const w = i % 2 ? 0.16 : 0.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * s * w, cy + Math.sin(a + Math.PI / 2) * s * w);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * s * w, cy + Math.sin(a - Math.PI / 2) * s * w);
    ctx.closePath();
    ctx.fill();
  }
  waves(ctx, W, top ? H * 0.92 : cy + s * 1.35, 3);
  ctx.restore();
}

// Fotoğraf yokken zemindeki çizim türe göre: yarış duyurusu yelkenli, sonuç kupa, antrenman parkur, duyuru deniz feneri,
// kayıt küçük yelkenliler, kulüp çapa, kutlama işaret bayrakları, diğer pusula
const DECORS = { duyuru: sailDecor, sonuc: trophyDecor, antrenman: courseDecor, genel: lighthouseDecor, kayit: fleetDecor, kulup: anchorDecor, kutlama: flagsDecor, diger: compassDecor };
function decor(ctx, W, H, top, color, kind) {
  (DECORS[kind] || sailDecor)(ctx, W, H, top, color);
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

// Küçük konum işareti (yer · tarih satırının başında)
function pin(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.lineTo(x, y + r * 1.9);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Yazı bloğunun parçaları ve yükseklikleri (k: küçültme katsayısı; sığmazsa küçülür)
function measure(ctx, post, maxW, k) {
  const z = (n) => Math.round(n * k);
  // Görselde en çok 2 sporcu adı (daha çoksa adlar açıklamada)
  const people = imagePeople(post.people) ? imagePeople(post.people).split("\n") : [];
  // Görselde vurgulanacak adlar: yarışın sporcuları + sporcu satırlarının baştaki adı
  const names = new Set(
    [...(post.race?.athletes || []).map((a) => a.name), ...people.map((l) => l.split("·")[0])]
      .flatMap((n) => String(n || "").split(/\s+/))
      .map(bareWord)
      .filter((w) => w.length > 1 && !/^\d/.test(w) && !/sporcu/.test(w)),
  );
  const meta = post.meta ? post.info : "";
  const busy = people.length + (post.wish ? 1 : 0) + (meta ? 1 : 0);
  const items = [];
  const tagH = z(post.tag ? 34 : 12);
  items.push({ t: "tag", h: tagH, gap: 0 });
  const headLines = tallOf(post.format) ? 5 : post.format === "portrait" ? 4 : 3;
  const head = fit(ctx, post.headline || " ", maxW, headLines, z(busy > 2 ? 74 : people.length ? 78 : 90), z(46), 700);
  items.push({ t: "head", ...head, lh: Math.round(head.size * 1.06), h: head.lines.length * Math.round(head.size * 1.06), gap: z(28) });
  if (meta) {
    const m = fit(ctx, meta, maxW - z(40), 1, z(31), z(24), 400);
    items.push({ t: "meta", ...m, h: Math.round(m.size * 1.3), gap: z(20) });
  }
  if (post.sub) {
    const sub = fitRich(ctx, post.sub, names, maxW, 4, z(36), z(26), 400);
    items.push({ t: "sub", ...sub, lh: Math.round(sub.size * 1.4), h: sub.lines.length * Math.round(sub.size * 1.4), gap: z(22) });
  }
  if (people.length) {
    const pp = fitRich(ctx, people.join("\n"), names, maxW - z(34), people.length, z(36), z(24), 600);
    const ph = Math.round(pp.size * 1.42);
    items.push({ t: "people", ...pp, ph, h: z(20) + pp.lines.length * ph, gap: z(18) });
  }
  if (post.wish) {
    const w = fit(ctx, post.wish, maxW, 1, z(40), z(28), 700);
    items.push({ t: "wish", ...w, h: Math.round(w.size * 1.3), gap: z(24) });
  }
  const h = items.reduce((a, x, i) => a + x.h + (i ? x.gap : 0), 0);
  return { items, h, z };
}

function paint(ctx, { items, z }, x, y, c) {
  ctx.textBaseline = "top";
  for (const [i, it] of items.entries()) {
    if (i) y += it.gap;
    if (it.t === "tag") {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.accent;
      if (c.tag) {
        // Etiket: kısa çizgi + aralıklı büyük harf (dolu kutu yerine sade, dergi tarzı)
        ctx.fillRect(x, y + it.h / 2 - 1.5, z(44), 3);
        ctx.font = `700 ${z(25)}px ${FONT}`;
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${z(5)}px`;
        ctx.textBaseline = "middle";
        ctx.fillText(c.tag.toLocaleUpperCase("tr-TR"), x + z(62), y + it.h / 2 + 1);
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      } else {
        ctx.fillRect(x, y + it.h / 2 - 2, z(96), 4);
      }
      ctx.restore();
    } else if (it.t === "head") {
      ctx.fillStyle = c.ink;
      ctx.font = `700 ${it.size}px ${FONT}`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x - 3, y + j * it.lh);
    } else if (it.t === "meta") {
      pin(ctx, x + z(12), y + it.h * 0.36, z(11), c.accent);
      ctx.fillStyle = c.ink;
      ctx.globalAlpha = 0.88;
      ctx.font = `400 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x + z(38), y + (it.h - it.size) / 2);
      ctx.globalAlpha = 1;
    } else if (it.t === "sub") {
      for (const [j, l] of it.lines.entries()) drawRich(ctx, l, x, y + j * it.lh, it.size, 400, it.space, c.sub, c.name);
    } else if (it.t === "people") {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.rule;
      ctx.fillRect(x, y, z(160), 3);
      ctx.restore();
      let py = y + z(20);
      ctx.font = `600 ${it.size}px ${FONT}`;
      for (const l of it.lines) {
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(x + z(9), py + it.ph / 2 - 3, z(8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawRich(ctx, l, x + z(34), py + (it.ph - it.size) / 2 - 2, it.size, 600, it.space, c.ink, c.name);
        py += it.ph;
      }
    } else if (it.t === "wish") {
      ctx.fillStyle = c.wish;
      ctx.font = `700 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x, y + (it.h - it.size) / 2);
    }
    y += it.h;
  }
}

// Renk karıştırma (#rrggbb): a'dan b'ye t oranında
function mix(a, b, t) {
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [p, q] = [h(a), h(b)];
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`;
}

// Fotoğrafı kaplayacak şekilde çizer: zoom (100-250 %) büyütür, fx/focus (0-100) yatay/dikey kaydırır
function cover(ctx, photo, W, H, post) {
  const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight) * ((post.zoom || 100) / 100);
  const w = photo.naturalWidth * s;
  const h = photo.naturalHeight * s;
  ctx.drawImage(photo, (W - w) * ((post.fx ?? 50) / 100), (H - h) * ((post.focus ?? 50) / 100), w, h);
}

// Afiş (Seyhun'un örneği gibi): üstte logo | kulüp adı, sarı eğik tür etiketi (YARIŞ DUYURUSU, DUYURU…), çok kalın beyaz
// başlık, yer · tarih, kısa sarı çizgi, sarı dilek. Zemin kullanıcının fotoğrafı (büyütülür, kaydırılır); gölgelendirme hazır:
// fotoğraf laciverte çalar, üst kenar ve yazının olduğu taraf alttan yukarı koyu laciverte yumuşakça kararır (shade ile ayarlanır).
// Fotoğraf yoksa sade koyu lacivert zemin.
const YELLOW = "#f6c445";
const NAVY = "rgb(7,21,44)";
// Özel günlerin havası (moodOf): gölge rengi, fotoğrafa çalan renk, vurgu, etiket kutusu ve fotoğrafsız zemin.
// milli kırmızı-beyaz + ay yıldız, anma siyah-gri (fotoğraf da griye döner), dini lacivert-altın, deniz lacivert + ay yıldız.
const MOODS = {
  genel: { dark: NAVY, tint: "rgb(190,205,232)", accent: YELLOW, tagBg: YELLOW, tagInk: "#0b1f3f" },
  milli: { dark: "rgb(86,4,12)", tint: "rgb(246,196,196)", accent: "#ffffff", tagBg: "#ffffff", tagInk: "#c8102e", bg: ["#dc1f36", "#8a0c1a"], mark: "#ffffff", markA: 0.14, crisp: true },
  anma: { dark: "rgb(8,8,10)", tint: "rgb(215,215,215)", accent: "#d8d8d8", tagBg: "#e9e9e9", tagInk: "#141414", bg: ["#3b3c40", "#0b0b0d"], gray: true },
  dini: { dark: NAVY, tint: "rgb(190,205,232)", accent: "#e3c06b", tagBg: "#e3c06b", tagInk: "#0b1f3f", bg: ["#1a4170", "#06132a"], mark: "#e3c06b", markA: 0.2 },
  deniz: { dark: "rgb(4,26,48)", tint: "rgb(185,212,232)", accent: YELLOW, tagBg: YELLOW, tagInk: "#0b1f3f", bg: ["#1d6a8f", "#062440"], mark: "#ffffff", markA: 0.16 },
};
// Türk bayrağındaki ay yıldız (bayrak ölçüleriyle; G bayrağın yüksekliği, (x, y) bayrağın sol üstü)
function crescentStar(ctx, x, y, G, color, alpha) {
  const u = G / 800;
  const X = (v) => x + v * u;
  const Y = (v) => y + v * u;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(X(425), Y(400), 200 * u, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.arc(X(425), Y(400), 200 * u, 0, Math.PI * 2);
  ctx.arc(X(475), Y(400), 160 * u, 0, Math.PI * 2);
  ctx.fill("evenodd");
  ctx.restore();
  ctx.beginPath();
  for (const [i, [a, b]] of [[583.334, 400], [764.235, 458.779], [652.431, 304.894], [652.431, 495.106], [764.235, 341.221]].entries()) ctx[i ? "lineTo" : "moveTo"](X(a), Y(b));
  ctx.closePath();
  ctx.fill("nonzero");
  ctx.restore();
}
function measureAfis(ctx, post, maxW, k) {
  const z = (n) => Math.round(n * k);
  const people = imagePeople(post.people) ? imagePeople(post.people).split("\n") : [];
  const names = new Set(
    [...(post.race?.athletes || []).map((a) => a.name), ...people.map((l) => l.split("·")[0])]
      .flatMap((n) => String(n || "").split(/\s+/))
      .map(bareWord)
      .filter((w) => w.length > 1 && !/^\d/.test(w) && !/sporcu/.test(w)),
  );
  const meta = post.meta ? String(post.info || "").replace(/\s*·\s*/g, " • ") : "";
  const items = [];
  if (post.tag) items.push({ t: "tag", h: z(76), gap: 0 });
  const lines = tallOf(post.format) ? 5 : post.format === "portrait" ? 4 : 3;
  const more = (post.sub ? 1 : 0) + people.length + (meta ? 1 : 0);
  const text = post.headline || " ";
  // Örnekteki gibi az satır: iki satıra çok küçülmeden sığıyorsa iki satır
  const hi = z(more > 2 ? 104 : 118);
  const two = fit(ctx, text, maxW, 2, hi, Math.round(hi * 0.78), 800);
  ctx.font = `800 ${two.size}px ${FONT}`;
  const head = wrap(ctx, text, maxW).length <= 2 ? two : fit(ctx, text, maxW, lines, hi, z(56), 800);
  const lh = Math.round(head.size * 1.08);
  items.push({ t: "head", ...head, lh, h: head.lines.length * lh, gap: z(post.tag ? 34 : 0) });
  if (meta) {
    const m = fit(ctx, meta, maxW, 1, z(38), z(26), 400);
    items.push({ t: "meta", ...m, h: Math.round(m.size * 1.25), gap: z(40) });
  }
  if (post.sub) {
    const sub = fitRich(ctx, post.sub, names, maxW, 4, z(32), z(24), 400);
    items.push({ t: "sub", ...sub, lh: Math.round(sub.size * 1.42), h: sub.lines.length * Math.round(sub.size * 1.42), gap: z(meta ? 18 : 30) });
  }
  if (people.length) {
    const pp = fitRich(ctx, people.join("\n"), names, maxW - z(34), people.length, z(34), z(24), 600);
    const ph = Math.round(pp.size * 1.42);
    items.push({ t: "people", ...pp, ph, h: pp.lines.length * ph, gap: z(20) });
  }
  if (post.wish) {
    const w = fit(ctx, post.wish, maxW, 2, z(40), z(26), 700);
    items.push({ t: "rule", h: z(4), gap: z(34) });
    items.push({ t: "wish", ...w, lh: Math.round(w.size * 1.28), h: w.lines.length * Math.round(w.size * 1.28), gap: z(32) });
  }
  return { items, h: items.reduce((a, x, i) => a + x.h + (i ? x.gap : 0), 0), z };
}

function paintAfis(ctx, { items, z }, x, y, c) {
  ctx.textBaseline = "top";
  for (const [i, it] of items.entries()) {
    if (i) y += it.gap;
    if (it.t === "tag") {
      // Önde ince eğik çizgi, sonra dolu eğik kutu; içinde koyu, aralıklı büyük harf
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.font = `800 ${z(34)}px ${FONT}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${z(3)}px`;
      const label = c.tag.toLocaleUpperCase("tr-TR");
      const tw = ctx.measureText(label).width;
      const h = it.h;
      const sk = h * 0.34;
      ctx.fillStyle = c.tagBg || c.accent;
      ctx.beginPath();
      ctx.moveTo(x + sk, y);
      ctx.lineTo(x + sk + z(11), y);
      ctx.lineTo(x + z(11), y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      const bx = x + z(30);
      const bw = tw + z(64);
      ctx.beginPath();
      ctx.moveTo(bx + sk, y);
      ctx.lineTo(bx + bw + sk, y);
      ctx.lineTo(bx + bw, y + h);
      ctx.lineTo(bx, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c.tagInk;
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + sk / 2 + z(32), y + h / 2 + 2);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      ctx.restore();
      ctx.textBaseline = "top";
    } else if (it.t === "head") {
      ctx.fillStyle = c.ink;
      ctx.font = `800 ${it.size}px ${FONT}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${-Math.round(it.size * 0.01)}px`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x - 4, y + j * it.lh);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    } else if (it.t === "meta") {
      ctx.fillStyle = c.ink;
      ctx.globalAlpha = 0.94;
      ctx.font = `400 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x, y + (it.h - it.size) / 2);
      ctx.globalAlpha = 1;
    } else if (it.t === "sub") {
      ctx.globalAlpha = 0.9;
      for (const [j, l] of it.lines.entries()) drawRich(ctx, l, x, y + j * it.lh, it.size, 400, it.space, c.ink, c.accent);
      ctx.globalAlpha = 1;
    } else if (it.t === "people") {
      let py = y;
      for (const l of it.lines) {
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(x + z(9), py + it.ph / 2 - 3, z(8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawRich(ctx, l, x + z(34), py + (it.ph - it.size) / 2 - 2, it.size, 600, it.space, c.ink, c.accent);
        py += it.ph;
      }
    } else if (it.t === "rule") {
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = c.accent;
      ctx.fillRect(x, y, z(104), it.h);
      ctx.restore();
    } else if (it.t === "wish") {
      ctx.fillStyle = c.accent;
      ctx.font = `700 ${it.size}px ${FONT}`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x, y + j * it.lh);
    }
    y += it.h;
  }
}

// Alttan (ya da üstten) yukarı yumuşakça açılan koyu geçiş: yazının olduğu taraf koyu, öbür tarafa doğru kaybolur
function fade(ctx, W, H, top, rgb, a, reach) {
  const g = top ? ctx.createLinearGradient(0, 0, 0, H * reach) : ctx.createLinearGradient(0, H, 0, H * (1 - reach));
  const col = (t) => rgb.replace("rgb", "rgba").replace(")", `,${(a * t).toFixed(3)})`);
  for (const [o, t] of [[0, 1], [0.2, 0.92], [0.4, 0.72], [0.6, 0.45], [0.8, 0.18], [1, 0]]) g.addColorStop(o, col(t));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

async function drawAfis(ctx, post, photo, W, H) {
  const [, , , c2] = themeOf(post.theme);
  const base = post.theme === "kum" ? "#1f5a4b" : c2;
  const top = post.pos === "top";
  const { t: safeT, b: safeB, r: safeR, l: safeL } = safeOf(post.format);
  const mood = MOODS[moodOf(post)] || MOODS.genel;
  // Yerleşim: logo satırı ve yazı bloğu (ay yıldız ikisinin arasındaki boşluğa göre yerleşir)
  const R = 66;
  const lx = PAD + safeL;
  const ly = PAD - 8 + safeT;
  const maxW = W - PAD * 2 - safeR - safeL;
  const headTop = ly + R * 2 + 70;
  const room = top ? H - headTop - PAD - safeB : H - PAD - safeB - headTop - 40;
  let m = measureAfis(ctx, post, maxW, 1);
  for (let k = 0.94; m.h > room && k >= 0.6; k -= 0.06) m = measureAfis(ctx, post, maxW, k);
  const navy = (a) => mood.dark.replace("rgb", "rgba").replace(")", `,${a.toFixed(3)})`);

  if (photo) {
    cover(ctx, photo, W, H, post);
    const k = post.shade / 100;
    ctx.save();
    // Anma günlerinde fotoğraf griye döner
    if (mood.gray) {
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, W, H);
    }
    // Hazır gölgelendirme: fotoğraf günün rengine (çoğunlukla lacivert) çalar, yazının olduğu taraf alttan yukarı koyulaşır
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = mood.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = navy(0.04 + k * 0.18);
    ctx.fillRect(0, 0, W, H);
    fade(ctx, W, H, top, mood.dark, 0.82 + k * 0.17, 0.6 + k * 0.18);
  } else if (mood.bg) {
    // Özel gün zemini: günün renginde geçiş, sağda ay yıldız (anmada yok)
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, mood.bg[0]);
    g.addColorStop(1, mood.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W * 0.75, H * 0.3, 0, W * 0.75, H * 0.3, W * 0.9);
    r.addColorStop(0, "rgba(255,255,255,.14)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
    if (mood.mark) {
      // Logo ile yazı arasında yer varsa bayraktaki gibi net beyaz ay yıldız; yoksa yazının arkasında silik büyük ay yıldız
      const [b0, b1] = top ? [headTop + m.h + 40, H - safeB - PAD] : [ly + R * 2 + 40, H - PAD - safeB - m.h - 40];
      const G = Math.min((b1 - b0) * 2, ((W - PAD * 2 - safeR - safeL) * 0.62) / 0.674);
      const right = W - PAD - safeR;
      if (mood.crisp && G >= W * 0.5) crescentStar(ctx, right - (764 / 800) * G, (b0 + b1) / 2 - G / 2, G, mood.mark, 0.96);
      else {
        const g2 = W * 0.9;
        crescentStar(ctx, right + PAD * 0.4 - (764 / 800) * g2, (top ? H - safeB - H * 0.38 : safeT + H * 0.36) - g2 / 2, g2, mood.mark, mood.markA);
      }
    }
    fade(ctx, W, H, top, mood.dark, 0.55, 0.55);
  } else {
    // Sade koyu lacivert zemin (fotoğraf eklenince yerini fotoğraf alır)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(base, "#0b1f3f", 0.6));
    g.addColorStop(1, "#06132a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W * 0.8, H * 0.18, 0, W * 0.8, H * 0.18, W * 0.85);
    r.addColorStop(0, "rgba(255,255,255,.12)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
  }
  // Logo satırı okunsun diye üst kenar koyu lacivert (yazı üstteyse geçiş zaten koyu)
  if (!top) {
    const g2 = ctx.createLinearGradient(0, 0, 0, 420 + safeT);
    g2.addColorStop(0, navy(photo ? 0.6 + (post.shade / 100) * 0.2 : 0.3));
    g2.addColorStop(1, navy(0));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, 420 + safeT);
  }

  // Üstte logo | kulüp adı (iki satır, aralıklı büyük harf)
  const logo = await loadLogo();
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.3)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(lx + R, ly + R, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (logo) {
    ctx.clip();
    ctx.drawImage(logo, lx + 6, ly + 6, R * 2 - 12, R * 2 - 12);
  }
  ctx.restore();
  const dx = lx + R * 2 + 36;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fillRect(dx, ly + R - 44, 2, 88);
  ctx.fillStyle = "#ffffff";
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.4)";
    ctx.shadowBlur = 10;
  }
  ctx.font = `700 37px ${FONT}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.textBaseline = "middle";
  ctx.fillText("DİKİLİ YELKEN", dx + 34, ly + R - 23);
  ctx.fillText("SPOR KULÜBÜ", dx + 34, ly + R + 25);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.restore();

  // Yazı bloğu
  const c = { tag: post.tag, ink: "#ffffff", accent: mood.accent, tagBg: mood.tagBg, tagInk: mood.tagInk };
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 16;
  }
  paintAfis(ctx, m, lx, top ? headTop : H - PAD - safeB - m.h, c);
  ctx.shadowColor = "transparent";
}

// post: cleanPost; photo: yüklenmiş Image ya da null
export async function drawPost(canvas, post, photo) {
  await loadFonts();
  const [, , W, H] = formatOf(post.format);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const [, , c1, c2, accent] = themeOf(post.theme);
  const style = post.style || "klasik";
  const light = !photo && post.theme === "kum";
  const deep = post.theme === "kum" ? "#1f5a4b" : c2;
  // Kum temasında vurgu koyu yeşil; koyu şeritte görünsün diye bantta kum sarısı
  const bandAcc = post.theme === "kum" ? "#e9c46a" : accent;
  if (style === "afis") {
    await drawAfis(ctx, post, photo, W, H);
    return canvas;
  }
  const top = post.pos === "top";
  // Hikâye/Reels'te Instagram'ın üst satırı, alttaki yazılar ve sağdaki düğmeler yazının üstüne binmesin
  const { t: safeT, b: safeB, r: safeR, l: safeL } = safeOf(post.format);
  const L = PAD + safeL;

  if (photo) {
    cover(ctx, photo, W, H, post);
    if (style === "klasik") {
      const k = post.shade / 100;
      fade(ctx, W, H, top, "rgb(6,22,18)", 0.6 + k * 0.35, 0.62 + k * 0.2);
    } else {
      ctx.fillStyle = `rgba(0,0,0,${(post.shade / 100) * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }
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
    decor(ctx, W, H, top, light ? "rgba(31,90,75,.1)" : "rgba(255,255,255,.08)", post.kind);
  }

  // Logo + kulüp adı (yazının karşı köşesinde)
  const logo = await loadLogo();
  const ly = top ? H - PAD - 104 - safeB : PAD - 20 + safeT;
  const R = 52;
  ctx.save();
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(L + R, ly + R, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (logo) {
    ctx.clip();
    ctx.drawImage(logo, L + 6, ly + 6, R * 2 - 12, R * 2 - 12);
  }
  ctx.restore();
  ctx.save();
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = light ? "#123c33" : "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(CLUB, L + R * 2 + 24, ly + R);
  ctx.restore();

  // Yazı bloğu: Kart ve Bant'ta kutu/şerit içinde, Klasik'te doğrudan zeminde. Sığmazsa her şey birlikte küçülür.
  const inset = style === "kart" ? 52 : 0;
  const maxW = W - PAD * 2 - inset * 2 - safeR - safeL;
  const room = H - PAD * 2 - safeT - safeB - 150 - (style === "klasik" ? 0 : 90);
  let m = measure(ctx, post, maxW, 1);
  for (let k = 0.94; m.h > room && k >= 0.66; k -= 0.06) m = measure(ctx, post, maxW, k);

  const c = {
    tag: post.tag,
    ink: light ? "#123c33" : "#ffffff",
    accent: light ? "#1f5a4b" : accent,
    tagBg: light ? "#1f5a4b" : accent,
    tagInk: light ? "#ffffff" : "#10231e",
    wish: light ? "#1f5a4b" : accent,
    rule: light ? "rgba(18,60,51,.25)" : "rgba(255,255,255,.35)",
  };
  let x = L;
  let y;
  if (style === "kart") {
    // Açık renk yuvarlak kutu; içindeki yazı koyu
    const bw = W - PAD * 2 + 24 - safeR - safeL;
    const bh = m.h + inset * 2;
    const bx = L - 12;
    const by = top ? PAD - 12 + safeT : H - PAD - bh - safeB + 12;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.22)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "rgba(252,249,244,.96)";
    pill(ctx, bx, by, bw, bh, 44);
    ctx.fill();
    ctx.restore();
    Object.assign(c, { ink: "#10231e", accent: deep, tagBg: deep, tagInk: "#ffffff", wish: deep, rule: "rgba(16,35,30,.2)" });
    x = bx + 12 + inset;
    y = by + inset;
  } else if (style === "bant") {
    // Kenardan kenara koyu şerit + ince renkli çizgi
    const bh = m.h + 140 + (top ? safeT : safeB);
    const by = top ? 0 : H - bh;
    ctx.save();
    ctx.fillStyle = deep;
    ctx.globalAlpha = 0.96;
    ctx.fillRect(0, by, W, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bandAcc;
    ctx.fillRect(0, top ? by + bh - 10 : by, W, 10);
    ctx.restore();
    Object.assign(c, { ink: "#ffffff", accent: bandAcc, tagBg: bandAcc, tagInk: "#10231e", wish: bandAcc, rule: "rgba(255,255,255,.35)" });
    y = top ? 70 + safeT : by + 76;
  } else {
    if (photo) {
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = 14;
    }
    y = top ? PAD + 10 + safeT : H - PAD - m.h - safeB;
  }
  c.sub = c.ink;
  c.name = c.accent;
  paint(ctx, m, x, y, c);
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
    const x = W - PAD - R * 2 - safeOf(format).r;
    const y = H - PAD - R * 2 - safeOf(format).b;
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
