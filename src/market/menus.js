// Hazır menüler (Seyhun 2026-10-24: "lazanya için gerekli olan tüm malzemeler"): yemek + malzeme listesi.
// Menü: { id, name, serves (kişi), photo (yemek/photo.js anahtarı ya da adres), items: [{ name, amount, qty }] }
//   name: malzeme ("Dana kıyma"); amount: tarifteki miktar ("500 g"); qty: marketten kaç paket/adet (serves kişi için)
// Malzeme katalogdaki ürünle adından eşleşir (findProduct); eşleşmeyen "Bulunamadı" olur ve yöneticinin İstekler listesine gider.
import { search, makeLine, free } from "./catalog";

const m = (id, name, serves, photo, items) => ({ id, name, serves, photo, items: items.map(([n, amount, qty = 1]) => ({ name: n, amount, qty })) });

export const SAMPLE_MENUS = [
  m("lazanya", "Lazanya", 4, "pasta", [
    ["Lazanya yaprağı", "500 g"], ["Dana kıyma", "500 g"], ["Domates salçası", "2 yemek kaşığı"], ["Kuru soğan", "2 adet"],
    ["Süt", "1 L"], ["Tereyağı", "100 g"], ["Un", "3 yemek kaşığı"], ["Kaşar peyniri", "200 g"], ["Muskat", "1 tutam"],
  ]),
  m("mercimek-corbasi", "Mercimek çorbası", 4, "soup", [
    ["Kırmızı mercimek", "1,5 su bardağı"], ["Kuru soğan", "1 adet"], ["Havuç", "1 adet"], ["Patates", "1 adet"],
    ["Tereyağı", "2 yemek kaşığı"], ["Un", "1 yemek kaşığı"], ["Limon", "1 adet"], ["Pul biber", "1 çay kaşığı"],
  ]),
  m("karniyarik", "Karnıyarık", 4, "stew", [
    ["Patlıcan", "6 adet"], ["Dana kıyma", "300 g"], ["Kuru soğan", "2 adet"], ["Sivri biber", "4 adet"],
    ["Domates", "3 adet"], ["Domates salçası", "1 yemek kaşığı"], ["Ayçiçek yağı", "1 su bardağı"], ["Maydanoz", "yarım demet"],
  ]),
  m("menemen", "Menemen", 2, "breakfast", [
    ["Yumurta", "4 adet"], ["Domates", "3 adet"], ["Sivri biber", "3 adet"], ["Tereyağı", "1 yemek kaşığı"], ["Ekmek", "1 adet"],
  ]),
  m("tavuk-sote", "Tavuk sote", 4, "stew", [
    ["Tavuk göğüs", "600 g"], ["Kapya biber", "2 adet"], ["Sivri biber", "3 adet"], ["Domates", "2 adet"],
    ["Kuru soğan", "1 adet"], ["Mantar", "200 g"], ["Ayçiçek yağı", "3 yemek kaşığı"], ["Kekik", "1 çay kaşığı"],
  ]),
  m("spagetti-bolonez", "Spagetti bolonez", 4, "pasta2", [
    ["Spagetti", "500 g"], ["Dana kıyma", "400 g"], ["Domates (konserve)", "400 g"], ["Kuru soğan", "1 adet"],
    ["Sarımsak", "2 diş"], ["Zeytinyağı", "3 yemek kaşığı"], ["Parmesan", "50 g"], ["Fesleğen", "birkaç yaprak"],
  ]),
];

const fold = (s = "") => s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]).trim();

// Malzeme adı → katalogdaki ürün: önce adı aynı olan (stokta olan önde), yoksa aramada ilk çıkan ("soğan" → Kuru soğan); yoksa null
export function findProduct(list, name) {
  const n = fold(name);
  if (!n) return null;
  const same = list.filter((p) => fold(p.name) === n).sort((a, b) => free(b) - free(a));
  if (same.length) return same[0];
  return search(list, name)[0] || null;
}

// Menünün satırları, kişi sayısına göre: [{ item, product|null, qty }]
export function menuRows(menu, list, people = menu.serves) {
  const k = people / (menu.serves || people || 1);
  return menu.items.map((item) => ({ item, product: findProduct(list, item.name), qty: Math.max(1, Math.ceil((item.qty || 1) * k - 1e-9)) }));
}

// Sepete eklenecekler: seçili ve bulunan satırlar (sepettekiyle birleşir). skip: { [malzeme adı]: true } (evde var)
export function menuToCart(cart, rows, skip = {}) {
  let next = [...cart];
  for (const r of rows) {
    if (!r.product || skip[r.item.name] || free(r.product) <= 0) continue;
    const qty = Math.min(r.qty, free(r.product));
    const has = next.find((l) => l.id === r.product.id);
    next = has ? next.map((l) => (l.id === r.product.id ? makeLine(r.product, l.qty + qty) : l)) : [...next, makeLine(r.product, qty)];
  }
  return next;
}

// Bulunamayan malzemelerin adları
export const missingOf = (rows) => rows.filter((r) => !r.product).map((r) => r.item.name);

// İstek listesi (yönetim › İstekler): { [anahtar]: { name, count, from: [menü adları], at } }; aynı ad bir kez sayılır
export function addRequests(reqs = {}, names = [], from = "", at = new Date().toISOString()) {
  const next = { ...reqs };
  for (const name of names) {
    const key = fold(name).replace(/[^a-z0-9]+/g, "-");
    if (!key) continue;
    const r = next[key] || { name: name.trim(), count: 0, from: [] };
    next[key] = { ...r, count: r.count + 1, from: from && !r.from.includes(from) ? [...r.from, from].slice(-5) : r.from, at };
  }
  return next;
}

// Elle yazılan malzeme satırı: "500 g dana kıyma", "2 adet soğan", "Muskat", "Süt - 1 L", "1. Un" → { name, amount, qty }
const UNIT = "(?:kg|g|gr|gram|l|lt|litre|ml|adet|paket|kutu|kavanoz|şişe|demet|bağ|dal|yaprak|dilim|diş|tutam|avuç|fincan|su bardağı|çay bardağı|yemek kaşığı|çay kaşığı|tatlı kaşığı|bardak|kaşık)";
export function parseIngredient(line = "") {
  const s = line.trim().replace(/^[-•*]\s*/u, "").replace(/^\d+[.)]\s+/u, "").trim();
  if (!s) return null;
  let m = new RegExp(`^(\\d+(?:[.,]\\d+)?|yarım|bir|iki|üç|dört|beş)\\s*(${UNIT})?\\s+(.+)$`, "iu").exec(s);
  if (m) {
    const amount = [m[1], m[2]].filter(Boolean).join(" ");
    const n = { yarım: 1, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5 }[m[1].toLocaleLowerCase("tr")] ?? Number(m[1].replace(",", "."));
    // Market paketi sayısı yalnız "2 paket", "3 kutu" gibi yazılınca; "2 adet soğan" 1 paket soğandır
    return { name: cap(m[3].trim()), amount, qty: /paket|kutu/i.test(m[2] || "") ? Math.max(1, Math.ceil(n)) : 1 };
  }
  m = /^(.+?)\s*[-–:]\s*(.+)$/u.exec(s);
  if (m) return { name: cap(m[1].trim()), amount: m[2].trim(), qty: 1 };
  return { name: cap(s), amount: "", qty: 1 };
}
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

// Yapay zeka cevabını temizle (/api/market-menu): { name, serves, items: [{ name, amount, qty }] }
export function cleanMenu(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((x) => ({ name: cap(String(x?.name || "").trim().slice(0, 60)), amount: String(x?.amount || "").trim().slice(0, 40), qty: Math.max(1, Math.min(20, Math.round(Number(x?.packs) || 1))) }))
    .filter((x) => x.name)
    .filter((x, i, l) => l.findIndex((y) => fold(y.name) === fold(x.name)) === i)
    .slice(0, 25);
  const serves = Math.max(1, Math.min(20, Math.round(Number(raw?.serves) || 4)));
  return { name: cap(String(raw?.name || "").trim().slice(0, 60)), serves, items };
}
// Forma yazılacak satır: "500 g Dana kıyma"; miktarsız ve paket sayısı 1'den çoksa "2 paket …"
// Miktar sayıyla başlamıyorsa ("birkaç yaprak") ad önde yazılır: "Fesleğen - birkaç yaprak" (parseIngredient ikisini de okur)
export function itemLine(i) {
  if (!i.amount) return i.qty > 1 ? `${i.qty} paket ${i.name}` : i.name;
  return /^(\d|(yarım|bir|iki|üç|dört|beş)\s)/iu.test(i.amount) ? `${i.amount} ${i.name}` : `${i.name} - ${i.amount}`;
}
