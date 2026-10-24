// Sepet, fiyat ve sipariş durumu: ekranlar ve asistan aynı hesapları kullanır.
// Sipariş belgesi (yemekSiparisler/{id}):
//   { uid, placeId, placeName, lines: [{ itemId, name, qty, picks: { [grup]: [seçenek] }, note, unit, total }],
//     subtotal, fee, total, pay: "kapıda-kart"|"kapıda-nakit", address: { id, name, text, pos },
//     status, times: { [durum]: ISO }, eta: ISO, courier: { name, pos: {lat,lng}, at } | null, rating, review, demo }

export const STATUSES = ["sent", "accepted", "preparing", "onTheWay", "delivered"];
export const STATUS_NAMES = { sent: "Gönderildi", accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim edildi", cancelled: "İptal" };
export const isOpenOrder = (o) => o && !["delivered", "cancelled"].includes(o.status);

// Seçeneklerle birim fiyat. picks: { "Boy": ["Büyük"], "Ekstra": ["Zeytin", "Mantar"] }
export function unitPrice(item, picks = {}) {
  let p = item.price;
  for (const g of item.options || []) for (const o of g.options) if ((picks[g.name] || []).includes(o.name)) p += o.extra || 0;
  return p;
}

// Eksik zorunlu seçim ya da fazla seçim varsa ilk sorunu yazar, yoksa "".
export function pickProblem(item, picks = {}) {
  for (const g of item.options || []) {
    const got = (picks[g.name] || []).filter((n) => g.options.some((o) => o.name === n));
    if (g.required && !got.length) return `${g.name} seç`;
    if (g.type === "one" && got.length > 1) return `${g.name}: tek seçim`;
    if (g.max && got.length > g.max) return `${g.name}: en çok ${g.max}`;
  }
  return "";
}

// Zorunlu tek seçimlerde ilk seçenek (ya da ek fiyatı 0 olan) hazır gelir
export function defaultPicks(item) {
  const picks = {};
  for (const g of item.options || []) if (g.required) picks[g.name] = [(g.options.find((o) => !o.extra) || g.options[0]).name];
  return picks;
}

export function makeLine(item, { qty = 1, picks, note = "" } = {}) {
  const p = picks || defaultPicks(item);
  const unit = unitPrice(item, p);
  return { itemId: item.id, name: item.name, qty, picks: p, note, unit, total: unit * qty };
}

// Satırın kısa açıklaması: "Büyük · İnce · Ekstra peynir"
export const lineDetail = (l) => [...Object.values(l.picks || {}).flat(), l.note && `"${l.note}"`].filter(Boolean).join(" · ");

export function cartTotals(place, lines) {
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const fee = place?.fee || 0;
  const short = Math.max(0, (place?.minOrder || 0) - subtotal);
  return { subtotal, fee, total: subtotal + fee, short };
}

// Restoran şu an açık mı (hours: ["11:00","23:00"]; gece yarısını geçen saatler de olur)
export function isOpenAt(place, date = new Date()) {
  if (!place?.hours || place.closed) return !place?.closed;
  const m = (s) => { const [h, mm] = s.split(":").map(Number); return h * 60 + mm; };
  const now = date.getHours() * 60 + date.getMinutes();
  const [a, b] = place.hours.map(m);
  return b > a ? now >= a && now < b : now >= a || now < b;
}

// Tahmini varış: hazırlık + yol (km başına 3 dk, en az 5 dk). Durum ilerledikçe kalan kısım hesaplanır.
export function travelMin(km) {
  return Math.max(5, Math.round(km * 3));
}
// road: yol süresi (dk; rota varsa src/yemek/route.js roadMin), yoksa km'den tahmin
export function etaFrom(order, place, km, now = new Date(), road = travelMin(km)) {
  const prep = place?.prepMin || 20;
  const at = (s) => (order.times?.[s] ? new Date(order.times[s]) : null);
  let base;
  if (order.status === "onTheWay") base = new Date((at("onTheWay") || now).getTime() + road * 60000);
  else if (order.status === "preparing" || order.status === "accepted") base = new Date((at("accepted") || now).getTime() + (prep + road) * 60000);
  else base = new Date((at("sent") || now).getTime() + (prep + road + 2) * 60000);
  return base < now ? now : base;
}
// Teslim edilmeyen siparişte süre dolsa da en az 1 dk (kurye "Teslim" deyince biter)
export const minutesLeft = (eta, now = new Date()) => Math.max(1, Math.ceil((new Date(eta) - now) / 60000));

const sameMinute = (x, y) => Math.floor(new Date(x).getTime() / 60000) === Math.floor(new Date(y).getTime() / 60000);
// Adım adım satırları (yeniden eskiye). Restoran "Onayla" deyince onay ve hazırlık aynı anda başlar: tek satır olur
// (Seyhun 2026-10-23: aynı saat iki kez yazmasın).
export function stepRows(times = {}, cancelled = false) {
  const rows = ["delivered", "onTheWay", "preparing", "accepted", "sent"].filter((s) => times[s]).map((s) => ({ s, title: STATUS_NAMES[s], at: times[s] }));
  const a = rows.find((r) => r.s === "accepted"), p = rows.find((r) => r.s === "preparing");
  const one = a && p && sameMinute(a.at, p.at);
  const out = one ? rows.filter((r) => r !== p).map((r) => (r === a ? { ...r, title: "Onaylandı, hazırlanıyor" } : r)) : rows;
  return [...(cancelled && times.cancelled ? [{ s: "cancelled", title: STATUS_NAMES.cancelled, at: times.cancelled }] : []), ...out];
}
