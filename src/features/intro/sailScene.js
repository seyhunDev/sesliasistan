// Velora Sailing tanıtım animasyonunun hesabı (Seyhun 2026-11-23, örnek A "açık deniz"; project-files/tanitim-kutulari/ornek.html).
// Velora Sailing senaryolarındaki gibi üstten görünüş: rüzgâr üstten (0°), start hattı altta, orsa şamandırası üstte.
// Üç tekne start alır, tramola atar, şamandırayı iskeleden bırakıp pupaya döner. Rota noktaları Catmull-Rom ile yumuşatılır;
// süre orsada yavaş, pupada hızlı. Tekne gövdesi Velora Sailing boat-draw.js "ilca" hullPath'i.

export const VIEW = "62 0 286 196";
export const MARK = { x: 200, y: 30 };
export const PIN = { x: 112, y: 176 };
export const CB = { x: 288, y: 176 };
export const LOOP = 11; // bir tur (sn)
export const RUN = 9; // tekneler bu sürede rotayı bitirir, sonra solar
export const HULL =
  "M0,-25 C0.3,-24.5 1.2,-23.4 2,-21.9 C2.8,-20.4 3.9,-18.5 4.7,-16.1 C5.5,-13.8 6.3,-11 6.9,-7.9 C7.4,-4.7 7.8,-0.7 8,2.8 C8.2,6.2 8.3,9.1 8,12.8 C7.8,16.5 6.9,23 6.6,25 L-6.6,25 C-6.9,23 -7.8,16.5 -8,12.8 C-8.3,9.1 -8.2,6.2 -8,2.8 C-7.8,-0.7 -7.4,-4.7 -6.9,-7.9 C-6.3,-11 -5.5,-13.8 -4.7,-16.1 C-3.9,-18.5 -2.8,-20.4 -2,-21.9 C-1.2,-23.4 -0.3,-24.5 0,-25 Z";

// me: mavi tekne ("sen"); lag: start gecikmesi (sn)
export const ROUTES = [
  { me: true, lag: 0, p: [[196, 206], [176, 186], [124, 134], [214, 46], [207, 35], [200, 22], [190, 27], [187, 60], [184, 110], [182, 160], [181, 230]] },
  { lag: 1.2, p: [[246, 208], [226, 188], [166, 128], [230, 62], [213, 44], [206, 25], [194, 17], [176, 28], [164, 60], [152, 110], [144, 160], [138, 230]] },
  { lag: 2, p: [[150, 210], [140, 198], [252, 86], [214, 46], [207, 34], [200, 21], [190, 26], [202, 60], [212, 110], [218, 160], [222, 230]] },
];

export function spline(pts, n = 14) {
  const o = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  o.push(pts[pts.length - 1]);
  // L: birikimli süre; orsada (yukarı) hız 1, apaz 1.4, pupa 1.9
  const L = [0];
  for (let i = 1; i < o.length; i++) {
    const dx = o[i][0] - o[i - 1][0], dy = o[i][1] - o[i - 1][1], d = Math.hypot(dx, dy), up = -dy / (d || 1);
    L.push(L[i - 1] + d / (up > 0.3 ? 1 : up > -0.3 ? 1.4 : 1.9));
  }
  return { o, L, len: L[L.length - 1] };
}

// f 0..1 → konum ve pruva (derece, 0 = yukarı, saat yönü)
export function at(sp, f) {
  const s = Math.max(0, Math.min(1, f)) * sp.len;
  let i = 1;
  while (i < sp.L.length - 1 && sp.L[i] < s) i++;
  const a = sp.o[i - 1], b = sp.o[i], u = (s - sp.L[i - 1]) / (sp.L[i] - sp.L[i - 1] || 1);
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, h: (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI };
}

// Bom açısı: TWA < 0 sancak kontra → bom iskele tarafa (+); orsada 12°, pupada 85°
export function boomAngle(h) {
  const twa = ((((h % 360) + 540) % 360) - 180);
  const a = Math.min(85, Math.max(10, (Math.abs(twa) - 38) * 0.85 + 12));
  return twa < 0 ? a : -a;
}

export function stepAt(t) {
  return t < 1.6 ? "Start" : t < 4.2 ? "Tramola" : t < 5.6 ? "Şamandıra" : t < RUN + 0.3 ? "Pupa" : "";
}

const SPL = ROUTES.map((r) => spline(r.p));
// ortak hız: en uzun rota RUN içinde biter; böylece tekneler arasındaki gerçek mesafe korunur
const V = Math.max(...SPL.map((sp, i) => sp.len / (RUN - ROUTES[i].lag)));

// t anındaki tekneler: [{x, y, h, boom, o}] (o = saydamlık)
export function frame(t) {
  const fade = t > RUN ? Math.max(0, 1 - (t - RUN) / 1.2) : Math.min(1, t / 0.4);
  return ROUTES.map((r, i) => {
    const p = at(SPL[i], ((t - r.lag) * V) / SPL[i].len);
    return { ...p, boom: boomAngle(p.h), o: fade };
  });
}
