// Velora Market hesapları (ekranlar, yönetim ve asistan aynı kuralları kullanır; Firestore'a dokunmaz).
// Stok (Seyhun 2026-10-24): sipariş verilince ürün "bekliyor"a alınır (held artar), teslim edilince stoktan düşer
// (stock ve held azalır), iptalde bekleyen geri açılır. Satılabilir = stock − held.
// Ölçülü satır (Seyhun 2026-10-24: "bir üründe paketi alır, bir üründe yapılışa göre miktarda"): paketin bir parçası (part, ör. 0,045 =
// 1 kg undan 3 yemek kaşığı). Stokta o kadar paket bekler / düşer (stok kesirli olabilir); fiyatı paketin o kadarı (en az ₺2).
// Sipariş belgesi (marketSiparisler/{id}):
//   { uid, lines: [{ id, name, size, brand?, part?, qty, price, total }], total, pay, address: { id, name, text, pos }, status, times: { [durum]: ISO }, at }

export const STATUSES = ["sent", "preparing", "onTheWay", "delivered"];
export const STATUS_NAMES = { sent: "Gönderildi", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim edildi", cancelled: "İptal" };
export const isOpenOrder = (o) => !!o && !["delivered", "cancelled"].includes(o.status);
export const LOW = 3; // bu kadar ve altı "Az kaldı"

const r3 = (n) => Math.round(n * 1000) / 1000;
export const free = (p) => Math.max(0, r3((p?.stock || 0) - (p?.held || 0)));
// Kesirli stok sayısı: 49,9
export const num = (n) => (Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
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
// m: ölçülü satır için { part, amount (ya da size) }: boyut yerine tarifteki miktar yazılır ("3 yemek kaşığı")
export const partPrice = (p, part) => Math.max(2, Math.ceil(p.price * part));
export function makeLine(p, qty = 1, m = null) {
  const base = { id: p.id, name: p.name, size: p.size, ...(p.brand ? { brand: p.brand } : {}) };
  if (!m?.part) return { ...base, qty, price: p.price, total: p.price * qty };
  const price = partPrice(p, m.part);
  return { ...base, size: m.amount || m.size || p.size, part: m.part, qty, price, total: price * qty };
}
// Sepette satır kimliği (aynı ürünün paketi ve ölçüsü ayrı satır) ve stokta kaç paket tuttuğu
export const lineKey = (l) => (l.part ? `${l.id}~${l.part}` : l.id);
export const packsOf = (l) => r3((l.part || 1) * l.qty);
export const cartTotal = (lines) => lines.reduce((s, l) => s + l.price * l.qty, 0);
export const cartCount = (lines) => lines.reduce((s, l) => s + l.qty, 0);
// Sepette adet değişimi (0 olunca satır çıkar); ürün yoksa eklenir
export function bump(lines, p, d, m = null) {
  const key = m?.part ? `${p.id}~${m.part}` : p.id;
  const has = lines.find((l) => lineKey(l) === key);
  const next = has ? lines.map((l) => (lineKey(l) === key ? makeLine(p, l.qty + d, m && { ...l, ...m }) : l)) : d > 0 ? [...lines, makeLine(p, d, m)] : lines;
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
    const need = packsOf(l);
    if (free(p) < need - 1e-9) { short.push(free(p) ? `${p.name}: ${num(free(p))} kaldı` : `${p.name}: tükendi`); continue; }
    next[l.id] = { ...p, held: r3((p.held || 0) + need) };
    out.push(makeLine(p, l.qty, l.part ? l : null));
  }
  return short.length ? { short } : { products: next, lines: out, total: cartTotal(out) };
}
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
// Sipariş satırının kısa hali: "Süt 1 L ×2, Ekmek"
export const linesText = (lines) => lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ");
export const tl = (n) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

// Katalog sürümü: eski belgeye (v yok) yeni örnek ürünler (markalar) eklenir; yazınca v ile kaydedilir.
// Var olan ürünün fiyatı, stoğu ve adı korunur; yalnız eksik alanlar (marka) örnekten gelir. v3: hazır setler kalktı (bekleyeni yoksa silinir).
export const KATALOG_V = 3;
export function upgradeKatalog(products = {}, v = 0, sample = {}) {
  if (v >= KATALOG_V) return products;
  const next = Object.fromEntries(Object.entries(products).filter(([, p]) => p.cat !== "set" || p.held));
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
