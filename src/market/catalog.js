// Velora Market hesapları (ekranlar, yönetim ve asistan aynı kuralları kullanır; Firestore'a dokunmaz).
// Stok (Seyhun 2026-10-24): sipariş verilince ürün "bekliyor"a alınır (held artar), teslim edilince stoktan düşer
// (stock ve held azalır), iptalde bekleyen geri açılır. Satılabilir = stock − held.
// Sipariş belgesi (marketSiparisler/{id}):
//   { uid, lines: [{ id, name, size, qty, price, total }], total, pay, address: { id, name, text, pos }, status, times: { [durum]: ISO }, at }

export const STATUSES = ["sent", "preparing", "onTheWay", "delivered"];
export const STATUS_NAMES = { sent: "Gönderildi", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim edildi", cancelled: "İptal" };
export const isOpenOrder = (o) => !!o && !["delivered", "cancelled"].includes(o.status);
export const LOW = 3; // bu kadar ve altı "Az kaldı"

export const free = (p) => Math.max(0, (p?.stock || 0) - (p?.held || 0));
export const label = (p) => `${p.name} ${p.size} ${p.brand || ""}`.trim();
// Ürünün alt satırı: "Söke · 1 kg"
export const packOf = (p) => [p.brand, p.size].filter(Boolean).join(" · ");

// Türkçe arama: büyük/küçük harf ve şapka fark etmez, her kelime ad, boyut ya da markadaki bir kelimenin başı olmalı ("su 5", "kiyma")
const fold = (s = "") => s.toLocaleLowerCase("tr").replace(/[âîû]/g, (c) => ({ â: "a", î: "i", û: "u" })[c]).replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]);
// Sıra: ad ve boyutla tutanlar markayla tutanlardan önce ("süt": Süt önde, Sütaş yoğurt sonra), sonra kelimenin addaki yeri, ad, varsayılan marka
export function search(products, q = "") {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  const hits = (text) => { const ws = fold(text).split(/\s+/); return words.every((w) => ws.some((x) => x.startsWith(w))); };
  const rank = (p) => (hits(`${p.name} ${p.size}`) ? 0 : 1);
  const pos = (p) => { const i = fold(p.name).indexOf(words[0]); return i < 0 ? 999 : i; };
  return products
    .filter((p) => hits(label(p)))
    .sort((a, b) => rank(a) - rank(b) || pos(a) - pos(b) || a.name.localeCompare(b.name, "tr") || !!a.alt - !!b.alt);
}

// Sepet satırı ve toplam
export const makeLine = (p, qty = 1) => ({ id: p.id, name: p.name, size: p.size, ...(p.brand ? { brand: p.brand } : {}), qty, price: p.price, total: p.price * qty });
export const cartTotal = (lines) => lines.reduce((s, l) => s + l.price * l.qty, 0);
export const cartCount = (lines) => lines.reduce((s, l) => s + l.qty, 0);
// Sepette adet değişimi (0 olunca satır çıkar); ürün yoksa eklenir
export function bump(lines, p, d) {
  const has = lines.find((l) => l.id === p.id);
  const next = has ? lines.map((l) => (l.id === p.id ? makeLine(p, l.qty + d) : l)) : d > 0 ? [...lines, makeLine(p, d)] : lines;
  return next.filter((l) => l.qty > 0);
}

// Siparişi ver: katalogda yetmeyen ürünler ("Domates: 2 kaldı") ya da bekleyene alınmış yeni katalog
// products: { [id]: ürün }. Fiyat katalogdan güncellenir.
export function holdFor(products, lines) {
  const short = [];
  const next = { ...products };
  const out = [];
  for (const l of lines) {
    const p = next[l.id];
    if (!p) { short.push(`${l.name}: artık yok`); continue; }
    if (free(p) < l.qty) { short.push(free(p) ? `${p.name}: ${free(p)} kaldı` : `${p.name}: tükendi`); continue; }
    next[l.id] = { ...p, held: (p.held || 0) + l.qty };
    out.push(makeLine(p, l.qty));
  }
  return short.length ? { short } : { products: next, lines: out, total: cartTotal(out) };
}
// Teslim: stoktan düş; iptal: bekleyeni aç. Katalogdan silinmiş ürün atlanır.
export function deliverFor(products, lines) {
  const next = { ...products };
  for (const l of lines) if (next[l.id]) next[l.id] = { ...next[l.id], stock: Math.max(0, next[l.id].stock - l.qty), held: Math.max(0, (next[l.id].held || 0) - l.qty) };
  return next;
}
export function releaseFor(products, lines) {
  const next = { ...products };
  for (const l of lines) if (next[l.id]) next[l.id] = { ...next[l.id], held: Math.max(0, (next[l.id].held || 0) - l.qty) };
  return next;
}
// Duruma geçiş katalogda ne yapar: "deliver" | "release" | null
export function stockStep(from, to) {
  if (from === to || from === "delivered" || from === "cancelled") return null;
  if (to === "delivered") return "deliver";
  if (to === "cancelled") return "release";
  return null;
}
// Sipariş satırının kısa hali: "Süt 1 L ×2, Ekmek"
export const linesText = (lines) => lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ");
export const tl = (n) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

// Katalog sürümü: eski belgeye (v yok) yeni örnek ürünler (markalar, setler) eklenir; yazınca v ile kaydedilir.
// Var olan ürünün fiyatı, stoğu ve adı korunur; yalnız eksik alanlar (marka) örnekten gelir.
export const KATALOG_V = 2;
export function upgradeKatalog(products = {}, v = 0, sample = {}) {
  if (v >= KATALOG_V) return products;
  const next = { ...products };
  for (const [id, p] of Object.entries(sample)) next[id] = next[id] ? { ...p, ...next[id] } : p;
  return next;
}

// Yönetim: siparişin sonraki adımı ve düğme adı
export const NEXT = { sent: ["preparing", "Hazırla"], preparing: ["onTheWay", "Yola çıkar"], onTheWay: ["delivered", "Teslim edildi"] };
// Yeni ürün kimliği: "Süt 1 L" → "sut-1-l" (varsa sonuna -2, -3…)
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function newId(products, name, size = "") {
  const base = slug(`${name} ${size}`) || "urun";
  let id = base;
  for (let i = 2; products[id]; i++) id = `${base}-${i}`;
  return id;
}
// Ürün formu denetimi: ilk sorun ya da ""
export function productProblem(p) {
  if (!p.name?.trim()) return "Ad yaz";
  if (!(Number(p.price) > 0)) return "Fiyat yaz";
  if (!(Number(p.stock) >= 0)) return "Stok yaz";
  return "";
}
