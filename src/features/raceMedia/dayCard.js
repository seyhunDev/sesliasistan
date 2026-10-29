"use client";

// Gün sonu kartı: daySummary (lib/raceLive.js) → 1080×1350 PNG (Instagram dikey gönderi boyu, veliye de resim olarak gider).
// Uygulamanın rengi (Seyhun 2026-10-29 "daha profesyonel; beklenti neydi, gerçekleşen ne oldu"): gece mavisi zemin, camgöbeği vurgu.
// Rüzgâr grafiği: beklenen (tahmin) dolu alan, gelen (ölçülen/elle) beyaz noktalı çizgi, yarışların startı dikey çizgiyle;
// altında tek satır karşılaştırma. Sonra yarışlar ve bizimkilerin sırası.
const W = 1080;
const H = 1350;
const C = { bg0: "#0a1730", bg1: "#11294d", card: "rgba(255,255,255,0.06)", line: "rgba(255,255,255,0.12)", fg: "#ffffff", mut: "rgba(255,255,255,0.62)", acc: "#67e8f9", accbg: "rgba(103,232,249,0.16)", warn: "#fbbf24" };
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
const span = (r) => (r ? (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`) : "");

// Beklenen / gelen rüzgâr grafiği (x: saat, y: knot)
function chart(ctx, c, x, y, w, h) {
  const top = Math.max(15, ...c.fc.map((p) => p.g ?? p.kn), ...c.ob.map((p) => p.kn));
  const max = Math.ceil((top + 2) / 5) * 5;
  const X = (hh) => x + ((hh - c.from) / Math.max(1, c.to - c.from)) * w;
  const Y = (kn) => y + h - (kn / max) * h;
  // ızgara: 5 kn'de bir ince çizgi, sağda değer
  font(ctx, 22);
  ctx.textAlign = "right";
  for (let k = 5; k < max; k += 5) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, Y(k));
    ctx.lineTo(x + w, Y(k));
    ctx.stroke();
    ctx.fillStyle = C.mut;
    ctx.fillText(String(k), x + w + 44, Y(k) + 8);
  }
  ctx.textAlign = "left";
  // starlar: dikey kesik çizgi + numara
  for (const s of c.starts) {
    const sx = X(s.h);
    ctx.strokeStyle = s.flag ? C.warn : "rgba(255,255,255,0.35)";
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + h);
    ctx.stroke();
    ctx.setLineDash([]);
    round(ctx, sx - 18, y - 46, 36, 36, 18);
    ctx.fillStyle = s.flag ? C.warn : "rgba(255,255,255,0.16)";
    ctx.fill();
    font(ctx, 22, 700);
    ctx.fillStyle = s.flag ? C.bg0 : C.fg;
    ctx.textAlign = "center";
    ctx.fillText(String(s.n), sx, y - 20);
    ctx.textAlign = "left";
  }
  // beklenen: dolu alan (üstte açık camgöbeği, aşağı doğru solar)
  if (c.fc.length > 1) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(103,232,249,0.55)");
    g.addColorStop(1, "rgba(103,232,249,0.08)");
    ctx.beginPath();
    ctx.moveTo(X(c.fc[0].h), y + h);
    c.fc.forEach((p) => ctx.lineTo(X(p.h), Y(p.kn)));
    ctx.lineTo(X(c.fc.at(-1).h), y + h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    c.fc.forEach((p, i) => (i ? ctx.lineTo(X(p.h), Y(p.kn)) : ctx.moveTo(X(p.h), Y(p.kn))));
    ctx.strokeStyle = C.acc;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // gelen: beyaz noktalı çizgi + noktalar
  if (c.ob.length) {
    ctx.beginPath();
    c.ob.forEach((p, i) => (i ? ctx.lineTo(X(p.h), Y(p.kn)) : ctx.moveTo(X(p.h), Y(p.kn))));
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 4;
    ctx.setLineDash([3, 9]);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of c.ob) {
      ctx.beginPath();
      ctx.arc(X(p.h), Y(p.kn), 7, 0, Math.PI * 2);
      ctx.fillStyle = C.fg;
      ctx.fill();
    }
  }
  // saatler
  font(ctx, 22);
  ctx.fillStyle = C.mut;
  ctx.textAlign = "center";
  const every = c.to - c.from > 8 ? 2 : 1;
  for (let hh = Math.ceil(c.from); hh <= c.to; hh += every) ctx.fillText(`${String(hh).padStart(2, "0")}`, X(hh), y + h + 30);
  ctx.textAlign = "left";
}

export function drawDayCard(s) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  const X = 72;
  const IW = W - X * 2;
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, C.bg1);
  bg.addColorStop(1, C.bg0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  let y = 128;
  font(ctx, 62, 700);
  ctx.fillStyle = C.fg;
  for (const l of wrap(ctx, s.title, IW)) (ctx.fillText(l, X, y), (y += 74));
  font(ctx, 32, 500);
  ctx.fillStyle = C.mut;
  ctx.fillText(fit(ctx, s.sub, IW), X, y - 16);
  y += 28;

  const block = (h) => {
    round(ctx, X - 24, y, IW + 48, h, 32);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    const top = y;
    y += h + 24;
    return top;
  };
  const label = (t, top) => {
    font(ctx, 26, 600);
    ctx.fillStyle = C.mut;
    ctx.fillText(t.toLocaleUpperCase("tr-TR"), X + 8, top + 52);
  };

  // Rüzgâr: büyük değer + grafik + beklenen/gelen satırı
  const c = s.chart;
  if (s.wind || c) {
    const tall = c ? 470 : 150;
    const top = block(tall);
    label("Rüzgâr", top);
    if (s.wind) {
      font(ctx, 54, 700);
      ctx.fillStyle = C.fg;
      ctx.fillText(fit(ctx, `${s.wind.dir} ${span([s.wind.lo, s.wind.hi])} kn`, IW - 320), X + 8, top + 118);
      if (s.wind.gust) {
        font(ctx, 30, 600);
        ctx.fillStyle = s.wind.gust >= 20 ? C.warn : C.mut;
        ctx.textAlign = "right";
        ctx.fillText(`sağanak ${s.wind.gust} kn`, X + IW - 8, top + 114);
        ctx.textAlign = "left";
      }
    }
    if (c) {
      chart(ctx, c, X + 8, top + 196, IW - 72, 176);
      // tek satır: Beklenen ■ 9–14 kn · Gelen ┄ 8–12 kn
      const ly = top + tall - 30;
      let lx = X + 8;
      font(ctx, 28, 600);
      if (c.exp) {
        round(ctx, lx, ly - 22, 30, 24, 6);
        ctx.fillStyle = C.acc;
        ctx.fill();
        lx += 44;
        ctx.fillStyle = C.mut;
        ctx.fillText("Beklenen", lx, ly);
        lx += ctx.measureText("Beklenen").width + 12;
        ctx.fillStyle = C.fg;
        ctx.fillText(`${span(c.exp)} kn`, lx, ly);
        lx += ctx.measureText(`${span(c.exp)} kn`).width + 48;
      }
      if (c.got) {
        ctx.fillStyle = C.fg;
        for (let i = 0; i < 3; i++) (ctx.beginPath(), ctx.arc(lx + 5 + i * 11, ly - 10, 4, 0, Math.PI * 2), ctx.fill());
        lx += 48;
        ctx.fillStyle = C.mut;
        ctx.fillText("Gelen", lx, ly);
        lx += ctx.measureText("Gelen").width + 12;
        ctx.fillStyle = C.fg;
        ctx.fillText(`${span(c.got)} kn`, lx, ly);
        lx += ctx.measureText(`${span(c.got)} kn`).width + 24;
        if (c.exp) {
          const d = Math.round((c.got[0] + c.got[1]) / 2 - (c.exp[0] + c.exp[1]) / 2);
          const t = Math.abs(d) < 2 ? "beklendiği gibi" : `${Math.abs(d)} kn ${d > 0 ? "fazla" : "az"}`;
          ctx.fillStyle = Math.abs(d) < 2 ? C.acc : C.warn;
          ctx.textAlign = "right";
          ctx.fillText(t, X + IW - 8, ly);
          ctx.textAlign = "left";
        }
      }
    }
  }

  // Yarışlar: numara rozeti, saat, rüzgâr, bayrak (en çok 6; fazlası "+n yarış")
  if (s.starts.length) {
    const list = s.starts.slice(0, 6);
    const rowH = 56;
    const top = block(90 + list.length * rowH + (s.starts.length > 6 ? 44 : 0));
    label(`Yarışlar · ${s.starts.length}`, top);
    list.forEach((x, i) => {
      const ry = top + 108 + i * rowH;
      round(ctx, X + 8, ry - 34, 44, 44, 22);
      ctx.fillStyle = x.flag ? C.warn : "rgba(255,255,255,0.14)";
      ctx.fill();
      font(ctx, 24, 700);
      ctx.fillStyle = x.flag ? C.bg0 : C.fg;
      ctx.textAlign = "center";
      ctx.fillText(String(x.n), X + 30, ry - 4);
      ctx.textAlign = "left";
      font(ctx, 32, 600);
      ctx.fillStyle = C.fg;
      ctx.fillText(x.time, X + 76, ry);
      font(ctx, 30);
      ctx.textAlign = "right";
      ctx.fillStyle = x.flag ? C.warn : C.mut;
      ctx.fillText(fit(ctx, [x.wind, x.flag].filter(Boolean).join(" · "), IW - 260), X + IW - 8, ry);
      ctx.textAlign = "left";
    });
    if (s.starts.length > 6) {
      font(ctx, 26);
      ctx.fillStyle = C.mut;
      ctx.fillText(`+${s.starts.length - 6} yarış`, X + 8, top + 108 + list.length * rowH);
    }
  }

  // Bizimkiler: sıra rozeti + ad + sonuç satırı; kalan yere sığdığı kadar
  const ranked = s.team.filter((a) => a.place);
  if (ranked.length && y < H - 200) {
    const rowH = 64;
    const room = Math.max(1, Math.floor((H - 40 - y - 80) / rowH));
    const list = ranked.slice(0, Math.min(room, ranked.length));
    const top = block(80 + list.length * rowH);
    label("Bizimkiler", top);
    list.forEach((a, i) => {
      const ry = top + 76 + i * rowH;
      round(ctx, X + 8, ry, 72, 48, 14);
      ctx.fillStyle = a.place <= 3 ? C.acc : C.accbg;
      ctx.fill();
      font(ctx, 28, 700);
      ctx.fillStyle = a.place <= 3 ? C.bg0 : C.acc;
      ctx.textAlign = "center";
      ctx.fillText(`${a.place}.`, X + 44, ry + 35);
      ctx.textAlign = "left";
      ctx.fillStyle = C.fg;
      font(ctx, 32, 600);
      const nm = fit(ctx, a.name, IW * 0.45);
      ctx.fillText(nm, X + 104, ry + 36);
      const nw = ctx.measureText(nm).width;
      if (a.line && a.line !== `${a.place}.`) {
        font(ctx, 26);
        ctx.fillStyle = C.mut;
        ctx.textAlign = "right";
        ctx.fillText(fit(ctx, a.line, IW - 140 - nw - 60), X + IW - 8, ry + 35);
        ctx.textAlign = "left";
      }
    });
  }

  // alt köşede küçük imza
  font(ctx, 24, 600);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "right";
  ctx.fillText("Velora", W - X, H - 40);
  ctx.textAlign = "left";

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Kart çizilemedi"))), "image/png"));
}
