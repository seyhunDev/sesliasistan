// Bölge haritası (hava sayfası, 2026-10-28): seçilen yerin çevresinde 7 × 7 nokta (~5 km aralık), son 2 saat ve sonraki 12 saat;
// saatlik rüzgâr (kn), yön ve yağış (mm). Kaynak Open-Meteo (ücretsiz, telefondan, tek istek). Çizim src/features/weather/RegionMap.jsx.
import { gridOf } from "./windMap";

export const SIZE = 7;
export function regionUrl(p, tz = "Europe/Istanbul") {
  const pts = gridOf(p, SIZE, SIZE);
  const q = new URLSearchParams({
    latitude: pts.map((x) => x.lat).join(","),
    longitude: pts.map((x) => x.lon).join(","),
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation",
    wind_speed_unit: "kn",
    timezone: tz,
    past_hours: "2",
    forecast_hours: "13",
  });
  return { url: `https://api.open-meteo.com/v1/forecast?${q}`, pts };
}

// → { times: ["2026-10-28T12:00", …], at: [ms…], spots: [{ lat, lon, w, g, d, mm }] }
export function shapeRegion(j, pts) {
  const list = Array.isArray(j) ? j : [j];
  const h0 = list[0]?.hourly || {};
  const times = h0.time || [];
  const off = (list[0]?.utc_offset_seconds ?? 0) * 1000;
  const at = times.map((t) => Date.parse(`${t}:00Z`) - off);
  const spots = pts.map((p, i) => {
    const h = list[i]?.hourly || {};
    const num = (a, round = true) => times.map((_, k) => (Number.isFinite(a?.[k]) ? (round ? Math.round(a[k]) : Math.round(a[k] * 10) / 10) : null));
    return { lat: p.lat, lon: p.lon, w: num(h.wind_speed_10m), g: num(h.wind_gusts_10m), d: num(h.wind_direction_10m), mm: num(h.precipitation, false) };
  });
  return { times, at, spots };
}

// Kaydırıcının adımları. Rüzgâr: saatlik, şimdiki saat "now". Yağış: geçmiş radar kareleri (10 dk) + şimdiden sonraki saatler (tahmin).
// Adım: { at, hh, kind: "past" | "fc" | "radar", i (ızgara saati), r (radar karesi), now }
export function regionSteps(grid, radar, mode, now) {
  if (!grid?.times?.length) return [];
  const hh = (t) => grid.times[t].slice(11, 13);
  const cur = grid.at.reduce((b, t, k) => (t <= now ? k : b), 0);
  if (mode === "wind") return grid.times.map((_, k) => ({ at: grid.at[k], hh: hh(k), kind: k <= cur ? "past" : "fc", i: k, now: k === cur }));
  const past = (radar || []).filter((f) => f.at <= now + 60e3).map((f, r, a) => ({ at: f.at, hh: "", kind: "radar", r: radar.indexOf(f), now: r === a.length - 1 }));
  const fut = grid.times.map((_, k) => k).filter((k) => grid.at[k] > now).map((k) => ({ at: grid.at[k], hh: hh(k), kind: "fc", i: k, now: false }));
  if (!past.length) {
    const head = grid.times.map((_, k) => k).filter((k) => k <= cur).map((k) => ({ at: grid.at[k], hh: hh(k), kind: "fc", i: k, now: k === cur }));
    return [...head, ...fut];
  }
  return [...past, ...fut];
}

// Saatlik yağış rengi (hafif mavi → orta sarı → kuvvetli kırmızı; radar renklerine yakın)
export function mmColor(mm) {
  return mm >= 4 ? "#f43f5e" : mm >= 1.5 ? "#facc15" : mm >= 0.5 ? "#38bdf8" : "#7dd3fc";
}
