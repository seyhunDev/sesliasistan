// Afiş şablonunun hazır arka planları: her türe uygun, canlı, çizimle üretilmiş sahne (fotoğraf gerekmez, ücretsiz, her boyutta keskin).
// Ufuk çizgisi ortanın biraz üstünde, ana nesne sağda (yazı solda/altta kalır); yazı tarafı sonra ayrıca koyulaştırılır.
// top: yazı üstteyse ana nesne aşağı kayar.

// Sabit rastgele (her çizimde aynı sahne)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace(")", `,${a})`).replace("rgb", "rgba"));
  g.addColorStop(1, color.replace(")", ",0)").replace("rgb", "rgba"));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Yumuşak bulut: üst üste binen saydam daireler
function cloud(ctx, x, y, w, a, rand) {
  ctx.save();
  ctx.globalAlpha = a;
  for (let i = 0; i < 7; i++) {
    const cx = x + (rand() - 0.5) * w;
    const cy = y + (rand() - 0.5) * w * 0.12;
    const r = w * (0.12 + rand() * 0.14);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// Uzak tepeler (sinüs toplamı), birkaç kat
function hills(ctx, W, base, amp, color, seed, haze) {
  const rand = rng(seed);
  const k = [rand() * 6, rand() * 6, rand() * 6];
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= W; x += 8) {
    const t = x / W;
    const y = base - amp * (0.55 + 0.25 * Math.sin(t * 5 + k[0]) + 0.15 * Math.sin(t * 13 + k[1]) + 0.05 * Math.sin(t * 37 + k[2]));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, base);
  ctx.closePath();
  ctx.fill();
  if (haze) {
    ctx.fillStyle = vgrad(ctx, base - amp, base, [
      [0, "rgba(255,255,255,0)"],
      [1, haze],
    ]);
    ctx.fill();
  }
  ctx.restore();
}

// Deniz: koyulaşan geçiş, dalga çizgileri, güneş yansıması ışıltıları
function sea(ctx, W, H, hy, c0, c1, opt = {}) {
  const rand = rng(opt.seed || 7);
  ctx.fillStyle = vgrad(ctx, hy, H, [
    [0, c0],
    [1, c1],
  ]);
  ctx.fillRect(0, hy, W, H - hy);
  // Dalga çizgileri: ufka yakın ince ve sık, öne doğru kalın ve seyrek
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const d = rand();
    const y = hy + 6 + (H - hy) * d * d;
    const len = 20 + d * 160 * rand();
    const x = rand() * W;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + d * 0.12})`;
    ctx.lineWidth = 1 + d * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y - 2 - d * 6, x + len, y);
    ctx.stroke();
  }
  // Işıltı yolu
  if (opt.shine) {
    const [sx, col] = opt.shine;
    for (let i = 0; i < 160; i++) {
      const d = rand();
      const y = hy + 4 + (H - hy) * d * d * 0.9;
      const spread = 30 + d * 260;
      const x = sx + (rand() - 0.5) * spread * 2;
      ctx.fillStyle = col.replace(")", `,${0.25 + rand() * 0.55})`).replace("rgb", "rgba");
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + d * 14 * rand(), 1 + d * 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Yelkenli: gövde, direk, yatık ana yelken (ve isteğe bağlı flok), yelkenci, köpük
function boat(ctx, x, y, s, o = {}) {
  const tilt = o.tilt ?? -0.12;
  const sail = o.sail || "#f7f7f2";
  ctx.save();
  ctx.translate(x, y);
  // Gölge / yansıma
  ctx.fillStyle = "rgba(0,10,25,.25)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.06, s * 0.55, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(tilt);
  // Yelken: hafif kavisli üçgen, gölgeli
  const mh = s * (o.tall || 1.55);
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, -mh);
  ctx.quadraticCurveTo(s * 0.5, -mh * 0.45, s * 0.52, -s * 0.12);
  ctx.lineTo(-s * 0.04, -s * 0.1);
  ctx.closePath();
  const sg = ctx.createLinearGradient(-s * 0.04, 0, s * 0.52, 0);
  sg.addColorStop(0, sail);
  sg.addColorStop(1, o.sailShade || "#d9dde3");
  ctx.fillStyle = sg;
  ctx.fill();
  // Yelken dikişleri
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.lineWidth = Math.max(1, s * 0.006);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -mh + (mh - s * 0.1) * t);
    ctx.lineTo(s * 0.5 * (0.35 + t * 0.6), -mh + (mh - s * 0.1) * t + s * 0.06);
    ctx.stroke();
  }
  if (o.jib) {
    ctx.fillStyle = o.jib;
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, -mh * 0.82);
    ctx.lineTo(-s * 0.5, -s * 0.12);
    ctx.lineTo(-s * 0.1, -s * 0.12);
    ctx.closePath();
    ctx.fill();
  }
  // Direk ve bumba
  ctx.strokeStyle = "#c9a46a";
  ctx.lineWidth = Math.max(2, s * 0.022);
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -mh - s * 0.04);
  ctx.lineTo(-s * 0.05, -s * 0.02);
  ctx.moveTo(-s * 0.05, -s * 0.1);
  ctx.lineTo(s * 0.55, -s * 0.12);
  ctx.stroke();
  // Yelkenci
  if (o.sailor !== false) {
    ctx.fillStyle = o.crew || "#1b2433";
    ctx.beginPath();
    ctx.ellipse(s * 0.3, -s * 0.2, s * 0.07, s * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.cap || "#2f6fd1";
    ctx.beginPath();
    ctx.arc(s * 0.27, -s * 0.34, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gövde
  ctx.fillStyle = o.hull || "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, -s * 0.06);
  ctx.lineTo(s * 0.58, -s * 0.06);
  ctx.quadraticCurveTo(s * 0.52, s * 0.06, s * 0.36, s * 0.08);
  ctx.lineTo(-s * 0.42, s * 0.08);
  ctx.quadraticCurveTo(-s * 0.54, s * 0.04, -s * 0.55, -s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,20,40,.18)";
  ctx.fillRect(-s * 0.5, s * 0.02, s * 1.0, s * 0.03);
  ctx.restore();
  // Köpük ve sıçrama
  if (o.splash !== false) {
    const rand = rng(Math.round(x + y));
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI;
      const r = s * (0.2 + rand() * 0.55);
      const px = x + s * 0.45 + Math.cos(a) * r * 0.9;
      const py = y + s * 0.02 - Math.sin(a) * r * 0.35;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, s * (0.004 + rand() * 0.014), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(x + s * 0.1, y + s * 0.07, s * 0.62, s * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Uzaktaki küçük yelken
function farSail(ctx, x, y, s, color = "rgba(255,255,255,.85)") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.32, y - s * 0.45, x + s * 0.36, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.04, y - s * 0.78);
  ctx.lineTo(x - s * 0.3, y);
  ctx.lineTo(x - s * 0.04, y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x - s * 0.3, y, s * 0.68, s * 0.05);
  ctx.restore();
}

function buoy(ctx, x, y, s, color = "#ff7a1a") {
  ctx.save();
  ctx.fillStyle = "rgba(0,10,25,.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.5, s * 0.9, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, color);
  g.addColorStop(1, "#b44a07");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.7, y + s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.7, y - s * 1.1, x, y - s * 1.2);
  ctx.quadraticCurveTo(x + s * 0.7, y - s * 1.1, x + s * 0.7, y + s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath();
  ctx.ellipse(x - s * 0.25, y - s * 0.5, s * 0.12, s * 0.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gulls(ctx, x, y, s, n, rand, color = "rgba(255,255,255,.8)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const gx = x + (rand() - 0.5) * s * 6;
    const gy = y + (rand() - 0.5) * s * 2;
    const k = s * (0.5 + rand() * 0.6);
    ctx.lineWidth = Math.max(2, k * 0.12);
    ctx.beginPath();
    ctx.moveTo(gx - k, gy - k * 0.2);
    ctx.quadraticCurveTo(gx - k * 0.45, gy - k * 0.55, gx, gy);
    ctx.quadraticCurveTo(gx + k * 0.45, gy - k * 0.55, gx + k, gy - k * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function lighthouse(ctx, x, base, h) {
  const w = h * 0.16;
  ctx.save();
  // Kaya
  ctx.fillStyle = "#1c2a36";
  ctx.beginPath();
  ctx.moveTo(x - h * 0.55, base + h * 0.06);
  ctx.quadraticCurveTo(x - h * 0.3, base - h * 0.12, x - w, base - h * 0.08);
  ctx.lineTo(x + w * 1.3, base - h * 0.1);
  ctx.quadraticCurveTo(x + h * 0.35, base - h * 0.06, x + h * 0.6, base + h * 0.06);
  ctx.closePath();
  ctx.fill();
  // Kule (kırmızı-beyaz bantlı)
  const top = base - h;
  for (let i = 0; i < 5; i++) {
    const y0 = base - h * 0.1 - (h * 0.75 * i) / 5;
    const y1 = base - h * 0.1 - (h * 0.75 * (i + 1)) / 5;
    const s0 = w * (1 - 0.3 * (i / 5));
    const s1 = w * (1 - 0.3 * ((i + 1) / 5));
    ctx.fillStyle = i % 2 ? "#f4f1ea" : "#d2463c";
    ctx.beginPath();
    ctx.moveTo(x - s0, y0);
    ctx.lineTo(x - s1, y1);
    ctx.lineTo(x + s1, y1);
    ctx.lineTo(x + s0, y0);
    ctx.closePath();
    ctx.fill();
  }
  const ly = base - h * 0.85;
  ctx.fillStyle = "#1c2a36";
  ctx.fillRect(x - w * 0.85, ly, w * 1.7, h * 0.03);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillRect(x - w * 0.55, ly - h * 0.08, w * 1.1, h * 0.08);
  ctx.fillStyle = "#1c2a36";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, ly - h * 0.08);
  ctx.lineTo(x, top);
  ctx.lineTo(x + w * 0.75, ly - h * 0.08);
  ctx.closePath();
  ctx.fill();
  // Işık huzmesi
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(x, 0, x + h * 1.4, 0);
  g.addColorStop(0, "rgba(255,230,160,.5)");
  g.addColorStop(1, "rgba(255,230,160,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, ly - h * 0.04);
  ctx.lineTo(x + h * 1.4, ly - h * 0.3);
  ctx.lineTo(x + h * 1.4, ly + h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  glow(ctx, x, ly - h * 0.04, h * 0.25, "rgb(255,230,160)", 0.8);
}

// İskele ve yan yana bağlı tekneler (marina)
function marina(ctx, W, hy, H, rand) {
  const m = Math.min(W, H);
  const py = hy + m * 0.07;
  ctx.save();
  // Ahşap iskele (ufka paralel)
  ctx.fillStyle = "#7a5534";
  ctx.fillRect(W * 0.34, py, W * 0.66, m * 0.018);
  ctx.fillStyle = "#4b321f";
  for (let i = 0; i < 10; i++) ctx.fillRect(W * 0.36 + i * W * 0.066, py + m * 0.018, m * 0.01, m * 0.045);
  // Bağlı tekneler: direk, gövde, mavi yelken örtüsü
  for (let i = 0; i < 7; i++) {
    const x = W * 0.42 + i * W * 0.085 + rand() * 8;
    const h = m * (0.3 + rand() * 0.12);
    const by = py - m * 0.004;
    ctx.strokeStyle = "rgba(235,240,244,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.lineTo(x, by - h);
    ctx.stroke();
    ctx.strokeStyle = "rgba(235,240,244,.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, by - h);
    ctx.lineTo(x - m * 0.05, by - m * 0.02);
    ctx.moveTo(x, by - h);
    ctx.lineTo(x + m * 0.05, by - m * 0.02);
    ctx.stroke();
    ctx.fillStyle = "#1d4e89";
    ctx.fillRect(x - m * 0.002, by - m * 0.07, m * 0.05, m * 0.014);
    ctx.fillStyle = "#f5f6f7";
    ctx.beginPath();
    ctx.moveTo(x - m * 0.04, by - m * 0.03);
    ctx.lineTo(x + m * 0.045, by - m * 0.03);
    ctx.lineTo(x + m * 0.036, by);
    ctx.lineTo(x - m * 0.032, by);
    ctx.closePath();
    ctx.fill();
  }
  // Kulüp bayrağı
  const fx = W * 0.37;
  ctx.strokeStyle = "#e9edf0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx, py);
  ctx.lineTo(fx, py - m * 0.28);
  ctx.stroke();
  ctx.fillStyle = "#d62839";
  ctx.beginPath();
  ctx.moveTo(fx, py - m * 0.28);
  ctx.quadraticCurveTo(fx + m * 0.05, py - m * 0.29, fx + m * 0.1, py - m * 0.26);
  ctx.lineTo(fx + m * 0.1, py - m * 0.21);
  ctx.quadraticCurveTo(fx + m * 0.05, py - m * 0.235, fx, py - m * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// İşaret bayrakları dizisi
const FLAG_COLORS = ["#e63946", "#f4d35e", "#2a6fdb", "#ffffff", "#2a9d8f", "#f77f00", "#e63946", "#ffffff", "#2a6fdb", "#f4d35e"];
function bunting(ctx, x0, y0, x1, y1, sag, n) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1);
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag) + t * t * y1;
    const s = 34;
    ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.lineTo(x + s * 0.5, y);
    ctx.lineTo(x, y + s * 1.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function firework(ctx, x, y, r, color, rand) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, x, y, r * 0.8, color, 0.35);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + rand() * 0.1;
    const r0 = r * 0.25;
    const r1 = r * (0.75 + rand() * 0.3);
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.lineWidth = 2 + rand() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 + r * 0.06);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r1, y + Math.sin(a) * r1 + r * 0.06, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Ortak gökyüzü + ufuk + tepeler + deniz
function base(ctx, W, H, hy, p, seed) {
  ctx.fillStyle = vgrad(ctx, 0, hy, p.sky);
  ctx.fillRect(0, 0, W, hy + 2);
  if (p.sun) glow(ctx, p.sun[0] * W, p.sun[1] * H, p.sun[2] * W, p.sun[3], p.sun[4] ?? 0.9);
  const rand = rng(seed);
  for (let i = 0; i < (p.clouds ?? 4); i++) cloud(ctx, rand() * W, hy * (0.15 + rand() * 0.55), W * (0.25 + rand() * 0.3), p.cloudA ?? 0.6, rand);
  if (p.far) hills(ctx, W, hy + 2, H * 0.07, p.far, seed + 1, p.haze);
  if (p.near) hills(ctx, W, hy + 2, H * 0.04, p.near, seed + 2);
  sea(ctx, W, H, hy, p.sea[0], p.sea[1], { seed, shine: p.shine });
}

// Her türün sahnesi
// Yazı altta: nesneler ufkun hemen altında, büyük yelkenler yukarı doğru uzanır (yazının üst sınırına girmez).
// Yazı üstte: ufuk aşağıda, nesneler alt yarıda.
const SCENES = {
  // Yarış duyurusu: gündüz, koyu mavi deniz, uzakta filo, sağda büyük yelkenli
  duyuru(ctx, W, H, top) {
    const hy = H * (top ? 0.58 : 0.42);
    base(ctx, W, H, hy, {
      sky: [[0, "#0f2a52"], [0.6, "#3f73b0"], [1, "#9cc3e6"]],
      sun: [0.8, 0.08, 0.6, "rgb(255,255,255)", 0.35],
      far: "#2a4462", near: "#1f3650", haze: "rgba(160,190,220,.55)",
      sea: ["#1d4f86", "#071a33"], shine: [W * 0.78, "rgb(255,255,255)"],
    }, 11);
    const rand = rng(3);
    for (let i = 0; i < 7; i++) farSail(ctx, W * (0.06 + rand() * 0.5), hy + 6 + rand() * 10, H * (0.03 + rand() * 0.025));
    const s = top ? (H - hy) * 0.42 : hy * 0.5;
    boat(ctx, W * 0.74, top ? hy + (H - hy) * 0.62 : hy + H * 0.07, s, { tilt: -0.14, cap: "#2f6fd1" });
  },
  // Yarış sonucu: gün batımı, altın ışık yolu, bitiş şamandırası, siluet yelkenliler
  sonuc(ctx, W, H, top) {
    const hy = H * (top ? 0.6 : 0.44);
    base(ctx, W, H, hy, {
      sky: [[0, "#2b1a3d"], [0.45, "#a33f4f"], [0.8, "#f08a4b"], [1, "#ffd08a"]],
      sun: [0.6, (hy / H) - 0.02, 0.42, "rgb(255,214,140)", 1],
      clouds: 3, cloudA: 0.35,
      far: "#3a2238", near: "#2a1730",
      sea: ["#5a2a45", "#140a1d"], shine: [W * 0.6, "rgb(255,200,120)"],
    }, 21);
    ctx.save();
    ctx.fillStyle = "#ffe2a6";
    ctx.beginPath();
    ctx.arc(W * 0.6, hy - H * 0.012, W * 0.075, Math.PI, 0);
    ctx.fill();
    ctx.restore();
    const dark = { sail: "#2a1830", sailShade: "#1a0f22", hull: "#1a0f22", crew: "#120a18", cap: "#120a18", splash: false };
    const s = top ? (H - hy) * 0.36 : hy * 0.42;
    boat(ctx, W * 0.82, top ? hy + (H - hy) * 0.6 : hy + H * 0.06, s, { ...dark, tilt: -0.1 });
    buoy(ctx, W * 0.5, hy + H * 0.035, Math.min(W, H) * 0.022, "#ffb703");
    gulls(ctx, W * 0.75, hy * 0.35, Math.min(W, H) * 0.03, 4, rng(5), "rgba(40,20,40,.7)");
  },
  // Antrenman: sabah, turuncu parkur şamandıraları, antrenör botu, küçük yelkenliler
  antrenman(ctx, W, H, top) {
    const hy = H * (top ? 0.58 : 0.42);
    base(ctx, W, H, hy, {
      sky: [[0, "#123a5a"], [0.6, "#4f9ac0"], [1, "#d6eef2"]],
      sun: [0.6, 0.12, 0.45, "rgb(255,248,220)", 0.6],
      far: "#2f5a6e", haze: "rgba(200,230,235,.6)",
      sea: ["#1f7a8c", "#06283a"], shine: [W * 0.6, "rgb(255,255,255)"],
    }, 31);
    const m = Math.min(W, H);
    const d = top ? (H - hy) * 0.5 : H * 0.05;
    buoy(ctx, W * 0.5, hy + d * 0.3, m * 0.016);
    buoy(ctx, W * 0.94, hy + d * 1.2, m * 0.03);
    boat(ctx, W * 0.6, hy + d * 0.5, m * 0.09, { tilt: -0.16 });
    boat(ctx, W * 0.42, hy + d * 0.2, m * 0.06, { tilt: -0.14 });
    const s = top ? (H - hy) * 0.32 : hy * 0.36;
    boat(ctx, W * 0.8, hy + d * 1.1, s, { tilt: -0.18, cap: "#ff7a1a" });
  },
  // Duyuru: alacakaranlıkta kayalık burunda deniz feneri
  genel(ctx, W, H, top) {
    const hy = H * (top ? 0.6 : 0.44);
    base(ctx, W, H, hy, {
      sky: [[0, "#0c1631"], [0.55, "#2e3f7a"], [1, "#9a8bc2"]],
      sun: [0.2, 0.12, 0.3, "rgb(255,255,255)", 0.15],
      clouds: 3, cloudA: 0.3,
      far: "#1b2547", haze: "rgba(140,130,190,.4)",
      sea: ["#26346a", "#070b1e"], shine: [W * 0.6, "rgb(255,230,170)"],
    }, 41);
    const rand = rng(9);
    ctx.save();
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(W * 0.3 + rand() * W * 0.7, rand() * hy * 0.6, 1 + rand() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    lighthouse(ctx, W * 0.8, top ? hy + (H - hy) * 0.5 : hy + H * 0.02, top ? (H - hy) * 0.7 : hy * 0.72);
  },
  // Kayıt / yelken okulu: güneşli gün, rengârenk yelkenli küçük tekneler
  kayit(ctx, W, H, top) {
    const hy = H * (top ? 0.58 : 0.42);
    base(ctx, W, H, hy, {
      sky: [[0, "#1a6fb5"], [0.7, "#68b8e8"], [1, "#d4f0fb"]],
      sun: [0.86, 0.1, 0.4, "rgb(255,246,200)", 0.9],
      cloudA: 0.8,
      far: "#3d7f6f", haze: "rgba(210,240,240,.55)",
      sea: ["#1aa2b8", "#04506b"], shine: [W * 0.85, "rgb(255,255,255)"],
    }, 51);
    const k = top ? (H - hy) / 0.6 : hy / 0.42;
    const y0 = top ? hy + (H - hy) * 0.15 : hy + H * 0.01;
    const dy = top ? (H - hy) * 0.6 : H * 0.07;
    const sails = ["#ffd166", "#ef476f", "#06d6a0", "#ffffff", "#ff9f1c"];
    [[0.6, 0, 0.05], [0.7, 0.25, 0.065], [0.8, 0.5, 0.08], [0.92, 1, 0.12], [0.66, 0.85, 0.09]].forEach(([x, t, z], i) =>
      boat(ctx, W * x, y0 + dy * t, k * z, { tilt: -0.12 - (i % 2) * 0.06, sail: sails[i], sailShade: sails[i], cap: sails[(i + 2) % 5] }),
    );
    gulls(ctx, W * 0.7, hy * 0.3, Math.min(W, H) * 0.03, 5, rng(8));
  },
  // Kulüp haberi: marina, iskele, bağlı tekneler, kulüp bayrağı
  kulup(ctx, W, H, top) {
    const hy = H * (top ? 0.6 : 0.42);
    base(ctx, W, H, hy, {
      sky: [[0, "#0f3b4a"], [0.6, "#4c8fa0"], [1, "#cfe7e4"]],
      sun: [0.9, 0.15, 0.5, "rgb(255,250,230)", 0.6],
      far: "#2c5560", haze: "rgba(200,230,230,.5)",
      sea: ["#1b6f73", "#05252e"], shine: [W * 0.6, "rgb(255,255,255)"],
    }, 61);
    marina(ctx, W, top ? hy + (H - hy) * 0.3 : hy, H, rng(4));
  },
  // Kutlama: akşam denizinde havai fişekler ve işaret bayrakları (logo satırından uzakta)
  kutlama(ctx, W, H, top) {
    const hy = H * (top ? 0.62 : 0.46);
    base(ctx, W, H, hy, {
      sky: [[0, "#0b0820"], [0.6, "#3a1747"], [1, "#a8435a"]],
      clouds: 2, cloudA: 0.2,
      far: "#1e1030",
      sea: ["#3a1a40", "#08040f"], shine: [W * 0.72, "rgb(255,200,120)"],
    }, 71);
    const rand = rng(12);
    const fy = top ? hy * 0.62 : hy * 0.5;
    firework(ctx, W * 0.74, fy, W * 0.16, "rgb(255,206,92)", rand);
    firework(ctx, W * 0.9, fy - W * 0.17, W * 0.09, "rgb(255,90,110)", rand);
    firework(ctx, W * 0.6, fy + W * 0.06, W * 0.06, "rgb(120,220,255)", rand);
    bunting(ctx, W * 0.42, hy * 0.06, W + 20, hy * 0.2, H * 0.05, 9);
    const s = top ? (H - hy) * 0.3 : hy * 0.3;
    boat(ctx, W * 0.8, top ? hy + (H - hy) * 0.6 : hy + H * 0.05, s, { tilt: -0.06, splash: false, sail: "#f2e6d8", sailShade: "#c9a9a0", hull: "#f2e6d8" });
  },
  // Diğer: sakin deniz, güneş, martılar, uzakta tek yelken
  diger(ctx, W, H, top) {
    const hy = H * (top ? 0.6 : 0.46);
    base(ctx, W, H, hy, {
      sky: [[0, "#1b2a3e"], [0.6, "#5b7a99"], [1, "#e8d9c0"]],
      sun: [0.75, (hy / H) - 0.08, 0.35, "rgb(255,236,190)", 0.9],
      cloudA: 0.4,
      far: "#34485c", haze: "rgba(230,210,190,.5)",
      sea: ["#34607e", "#0b1a28"], shine: [W * 0.75, "rgb(255,236,190)"],
    }, 81);
    farSail(ctx, W * 0.62, hy + 8, H * 0.07);
    gulls(ctx, W * 0.7, hy * 0.5, Math.min(W, H) * 0.035, 4, rng(6));
  },
};

export const SCENE_KINDS = Object.keys(SCENES);

export function drawScene(ctx, W, H, kind, top) {
  (SCENES[kind] || SCENES.diger)(ctx, W, H, top);
}
