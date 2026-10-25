// Kuryeler (Seyhun 2026-10-23): müsait / siparişte, en yakın müsait kuryeye otomatik atama, Dikili'de deneme kuryeleri.
// Kurye ayarda (orgs/{org}/yemek/ayar couriers[]): { id, name, phone, vehicle, pos?, at?, demo?, demoBusy? }.
// Kurye ekranı açıkken telefonun konumu kuryenin pos'una yazılır; deneme kuryelerinin konumu sabit.
import { distanceKm } from "./address";
import { isOpenAt } from "./order";

const OPEN = new Set(["sent", "accepted", "preparing", "onTheWay"]);
const statusOf = (o) => o.live?.status || o.status;

// Kuryenin açık siparişi (atanan ya da yoldaki); yoksa null
export function busyOrder(courier, orders = []) {
  return orders.find((o) => o.courier?.id === courier.id && OPEN.has(statusOf(o))) || null;
}
// { busy, order } — deneme kuryelerinde demoBusy da siparişte sayılır
export function courierState(courier, orders = []) {
  const order = busyOrder(courier, orders);
  return { busy: !!order || !!courier.demoBusy, order };
}

// Restorana en yakın müsait kurye (konumu bilinenler arasından); yoksa null
export function nearestFree(couriers = [], orders = [], pos) {
  if (!pos) return null;
  let best = null, bestKm = Infinity;
  for (const c of couriers) {
    if (!c.pos || courierState(c, orders).busy) continue;
    const km = distanceKm(c.pos, pos);
    if (km < bestKm) [best, bestKm] = [c, km];
  }
  return best;
}

// Siparişin kuryesi: en yakın müsait; müsait yoksa en yakın kurye (Seyhun 2026-10-23: şimdilik tek kurye var,
// her sipariş ona gider, meşgulse "Sırada"ya düşer). Konumu bilinen kurye yoksa null.
export function pickCourier(couriers = [], orders = [], pos) {
  const free = nearestFree(couriers, orders, pos);
  if (free || !pos) return free;
  let best = null, bestKm = Infinity;
  for (const c of couriers) {
    if (!c.pos || c.demoBusy) continue;
    const km = distanceKm(c.pos, pos);
    if (km < bestKm) [best, bestKm] = [c, km];
  }
  return best;
}

// Siparişe yazılan kurye (atanınca; konumu yola çıkınca yazılır)
export const courierOnOrder = (c) => ({ id: c.id, name: c.name, phone: c.phone || "", vehicle: c.vehicle || "motor", pos: null });

// Kurye listesi sırası: müsaitler önce, sonra restorana yakınlık
export function sortCouriers(couriers = [], orders = [], pos) {
  const km = (c) => (pos && c.pos ? distanceKm(c.pos, pos) : Infinity);
  return [...couriers].map((c) => ({ ...c, ...courierState(c, orders), km: km(c) })).sort((a, b) => a.busy - b.busy || a.km - b.km);
}

// Deneme kuryeleri: Dikili'nin farklı yerlerinde, ikisi siparişte. Yönetim'den eklenince her biri gerçek kurye hesabı olur
// (kullanıcı adı login; hesapları Velora Food açar). Kuryeyle girilince yeri telefondan.
export const DEMO_COURIERS = [
  { id: "dk-murat", login: "kurye.murat", name: "Murat", phone: "0532 000 00 11", vehicle: "motor", pos: { lat: 39.0718, lng: 26.8884 } },
  { id: "dk-emre", login: "kurye.emre", name: "Emre", phone: "0532 000 00 12", vehicle: "motor", pos: { lat: 39.0762, lng: 26.8931 } },
  { id: "dk-ayse", login: "kurye.ayse", name: "Ayşe", phone: "0532 000 00 13", vehicle: "bisiklet", pos: { lat: 39.0694, lng: 26.8858 } },
  { id: "dk-can", login: "kurye.can", name: "Can", phone: "0532 000 00 14", vehicle: "araba", pos: { lat: 39.0655, lng: 26.8812 }, demoBusy: true },
  { id: "dk-zeynep", login: "kurye.zeynep", name: "Zeynep", phone: "0532 000 00 15", vehicle: "motor", pos: { lat: 39.0790, lng: 26.8968 }, demoBusy: true },
  { id: "dk-ali", login: "kurye.ali", name: "Ali", phone: "0532 000 00 16", vehicle: "bisiklet", pos: { lat: 39.0736, lng: 26.8840 } },
].map((c) => ({ ...c, demo: true }));

// Kurye müsaitken en yakın restoranlar (Seyhun 2026-10-23): uzaklık, yaklaşık süre (yol kuş uçuşunun 1,3 katı;
// motor/araba 30, bisiklet 15 km/sa), açık mı. En çok n tane.
const SPEED = { motor: 30, araba: 30, bisiklet: 15 };
export function nearPlaces(pos, places = [], { vehicle = "motor", closed = {}, now = new Date(), n = 5 } = {}) {
  if (!pos) return [];
  return places
    .filter((p) => p.pos)
    .map((p) => {
      const km = distanceKm(pos, p.pos);
      return { place: p, km, min: Math.max(1, Math.round(((km * 1.3) / (SPEED[vehicle] || 30)) * 60)), open: !closed[p.id] && isOpenAt(p, now) };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}
