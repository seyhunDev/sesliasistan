// Velora'da kalan market hesapları (2026-10-25): market alışverişi, yönetimi ve hazır menüler Velora Sanal'da (depo velora-sanal,
// kendi catalog.js'i asıl kaynak). Burada yalnız ana sayfadaki açık market siparişi kartı ve penceresi için gerekenler.
// Stok: sipariş verilince ürün "bekliyor"a alınır (held artar), teslim edilince stoktan düşer, iptalde bekleyen geri açılır.
// Ölçülü satırda (part, ör. 0,045 = 1 kg undan 3 yemek kaşığı) stokta paketin o kadarı bekler / düşer.
// Sipariş belgesi (marketSiparisler/{id}):
//   { uid, lines: [{ id, name, size, brand?, part?, qty, price, total }], total, pay, address: { id, name, text, pos }, status, times: { [durum]: ISO }, at }

export const STATUSES = ["sent", "preparing", "onTheWay", "delivered"];
export const STATUS_NAMES = { sent: "Gönderildi", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim edildi", cancelled: "İptal" };
export const isOpenOrder = (o) => !!o && !["delivered", "cancelled"].includes(o.status);

const r3 = (n) => Math.round(n * 1000) / 1000;
// Satırın alt yazısı: "Söke · 1 kg"
export const packOf = (p) => [p.brand, p.size].filter(Boolean).join(" · ");
// Satır kimliği (aynı ürünün paketi ve ölçüsü ayrı satır) ve stokta kaç paket tuttuğu
export const lineKey = (l) => (l.part ? `${l.id}~${l.part}` : l.id);
export const packsOf = (l) => r3((l.part || 1) * l.qty);
export const cartCount = (lines) => lines.reduce((s, l) => s + l.qty, 0);

// Teslim: stoktan düş; iptal: bekleyeni aç. Katalogdan silinmiş ürün atlanır.
export function deliverFor(products, lines) {
  const next = { ...products };
  for (const l of lines) if (next[l.id]) next[l.id] = { ...next[l.id], stock: Math.max(0, r3(next[l.id].stock - packsOf(l))), held: Math.max(0, r3((next[l.id].held || 0) - packsOf(l))) };
  return next;
}
export function releaseFor(products, lines) {
  const next = { ...products };
  for (const l of lines) if (next[l.id]) next[l.id] = { ...next[l.id], held: Math.max(0, r3((next[l.id].held || 0) - packsOf(l))) };
  return next;
}
// Duruma geçiş katalogda ne yapar: "deliver" | "release" | null
export function stockStep(from, to) {
  if (from === to || from === "delivered" || from === "cancelled") return null;
  if (to === "delivered") return "deliver";
  if (to === "cancelled") return "release";
  return null;
}
export const tl = (n) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
