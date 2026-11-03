// Tekne konum oynatıcısı (Seyhun 2026-11-03 "canlı veri akışını sonra kuracağım, altyapı ona uygun olsun; önce hazır data setiyle
// start'tan 5 sn önce, 10 sn sonra animasyon"): animasyon yalnız bu biçimi okur; veri dosyadan da (public/veri/ornek-start.json)
// canlı akıştan da (tekne takibi takip/{yarış}/tekne: lat, lon, hdg, spd, t) aynı gelir. Biçim project-files/tekne-animasyon/veri-bicimi.md.
//   { v: 1, race, start (ISO), wind: { dir, kn }, marks: { komite, pin, m1… }, boats: [{ sail, name, grp }],
//     fixes: [{ t (start'a göre ms), sail, lat, lon, hdg?, spd? }] }
// Saf işlevler (test: scripts/asistan-test/yerel/yaris.mjs "Tekne animasyonu").
import { cleanFix, cleanSail } from "@/lib/boatTrack";
import { bearing, dist } from "@/lib/raceCourse";

const N = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v);
export const angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
const norm = (d) => ((d % 360) + 360) % 360;
const geo = (p) => (N(p?.lat) !== null && N(p?.lon) !== null && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? { lat: +p.lat, lon: +p.lon } : null);

export function cleanSet(j) {
  const wind = { dir: norm(N(j?.wind?.dir) ?? 0), kn: Math.max(0, Math.min(80, N(j?.wind?.kn) ?? 0)) };
  const marks = {};
  for (const [k, v] of Object.entries(j?.marks && typeof j.marks === "object" ? j.marks : {}).slice(0, 12)) {
    const g = geo(v);
    if (g && /^(komite|pin|m[1-9])$/.test(k)) marks[k] = g;
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
// Yayındaki replay (BoatReplay): ekrandaki yarışın grubu veri setinde varsa o, yoksa ilk grup
export const replayGroup = (set, grp) => (set && groupsOf(set).includes(grp) ? grp : (set && groupsOf(set)[0]) || "");
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
export function frameOf(points, { W = 1600, H = 900, pad = 120, up = 0, min = 60 } = {}) {
  const ok = (points || []).filter(geo);
  if (!ok.length) return null;
  const o = { lat: ok.reduce((s, p) => s + p.lat, 0) / ok.length, lon: ok.reduce((s, p) => s + p.lon, 0) / ok.length };
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
  const m = Math.max(Math.max(min, Math.max(...xs) - Math.min(...xs)) / (W - pad * 2), Math.max(min, Math.max(...ys) - Math.min(...ys)) / (H - pad * 2));
  return {
    m,
    up,
    at: (p) => {
      const q = rot(p);
      return { x: W / 2 + (q.x - cx) / m, y: H / 2 - (q.y - cy) / m };
    },
  };
}

// Sayaç yazısı: start'tan önce "Start'a 00:03", sonra "Süre 00:08"
export function clockText(t) {
  const s = Math.ceil(Math.abs(t) / 1000 - 1e-9);
  const mmss = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return t < 0 ? { label: "START'A", n: mmss } : { label: "SÜRE", n: `${String(Math.floor(Math.floor(t / 1000) / 60)).padStart(2, "0")}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}` };
}
