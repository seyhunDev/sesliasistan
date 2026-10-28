// Rota kartı (Seyhun 2026-10-28, kendi kartının benzeri; seçtiği "A · Rüzgâr yukarıda", örnek yaris-tasarim/parkur/rota-karti-a.png):
// Start (komite sağda, pin solda), 4s/4p kapısı, 1 + 1A, 2, 3s/3p kapısı, Finiş. Kağıt kart gibi ölçeksiz şema; açılar girilen
// ölçümlerden (raceCourse.js axisOf / lineOf / son rüzgâr / orsadan apaza). Rüzgâr hep yukarıdan gelir, hattın eğimi avantajı gösterir.
import { ORSA_M, axisOf, lineOf } from "@/lib/raceCourse";

const rad = (d) => (d * Math.PI) / 180;
const nrm = (d) => ((Math.round(d) % 360) + 360) % 360;
const dir = (b, m) => [m * Math.sin(rad(b)), m * Math.cos(rad(b))];
const add = (p, b, m) => { const [x, y] = dir(b, m); return [p[0] + x, p[1] + y]; };
function geom(c) {
  const A = c.axis, L = c.orsa;
  const mid = [0, 0];
  const lineDeg = c.line ?? nrm(A + 90); // pin → komite
  const lineM = Math.max(c.lineM || 120, L * 0.32); // kartta hat okunur boyda (kağıt kart gibi ölçeksiz)
  const komite = add(mid, lineDeg, lineM / 2), pin = add(mid, lineDeg + 180, lineM / 2);
  const m1 = add(mid, A, L);
  const m1a = add(m1, A - 90, L * 0.15);
  const reach = c.reach ?? nrm(A - 120);
  const m2 = add(m1a, reach, L * 0.6);
  const g3 = add(m2, A + 180, L * 0.95);
  const gw = Math.max(40, L * 0.075);
  const s3 = add(g3, A - 90, gw), p3 = add(g3, A + 90, gw); // pupada sancak solda (rüzgâr yukarıda bakınca)
  const g4 = add(mid, A, L * 0.24);
  const s4 = add(g4, A - 90, gw), p4 = add(g4, A + 90, gw);
  const fin = add(g3, A + 150, L * 0.45);
  const fA = add(fin, A + 60, L * 0.1), fB = add(fin, A + 240, L * 0.1);
  return { A, L, mid, komite, pin, m1, m1a, reach, m2, g3, s3, p3, g4, s4, p4, fin, fA, fB, lineDeg };
}
function svgOf(c, { up = "wind", w = 350, h = 440 } = {}) {
  const g = geom(c);
  const rot = up === "wind" ? (c.wind ?? g.A) : 0; // rüzgâr yukarıda: hattın eğimi avantajı doğrudan gösterir
  const R = ([x, y]) => [x * Math.cos(rad(rot)) - y * Math.sin(rad(rot)), x * Math.sin(rad(rot)) + y * Math.cos(rad(rot))];
  const names = ["komite", "pin", "m1", "m1a", "m2", "s3", "p3", "s4", "p4", "fA", "fB"];
  const P = Object.fromEntries(names.map((k) => [k, R(g[k])]));
  const xs = Object.values(P).map((p) => p[0]), ys = Object.values(P).map((p) => p[1]);
  const pad = { l: 40, r: 40, t: 70, b: 40 };
  const sx = (w - pad.l - pad.r) / (Math.max(...xs) - Math.min(...xs) || 1), sy = (h - pad.t - pad.b) / (Math.max(...ys) - Math.min(...ys) || 1);
  const s = Math.min(sx, sy);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const S = (p) => { const [x, y] = R(p); return [w / 2 + (x - cx) * s, pad.t + (h - pad.t - pad.b) / 2 - (y - cy) * s]; };
  const pt = (k) => S(g[k]);
  const f = (n) => n.toFixed(1);
  const ink = "#26282c", mut = "#74777d", acc = "#0b7f99", amb = "#f59e0b";
  let o = "";
  const line = (a, b, st = "", sw = 2) => (o += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${ink}" stroke-width="${sw}" ${st}/>`);
  const path = (pts, st = "") => (o += `<polyline points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(" ")}" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round" ${st}/>`);
  const arrowOn = (a, b, t = 0.55) => {
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    o += `<path d="M5 0 L-5 -4.5 L-5 4.5 Z" fill="${ink}" transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"/>`;
  };
  const legLabel = (a, b, txt, side = 1) => {
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * 16 * side, ny = (dx / L) * 16 * side;
    o += `<text x="${f(x + nx)}" y="${f(y + ny + 4)}" text-anchor="middle" font-size="12" font-weight="600" fill="${acc}">${txt}</text>`;
  };
  const buoy = (p, t, est) => (o += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="13" fill="#fff" stroke="${ink}" stroke-width="2" ${est ? 'stroke-dasharray="3 3"' : ""}/><text x="${f(p[0])}" y="${f(p[1] + 4)}" text-anchor="middle" font-size="${t.length > 1 ? 10 : 12}" font-weight="700" fill="${ink}">${t}</text>`);
  const boat = (p, est) => (o += `<path d="M-7 8 L-7 -2 L0 -9 L7 -2 L7 8 Z" fill="#fff" stroke="${ink}" stroke-width="2" ${est ? 'stroke-dasharray="3 2"' : ""} transform="translate(${f(p[0])} ${f(p[1])})"/>`);
  const mid = S(g.mid), m1 = pt("m1"), m1a = pt("m1a"), m2 = pt("m2"), s3 = pt("s3"), p3 = pt("p3"), s4 = pt("s4"), p4 = pt("p4"), fin = S(g.fin), g3 = S(g.g3), g4 = S(g.g4);
  // iç rota (kesik): start → 4 kapısı → 1 → 1A → 4 → 1 …
  path([mid, g4, m1], 'stroke-dasharray="2 4" opacity=".7"');
  // dış rota: start → 1 → 1A → 2 → 3 kapısı → Finiş
  path([mid, m1, m1a, m2, g3, fin]);
  arrowOn(mid, m1, 0.6); arrowOn(m1a, m2); arrowOn(m2, g3); arrowOn(g3, fin, 0.6);
  // start hattı
  line(pt("pin"), pt("komite"), `stroke="${amb}" stroke-dasharray="7 5"`, 3);
  o = o.replace(/stroke="#26282c" stroke-width="3" stroke="#f59e0b"/, `stroke="${amb}" stroke-width="3"`);
  boat(pt("komite"), c.est?.komite); boat(pt("pin"), c.est?.pin);
  const ko = pt("komite"), pi = pt("pin");
  o += `<text x="${f(ko[0] + 12)}" y="${f(ko[1] + 24)}" text-anchor="start" font-size="11" font-weight="600" fill="${ink}">Komite</text>`;
  o += `<text x="${f(pi[0] - 12)}" y="${f(pi[1] + 24)}" text-anchor="end" font-size="11" font-weight="600" fill="${ink}">Pin</text>`;
  // finiş
  line(pt("fA"), pt("fB"), `stroke-width="2"`, 2);
  boat(pt("fA"), true);
  const fb = pt("fB"); o += `<circle cx="${f(fb[0])}" cy="${f(fb[1])}" r="6" fill="${ink}"/>`;
  o += `<text x="${f(fin[0] + 14)}" y="${f(fin[1] + 18)}" font-size="11" font-weight="600" fill="${mut}">Finiş</text>`;
  // şamandıralar
  buoy(m1, "1", c.est?.m1); buoy(m1a, "1A", c.est?.m1); buoy(m2, "2", c.est?.m2);
  buoy(s3, "3s", c.est?.m3); buoy(p3, "3p", c.est?.m3); buoy(s4, "4s", c.est?.m4); buoy(p4, "4p", c.est?.m4);
  // ayak açıları
  legLabel(g4, m1, `${nrm(g.A)}°`, -1);
  legLabel(m1a, m2, `${nrm(g.reach)}°`, -1);
  legLabel(m2, g3, `${nrm(g.A + 180)}°`, -1);
  // rüzgâr oku (üstte, gerçek yönüne göre)
  const wd = c.wind ?? g.A;
  const wa = up === "wind" ? 0 : wd; // ekrandaki yönü (0 = yukarıdan geliyor)
  o += `<g transform="translate(${w / 2} 30) rotate(${f(wa)})"><line x1="0" y1="-18" x2="0" y2="12" stroke="${acc}" stroke-width="3"/><path d="M0 20 L-7 8 L7 8 Z" fill="${acc}"/></g>`;
  o += `<text x="${w / 2 + 16}" y="26" font-size="13" font-weight="600" fill="${acc}">Rüzgâr ${nrm(wd)}°${c.kn != null ? ` · ${c.kn} kn` : ""}</text>`;
  // kuzey
  const na = up === "wind" ? -rot : 0;
  o += `<g transform="translate(26 30) rotate(${f(na)})"><circle r="15" fill="#fff" stroke="#e7e5df"/><path d="M0 -11 L5 4 L0 1 L-5 4 Z" fill="${ink}"/></g><text x="26" y="58" text-anchor="middle" font-size="10" fill="${mut}">K</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Inter,sans-serif">${o}</svg>`;
}

// Parkurun kart bilgisi; eksen ve rüzgâr yoksa null (kart çizilmez)
export function cardOf(c) {
  const ax = axisOf(c);
  const w = [...c.obs].reverse().find((x) => x.kind === "wind" && (!x.spot || x.spot === "komite" || x.spot === "pin")) || [...c.obs].reverse().find((x) => x.kind === "wind");
  const ln = lineOf(c);
  if (!ax && !w && !ln) return null;
  const axis = ax ? ax.deg : w ? w.deg : nrm(ln.deg - 90);
  const leg = [...c.obs].reverse().find((x) => x.kind === "leg");
  return {
    axis,
    wind: w ? w.deg : null,
    kn: w ? w.kn : null,
    line: ln ? ln.deg : null,
    reach: leg ? (leg.ref === "m1m2" ? leg.deg : nrm(leg.deg + 180)) : null,
    orsa: c.len?.orsa || ORSA_M,
    est: { komite: !c.pts.komite, pin: !c.pts.pin, m1: !c.pts.m1, m2: !c.pts.m2, m3: !c.pts.m3, m4: !c.pts.m4 },
  };
}
export const cardSvg = (k, o) => (k ? svgOf(k, o) : "");
