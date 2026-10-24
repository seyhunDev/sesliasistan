// Hazır menüler (Seyhun 2026-10-24: "lazanya için gerekli olan tüm malzemeler"): yemek + malzeme listesi + tarif.
// Menü: { id, name, serves (kişi), photo (yemek/photo.js anahtarı ya da adres), items: [{ name, amount, qty }], steps: [{ text, min }], minutes }
//   name: malzeme ("Dana kıyma"); amount: tarifteki miktar ("500 g"); qty: marketten kaç paket/adet (serves kişi için)
//   steps: tarifin adımları (min: o adımın dakikası); minutes: toplam süre (yoksa adımların toplamı)
// Malzeme katalogdaki ürünle adından eşleşir (findProduct); eşleşmeyen "Bulunamadı" olur ve yöneticinin İstekler listesine gider.
// Her malzeme ayrı seçilir (Seyhun 2026-10-24): Ölçü (market tarifteki kadarını hazırlar; partOf) ya da Paket (en küçük paketi),
// ve markası (aynı adın başka markaları; seçim ürün başına, ölçüde de pakette de aynı).
import { search, bump, free, partPrice } from "./catalog";

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
// Aynı adın birden çok markası varsa: stokta olan, sonra varsayılan marka (alt değil), sonra stoğu çok olan.
const pickOrder = (a, b) => (free(b) > 0) - (free(a) > 0) || !!a.alt - !!b.alt || free(b) - free(a);
export function findProduct(list, name) {
  const n = fold(name);
  if (!n) return null;
  const same = list.filter((p) => fold(p.name) === n).sort(pickOrder);
  if (same.length) return same[0];
  return search(list, name)[0] || null;
}

// Marka seçenekleri: aynı adlı ürünler, ucuzdan pahalıya
export const alternatives = (list, p) => (p ? list.filter((x) => fold(x.name) === fold(p.name)).sort((a, b) => a.price - b.price || (a.brand || "").localeCompare(b.brand || "", "tr")) : []);

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
// Tarifteki miktar → paketin ne kadarı (Ölçü): ("3 yemek kaşığı", Un 1 kg) → 0,045. Hesaplanamazsa ya da neredeyse bütün paketse null.
// Kaşık/bardak gram ya da ml sayılır; sebzede "adet" ortalama ağırlıktan; "10'lu" pakette adet sayısından.
const PER = { g: 1, gr: 1, gram: 1, kg: 1000, ml: 1, l: 1000, lt: 1000, litre: 1000, "yemek kaşığı": 15, "tatlı kaşığı": 10, "çay kaşığı": 5, "su bardağı": 200, "çay bardağı": 100, fincan: 70, tutam: 1, diş: 5 };
const PIECE_G = { "kuru soğan": 150, domates: 150, patates: 200, havuç: 100, patlıcan: 250, "sivri biber": 30, "kapya biber": 120, limon: 100, kabak: 250, salatalık: 150, elma: 180, sarımsak: 40 };
const AMOUNT = /^(\d+(?:[.,]\d+)?|(?:yarım|bir|iki|üç|dört|beş)(?!\p{L}))\s*(.*)$/iu;
// rawPart: kesir sınırsız (2,4 = 3 paket gerekir); partOf: ölçü olarak satılabilecek kesir
export function rawPart(amount = "", product, k = 1) {
  if (!product) return null;
  const a = AMOUNT.exec(String(amount).trim());
  if (!a) return null;
  const z = AMOUNT.exec(String(product.size || "").trim()) || ["", "1", product.size || ""];
  const n = (NUMW[a[1].toLocaleLowerCase("tr")] ?? Number(a[1].replace(",", "."))) * k;
  const unit = a[2].toLocaleLowerCase("tr").trim();
  const zn = Number(String(z[1]).replace(",", ".")) || 1;
  const zu = String(z[2]).toLocaleLowerCase("tr").trim();
  const count = /^'l[ıiuü]$/u.test(zu) || zu === "adet" ? zn : 0; // "10'lu" → 10 adet, "adet" → 1
  const piece = PIECE_G[product.name.toLocaleLowerCase("tr")];
  let part = 0;
  if (PER[unit] && PER[zu]) part = (n * PER[unit]) / (zn * PER[zu]);
  else if (unit === "adet" && count) part = n / count;
  else if (unit === "adet" && piece && PER[zu]) part = (n * piece) / (zn * PER[zu]);
  else if (unit && unit === zu) part = n / zn; // "yarım demet" / "demet"
  return part > 0 ? Math.round(part * 1000) / 1000 : null;
}
export function partOf(amount = "", product, k = 1) {
  const part = rawPart(amount, product, k);
  return part && part < 0.9 ? part : null;
}

// Menünün satırları, kişi sayısına göre: [{ item, product|null, qty (paket), amount (ölçekli tarif miktarı), part (ölçü; yoksa null) }]
// pick: { [malzeme adı]: ürün } seçilen marka
export function menuRows(menu, list, people = menu.serves, pick = {}) {
  const k = people / (menu.serves || people || 1);
  return menu.items.map((item) => {
    const product = pick[item.name] || findProduct(list, item.name);
    const raw = rawPart(item.amount, product, k);
    // Paket sayısı: miktar paketle ölçülebiliyorsa ondan (6 patlıcan = 1,5 kg → 2 paket), yoksa menüdeki paket sayısı × kişi oranı
    const qty = Math.max(1, Math.ceil((raw || (item.qty || 1) * k) - 1e-9));
    return { item, product, qty, amount: scaleAmount(item.amount, k), part: raw && raw < 0.9 ? raw : null };
  });
}
// Satır ölçüyle mi alınır: ölçü hesaplanabiliyorsa ve "Paket" seçilmediyse (how: { [malzeme adı]: "paket" | "olcu" })
export const byMeasure = (r, how = {}) => !!r.part && how[r.item.name] !== "paket";
// Satırın fiyatı ve stokta yeterli mi
export const rowPrice = (r, how = {}) => (!r.product ? 0 : byMeasure(r, how) ? partPrice(r.product, r.part) : r.product.price * r.qty);
export const rowOk = (r, how = {}) => !!r.product && free(r.product) >= (byMeasure(r, how) ? r.part : 1);

// Sepete eklenecekler: seçili ve bulunan satırlar (sepettekiyle birleşir). skip: { [malzeme adı]: true } (evde var)
export function menuToCart(cart, rows, skip = {}, how = {}) {
  let next = [...cart];
  for (const r of rows) {
    if (skip[r.item.name] || !rowOk(r, how)) continue;
    next = byMeasure(r, how) ? bump(next, r.product, 1, { part: r.part, amount: r.amount }) : bump(next, r.product, Math.min(r.qty, Math.floor(free(r.product))));
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
