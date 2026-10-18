"use client";

// Gün sonu kartı: daySummary (lib/raceLive.js) → 1080×1350 PNG (Instagram dikey gönderi boyu, veliye de resim olarak gider).
// Sade: açık sıcak zemin, koyu gri yazı, tek yeşil vurgu; yarış adı, yer ve gün, rüzgâr (saat saat çubuk), yarışlar, bizimkilerin sırası.
const W = 1080;
const H = 1350;
const C = { bg: "#F5F2EC", card: "#FFFFFF", fg: "#2F3134", mut: "#7B7D80", line: "#E4E0D8", acc: "#3F7A5A", accbg: "#E3EEE7", warn: "#B7791F" };
const FONT = `-apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;

const font = (ctx, px, w = 400) => (ctx.font = `${w} ${px}px ${FONT}`);
// Uzun yazı sığmazsa "…" ile kısalır
function fit(ctx, text, max) {
  let t = String(text || "");
  if (ctx.measureText(t).width <= max) return t;
  while (t && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}
// Başlık iki satıra kadar kırılır
function wrap(ctx, text, max, lines = 2) {
  const out = [];
  let cur = "";
  for (const w of String(text || "").split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= max || !cur) cur = t;
    else (out.push(cur), (cur = w));
  }
  if (cur) out.push(cur);
  if (out.length > lines) out.splice(lines - 1, out.length, fit(ctx, out.slice(lines - 1).join(" "), max));
  return out;
}
function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawDayCard(s) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  const X = 72;
  const IW = W - X * 2;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  let y = 130;
  font(ctx, 64, 600);
  ctx.fillStyle = C.fg;
  for (const l of wrap(ctx, s.title, IW)) (ctx.fillText(l, X, y), (y += 76));
  font(ctx, 34);
  ctx.fillStyle = C.mut;
  ctx.fillText(fit(ctx, s.sub, IW), X, y - 14);
  y += 40;

  const block = (title, h) => {
    font(ctx, 30, 600);
    ctx.fillStyle = C.mut;
    ctx.fillText(title, X, y);
    y += 22;
    round(ctx, X, y, IW, h, 28);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    const top = y;
    y += h + 48;
    return top;
  };

  // Rüzgâr: özet satırı + saat saat çubuklar (17 kn ve üstü turuncu)
  if (s.wind) {
    const pts = s.wind.pts.slice(-14);
    const top = block("Rüzgâr", pts.length > 1 ? 300 : 120);
    font(ctx, 44, 600);
    ctx.fillStyle = C.fg;
    ctx.fillText(fit(ctx, `${s.wind.dir} ${s.wind.lo === s.wind.hi ? s.wind.hi : `${s.wind.lo}–${s.wind.hi}`} kn`, IW - 340), X + 36, top + 76);
    font(ctx, 30);
    ctx.fillStyle = C.mut;
    ctx.textAlign = "right";
    ctx.fillText([s.wind.gust ? `sağanak ${s.wind.gust} kn` : "", s.wind.src === "tahmin" ? "tahmin" : ""].filter(Boolean).join(" · "), X + IW - 36, top + 74);
    ctx.textAlign = "left";
    if (pts.length > 1) {
      const max = Math.max(20, ...pts.map((p) => p.kn));
      const gx = X + 36;
      const gw = IW - 72;
      const step = gw / pts.length;
      const bw = Math.min(44, step * 0.6);
      const base = top + 250;
      pts.forEach((p, i) => {
        const h = Math.max(6, (p.kn / max) * 130);
        const cx = gx + step * i + step / 2;
        round(ctx, cx - bw / 2, base - h, bw, h, 8);
        ctx.fillStyle = p.kn >= 17 ? C.warn : C.acc;
        ctx.fill();
        font(ctx, 22);
        ctx.fillStyle = C.mut;
        ctx.textAlign = "center";
        if (pts.length <= 8 || i % 2 === 0) ctx.fillText(p.hh, cx, base + 32);
        ctx.fillStyle = C.fg;
        ctx.fillText(String(p.kn), cx, base - h - 10);
        ctx.textAlign = "left";
      });
    }
  }

  // Yarışlar: numara, saat, rüzgâr, bayrak (en çok 6; fazlası "+n yarış")
  if (s.starts.length) {
    const list = s.starts.slice(0, 6);
    const rowH = 64;
    const top = block(`Yarışlar · ${s.starts.length}`, list.length * rowH + 24 + (s.starts.length > 6 ? 50 : 0));
    list.forEach((x, i) => {
      const ry = top + 56 + i * rowH;
      font(ctx, 32, 600);
      ctx.fillStyle = C.fg;
      ctx.fillText(`${x.n}. yarış`, X + 36, ry);
      font(ctx, 32);
      ctx.fillStyle = C.mut;
      ctx.fillText(x.time, X + 230, ry);
      ctx.textAlign = "right";
      ctx.fillStyle = x.flag ? C.warn : C.mut;
      ctx.fillText(fit(ctx, [x.wind, x.flag].filter(Boolean).join(" · "), IW - 420), X + IW - 36, ry);
      ctx.textAlign = "left";
    });
    if (s.starts.length > 6) {
      font(ctx, 28);
      ctx.fillStyle = C.mut;
      ctx.fillText(`+${s.starts.length - 6} yarış`, X + 36, top + 56 + list.length * rowH);
    }
  }

  // Bizimkiler: sıra + ad + sonuç satırı; kalan yere sığdığı kadar
  const ranked = s.team.filter((a) => a.place);
  if (ranked.length && y < H - 200) {
    const rowH = 76;
    const room = Math.max(1, Math.floor((H - 80 - y - 22 - 24) / rowH));
    const list = ranked.slice(0, Math.min(room, ranked.length));
    const top = block("Bizimkiler", list.length * rowH + 20);
    list.forEach((a, i) => {
      const ry = top + 34 + i * rowH;
      round(ctx, X + 28, ry, 68, 52, 14);
      ctx.fillStyle = C.accbg;
      ctx.fill();
      font(ctx, 30, 600);
      ctx.fillStyle = C.acc;
      ctx.textAlign = "center";
      ctx.fillText(`${a.place}.`, X + 62, ry + 37);
      ctx.textAlign = "left";
      ctx.fillStyle = C.fg;
      font(ctx, 32, 600);
      const nm = fit(ctx, a.name, IW * 0.45);
      ctx.fillText(nm, X + 120, ry + 37);
      const nw = ctx.measureText(nm).width;
      if (a.line && a.line !== `${a.place}.`) {
        font(ctx, 26);
        ctx.fillStyle = C.mut;
        ctx.textAlign = "right";
        ctx.fillText(fit(ctx, a.line, IW - 160 - nw - 60), X + IW - 32, ry + 36);
        ctx.textAlign = "left";
      }
    });
  }

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Kart çizilemedi"))), "image/png"));
}
