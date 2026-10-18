"use client";

import { formatOf, imagePeople, inkOf, moodOf, safeOf, tallOf, themeOf } from "./postModel";

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

// Başlık ve alt yazı boyutu (%60-150; 100 = otomatik boyut)
const sizeK = (v) => Math.max(60, Math.min(150, Number(v) || 100)) / 100;
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
// Afiş'te seçilen rengin (tür değişince türün rengi) karşılığı: gölge/zemin rengi (dark), etiket kutusu ve vurgu (tag),
// etiket yazısı (ink). Etiketin arka planı böylece türe göre değişir: Yarış mint, Sonuç turuncu, Antrenman sarı…
const AFIS_THEMES = {
  deniz: { dark: NAVY, tag: YELLOW, ink: "#0b1f3f", tint: "rgb(190,205,232)" },
  gece: { dark: "rgb(10,18,34)", tag: "#7fd3c4", ink: "#0b1f3f" },
  gun: { dark: "rgb(52,16,24)", tag: "#f4a261", ink: "#2a0f12" },
  kum: { dark: "rgb(10,40,32)", tag: "#9ad7ae", ink: "#0d2a22" },
  mor: { dark: "rgb(28,20,54)", tag: "#c5b3f6", ink: "#1e1440" },
  turkuaz: { dark: "rgb(5,36,42)", tag: "#5fd4c8", ink: "#06262b" },
  bordo: { dark: "rgb(46,10,22)", tag: "#f29bb0", ink: "#3a0a18" },
  antrasit: { dark: "rgb(16,18,22)", tag: "#e3e7ec", ink: "#16191e" },
  al: { dark: "rgb(86,4,12)", tag: "#ffffff", ink: "#c8102e" },
};
// Renk seçicide Afiş'in etiket rengi (küçük nokta)
export const afisTag = (theme) => (AFIS_THEMES[theme] || AFIS_THEMES.deniz).tag;
// "rgb(r,g,b)" ya da "#rrggbb" iki rengi t oranında karıştırır, "rgb(...)" döner
function mixRgb(a, b, t) {
  const v = (x) => (x.startsWith("#") ? [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)) : x.match(/\d+/g).map(Number));
  const [p, q] = [v(a), v(b)];
  return `rgb(${p.map((n, i) => Math.round(n + (q[i] - n) * t)).join(",")})`;
}
// Afiş'in havası: özel günde günün havası (MOODS), diğer türlerde seçili renge göre
function afisMood(post) {
  const m = moodOf(post);
  if (m !== "genel") return MOODS[m] || MOODS.genel;
  const [k, , c1] = themeOf(post.theme);
  const t = AFIS_THEMES[k] || AFIS_THEMES.deniz;
  // Fotoğraf seçili rengin açık tonuna çalar (multiply), gölge rengin koyusu
  return { dark: t.dark, tint: t.tint || mixRgb(c1, "#ffffff", 0.5), accent: t.tag, tagBg: t.tag, tagInk: t.ink };
}
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
// Görselde vurgulanacak adlar: yarışın sporcuları + sporcu satırlarının baştaki adı
function namesOf(post, people) {
  return new Set(
    [...(post.race?.athletes || []).map((a) => a.name), ...people.map((l) => l.split("·")[0])]
      .flatMap((n) => String(n || "").split(/\s+/))
      .map(bareWord)
      .filter((w) => w.length > 1 && !/^\d/.test(w) && !/sporcu/.test(w)),
  );
}
function measureAfis(ctx, post, maxW, k) {
  const z = (n) => Math.round(n * k);
  const people = imagePeople(post.people) ? imagePeople(post.people).split("\n") : [];
  const names = namesOf(post, people);
  const meta = post.meta ? String(post.info || "").replace(/\s*·\s*/g, " • ") : "";
  const items = [];
  if (post.tag) items.push({ t: "tag", h: z(76), gap: 0 });
  const lines = tallOf(post.format) ? 5 : post.format === "portrait" ? 4 : 3;
  const more = (post.sub ? 1 : 0) + people.length + (meta ? 1 : 0);
  const text = post.headline;
  const hk = sizeK(post.headSize);
  const sk = sizeK(post.subSize);
  if (text) {
    // Örnekteki gibi az satır: iki satıra çok küçülmeden sığıyorsa iki satır
    const hi = z((more > 2 ? 104 : 118) * hk);
    const two = fit(ctx, text, maxW, 2, hi, Math.round(hi * 0.78), 800);
    ctx.font = `800 ${two.size}px ${FONT}`;
    const head = wrap(ctx, text, maxW).length <= 2 ? two : fit(ctx, text, maxW, lines, hi, z(56 * hk), 800);
    const lh = Math.round(head.size * 1.08);
    items.push({ t: "head", ...head, lh, h: head.lines.length * lh, gap: z(post.tag ? 34 : 0) });
  }
  if (meta) {
    const m = fit(ctx, meta, maxW, 1, z(38), z(26), 400);
    items.push({ t: "meta", ...m, h: Math.round(m.size * 1.25), gap: z(40) });
  }
  if (post.sub) {
    const sub = fitRich(ctx, post.sub, names, maxW, sk > 1 ? 5 : 4, z(32 * sk), z(24 * sk), 400);
    items.push({ t: "sub", ...sub, lh: Math.round(sub.size * 1.42), h: sub.lines.length * Math.round(sub.size * 1.42), gap: z(meta ? 18 : 30) });
  }
  if (people.length) {
    const pp = fitRich(ctx, people.join("\n"), names, maxW - z(34), people.length, z(34), z(24), 600);
    const ph = Math.round(pp.size * 1.42);
    items.push({ t: "people", ...pp, ph, h: pp.lines.length * ph, gap: z(20) });
  }
  if (post.wish) {
    const wk = sizeK(post.wishSize);
    const w = fit(ctx, post.wish, maxW, 2, z(40 * wk), z(26 * wk), 700);
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
      ctx.fillStyle = c.head || c.ink;
      ctx.font = `800 ${it.size}px ${FONT}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${-Math.round(it.size * 0.01)}px`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, x - 4, y + j * it.lh);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    } else if (it.t === "meta") {
      ctx.fillStyle = c.meta || c.ink;
      ctx.globalAlpha = 0.94;
      ctx.font = `400 ${it.size}px ${FONT}`;
      ctx.fillText(it.lines[0] || "", x, y + (it.h - it.size) / 2);
      ctx.globalAlpha = 1;
    } else if (it.t === "sub") {
      ctx.globalAlpha = 0.9;
      for (const [j, l] of it.lines.entries()) drawRich(ctx, l, x, y + j * it.lh, it.size, 400, it.space, c.sub || c.ink, c.accent);
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
      ctx.fillStyle = c.wish || c.accent;
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
  const mood = afisMood(post);
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
    // Sade koyu zemin, seçili rengin tonunda (fotoğraf eklenince yerini fotoğraf alır)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mixRgb(base, mood.dark, 0.45));
    g.addColorStop(1, mixRgb(mood.dark, "#000000", 0.25));
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

  // Üstte logo | kulüp adı (iki satır, aralıklı büyük harf); istenirse kapatılır (noBrand)
  if (!post.noBrand) {
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
  }

  // Yazı bloğu
  const ink = post.ink || {};
  const c = { tag: post.tag, ink: "#ffffff", accent: mood.accent, tagBg: mood.tagBg, tagInk: mood.tagInk, head: inkOf(ink.head), sub: inkOf(ink.sub), meta: inkOf(ink.meta), wish: inkOf(ink.wish) };
  if (photo) {
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 16;
  }
  paintAfis(ctx, m, lx, top ? headTop : H - PAD - safeB - m.h, c);
  ctx.shadowColor = "transparent";
}

// Resmi yarış afişi (yarış bağlıyken her zaman bu): kulüp önde. Üstte ortada logo ve kulüp adı, altında kısa başlık,
// ince çizgili resmi bilgi tablosu (yarış, yer, tarih, sınıflar), sporcuların adları (sınıfıyla), en altta dilek.
// Zemin seçili rengin koyusu, kenarda ince çerçeve; fotoğraf varsa üstte görünür, aşağı doğru zemine kararır.
const upTr = (s) => String(s || "").toLocaleUpperCase("tr-TR");
function spaced(ctx, text, x, y, px, align) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
  const w = ctx.measureText(text).width - px;
  ctx.fillText(text, align === "center" ? x - w / 2 : x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}
function resmiRows(post) {
  const [place, ...rest] = String(post.info || "").split(/\s*·\s*/);
  const rows = [];
  if (post.race?.name) rows.push(["Yarış", post.race.name]);
  if (post.meta && place) rows.push(["Yer", place]);
  if (post.meta && rest.join(" · ")) rows.push(["Tarih", rest.join(" · ")]);
  if (post.classes) rows.push(["Sınıflar", String(post.classes).split(/\s*,\s*/).filter(Boolean).join(", ")]);
  return rows;
}
function measureResmi(ctx, post, maxW, k) {
  const z = (n) => Math.round(n * k);
  const items = [];
  const label = post.kind === "sonuc" ? "YARIŞ SONUCU" : "YARIŞ DUYURUSU";
  items.push({ t: "label", text: label, size: z(28), h: z(34), gap: 0 });
  if (post.headline) {
    const hk = sizeK(post.headSize);
    const head = fit(ctx, post.headline, maxW, 2, z(112 * hk), z(64 * hk), 800);
    const lh = Math.round(head.size * 1.06);
    items.push({ t: "head", ...head, lh, h: head.lines.length * lh, gap: z(16) });
  }
  const rows = resmiRows(post);
  if (rows.length) {
    const lw = z(200);
    const vw = maxW - lw;
    const size = z(33);
    const lh = Math.round(size * 1.3);
    const rs = rows.map(([l, v], i) => {
      ctx.font = `${i ? 400 : 700} ${size}px ${FONT}`;
      const lines = wrap(ctx, v, vw).slice(0, 2);
      return { l, lines, bold: !i, h: lines.length * lh + z(40) };
    });
    items.push({ t: "table", rows: rs, lw, size, lh, h: rs.reduce((a, r) => a + r.h, 0), gap: z(56) });
  }
  const all = post.hide?.includes("people") ? [] : post.race?.athletes || [];
  if (all.length) {
    const max = 12;
    const list = all.length > max ? all.slice(0, max - 1) : all;
    const cols = list.length > 4 ? 2 : 1;
    const size = z(cols > 1 ? 33 : 38);
    const ph = Math.round(size * 1.62);
    const rowsN = Math.ceil(list.length / cols) + (all.length > max ? 1 : 0);
    items.push({ t: "plabel", text: list.length === 1 ? "SPORCUMUZ" : "SPORCULARIMIZ", size: z(26), h: z(32), gap: z(54) });
    items.push({ t: "names", list, more: all.length - list.length, cols, size, ph, h: rowsN * ph, gap: z(20) });
  }
  const body = items.reduce((a, x, i) => a + x.h + (i ? x.gap : 0), 0);
  let wish = null;
  if (post.wish) {
    const wk = sizeK(post.wishSize);
    wish = fit(ctx, post.wish, maxW, 2, z(38 * wk), z(26 * wk), 700);
    wish.lh = Math.round(wish.size * 1.28);
    wish.h = wish.lines.length * wish.lh;
  }
  return { items, body, wish, z, h: body + (wish ? wish.h + z(70) : 0) };
}
function paintResmi(ctx, m, x, y, maxW, c) {
  const { z } = m;
  const cx = x + maxW / 2;
  ctx.textBaseline = "top";
  for (const [i, it] of m.items.entries()) {
    if (i) y += it.gap;
    if (it.t === "label" || it.t === "plabel") {
      ctx.fillStyle = c.accent;
      ctx.font = `700 ${it.size}px ${FONT}`;
      spaced(ctx, it.text, cx, y + (it.h - it.size) / 2, z(7), "center");
    } else if (it.t === "head") {
      ctx.fillStyle = c.head || "#ffffff";
      ctx.font = `800 ${it.size}px ${FONT}`;
      for (const [j, l] of it.lines.entries()) ctx.fillText(l, cx - ctx.measureText(l).width / 2, y + j * it.lh);
    } else if (it.t === "table") {
      let ry = y;
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(x, ry, maxW, 2);
      for (const r of it.rows) {
        ctx.fillStyle = c.accent;
        ctx.font = `600 ${z(25)}px ${FONT}`;
        spaced(ctx, upTr(r.l), x, ry + z(20) + (it.size - z(25)) / 2 + z(3), z(3));
        ctx.fillStyle = c.meta || "#ffffff";
        ctx.font = `${r.bold ? 700 : 400} ${it.size}px ${FONT}`;
        for (const [j, l] of r.lines.entries()) ctx.fillText(l, x + it.lw, ry + z(20) + j * it.lh);
        ry += r.h;
        ctx.fillStyle = "rgba(255,255,255,.28)";
        ctx.fillRect(x, ry - 1, maxW, 2);
      }
    } else if (it.t === "names") {
      const colW = it.cols > 1 ? maxW / 2 : maxW;
      const n = Math.ceil(it.list.length / it.cols);
      for (const [j, a] of it.list.entries()) {
        const col = it.cols > 1 ? Math.floor(j / n) : 0;
        const row = it.cols > 1 ? j % n : j;
        const py = y + row * it.ph + (it.ph - it.size) / 2;
        ctx.font = `600 ${it.size}px ${FONT}`;
        const name = a.name || "";
        const cls = a.cls ? `  ${a.cls}` : "";
        const nw = ctx.measureText(name).width;
        ctx.font = `400 ${Math.round(it.size * 0.74)}px ${FONT}`;
        const cw = ctx.measureText(cls).width;
        const left = it.cols > 1 ? x + col * colW + z(24) : cx - (nw + cw) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.font = `600 ${it.size}px ${FONT}`;
        ctx.fillText(name, left, py);
        ctx.globalAlpha = 0.7;
        ctx.font = `400 ${Math.round(it.size * 0.74)}px ${FONT}`;
        ctx.fillText(cls, left + nw, py + it.size * 0.2);
        ctx.globalAlpha = 1;
      }
      if (it.more > 0) {
        ctx.globalAlpha = 0.8;
        ctx.font = `400 ${Math.round(it.size * 0.8)}px ${FONT}`;
        const t = `ve ${it.more} sporcumuz daha`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(t, cx - ctx.measureText(t).width / 2, y + n * it.ph + (it.ph - it.size) / 2);
        ctx.globalAlpha = 1;
      }
    }
    y += it.h;
  }
}
async function drawResmi(ctx, post, photo, W, H) {
  const [, , , c2] = themeOf(post.theme);
  const { t: safeT, b: safeB, r: safeR, l: safeL } = safeOf(post.format);
  const mood = afisMood(post);
  const dark = mixRgb(c2, mood.dark, 0.55);
  const navy = (rgb, a) => rgb.replace("rgb", "rgba").replace(")", `,${a.toFixed(3)})`);
  // Zemin: düz koyu renk; fotoğraf varsa üstte, aşağı doğru zemine karışır
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);
  if (photo) {
    cover(ctx, photo, W, H, post);
    const k = post.shade / 100;
    ctx.fillStyle = navy(dark, 0.35 + k * 0.25);
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.62);
    g.addColorStop(0, navy(dark, 0));
    g.addColorStop(1, navy(dark, 0.97));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const r = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.75);
    r.addColorStop(0, "rgba(255,255,255,.10)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
  }
  // İnce çerçeve
  const F = 34;
  ctx.strokeStyle = navy(mixRgb(mood.accent, "#ffffff", 0), 0.55);
  ctx.lineWidth = 2;
  ctx.strokeRect(F + safeL, F + safeT, W - F * 2 - safeL - safeR, H - F * 2 - safeT - safeB);

  // Üstte ortada logo ve kulüp adı
  const cx = (W + safeL - safeR) / 2;
  let y = PAD - 6 + safeT;
  const R = 74;
  if (!post.noBrand) {
    const logo = await loadLogo();
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, y + R, R, 0, Math.PI * 2);
    ctx.fill();
    if (logo) {
      ctx.clip();
      ctx.drawImage(logo, cx - R + 6, y + 6, R * 2 - 12, R * 2 - 12);
    }
    ctx.restore();
    y += R * 2 + 30;
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 42px ${FONT}`;
    ctx.textBaseline = "top";
    spaced(ctx, CLUB, cx, y, 5, "center");
    y += 52;
    ctx.fillStyle = mood.accent;
    ctx.fillRect(cx - 45, y + 12, 90, 4);
    y += 16;
  }
  // Orta blok: başlık, tablo, sporcular; dilek en altta
  const maxW = W - PAD * 2 - 24 - safeL - safeR;
  const x = (W - maxW + safeL - safeR) / 2;
  const top = y + 40;
  const bottom = H - PAD - safeB;
  let m = measureResmi(ctx, post, maxW, 1);
  for (let k = 0.94; m.h > bottom - top && k >= 0.55; k -= 0.06) m = measureResmi(ctx, post, maxW, k);
  const wishH = m.wish ? m.wish.h : 0;
  const free = bottom - top - wishH - (m.wish ? m.z(70) : 0) - m.body;
  const ink = post.ink || {};
  paintResmi(ctx, m, x, top + Math.max(0, free) * 0.42, maxW, { accent: mood.accent, head: inkOf(ink.head), meta: inkOf(ink.meta) });
  if (m.wish) {
    ctx.fillStyle = inkOf(ink.wish) || mood.accent;
    ctx.font = `700 ${m.wish.size}px ${FONT}`;
    ctx.textBaseline = "top";
    for (const [j, l] of m.wish.lines.entries()) ctx.fillText(l, cx - ctx.measureText(l).width / 2, bottom - wishH + j * m.wish.lh);
  }
}

// post: cleanPost; photo: yüklenmiş Image ya da null
export async function drawPost(canvas, post, photo) {
  await loadFonts();
  // Başlık kaldırıldıysa görselde başlık yok (yazısı saklı kalır, geri açılınca gelir)
  if (post.noHead) post = { ...post, headline: "" };
  // Kapatılan yazılar (alt satır, sporcular, dilek, etiket) görselde çizilmez
  if (post.hide?.length) post = { ...post, ...Object.fromEntries(post.hide.map((k) => [k, ""])) };
  const [, , W, H] = formatOf(post.format);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const [, , c1, c2] = themeOf(post.theme);
  // Yalnız fotoğraf (yarış sonucu): görselde yazı ve logo yok; fotoğraf yoksa sade renk geçişi
  if (post.photoOnly) {
    if (photo) cover(ctx, photo, W, H, post);
    else {
      const g = ctx.createLinearGradient(0, 0, W * 0.45, H);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    return canvas;
  }
  // Yarış bağlıysa resmi yarış afişi; diğerleri (özel günler dahil) Afiş
  if (post.race && post.kind !== "ozel") {
    await drawResmi(ctx, post, photo, W, H);
    return canvas;
  }
  await drawAfis(ctx, post, photo, W, H);
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
