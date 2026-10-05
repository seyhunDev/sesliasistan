// Rüzgâr haritası (Windy gibi): seçili konumun (varsayılan Dikili) çevresinde ızgara noktaları, saat saat rüzgâr.
// Kaynak Open-Meteo (ücretsiz, anahtarsız, telefondan); tek istekte tüm noktalar. Firestore'a okuma/yazma yok.
// Saf hesaplar burada (testli); çizim src/features/weather/WindMap.jsx.

export const ROWS = 6;
export const COLS = 6;
const STEP_LAT = 0.05; // ≈ 5,5 km
const STEP_LON = 0.06; // ≈ 5,2 km (39° enlemde)
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
