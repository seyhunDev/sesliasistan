// Siparişin kurye adımları (saf; hem istemci hem sunucu /api/kurye kullanır).
// Kendi hesabıyla giren kurye (Seyhun 2026-10-23) bu adımları sunucu üzerinden yapar: Firestore'a yazamaz, yalnız okur.
import { liveView } from "./demo";
import { roadMin } from "./route";

// Teslim alma: sipariş "Yolda" olur, kurye ve varış saati yazılır
export function pickupPatch(o, place, courier, now = Date.now()) {
  const t = new Date(now).toISOString();
  return {
    demo: false, status: "onTheWay", times: { ...(o.times || {}), onTheWay: t },
    eta: new Date(now + roadMin(o, place, courier.vehicle) * 60000).toISOString(),
    courier: { id: courier.id, name: courier.name, phone: courier.phone || "", vehicle: courier.vehicle || "motor", pos: place?.pos || null, at: t },
  };
}
export const deliverPatch = (o, now = Date.now()) => ({ demo: false, status: "delivered", times: { ...(o.times || {}), delivered: new Date(now).toISOString() } });

// Kurye bu siparişle ne yapabilir: "pickup" (teslim alabilir), "deliver" (onda, yolda), "" (hiçbiri)
export function courierCan(o, place, courierId, now = Date.now()) {
  const s = liveView(o, place, now)?.status || o?.status;
  if (["accepted", "preparing"].includes(s)) return "pickup";
  if (s === "onTheWay" && o.courier?.id === courierId) return "deliver";
  return "";
}

// Kayıtlı kurye: ayardaki couriers[] satırı (kimliği hesabın uid'si)
// login: kullanıcı adı (Yönetim'de görünür; şifre hiçbir yerde saklanmaz)
export const accountCourier = (uid, name, phone, login = "") => ({ id: uid, uid, name, phone: phone || "", vehicle: "motor", account: true, login });
