// Bölge haritası (hava sayfası, 2026-10-28): seçilen yerin çevresinde 7 × 7 nokta (~5 km aralık), son 2 saat ve sonraki 12 saat;
// saatlik rüzgâr (kn), yön ve yağış (mm). Kaynak Open-Meteo (ücretsiz, telefondan, tek istek). Çizim src/features/weather/RegionMap.jsx.
import { gridOf } from "./windMap";

export const SIZE = 7;
// day ("YYYY-AA-GG", Seyhun 2026-11-04 "gün değiştirirsem alttaki haritanın da günü değişsin"): verilirse o günün 24 saati; yoksa şimdiden −2 … +24 sa
export function regionUrl(p, tz = "Europe/Istanbul", day = "") {
  const pts = gridOf(p, SIZE, SIZE);
  const span = day ? { start_date: day, end_date: day } : { past_hours: "2", forecast_hours: "25" };
  const q = new URLSearchParams({
    latitude: pts.map((x) => x.lat).join(","),
    longitude: pts.map((x) => x.lon).join(","),
    hourly: "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,precipitation_probability",
    wind_speed_unit: "kn",
    timezone: tz,
    ...span,
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
    return { lat: p.lat, lon: p.lon, w: num(h.wind_speed_10m), g: num(h.wind_gusts_10m), d: num(h.wind_direction_10m), mm: num(h.precipitation, false), p: num(h.precipitation_probability) };
  });
  return { times, at, spots };
}

// Kaydırıcının adımları. Rüzgâr: saatlik, şimdiki saat "now". Yağış: geçmiş radar kareleri (10 dk) + şimdiden sonraki saatler (tahmin).
// Adım: { at, hh, kind: "past" | "fc" | "radar", i (ızgara saati), r (radar karesi), now }
// day: başka bir günün haritası; o günün saatleri sırayla (tahmin), radar ve "şimdi" yok
export function regionSteps(grid, radar, mode, now, day = false) {
  if (!grid?.times?.length) return [];
  const hh = (t) => grid.times[t].slice(11, 13);
  if (day) return grid.times.map((_, k) => ({ at: grid.at[k], hh: hh(k), kind: "fc", i: k, now: false }));
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

// Yağış ihtimali (%) rengi ve saydamlığı (Seyhun 2026-11-03: "%80 demek bölgenin neresine yağacak"): %30 altı görünmez, %30–49 açık, %50–79 mavi, %80 üstü koyu mavi
export function pTone(p) {
  return p >= 80 ? { c: "#2563eb", o: 0.62 } : p >= 50 ? { c: "#5b8cff", o: 0.5 } : p >= 30 ? { c: "#7dd3fc", o: 0.34 } : { c: "#7dd3fc", o: 0 };
}

// Verilen saatte (ızgara sırası i) çevrede yağış bekleyen noktaların oranı (%): mm ≥ 0,1 olan nokta / bütün noktalar
export function rainShare(spots, i) {
  const ok = (spots || []).filter((s) => s.mm?.[i] != null);
  return ok.length ? Math.round((ok.filter((s) => s.mm[i] >= 0.1).length / ok.length) * 100) : 0;
}

// Saatlik yağış rengi (hafif mavi → orta sarı → kuvvetli kırmızı; radar renklerine yakın)
export function mmColor(mm) {
  return mm >= 4 ? "#f43f5e" : mm >= 1.5 ? "#facc15" : mm >= 0.5 ? "#5b8cff" : "#7dd3fc";
}

// Yaklaştıkça sıklaşan oklar (Seyhun 2026-10-29: "yaklaştıkça oklar daha sık olmalı, koyun içindeki rüzgârı görebilmeliyim").
// Ekranda ~56 pikselde bir ok; ızgara noktalarının (≈5 km) arası çift doğrusal ara değerle doldurulur: hız düz ortalanır,
// yön u/v bileşenleriyle (355° ile 5° arası 0° olur, 180° değil). Yeni ölçüm değil: modelin değeri noktalar arasında yumuşatılır.
// Konumlar adımın katlarına oturur, harita kayınca oklar zıplamaz. bounds: [batı, güney, doğu, kuzey]. Dönen [{ lat, lon, w, d }] (en çok 500)
export function denseArrows(grid, i, bounds, zoom, px = 56) {
  if (!grid?.spots?.length || i < 0) return [];
  const n = Math.round(Math.sqrt(grid.spots.length));
  const s0 = grid.spots[0];
  const dLat = n > 1 ? s0.lat - grid.spots[n].lat : 0;
  const dLon = n > 1 ? grid.spots[1].lon - s0.lon : 0;
  if (!(dLat > 0 && dLon > 0)) return [];
  const lonStep = (px * 360) / (256 * 2 ** zoom);
  const latStep = lonStep * Math.cos((s0.lat * Math.PI) / 180);
  if (latStep >= dLat * 0.9) return grid.spots.filter((s) => s.w[i] != null && s.d[i] != null).map((s) => ({ lat: s.lat, lon: s.lon, w: s.w[i], d: s.d[i] }));
  const [w0, so, e0, no] = bounds;
  const south = Math.max(so, s0.lat - (n - 1) * dLat), north = Math.min(no, s0.lat);
  const west = Math.max(w0, s0.lon), east = Math.min(e0, s0.lon + (n - 1) * dLon);
  const out = [];
  for (let lat = Math.ceil(south / latStep) * latStep; lat <= north; lat += latStep)
    for (let lon = Math.ceil(west / lonStep) * lonStep; lon <= east; lon += lonStep) {
      const v = windAt(grid, i, n, dLat, dLon, lat, lon);
      if (v) out.push({ lat: +lat.toFixed(5), lon: +lon.toFixed(5), ...v });
      if (out.length >= 500) return out;
    }
  return out;
}

function windAt(grid, i, n, dLat, dLon, lat, lon) {
  const s0 = grid.spots[0];
  const fr = (s0.lat - lat) / dLat, fc = (lon - s0.lon) / dLon;
  const r = Math.min(n - 2, Math.max(0, Math.floor(fr))), c = Math.min(n - 2, Math.max(0, Math.floor(fc)));
  const tr = fr - r, tc = fc - c;
  let w = 0, u = 0, v = 0;
  for (const [dr, dc, k] of [[0, 0, (1 - tr) * (1 - tc)], [0, 1, (1 - tr) * tc], [1, 0, tr * (1 - tc)], [1, 1, tr * tc]]) {
    const s = grid.spots[(r + dr) * n + c + dc];
    if (s?.w[i] == null || s?.d[i] == null) return null;
    const a = (s.d[i] * Math.PI) / 180;
    w += k * s.w[i];
    u += k * Math.sin(a);
    v += k * Math.cos(a);
  }
  const d = (Math.round((Math.atan2(u, v) * 180) / Math.PI) + 360) % 360;
  return { w: Math.round(w), d };
}
