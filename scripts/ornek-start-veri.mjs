// Örnek start veri seti (Seyhun 2026-11-03): public/veri/ornek-start.json üretir. Biçim lib/boatPlay.js (ileride canlı akışla aynı).
// İki grup (Sarı, Mavi; ayrı yarışlar), 10'ar tekne; start'tan 5 sn önce ile 10 sn sonrası, yarım saniyede bir konum.
// Hattın altında yelken boşta bekleyiş, son 1,5 sn'de açıp hızlanma, startta hattı geçiş, iki tekne kontra değiştirir.
// Çalıştırma: node scripts/ornek-start-veri.mjs
import { writeFileSync } from "node:fs";

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
function dest(p, b, m) {
  const d = m / R;
  const la = rad(p.lat);
  const lat = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(rad(b)));
  const lon = rad(p.lon) + Math.atan2(Math.sin(rad(b)) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(lat));
  return { lat: deg(lat), lon: deg(lon) };
}
const AX = 350; // rüzgâr ve parkur ekseni
const MID = { lat: 39.072, lon: 26.86 }; // Dikili açığı, hattın ortası
// yerel (x sağa, y rüzgâra doğru, metre) → enlem/boylam
const at = (x, y) => (x || y ? dest(MID, AX + deg(Math.atan2(x, y)), Math.hypot(x, y)) : { ...MID });
const r6 = (v) => Math.round(v * 1e6) / 1e6;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const GROUPS = {
  Sarı: [["1302", "Deniz Aydın"], ["1287", "Ece Kara"], ["1415", "Can Öz"], ["305", "Ada Yılmaz"], ["2210", "Mert Şen"], ["918", "Elif Koç"], ["502", "Kaan Er"], ["77", "Lina Taş"], ["1450", "Efe Tan"], ["62", "Arda Öz"]],
  Mavi: [["512", "Selin Ay"], ["88", "Bora Ak"], ["731", "Umut Can"], ["1960", "Zeynep Su"], ["1188", "Mira Ateş"], ["24", "Yiğit Kurt"], ["808", "Duru Er"], ["415", "Ali Tuna"], ["233", "Nehir Göl"], ["1301", "Emir Tan"]],
};
const LINE = 60; // hattın yarı boyu (m)
const boats = [];
const fixes = [];
for (const [grp, list] of Object.entries(GROUPS)) {
  list.forEach(([sail, name], i) => {
    boats.push({ sail, name, grp });
    const port = i === list.length - 1; // komite ucunda iskele kontrada gelen
    const tack = i === list.length - 1 ? 4500 + Math.round(rnd() * 800) : null; // iskeledeki tekne kontra değiştirir
    let x = -LINE + 10 + (i / (list.length - 1)) * (2 * LINE - 20) + (rnd() - 0.5) * 3;
    let y = -(7 + (i % 2) * 5 + rnd() * 2);
    if (port) x -= 12;
    let side = port ? 1 : -1; // -1: sancak kontra (sola, yukarı), 1: iskele kontra
    let h = side * 25; // eksene göre yön; beklerken rüzgâra yakın (yelken boşta)
    let v = 0.7 + rnd() * 0.3;
    const go = -1500 - Math.round(rnd() * 800);
    for (let t = -5000; t <= 10000; t += 100) {
      let want = t < go ? side * 25 : side * 45;
      let vw = t < go ? 0.7 : 2.5 + rnd() * 0.15;
      if (tack && t >= tack && t < tack + 1800) {
        const f = (t - tack) / 1800;
        want = side * 45 * (1 - 2 * f);
        vw = 1.1;
        if (t + 100 >= tack + 1800) side = -side;
      }
      h += Math.max(-9, Math.min(9, want - h)) + (rnd() - 0.5) * 1.2;
      v += (vw - v) * 0.06;
      x += Math.sin(rad(h)) * v * 0.1;
      y += Math.cos(rad(h)) * v * 0.1;
      if (t % 500 === 0) {
        const p = at(x, y);
        fixes.push({ t, sail, lat: r6(p.lat), lon: r6(p.lon), hdg: Math.round((AX + h + 360) % 360), spd: Math.round(v * 1.943844 * 10) / 10 });
      }
    }
  });
}
// Trapez parkur (Seyhun 2026-11-03 "trapez parkur örneğini al, parkuru görmemiz gerekiyor"; oranlar lib/courseCard.js geom trapez):
// 1 startın tam rüzgâr üstünde (orsa ORSA m), 2 solda ve aşağıda, 3S/3P kapısı 2'nin altında, finiş 2'nin sağında. Gerçek koordinatları Seyhun verecek.
const ORSA = 700;
const pt = (x, y) => (({ lat, lon }) => ({ lat: r6(lat), lon: r6(lon) }))(at(x, y));
const marks = {
  pin: pt(-LINE, 0),
  komite: pt(LINE, 0),
  m1: pt(0, ORSA),
  m2: pt(-1.05 * ORSA, 0.45 * ORSA),
  m3s: pt(-0.98 * ORSA - 0.11 * ORSA, -0.57 * ORSA),
  m3p: pt(-0.98 * ORSA + 0.11 * ORSA, -0.57 * ORSA),
  fin1: pt(-0.86 * ORSA + 0.09 * ORSA, 0.39 * ORSA),
  fin2: pt(-0.86 * ORSA - 0.09 * ORSA, 0.39 * ORSA),
};
const set = {
  v: 1,
  race: "ornek",
  start: "2026-11-03T11:00:00+03:00",
  wind: { dir: AX, kn: 11 },
  marks,
  boats,
  fixes: fixes.sort((a, b) => a.t - b.t || a.sail.localeCompare(b.sail)),
};
writeFileSync(new URL("../public/veri/ornek-start.json", import.meta.url), JSON.stringify(set));
console.log(`${boats.length} tekne, ${fixes.length} konum`);
