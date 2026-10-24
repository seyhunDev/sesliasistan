// Hazır menüler (Seyhun 2026-10-24: "lazanya için gerekli olan tüm malzemeler"): yemek + malzeme listesi + tarif.
// Menü: { id, name, serves (kişi), photo (yemek/photo.js anahtarı ya da adres), items: [{ name, amount, qty }], steps: [{ text, min }], minutes }
//   name: malzeme ("Dana kıyma"); amount: tarifteki miktar ("500 g"); qty: marketten kaç paket/adet (serves kişi için)
//   steps: tarifin adımları (min: o adımın dakikası); minutes: toplam süre (yoksa adımların toplamı)
// Malzeme katalogdaki ürünle adından eşleşir (findProduct); eşleşmeyen "Bulunamadı" olur ve yöneticinin İstekler listesine gider.
// İki türlü alınır (Seyhun 2026-10-24 "Set + paketler"): Ölçülü set (market tam ölçüyü hazırlar; katalogda cat "set" ürünü,
// kişi sayısı başına bir tane) ya da Paketlerle (her malzemenin en küçük paketi, markası değiştirilebilir).
import { search, makeLine, free } from "./catalog";
import { SAMPLE_PRODUCTS } from "./sample";

const m = (id, name, serves, photo, items, steps = []) => ({
  id, name, serves, photo,
  items: items.map(([n, amount, qty = 1]) => ({ name: n, amount, qty })),
  steps: steps.map(([text, min]) => ({ text, min })),
  minutes: steps.reduce((s, x) => s + x[1], 0),
});

export const SAMPLE_MENUS = [
  m("lazanya", "Lazanya", 4, "pasta", [
    ["Lazanya yaprağı", "500 g"], ["Dana kıyma", "500 g"], ["Domates salçası", "2 yemek kaşığı"], ["Kuru soğan", "2 adet"],
    ["Süt", "1 L"], ["Tereyağı", "100 g"], ["Un", "3 yemek kaşığı"], ["Kaşar peyniri", "200 g"], ["Muskat", "1 tutam"],
  ], [
    ["Soğanı ince doğra, tereyağında 3 dk kavur. Kıymayı ekle, suyunu çekene kadar pişir.", 10],
    ["Salçayı ekle, tuz ve karabiberle tatlandır. 10 dk kısık ateşte pişir.", 10],
    ["Beşamel: tereyağını erit, unu kavur, sütü azar azar ekleyip koyulaşana kadar karıştır. Muskat ekle.", 10],
    ["Tepsiye sırayla yaprak, kıymalı sos ve beşamel koy; üç kat yap.", 5],
    ["Üstüne rendelenmiş kaşarı serp, 180 °C fırında 30 dk pişir.", 30],
    ["10 dk dinlendirip dilimle.", 5],
  ]),
  m("mercimek-corbasi", "Mercimek çorbası", 4, "soup", [
    ["Kırmızı mercimek", "1,5 su bardağı"], ["Kuru soğan", "1 adet"], ["Havuç", "1 adet"], ["Patates", "1 adet"],
    ["Tereyağı", "2 yemek kaşığı"], ["Un", "1 yemek kaşığı"], ["Limon", "1 adet"], ["Pul biber", "1 çay kaşığı"],
  ], [
    ["Soğan, havuç ve patatesi doğra, tereyağında 5 dk kavur.", 5],
    ["Unu ekleyip 1 dk kavur.", 2],
    ["Yıkanmış mercimeği ve 6 su bardağı sıcak suyu ekle, 25 dk pişir.", 25],
    ["Blenderdan geçir, tuzla tatlandır.", 3],
    ["Pul biberi tereyağında kızdırıp üstüne gezdir, limonla servis et.", 3],
  ]),
  m("karniyarik", "Karnıyarık", 4, "stew", [
    ["Patlıcan", "6 adet"], ["Dana kıyma", "300 g"], ["Kuru soğan", "2 adet"], ["Sivri biber", "4 adet"],
    ["Domates", "3 adet"], ["Domates salçası", "1 yemek kaşığı"], ["Ayçiçek yağı", "1 su bardağı"], ["Maydanoz", "yarım demet"],
  ], [
    ["Patlıcanları alacalı soy, tuzlu suda 15 dk beklet, kurula.", 15],
    ["Yağda her yanı kızarana kadar kızart.", 15],
    ["Soğanı ve biberi kavur, kıymayı ekle; domates ve salçayla 10 dk pişir.", 10],
    ["Patlıcanları ortadan yar, içini kıymayla doldur, üstüne domates ve biber koy.", 5],
    ["Tepsiye 1 su bardağı salçalı su dök, 180 °C fırında 30 dk pişir. Maydanozla servis et.", 30],
  ]),
  m("menemen", "Menemen", 2, "breakfast", [
    ["Yumurta", "4 adet"], ["Domates", "3 adet"], ["Sivri biber", "3 adet"], ["Tereyağı", "1 yemek kaşığı"], ["Ekmek", "1 adet"],
  ], [
    ["Biberi doğra, tereyağında 3 dk kavur.", 3],
    ["Rendelenmiş domatesi ekle, suyunu çekene kadar pişir.", 7],
    ["Yumurtaları kır, hafifçe karıştır, tuzla.", 3],
    ["Kıvamını alınca ocaktan al, ekmekle servis et.", 1],
  ]),
  m("tavuk-sote", "Tavuk sote", 4, "stew", [
    ["Tavuk göğüs", "600 g"], ["Kapya biber", "2 adet"], ["Sivri biber", "3 adet"], ["Domates", "2 adet"],
    ["Kuru soğan", "1 adet"], ["Mantar", "200 g"], ["Ayçiçek yağı", "3 yemek kaşığı"], ["Kekik", "1 çay kaşığı"],
  ], [
    ["Tavuğu kuşbaşı doğra, yağda suyunu çekene kadar sotele.", 10],
    ["Soğanı ve mantarı ekle, 5 dk pişir.", 5],
    ["Biberleri ve domatesi ekle; kekik, tuz ve karabiberle 10 dk pişir.", 10],
  ]),
  m("spagetti-bolonez", "Spagetti bolonez", 4, "pasta2", [
    ["Spagetti", "500 g"], ["Dana kıyma", "400 g"], ["Domates (konserve)", "400 g"], ["Kuru soğan", "1 adet"],
    ["Sarımsak", "2 diş"], ["Zeytinyağı", "3 yemek kaşığı"], ["Parmesan", "50 g"], ["Fesleğen", "birkaç yaprak"],
  ], [
    ["Soğanı ve sarımsağı zeytinyağında kavur.", 5],
    ["Kıymayı ekle, suyunu çekene kadar pişir.", 10],
    ["Domatesleri ekle, kısık ateşte 20 dk pişir; tuz ve karabiber ekle.", 20],
    ["Spagettiyi tuzlu suda paketteki süre kadar haşla, süz.", 10],
    ["Sosu makarnayla karıştır, parmesan ve fesleğenle servis et.", 2],
  ]),
];

// Kaydedilmiş eski menülerde tarif yok: örnek menüden (aynı id) tamamlanır
const SAMPLE_BY_ID = Object.fromEntries(SAMPLE_MENUS.map((x) => [x.id, x]));
export function withRecipe(menu) {
  const s = SAMPLE_BY_ID[menu?.id];
  return s && !menu.steps ? { ...menu, steps: s.steps, minutes: s.minutes } : menu;
}
// Toplam süre: menüde yazan ya da adımların toplamı
export const minutesOf = (menu) => menu?.minutes || (menu?.steps || []).reduce((s, x) => s + (x.min || 0), 0);
// "1 sa 10 dk", "40 dk"
export function dur(min) {
  if (!min) return "";
  const h = Math.floor(min / 60), r = min % 60;
  return h ? `${h} sa${r ? ` ${r} dk` : ""}` : `${r} dk`;
}

const fold = (s = "") => s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]).trim();

// Malzeme adı → katalogdaki ürün: önce adı aynı olan (stokta olan önde), yoksa aramada ilk çıkan ("soğan" → Kuru soğan); yoksa null
// Aynı adın birden çok markası varsa: stokta olan, sonra varsayılan marka (alt değil), sonra stoğu çok olan. Setler malzeme değildir.
const pickOrder = (a, b) => (free(b) > 0) - (free(a) > 0) || !!a.alt - !!b.alt || free(b) - free(a);
export function findProduct(list, name) {
  const n = fold(name);
  if (!n) return null;
  const goods = list.filter((p) => p.cat !== "set");
  const same = goods.filter((p) => fold(p.name) === n).sort(pickOrder);
  if (same.length) return same[0];
  return search(goods, name)[0] || null;
}

// Marka seçenekleri: aynı adlı ürünler, ucuzdan pahalıya
export const alternatives = (list, p) => (p ? list.filter((x) => x.cat !== "set" && fold(x.name) === fold(p.name)).sort((a, b) => a.price - b.price || (a.brand || "").localeCompare(b.brand || "", "tr")) : []);

// Ölçülü set: menünün o kişi sayılık set ürünü (yoksa null)
export const setId = (menuId, people) => `set-${menuId}-${people}`;
export const setFor = (list, menuId, people) => list.find((p) => p.cat === "set" && p.menu === menuId && p.people === people) || null;
// Setin önerilen fiyatı: paketlerin toplamının %75'i, kişi sayısıyla orantılı, 5'e yuvarlı (yönetim değiştirir)
export function setPrice(menu, list, people) {
  const full = menuRows(menu, list, menu.serves).reduce((s, r) => s + (r.product ? r.product.price * r.qty : 0), 0);
  return Math.max(5, Math.round((full * 0.75 * people) / (menu.serves || 4) / 5) * 5);
}
// Set ürünü (katalogda cat "set"): "Lazanya seti", "4 kişilik"
export const makeSet = (menu, people, price, stock) => ({ id: setId(menu.id, people), name: `${menu.name} seti`, size: `${people} kişilik`, cat: "set", menu: menu.id, people, price, stock, held: 0 });

// Tarifteki miktarı kişi sayısına göre ölçekle: ("500 g", 1.5) → "750 g", ("2 adet", 0.5) → "1 adet", ("yarım demet", 2) → "1 demet"
const NUMW = { yarım: 0.5, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5 };
export function scaleAmount(amount = "", k = 1) {
  const mm = /^(\d+(?:[.,]\d+)?|(?:yarım|bir|iki|üç|dört|beş)(?!\p{L}))(\s*)(.*)$/iu.exec(amount.trim());
  if (!mm || k === 1) return amount;
  const unit = mm[3];
  let v = (NUMW[mm[1].toLocaleLowerCase("tr")] ?? Number(mm[1].replace(",", "."))) * k;
  if (/^(g|gr|gram|ml)$/i.test(unit)) v = v >= 100 ? Math.round(v / 10) * 10 : Math.round(v);
  else if (/^(adet|diş|dal|yaprak|dilim)/i.test(unit)) v = Math.max(1, Math.ceil(v - 1e-9));
  else if (v < 1) return `yarım${unit ? ` ${unit}` : ""}`;
  else v = Math.round(v * 2) / 2;
  return `${String(v).replace(".", ",")}${mm[2] || " "}${unit}`.trim();
}
// Setteki malzemeler: [{ name, amount }] (kişi sayısına göre)
export const setItems = (menu, people) => menu.items.map((i) => ({ name: i.name, amount: scaleAmount(i.amount, people / (menu.serves || people)) }));

// Örnek setler: her örnek menünün 2, 4 ve 6 kişilik seti (stok 5)
export const SET_SIZES = [2, 4, 6];
export const SAMPLE_SETS = SAMPLE_MENUS.flatMap((menu) => SET_SIZES.map((n) => makeSet(menu, n, setPrice(menu, SAMPLE_PRODUCTS, n), 5)));

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

// Yapay zeka cevabını temizle (/api/market-menu): { name, serves, items: [{ name, amount, qty }], steps: [{ text, min }], minutes }
export function cleanMenu(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((x) => ({ name: cap(String(x?.name || "").trim().slice(0, 60)), amount: String(x?.amount || "").trim().slice(0, 40), qty: Math.max(1, Math.min(20, Math.round(Number(x?.packs) || 1))) }))
    .filter((x) => x.name)
    .filter((x, i, l) => l.findIndex((y) => fold(y.name) === fold(x.name)) === i)
    .slice(0, 25);
  const serves = Math.max(1, Math.min(20, Math.round(Number(raw?.serves) || 4)));
  const steps = (Array.isArray(raw?.steps) ? raw.steps : [])
    .map((x) => ({ text: String(x?.text || "").trim().slice(0, 300), min: Math.max(0, Math.min(600, Math.round(Number(x?.min) || 0))) }))
    .filter((x) => x.text)
    .slice(0, 15);
  const minutes = Math.max(0, Math.min(1440, Math.round(Number(raw?.minutes) || 0))) || steps.reduce((t, x) => t + x.min, 0);
  return { name: cap(String(raw?.name || "").trim().slice(0, 60)), serves, items, steps, minutes };
}

// Tarif adımı satırı (formda her satır bir adım): "Soğanı kavur. (5 dk)" ↔ { text, min }
export function parseStep(line = "") {
  const s = line.trim().replace(/^[-•*]\s*/u, "").replace(/^\d+[.)]\s+/u, "").trim();
  if (!s) return null;
  const mm = /^(.*?)\s*\((\d+)\s*(?:dk|dakika)\)$/iu.exec(s);
  return mm ? { text: mm[1].trim(), min: Number(mm[2]) } : { text: s, min: 0 };
}
export const stepLine = (st) => (st.min ? `${st.text} (${st.min} dk)` : st.text);
// Forma yazılacak satır: "500 g Dana kıyma"; miktarsız ve paket sayısı 1'den çoksa "2 paket …"
// Miktar sayıyla başlamıyorsa ("birkaç yaprak") ad önde yazılır: "Fesleğen - birkaç yaprak" (parseIngredient ikisini de okur)
export function itemLine(i) {
  if (!i.amount) return i.qty > 1 ? `${i.qty} paket ${i.name}` : i.name;
  return /^(\d|(yarım|bir|iki|üç|dört|beş)\s)/iu.test(i.amount) ? `${i.amount} ${i.name}` : `${i.name} - ${i.amount}`;
}
