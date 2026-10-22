// Deneme modu: gerçek restoran ve kurye yokken sipariş kendiliğinden ilerler. Hiçbir şey yazılmaz;
// durum, saatler ve kurye konumu siparişin verildiği andan hesaplanır (gerçek süreler: restoranın hazırlığı + yol).
import { distanceKm } from "./address";
import { STATUSES, etaFrom, travelMin } from "./order";

const MIN = 60000;

export function demoTimes(order, place) {
  const t0 = new Date(order.times?.sent || order.at).getTime();
  const km = distanceKm(place?.pos, order.address?.pos);
  const road = travelMin(Number.isFinite(km) ? km : 2);
  const ready = t0 + (place?.prepMin || 20) * MIN;
  return { sent: t0, accepted: t0 + MIN, preparing: t0 + 2 * MIN, onTheWay: ready, delivered: ready + road * MIN };
}

// Ekranda gösterilecek hal: { status, times (ISO), eta (ISO), courier: { name, pos } | null }
export function liveView(order, place, now = Date.now()) {
  if (!order) return null;
  if (!order.demo || order.status === "cancelled") {
    const km = distanceKm(place?.pos, order.address?.pos);
    return { status: order.status, times: order.times || {}, eta: order.eta || etaFrom(order, place, Number.isFinite(km) ? km : 2, new Date(now)).toISOString(), courier: order.courier || null };
  }
  const t = demoTimes(order, place);
  const status = [...STATUSES].reverse().find((s) => now >= t[s]) || "sent";
  const times = Object.fromEntries(STATUSES.filter((s) => now >= t[s]).map((s) => [s, new Date(t[s]).toISOString()]));
  let courier = null;
  if (status === "onTheWay" && place?.pos && order.address?.pos) {
    const f = Math.min(1, (now - t.onTheWay) / (t.delivered - t.onTheWay));
    courier = { name: "Murat", pos: { lat: place.pos.lat + (order.address.pos.lat - place.pos.lat) * f, lng: place.pos.lng + (order.address.pos.lng - place.pos.lng) * f } };
  }
  return { status, times, eta: new Date(t.delivered).toISOString(), courier };
}
