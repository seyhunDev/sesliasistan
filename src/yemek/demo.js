// Deneme modu: gerçek restoran ve kurye yokken sipariş kendiliğinden ilerler. Hiçbir şey yazılmaz;
// durum, saatler ve kurye konumu siparişin verildiği andan hesaplanır (gerçek süreler: restoranın hazırlığı + yol).
// Rota varsa (sipariş verilirken OSRM'den) kurye yol üzerinde ilerler, yol süresi rotadan.
import { distanceKm } from "./address";
import { STATUSES, etaFrom } from "./order";
import { lineOf, pointAlong, progressOn, rideMin, roadMin } from "./route";

const MIN = 60000;
export const DEMO_COURIER = { name: "Murat", vehicle: "motor" };

export function demoTimes(order, place) {
  const t0 = new Date(order.times?.sent || order.at).getTime();
  const road = roadMin(order, place, "motor");
  const ready = t0 + (place?.prepMin || 20) * MIN;
  return { sent: t0, accepted: t0 + MIN, preparing: t0 + 2 * MIN, onTheWay: ready, delivered: ready + road * MIN };
}

// Ekranda gösterilecek hal: { status, times (ISO), eta (ISO), courier: { name, vehicle, pos } | null, f (yolun alınan kısmı 0–1) }
export function liveView(order, place, now = Date.now()) {
  if (!order) return null;
  const line = lineOf(order.route);
  if (!order.demo || order.status === "cancelled") {
    const km = distanceKm(place?.pos, order.address?.pos);
    let eta = order.eta || etaFrom(order, place, Number.isFinite(km) ? km : 2, new Date(now), roadMin(order, place)).toISOString();
    let f = order.status === "delivered" ? 1 : 0;
    // Yolda ve kuryenin konumu biliniyorsa kalan süre kuryeden adrese (rota üzerindeyse rotanın kalanı)
    const pos = order.status === "onTheWay" ? order.courier?.pos : null;
    if (pos) {
      const on = progressOn(line, pos);
      const left = distanceKm(pos, order.address?.pos);
      if (line && on.off < 300) {
        f = on.f;
        eta = new Date(now + Math.max(1, Math.round(rideMin(order.route, order.courier?.vehicle) * (1 - on.f))) * MIN).toISOString();
      } else if (Number.isFinite(left)) eta = new Date(now + roadMin({ address: order.address }, { pos }, order.courier?.vehicle) * MIN).toISOString();
    }
    return { status: order.status, times: order.times || {}, eta, courier: order.courier || null, f };
  }
  const t = demoTimes(order, place);
  const status = [...STATUSES].reverse().find((s) => now >= t[s]) || "sent";
  const times = Object.fromEntries(STATUSES.filter((s) => now >= t[s]).map((s) => [s, new Date(t[s]).toISOString()]));
  let courier = null, f = status === "delivered" ? 1 : 0;
  if (status === "onTheWay" && place?.pos && order.address?.pos) {
    f = Math.min(1, (now - t.onTheWay) / (t.delivered - t.onTheWay));
    const pos = line ? pointAlong(line, f) : { lat: place.pos.lat + (order.address.pos.lat - place.pos.lat) * f, lng: place.pos.lng + (order.address.pos.lng - place.pos.lng) * f };
    courier = { ...DEMO_COURIER, pos };
  }
  return { status, times, eta: new Date(t.delivered).toISOString(), courier, f };
}
