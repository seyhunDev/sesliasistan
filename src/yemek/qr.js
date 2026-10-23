// Siparişin kare kodu (Seyhun 2026-10-23): restoran ekranında ve basılan fişte durur; kurye Kurye ekranında okutup kabul edince
// sipariş ona verilir (Yolda). Elle "Kuryeye ver" de kalır. Kodun içinde yalnız sipariş kimliği var ("VY:<id>").
import qrcode from "@/lib/vendor/qrcode.mjs";

export const qrText = (id) => `VY:${id}`;
export function parseQr(text) {
  const m = /^VY:([\w-]{4,})$/.exec(String(text || "").trim());
  return m ? m[1] : null;
}
// Fişte ve ekranda okunacak kısa numara
export const orderNo = (id) => String(id || "").slice(-4).toUpperCase();

// Kare kodun hücreleri: { n (kenar), d (SVG yolu) }
export function qrCells(text) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { n, d, dark: (r, c) => q.isDark(r, c) };
}

// Okutulan kodun siparişi kuryeye verilebilir mi: { o, why: "ok" | "none" | "wait" | "road" | "done" }
// orders: bugünün siparişleri, her birinde live.status (withLive)
export function pickupOf(orders, text) {
  const id = parseQr(text);
  const o = id ? (orders || []).find((x) => x.id === id) : null;
  if (!o) return { o: null, why: "none" };
  const s = o.live?.status || o.status;
  if (s === "sent") return { o, why: "wait" };
  if (s === "onTheWay") return { o, why: "road" };
  if (s === "delivered" || s === "cancelled") return { o, why: "done" };
  return { o, why: "ok" };
}
export const PICKUP_SAY = {
  none: "Bu kare kod bir siparişe ait değil",
  wait: "Restoran siparişi henüz onaylamadı",
  road: "Bu sipariş zaten yolda",
  done: "Bu sipariş kapanmış",
};
