// Tekne konum oynatıcısı (Seyhun 2026-11-03 "canlı veri akışını sonra kuracağım, altyapı ona uygun olsun; önce hazır data setiyle
// start'tan 5 sn önce, 10 sn sonra animasyon"): animasyon yalnız bu biçimi okur; veri dosyadan da (public/veri/ornek-start.json)
// canlı akıştan da (tekne takibi takip/{yarış}/tekne: lat, lon, hdg, spd, t) aynı gelir. Biçim project-files/tekne-animasyon/veri-bicimi.md.
//   { v: 1, race, start (ISO), wind: { dir, kn }, marks: { komite, pin, m1, m2, m3s, m3p (kapı), fin1 (finiş teknesi), fin2 }, boats: [{ sail, name, grp }],
//     fixes: [{ t (start'a göre ms), sail, lat, lon, hdg?, spd? }] }
// Saf işlevler (test: scripts/asistan-test/yerel/yaris.mjs "Tekne animasyonu").
import { cleanFix, cleanSail } from "@/lib/boatTrack";
import { bearing, dest, dist } from "@/lib/raceCourse";

const N = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v);
export const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
const norm = (d) => ((d % 360) + 360) % 360;
const geo = (p) => (N(p?.lat) !== null && N(p?.lon) !== null && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? { lat: +p.lat, lon: +p.lon } : null);

export function cleanSet(j) {
  const wind = { dir: norm(N(j?.wind?.dir) ?? 0), kn: Math.max(0, Math.min(80, N(j?.wind?.kn) ?? 0)) };
  const marks = {};
  for (const [k, v] of Object.entries(j?.marks && typeof j.marks === "object" ? j.marks : {}).slice(0, 12)) {
    const g = geo(v);
    if (g && /^(komite|pin|m[1-9][sp]?|fin[12])$/.test(k)) marks[k] = g;
  }
  const seen = new Set();
  const boats = (Array.isArray(j?.boats) ? j.boats : [])
    .map((b) => ({ sail: cleanSail(b?.sail), name: String(b?.name || "").slice(0, 40), grp: String(b?.grp || "").slice(0, 20) }))
    .filter((b) => b.sail && !seen.has(b.sail) && seen.add(b.sail))
    .slice(0, 300);
  // t: start'a göre ms (eksi = önce); cleanFix t > 0 ister, o yüzden kaydırılıp geri alınır
  const fixes = (Array.isArray(j?.fixes) ? j.fixes : [])
    .map((f) => {
      const t = N(f?.t);
      const sail = cleanSail(f?.sail);
      const c = t === null || !sail ? null : cleanFix({ ...f, t: t + 1e12 });
      return c ? { ...c, t: c.t - 1e12, sail } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t)
    .slice(0, 200000);
  const start = typeof j?.start === "string" && !Number.isNaN(Date.parse(j.start)) ? j.start : "";
  return { v: 1, race: String(j?.race || "").slice(0, 60), start, wind, marks, boats, fixes };
}

// Canlı akış satırı (gerçek saat) → oynatıcı satırı (start'a göre ms)
export const liveRow = (row, startMs) => ({ ...row, t: N(row?.t) - startMs });

// Yalnız ekrandaki grubun tekneleri (Seyhun 2026-11-03 "sarı grubun yarışında sadece sarılar"); grup boşsa hepsi
export function groupSet(set, grp) {
  if (!grp) return set;
  const keep = new Set(set.boats.filter((b) => b.grp === grp).map((b) => b.sail));
  return { ...set, boats: set.boats.filter((b) => keep.has(b.sail)), fixes: set.fixes.filter((f) => keep.has(f.sail)) };
}
export const groupsOf = (set) => [...new Set(set.boats.map((b) => b.grp).filter(Boolean))];
// Yayındaki canlı konum (BoatLive): ekrandaki yarışın grubu veri setinde varsa o, yoksa ilk grup
export const liveGroup = (set, grp) => (set && groupsOf(set).includes(grp) ? grp : (set && groupsOf(set)[0]) || "");
// Renk listesindeki tekneler (Seyhun 2026-11-04 "renk listesi yüklenince sarı grup tekneler, mavi grup tekneler; verdiğimiz renk listesine göre
// o tekneler oluşturulmalı"): kayıt listesi + günün grup listesi { yelken: grup } → [{ sail, name, grp }]
export function fleetOf(entries, gm) {
  const name = new Map((Array.isArray(entries) ? entries : []).map((e) => [String(e?.sail || ""), String(e?.name || "")]));
  return Object.entries(gm && typeof gm === "object" ? gm : {})
    .map(([sail, grp]) => ({ sail: cleanSail(sail), name: (name.get(String(sail)) || "").slice(0, 40), grp: String(grp || "").slice(0, 20) }))
    .filter((b) => b.sail && b.grp)
    .sort((a, b) => Number(a.sail) - Number(b.sail) || a.sail.localeCompare(b.sail));
}
// Gruplar renk listesindeki sırayla değil, bilinen sırayla (order: ["Sarı", "Mavi", …]); bilinmeyen sonda
export const fleetGroups = (fleet, order = []) => {
  const gs = [...new Set((fleet || []).map((b) => b.grp).filter(Boolean))];
  const at = (g) => (order.indexOf(g) < 0 ? 999 : order.indexOf(g));
  return gs.sort((a, b) => at(a) - at(b) || a.localeCompare(b, "tr"));
};
// Gerçek konum gelene kadar (Seyhun 2026-11-04 "datayı şu an almıyoruz, örnek data kullanıyoruz; gerçek renklere göre tekneler devam edelim"):
// grubun gerçek tekneleri örnek setin bir grubunun izlerini sırayla alır; örnekteki tekneden çoksa sonrakiler birer sıra geride (9 m) ve
// biraz yanda. Gerçek takip verisi gelince bu işlev kalkar, oynatıcı aynı biçimi okur.
export function realSet(set, fleet, grp) {
  const mine = (fleet || []).filter((b) => b.grp === grp);
  if (!set || !mine.length) return null;
  const g0 = groupsOf(set)[0] || "";
  const tpl = set.boats.filter((b) => !g0 || b.grp === g0).map((b) => b.sail);
  if (!tpl.length) return null;
  const tr = tracksOf(set);
  const back = norm(set.wind.dir + 180);
  const side = norm(set.wind.dir + 90);
  const fixes = [];
  mine.forEach((b, i) => {
    const k = Math.floor(i / tpl.length);
    for (const f of tr.get(tpl[i % tpl.length]) || []) {
      let p = { lat: f.lat, lon: f.lon };
      if (k) p = dest(dest(p, back, 9 * k), side, k % 2 ? 5 : -2);
      fixes.push({ ...f, sail: b.sail, lat: p.lat, lon: p.lon });
    }
  });
  fixes.sort((a, b) => a.t - b.t);
  return { ...set, boats: mine.map((b) => ({ sail: b.sail, name: b.name, grp })), fixes };
}
// Parkurun gerçek yerine taşıma (Seyhun 2026-11-03 "hakem botu, pin, şamandıra koordinatlarını gireceğim"; Yayın › Parkur, courseCard coursePoints):
// verilen noktalar (komite, pin, m1… {lat, lon}) şamandıra olur; örnek tekneler start hattına göre yerleşir: hattın ortası gerçek ortaya,
// parkur ekseni gerçek eksene (orta → 1) döner, hat boyunca uzaklık hattın boyuna göre ölçeklenir. Rüzgâr yönü gerçek eksen olur.
export function placeSet(set, pts) {
  const g = (k) => geo(pts?.[k]);
  if (!g("komite") || !g("pin") || !set.marks.pin || !set.marks.komite) return set;
  const mid = (a, b) => ({ lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });
  const sM = mid(set.marks.pin, set.marks.komite);
  const rM = mid(g("pin"), g("komite"));
  const sAx = set.wind.dir;
  const rAx = g("m1") ? bearing(rM, g("m1")) : norm(bearing(g("pin"), g("komite")) - 90);
  const k = (dist(g("pin"), g("komite")) || 1) / (dist(set.marks.pin, set.marks.komite) || 1);
  const move = (p) => {
    const d = dist(sM, p);
    if (d < 0.01) return { lat: rM.lat, lon: rM.lon };
    const a = ((bearing(sM, p) - sAx) * Math.PI) / 180; // eksene göre
    const x = Math.sin(a) * d * k; // hat boyunca, ölçekli
    const y = Math.cos(a) * d;
    return dest(rM, norm(rAx + (Math.atan2(x, y) * 180) / Math.PI), Math.hypot(x, y));
  };
  const marks = {};
  for (const n of ["komite", "pin", "m1", "m2", "m3s", "m3p", "fin1", "fin2"]) if (g(n)) marks[n] = g(n);
  const turn = rAx - sAx;
  return { ...set, wind: { ...set.wind, dir: Math.round(norm(rAx)) }, marks, fixes: set.fixes.map((f) => ({ ...f, ...move(f), hdg: f.hdg === null || f.hdg === undefined ? f.hdg : norm(f.hdg + turn) })) };
}
// Klibin başı ve sonu (ms)
export function spanOf(set) {
  if (!set.fixes.length) return { t0: 0, t1: 0 };
  return { t0: set.fixes[0].t, t1: set.fixes.at(-1).t };
}
// yelken → zamana göre sıralı konumlar
export function tracksOf(set) {
  const m = new Map();
  for (const f of set.fixes) {
    if (!m.has(f.sail)) m.set(f.sail, []);
    m.get(f.sail).push(f);
  }
  return m;
}

// t anındaki yer ve yön: iki konum arası doğrusal; yön verilmişse kısa açıdan, yoksa gidişten. Son konumdan sonra 3 sn'ye kadar durur.
export function poseAt(list, t) {
  if (!list?.length || t < list[0].t || t > list.at(-1).t + 3000) return null;
  let i = 0;
  while (i + 1 < list.length && list[i + 1].t <= t) i++;
  const a = list[i];
  const b = list[i + 1];
  const move = (p, q) => (dist(p, q) > 0.3 ? bearing(p, q) : null);
  if (!b) {
    const prev = list[i - 1];
    return { lat: a.lat, lon: a.lon, hdg: a.hdg ?? (prev ? move(prev, a) : null) ?? 0, spd: a.spd ?? 0 };
  }
  const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  const h0 = a.hdg ?? move(a, b) ?? 0;
  const h1 = b.hdg ?? move(a, b) ?? h0;
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, hdg: norm(h0 + angDiff(h0, h1) * f), spd: (a.spd ?? 0) + ((b.spd ?? 0) - (a.spd ?? 0)) * f };
}

// Yelken: rüzgârın baştan geliş açısına göre bumba açısı (derece, orta hattan) ve tarafı (-1 iskele, 1 sancak; rüzgâraltı).
// 38°'den dar: rüzgâra karşı, yelken boşta (luff). Pupada en çok 85°.
export function boomOf(hdg, windDir) {
  const r = angDiff(hdg, windDir);
  const a = Math.abs(r);
  const luff = a < 38;
  return { b: luff ? 10 : Math.round(Math.min(85, 8 + (a - 38) * 0.62)), side: r >= 0 ? -1 : 1, luff };
}

// Sabit çerçeve (klip boyunca kamera kımıldamaz): verilen noktaları W×H'ye sığdıran izdüşüm; up yukarıdaki yön (parkur ekseni)
// origin: iki çerçeve karışacaksa (frameMix) ortak başlangıç noktası
// padB: alttaki boşluk (canlı ekranda alt şeridin altında kalmasın)
export function frameOf(points, { W = 1600, H = 900, pad = 120, padB = null, up = 0, min = 60, origin = null } = {}) {
  const pb = padB ?? pad;
  const ok = (points || []).filter(geo);
  if (!ok.length) return null;
  const o = origin || { lat: ok.reduce((s, p) => s + p.lat, 0) / ok.length, lon: ok.reduce((s, p) => s + p.lon, 0) / ok.length };
  const a = (up * Math.PI) / 180;
  const k = Math.cos((o.lat * Math.PI) / 180);
  const rot = (p) => {
    const x = ((p.lon - o.lon) * Math.PI * 6371000 * k) / 180;
    const y = ((p.lat - o.lat) * Math.PI * 6371000) / 180;
    return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
  };
  const r = ok.map(rot);
  const xs = r.map((p) => p.x);
  const ys = r.map((p) => p.y);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const m = Math.max(Math.max(min, Math.max(...xs) - Math.min(...xs)) / (W - pad * 2), Math.max(min, Math.max(...ys) - Math.min(...ys)) / Math.max(40, H - pad - pb));
  return mkFrame({ m, up, cx, cy, W, H, Y0: (pad + H - pb) / 2, rot });
}
const mkFrame = (f) => ({
  ...f,
  at: (p) => {
    const q = f.rot(p);
    return { x: f.W / 2 + (q.x - f.cx) / f.m, y: f.Y0 - (q.y - f.cy) / f.m };
  },
});
// Yakınlık (Seyhun 2026-11-03 "tepeden startı ve parkuru; zoomlayıp uzaklaşmak mümkün olsun, yönetimden ayarlayayım"):
// z 0 = start çerçevesi (a), 1 = bütün parkur (b); ölçek logaritmik geçer. anchor (start hattının ortası) ekranda a'daki yerinden b'dekine
// doğru kayar, böylece arada da start görünür kalır. a ve b aynı origin ile kurulmalı.
export function frameMix(a, b, z, anchor = null) {
  if (!a || !b) return a || b;
  const k = Math.max(0, Math.min(1, z));
  const m = Math.exp(Math.log(a.m) + (Math.log(b.m) - Math.log(a.m)) * k);
  if (!anchor || !geo(anchor)) return mkFrame({ ...a, m, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, Y0: a.Y0 + (b.Y0 - a.Y0) * k });
  const sa = a.at(anchor);
  const sb = b.at(anchor);
  const sx = sa.x + (sb.x - sa.x) * k;
  const sy = sa.y + (sb.y - sa.y) * k;
  const q = a.rot(anchor);
  return mkFrame({ ...a, m, cx: q.x - (sx - a.W / 2) * m, cy: q.y + (sy - a.Y0) * m });
}
// Yayın'daki görünüm düğmeleri: screen.zoom (0–100)
export const ZOOMS = [
  ["Start", 0],
  ["Yakın", 35],
  ["Orta", 65],
  ["Parkur", 100],
];
export const ZOOM_DEF = 100;
export const cleanZoom = (z) => (Number.isFinite(+z) && z !== null && z !== "" ? Math.max(0, Math.min(100, Math.round(+z))) : ZOOM_DEF);

// Sayaç yazısı: start'tan önce "Start'a 00:03", sonra "Süre 00:08"
export function clockText(t) {
  const s = Math.ceil(Math.abs(t) / 1000 - 1e-9);
  const mmss = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return t < 0 ? { label: "START'A", n: mmss } : { label: "SÜRE", n: `${String(Math.floor(Math.floor(t / 1000) / 60)).padStart(2, "0")}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}` };
}
