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

// Sporcu adları ayrı yazı tipinde (eğik, tırnaklı) ve renkte: kelime kelime ölçülür, satıra bölünür
const NAME_FONT = `Georgia, "Times New Roman", serif`;
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

// Sonuç: kupa, arkasında ışınlar, etrafında yıldızlar
function trophyDecor(ctx, W, H, top, color) {
  const s = Math.min(W, H) * 0.34;
  const cx = W * 0.74;
  const cy = top ? H * 0.66 : H * 0.3;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Işınlar (kupadan soluk)
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, s * 1.1, a, a + Math.PI / 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Kupa gövdesi
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.42, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.12, cx, cy + s * 0.2);
  ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.12, cx - s * 0.42, cy - s * 0.5);
  ctx.fill();
  // Kulplar
  ctx.lineWidth = s * 0.07;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + d * s * 0.44, cy - s * 0.28, s * 0.16, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
    ctx.stroke();
  }
  // Ayak ve kaide
  ctx.fillRect(cx - s * 0.06, cy + s * 0.18, s * 0.12, s * 0.22);
  ctx.fillRect(cx - s * 0.26, cy + s * 0.4, s * 0.52, s * 0.1);
  ctx.fillRect(cx - s * 0.34, cy + s * 0.5, s * 0.68, s * 0.1);
  // Yıldızlar
  const star = (x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  };
  star(cx - s * 0.95, cy - s * 0.7, s * 0.12);
  star(cx + s * 0.9, cy - s * 0.85, s * 0.09);
  star(cx - s * 1.2, cy + s * 0.25, s * 0.07);
  star(cx + s * 0.75, cy + s * 0.55, s * 0.08);
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

// Fotoğraf yokken zemindeki çizim türe göre: duyuru yelkenli, sonuç kupa, antrenman parkur, kulüp çapa, diğer pusula
const DECORS = { duyuru: sailDecor, sonuc: trophyDecor, antrenman: courseDecor, kulup: anchorDecor, diger: compassDecor };
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
  const people = post.people ? post.people.split("\n").slice(0, 4) : [];
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
  const tagH = z(post.tag ? 54 : 12);
  items.push({ t: "tag", h: tagH, gap: 0 });
  const headLines = post.format === "story" ? 5 : post.format === "portrait" ? 4 : 3;
  const head = fit(ctx, post.headline || " ", maxW, headLines, z(busy > 2 ? 72 : people.length ? 76 : 88), z(46), 800);
  items.push({ t: "head", ...head, lh: Math.round(head.size * 1.1), h: head.lines.length * Math.round(head.size * 1.1), gap: z(26) });
  if (meta) {
    ctx.font = `600 ${z(32)}px ${FONT}`;
    const m = fit(ctx, meta, maxW - z(40), 1, z(32), z(24), 600);
    items.push({ t: "meta", ...m, h: Math.round(m.size * 1.3), gap: z(20) });
  }
  if (post.sub) {
    const sub = fitRich(ctx, post.sub, names, maxW, 4, z(38), z(26), 500);
    items.push({ t: "sub", ...sub, lh: Math.round(sub.size * 1.32), h: sub.lines.length * Math.round(sub.size * 1.32), gap: z(22) });
  }
  if (people.length) {
    const pp = fitRich(ctx, people.join("\n"), names, maxW - z(34), people.length, z(36), z(24), 600);
    const ph = Math.round(pp.size * 1.42);
    items.push({ t: "people", ...pp, ph, h: z(20) + pp.lines.length * ph, gap: z(18) });
  }
  if (post.wish) {
    const w = fit(ctx, post.wish, maxW, 1, z(42), z(28), 800);
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
      ctx.fillStyle = c.tagBg;
      if (c.tag) {
        ctx.font = `800 ${z(26)}px ${FONT}`;
        const t = c.tag.toLocaleUpperCase("tr-TR");
        pill(ctx, x, y, ctx.measureText(t).width + z(48), it.h, it.h / 2);
        ctx.fill();
        ctx.fillStyle = c.tagInk;
        ctx.textBaseline = "middle";
        ctx.fillText(t, x + z(24), y + it.h / 2 + 1);
      } else {
        pill(ctx, x, y, z(120), it.h, it.h / 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (it.t === "head") {
      ctx.fillStyle = c.ink;
      ctx.font = `800 ${it.size}px ${FONT}`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x - 3, y + j * it.lh);
    } else if (it.t === "meta") {
      pin(ctx, x + z(12), y + it.h * 0.36, z(11), c.accent);
      ctx.fillStyle = c.ink;
      ctx.font = `600 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x + z(38), y + (it.h - it.size) / 2);
    } else if (it.t === "sub") {
      for (const [j, l] of it.lines.entries()) drawRich(ctx, l, x, y + j * it.lh, it.size, 500, it.space, c.sub, c.name);
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
      ctx.font = `800 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x, y + (it.h - it.size) / 2);
    }
    y += it.h;
  }
}

// post: cleanPost; photo: yüklenmiş Image ya da null
export async function drawPost(canvas, post, photo) {
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
    if (style === "klasik") {
      const g = top ? ctx.createLinearGradient(0, 0, 0, H * 0.72) : ctx.createLinearGradient(0, H, 0, H * 0.28);
      g.addColorStop(0, "rgba(6,22,18,.86)");
      g.addColorStop(0.55, "rgba(6,22,18,.6)");
      g.addColorStop(1, "rgba(6,22,18,0)");
      ctx.fillStyle = g;
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
    decor(ctx, W, H, top, light ? "rgba(31,90,75,.13)" : "rgba(255,255,255,.1)", post.kind);
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
  ctx.arc(PAD + R, ly + R, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (logo) {
    ctx.clip();
    ctx.drawImage(logo, PAD + 6, ly + 6, R * 2 - 12, R * 2 - 12);
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
  ctx.fillText(CLUB, PAD + R * 2 + 24, ly + R);
  ctx.restore();

  // Yazı bloğu: Kart ve Bant'ta kutu/şerit içinde, Klasik'te doğrudan zeminde. Sığmazsa her şey birlikte küçülür.
  const inset = style === "kart" ? 52 : 0;
  const maxW = W - PAD * 2 - inset * 2;
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
  let x = PAD;
  let y;
  if (style === "kart") {
    // Açık renk yuvarlak kutu; içindeki yazı koyu
    const bw = W - PAD * 2 + 24;
    const bh = m.h + inset * 2;
    const bx = PAD - 12;
    const by = top ? PAD - 12 + safeT : H - PAD - bh - safeB + 12;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.22)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "rgba(255,255,255,.95)";
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
