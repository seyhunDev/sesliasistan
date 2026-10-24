// Restorandan adrese yol (OSRM, OpenStreetMap yolları; ücretsiz, anahtarsız). Sipariş verilirken bir kez alınır,
// siparişe { line (polyline6), km, min } olarak yazılır; harita ve süre bunu kullanır. Alınamazsa düz çizgi ve tahmini süre.
import { distanceKm, distanceM } from "./address";
import { travelMin } from "./order";

const OSRM = "https://router.project-osrm.org/route/v1/driving";

// Google/OSRM polyline çözümü → [[lng, lat], …]
export function decodeLine(str = "", precision = 6) {
  const f = 10 ** precision, out = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const k of [0, 1]) {
      let shift = 0, res = 0, b;
      do {
        b = str.charCodeAt(i++) - 63;
        res |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i < str.length);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (k === 0) lat += d;
      else lng += d;
    }
    out.push([lng / f, lat / f]);
  }
  return out;
}
const cache = new Map();
export const lineOf = (route) => {
  if (!route?.line) return null;
  if (!cache.has(route.line)) cache.set(route.line, decodeLine(route.line));
  return cache.get(route.line);
};

const P = ([lng, lat]) => ({ lat, lng });
// Yolun uzunluğu boyunca f (0–1) noktası
export function pointAlong(coords, f) {
  if (!coords?.length) return null;
  if (coords.length === 1 || f <= 0) return P(coords[0]);
  const seg = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = distanceM(P(coords[i - 1]), P(coords[i]));
    seg.push(d);
    total += d;
  }
  let left = Math.min(1, f) * total;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, left / seg[i]) : 0;
      const [a, b] = [coords[i], coords[i + 1]];
      return { lng: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t };
    }
    left -= seg[i];
  }
  return P(coords[coords.length - 1]);
}

// Konumun yol üzerindeki yeri (0–1) ve yola uzaklığı (m); kuryenin kalan yolunu bulmak için.
// Her parçaya dik izdüşüm (kısa mesafede düz kabul: enlem/boylam metreye çevrilir)
export function progressOn(coords, pos) {
  if (!coords?.length || !pos) return { f: 0, off: Infinity };
  const kx = 111320 * Math.cos((pos.lat * Math.PI) / 180), ky = 110540;
  const xy = ([lng, lat]) => [(lng - pos.lng) * kx, (lat - pos.lat) * ky];
  let best = { d: Infinity, at: 0 }, total = 0;
  if (coords.length === 1) return { f: 1, off: Math.hypot(...xy(coords[0])) };
  for (let i = 1; i < coords.length; i++) {
    const [ax, ay] = xy(coords[i - 1]), [bx, by] = xy(coords[i]);
    const len = Math.hypot(bx - ax, by - ay);
    const t = len ? Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / (len * len))) : 0;
    const d = Math.hypot(ax + (bx - ax) * t, ay + (by - ay) * t);
    if (d < best.d) best = { d, at: total + len * t };
    total += len;
  }
  return { f: total ? best.at / total : 1, off: best.d };
}

// Araca göre yol süresi (dk). OSRM araba süresi; motor trafikte biraz hızlı, bisiklet 15 km/sa
export const VEHICLES = { motor: "Motor", araba: "Araba", bisiklet: "Bisiklet" };
export function rideMin(route, vehicle = "motor", km) {
  const dist = route?.km ?? km;
  if (!Number.isFinite(dist)) return 10;
  if (vehicle === "bisiklet") return Math.max(3, Math.round((dist / 15) * 60));
  if (!route?.min) return travelMin(dist);
  return Math.max(3, Math.round(route.min * (vehicle === "araba" ? 1 : 0.85)));
}

// Siparişin yol süresi: rota varsa rotadan, yoksa kuş uçuşu tahmin
export function roadMin(order, place, vehicle) {
  if (order?.route) return rideMin(order.route, vehicle || order.courier?.vehicle);
  const km = distanceKm(place?.pos, order?.address?.pos);
  return travelMin(Number.isFinite(km) ? km : 2);
}

// OSRM'den rota (en çok 5 sn). Olmazsa null.
export async function fetchRoute(from, to) {
  if (!from || !to) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(`${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline6`, { signal: ctl.signal });
    const j = r.ok ? await r.json() : null;
    const best = j?.routes?.[0];
    if (!best?.geometry) return null;
    return { line: best.geometry, km: Math.round(best.distance / 100) / 10, min: Math.max(1, Math.round(best.duration / 60)) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
