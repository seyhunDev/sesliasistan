// Rüzgâr haritası (Windy gibi): seçili konumun (varsayılan Dikili) çevresinde ızgara noktaları, saat saat rüzgâr.
// Kaynak Open-Meteo (ücretsiz, anahtarsız, telefondan); tek istekte tüm noktalar. Firestore'a okuma/yazma yok.
// Saf hesaplar burada (testli); çizim src/features/weather/WindMap.jsx.

export const ROWS = 6;
export const COLS = 6;
export const STEP_LAT = 0.05; // ≈ 5,5 km
export const STEP_LON = 0.06; // ≈ 5,2 km (39° enlemde)
export const DAYS = 3;

// Konumun çevresinde ROWS × COLS nokta (kuzeyden güneye, batıdan doğuya). Dikili'de körfez ve Midilli kanalı girer.
export function gridOf(p, rows = ROWS, cols = COLS) {
  const lat0 = +p.lat + ((rows - 1) / 2) * STEP_LAT;
  const lon0 = +p.lon - ((cols - 1) / 2) * STEP_LON;
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push({ r, c, lat: +(lat0 - r * STEP_LAT).toFixed(4), lon: +(lon0 + c * STEP_LON).toFixed(4) });
  return out;
}

// Noktanın çevresindeki hücre (renkli alan için): [[güney, batı], [kuzey, doğu]]
export const cellOf = (pt) => [
  [pt.lat - STEP_LAT / 2, pt.lon - STEP_LON / 2],
  [pt.lat + STEP_LAT / 2, pt.lon + STEP_LON / 2],
];

export function mapUrl(points, tz = "Europe/Istanbul") {
  const q = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    wind_speed_unit: "kn",
    timezone: tz,
    forecast_days: String(DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

const r = Math.round;

// Yanıt (çok noktada dizi, tek noktada nesne) → { times: ["2026-10-05T00:00", …], spots: [{ lat, lon, w: [kn], g: [kn], d: [°] }] }
export function shapeMap(j, points, now = Date.now()) {
  const list = Array.isArray(j) ? j : [j];
  const times = list[0]?.hourly?.time || [];
  const spots = points.map((p, i) => {
    const h = list[i]?.hourly || {};
    const num = (a) => times.map((_, k) => (Number.isFinite(a?.[k]) ? r(a[k]) : null));
    return { r: p.r, c: p.c, lat: p.lat, lon: p.lon, w: num(h.wind_speed_10m), g: num(h.wind_gusts_10m), d: num(h.wind_direction_10m) };
  });
  return { at: now, times, spots };
}

// Şimdiki saatin sırası ("2026-10-05T14" ile başlayan); yoksa 0
export function nowIndex(times, nowStr) {
  const k = times.findIndex((t) => t.slice(0, 13) >= nowStr.slice(0, 13));
  return k < 0 ? 0 : k;
}

// Bir saatin okları: [{ lat, lon, kn, gust, dir }] (veri yoksa atlanır)
export function frameAt(data, i) {
  return (data?.spots || [])
    .filter((s) => s.w[i] != null && s.d[i] != null)
    .map((s) => ({ r: s.r, c: s.c, lat: s.lat, lon: s.lon, kn: s.w[i], gust: s.g[i] ?? s.w[i], dir: s.d[i] }));
}

// Haritanın özeti (o saat): ortalama, en düşük–en yüksek, en sert sağanak, baskın yön (vektör ortalaması)
export function frameSummary(f) {
  if (!f.length) return null;
  const kn = f.map((x) => x.kn);
  let u = 0;
  let v = 0;
  for (const x of f) {
    u += Math.sin((x.dir * Math.PI) / 180);
    v += Math.cos((x.dir * Math.PI) / 180);
  }
  const dir = r(((Math.atan2(u, v) * 180) / Math.PI + 360) % 360);
  return { avg: r(kn.reduce((a, b) => a + b, 0) / kn.length), min: Math.min(...kn), max: Math.max(...kn), gust: Math.max(...f.map((x) => x.gust)), dir };
}

// Akan çizgiler ve renk geçişi için alan: saatin noktaları ızgaraya dizilir, aradaki her yer çift doğrusal hesaplanır.
// u doğuya, v kuzeye doğru hız (knot); rüzgâr geldiği yönden estiği yöne akar.
export function fieldOf(frame) {
  if (!frame.length) return null;
  const rows = Math.max(...frame.map((x) => x.r)) + 1;
  const cols = Math.max(...frame.map((x) => x.c)) + 1;
  const cell = Array.from({ length: rows }, () => Array(cols).fill(null));
  let lat0 = -Infinity;
  let lon0 = Infinity;
  for (const x of frame) {
    const a = (x.dir * Math.PI) / 180;
    cell[x.r][x.c] = { u: -Math.sin(a) * x.kn, v: -Math.cos(a) * x.kn, kn: x.kn };
    lat0 = Math.max(lat0, x.lat + x.r * STEP_LAT);
    lon0 = Math.min(lon0, x.lon - x.c * STEP_LON);
  }
  return { rows, cols, cell, lat0, lon0 };
}

// Bir yerdeki rüzgâr { u, v, kn }; ızgaranın yarım hücre dışı ve eksik nokta null
export function sampleField(f, lat, lon) {
  if (!f) return null;
  const fr = (f.lat0 - lat) / STEP_LAT;
  const fc = (lon - f.lon0) / STEP_LON;
  if (fr < -0.5 || fc < -0.5 || fr > f.rows - 0.5 || fc > f.cols - 0.5) return null;
  const r0 = Math.min(Math.max(Math.floor(fr), 0), f.rows - 1);
  const c0 = Math.min(Math.max(Math.floor(fc), 0), f.cols - 1);
  const r1 = Math.min(r0 + 1, f.rows - 1);
  const c1 = Math.min(c0 + 1, f.cols - 1);
  const tr = Math.min(Math.max(fr - r0, 0), 1);
  const tc = Math.min(Math.max(fc - c0, 0), 1);
  const a = f.cell[r0][c0];
  const b = f.cell[r0][c1];
  const c = f.cell[r1][c0];
  const d = f.cell[r1][c1];
  if (!a || !b || !c || !d) return a || b || c || d || null;
  const mix = (k) => (a[k] * (1 - tc) + b[k] * tc) * (1 - tr) + (c[k] * (1 - tc) + d[k] * tc) * tr;
  return { u: mix("u"), v: mix("v"), kn: mix("kn") };
}

// Günün en sert rüzgârı (gün düğmesinde)
export function dayMax(spot, from, to) {
  let m = null;
  for (let i = from; i < to; i++) if (spot.w[i] != null) m = Math.max(m ?? 0, spot.w[i]);
  return m;
}

// Şiddete göre renk (Windy'ye benzer sıra: mavi → yeşil → sarı → turuncu → kırmızı → mor)
const SCALE = [
  [0, "#7aa6d6"],
  [5, "#4fb3a9"],
  [9, "#5fbf5a"],
  [13, "#c9d23f"],
  [17, "#f2b33d"],
  [22, "#ec7a35"],
  [28, "#d9423b"],
  [34, "#a33b9c"],
];
export function colorOf(kn) {
  let c = SCALE[0][1];
  for (const [k, col] of SCALE) if (kn >= k) c = col;
  return c;
}
export const LEGEND = SCALE.map(([k, col]) => ({ kn: k, color: col }));

// Renk geçişi için [r, g, b] (ölçekteki iki renk arası karışır)
const RGB = SCALE.map(([k, col]) => [k, [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16))]);
export function rgbOf(kn) {
  if (kn <= RGB[0][0]) return RGB[0][1];
  for (let i = 1; i < RGB.length; i++) {
    const [k1, c1] = RGB[i];
    const [k0, c0] = RGB[i - 1];
    if (kn < k1) {
      const t = (kn - k0) / (k1 - k0);
      return c0.map((x, j) => Math.round(x + (c1[j] - x) * t));
    }
  }
  return RGB[RGB.length - 1][1];
}

// Gün düğmeleri için: [{ date, from (ilk saatin sırası) }]
export function daysOf(times) {
  const out = [];
  times.forEach((t, i) => {
    const d = t.slice(0, 10);
    if (!out.length || out[out.length - 1].date !== d) out.push({ date: d, from: i });
  });
  return out;
}

// Önbellek: aynı konum ve 30 dakikadan yeni
export const TTL = 30 * 60e3;
export const placeId = (p) => `${(+p.lat).toFixed(3)},${(+p.lon).toFixed(3)}`;
export const fresh = (c, p, now = Date.now()) => !!c && c.place === placeId(p) && now - c.at < TTL && c.times?.length > 0;
