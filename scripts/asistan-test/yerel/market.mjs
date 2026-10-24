// Velora Market (src/market): örnek ürünler, arama, sepet, stok (bekleyen, teslim, iptal).
import { SAMPLE_PRODUCTS, AISLES } from "@/market/sample";
import { search, bump, cartTotal, cartCount, free, holdFor, deliverFor, releaseFor, stockStep, linesText, makeLine, newId, productProblem, NEXT, packOf, upgradeKatalog, KATALOG_V, lineKey } from "@/market/catalog";
import { SAMPLE_MENUS, findProduct, menuRows, menuToCart, missingOf, addRequests, parseIngredient, cleanMenu, itemLine, alternatives, partOf, rowPrice, byMeasure, scaleAmount, dur, minutesOf, withRecipe, parseStep, stepLine } from "@/market/menus";
import { marketAsk, findSpoken } from "@/market/voice";
import { suite } from "./ortak.mjs";

const { group } = suite("market");
const MAP = Object.fromEntries(SAMPLE_PRODUCTS.map((p) => [p.id, p]));
const byName = (n, size) => SAMPLE_PRODUCTS.find((p) => p.name === n && (!size || p.size === size));
const sut = byName("Süt"), kiyma = byName("Dana kıyma"), hcs = byName("Hindistan cevizi sütü");

group("Örnek ürünler")([
  ["en az 120 ürün, 8 reyon", { desc: "her reyonda ürün var", fn: () => [SAMPLE_PRODUCTS.length, AISLES.filter(([k]) => SAMPLE_PRODUCTS.some((p) => p.cat === k)).length], ok: (g) => g[0] >= 120 && g[1] === 8 }],
  ["kimlikler tek", { desc: "aynı id yok", fn: () => SAMPLE_PRODUCTS.length - new Set(SAMPLE_PRODUCTS.map((p) => p.id)).size, ok: (g) => g === 0 }],
  ["fiyat ve boyut var", { desc: "fiyat > 0, boyut dolu", fn: () => SAMPLE_PRODUCTS.filter((p) => !(p.price > 0) || !p.size).length, ok: (g) => g === 0 }],
]);

group("Arama")([
  ["kiyma", { desc: "şapkasız yazınca Dana kıyma", fn: (s) => search(SAMPLE_PRODUCTS, s).map((p) => p.name), ok: (g) => g[0] === "Dana kıyma" }],
  ["SÜT", { desc: "Süt başta, Hindistan cevizi sütü de bulunur", fn: (s) => search(SAMPLE_PRODUCTS, s).map((p) => p.name), ok: (g) => g[0] === "Süt" && g.includes("Hindistan cevizi sütü") }],
  ["su 5", { desc: "iki kelime: Su 5 L başta, Su 0,5 L yok", fn: (s) => search(SAMPLE_PRODUCTS, s).map((p) => p.id), ok: (g) => g[0] === byName("Su", "5 L").id && !g.includes(byName("Su", "0,5 L").id) }],
  ["muskat", { desc: "yok", fn: (s) => search(SAMPLE_PRODUCTS, s).length, ok: (g) => g === 0 }],
]);

group("Sepet")([
  ["süt ekle, bir daha ekle, kıyma ekle", { desc: "2 süt + 1 kıyma = 409 ₺, 3 ürün", fn: () => { let l = bump([], sut, 1); l = bump(l, sut, 1); l = bump(l, kiyma, 1); return [cartTotal(l), cartCount(l), linesText(l)]; }, ok: (g) => g[0] === 409 && g[1] === 3 && g[2] === "Süt ×2, Dana kıyma" }],
  ["tek sütü azalt", { desc: "satır çıkar", fn: () => bump(bump([], sut, 1), sut, -1).length, ok: (g) => g === 0 }],
]);

const order = [makeLine(sut, 2), makeLine(kiyma, 1)];
const held = holdFor(MAP, order);
group("Stok")([
  ["sipariş verilince bekleyen", { desc: "süt stok aynı, bekleyen 2, satılabilir 58", fn: () => held.products[sut.id], ok: (g) => g.stock === 60 && g.held === 2 && free(g) === 58 }],
  ["teslim edilince düşer", { desc: "süt stok 58, bekleyen 0", fn: () => deliverFor(held.products, order)[sut.id], ok: (g) => g.stock === 58 && g.held === 0 }],
  ["iptal edilince açılır", { desc: "süt stok 60, bekleyen 0", fn: () => releaseFor(held.products, order)[sut.id], ok: (g) => g.stock === 60 && g.held === 0 }],
  ["yetmeyen ürün", { desc: "kıyma 31 adet → \"30 kaldı\", hiçbir şey ayrılmaz", fn: () => holdFor(MAP, [makeLine(kiyma, 31)]), ok: (g) => g.short?.[0] === "Dana kıyma: 30 kaldı" && !g.products }],
  ["tükenen ürün", { desc: "Hindistan cevizi sütü stok 0", fn: () => holdFor(MAP, [makeLine(hcs, 1)]).short?.[0], ok: (g) => g === "Hindistan cevizi sütü: tükendi" }],
  ["fiyat katalogdan", { desc: "sepette eski fiyat 30 → katalogdaki 42", fn: () => holdFor(MAP, [{ ...makeLine(sut, 1), price: 30, total: 30 }]).total, ok: (g) => g === 42 }],
  ["durum geçişleri", { desc: "teslim → düş, iptal → aç, yolda → yok, teslimden sonra → yok", fn: () => [stockStep("onTheWay", "delivered"), stockStep("sent", "cancelled"), stockStep("sent", "onTheWay"), stockStep("delivered", "cancelled")], ok: (g) => g.join() === "deliver,release,," }],
]);

group("Yönetim")([
  ["yeni ürün kimliği", { desc: "\"Süt 1 L\" var → sut-1-l-2; \"Muskat 50 g\" → muskat-50-g", fn: () => [newId(MAP, "Süt", "1 L"), newId(MAP, "Muskat", "50 g")], ok: (g) => g[0] === "sut-1-l-2" && g[1] === "muskat-50-g" }],
  ["form denetimi", { desc: "ad yok → \"Ad yaz\", fiyat yok → \"Fiyat yaz\", tamam → \"\"", fn: () => [productProblem({ name: "", price: 5, stock: 1 }), productProblem({ name: "Muskat", price: "", stock: 1 }), productProblem({ name: "Muskat", price: "45", stock: "10" })], ok: (g) => g.join("|") === "Ad yaz|Fiyat yaz|" }],
  ["sipariş adımları", { desc: "Gönderildi › Hazırla › Yola çıkar › Teslim edildi", fn: () => [NEXT.sent[1], NEXT.preparing[1], NEXT.onTheWay[1], NEXT.delivered], ok: (g) => g[0] === "Hazırla" && g[1] === "Yola çıkar" && g[2] === "Teslim edildi" && !g[3] }],
]);

const LIST = SAMPLE_PRODUCTS;
const laz = SAMPLE_MENUS.find((x) => x.id === "lazanya");
group("Hazır menüler")([
  ["6 örnek menü, kimlikler tek", { desc: "Lazanya dahil", fn: () => [SAMPLE_MENUS.length, new Set(SAMPLE_MENUS.map((x) => x.id)).size, !!laz], ok: (g) => g[0] === 6 && g[1] === 6 && g[2] }],
  ["Lazanya malzemeleri markette", { desc: "9 malzemeden 8'i bulunur, Muskat bulunamadı", fn: () => missingOf(menuRows(laz, LIST)), ok: (g) => g.length === 1 && g[0] === "Muskat" }],
  ["örnek menülerde bulunamayan", { desc: "yalnız Muskat ve Fesleğen", fn: () => SAMPLE_MENUS.flatMap((x) => missingOf(menuRows(x, LIST))), ok: (g) => g.sort().join() === "Fesleğen,Muskat" }],
  ["soğan", { desc: "Kuru soğan", fn: (s) => findProduct(LIST, s)?.name, ok: (g) => g === "Kuru soğan" }],
  ["Limon", { desc: "Limon (Limon sosu değil)", fn: (s) => findProduct(LIST, s)?.name, ok: (g) => g === "Limon" }],
  ["8 kişilik lazanya", { desc: "yaprak 2 paket", fn: () => menuRows(laz, LIST, 8).find((r) => r.item.name === "Lazanya yaprağı").qty, ok: (g) => g === 2 }],
  ["sepete ekle (tereyağı evde var)", { desc: "7 ürün; sepetteki süt 1 + 1 = 2", fn: () => { const c = menuToCart([makeLine(sut, 1)], menuRows(laz, LIST), { Tereyağı: true }); return [c.length, c.find((l) => l.id === sut.id).qty, c.some((l) => l.name === "Tereyağı")]; }, ok: (g) => g[0] === 7 && g[1] === 2 && !g[2] }],
  ["istekler", { desc: "Muskat iki menüden: 2 kez, iki menü adı", fn: () => addRequests(addRequests({}, ["Muskat"], "Lazanya"), ["muskat"], "Beşamel"), ok: (g) => g.muskat?.count === 2 && g.muskat.from.join() === "Lazanya,Beşamel" }],
]);

group("Malzeme satırı")([
  ["500 g dana kıyma", { desc: "Dana kıyma · 500 g", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Dana kıyma" && g.amount === "500 g" && g.qty === 1 }],
  ["2 adet patlıcan", { desc: "Patlıcan · 2 adet, 1 paket", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Patlıcan" && g.amount === "2 adet" && g.qty === 1 }],
  ["2 paket lazanya yaprağı", { desc: "2 paket", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Lazanya yaprağı" && g.qty === 2 }],
  ["- 1,5 su bardağı kırmızı mercimek", { desc: "madde imi atılır", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Kırmızı mercimek" && g.amount === "1,5 su bardağı" }],
  ["3. Muskat", { desc: "numara atılır", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Muskat" && g.amount === "" }],
  ["Süt - 1 L", { desc: "ad · miktar", fn: (s) => parseIngredient(s), ok: (g) => g.name === "Süt" && g.amount === "1 L" }],
]);

const MA = (s) => marketAsk(s);
group("Sesle market")([
  ["Lazanya malzemelerini sepete ekle", { desc: "menü: lazanya", fn: MA, ok: (g) => g?.op === "menu" && g.id === "lazanya" }],
  ["bu akşam karnıyarık yapacağım malzemeleri al", { desc: "menü: karnıyarık", fn: MA, ok: (g) => g?.op === "menu" && g.id === "karniyarik" }],
  ["lazanya söyle", { desc: "yemek siparişi, market değil", fn: MA, ok: (g) => g === null }],
  ["marketten 2 süt ve ekmek al", { desc: "süt ×2, ekmek", fn: MA, ok: (g) => g?.op === "add" && g.items.map((i) => `${i.name}:${i.qty}`).join() === "süt:2,ekmek:1" }],
  ["market sepetine kıymayı, iki domates ve muskat ekle", { desc: "3 ürün", fn: MA, ok: (g) => g?.items.map((i) => `${i.name}:${i.qty}`).join() === "kıymayı:1,domates:2,muskat:1" }],
  ["listeye süt ekle", { desc: "alışveriş listesi", fn: MA, ok: (g) => g === null }],
  ["markete gidiyorum", { desc: "iş yok", fn: MA, ok: (g) => g === null }],
  ["sütü / ekmeği / kıymayı", { desc: "Süt, Ekmek, Dana kıyma", fn: () => ["sütü", "ekmeği", "kıymayı"].map((n) => findSpoken(LIST, n)?.name).join(), ok: (g) => g === "Süt,Ekmek,Dana kıyma" }],
  ["muskat", { desc: "bulunamaz", fn: (s) => findSpoken(LIST, s), ok: (g) => g === null }],
]);

group("Yapay zekayla menü (cevap temizliği)")([
  ["boş ve tekrar eden malzeme atılır", { desc: "2 malzeme, kişi 4, paket 1-20", fn: () => cleanMenu({ name: "karnıyarık", serves: 0, items: [{ name: "patlıcan", amount: "6 adet", packs: 0 }, { name: "Patlıcan", amount: "", packs: 1 }, { name: "", amount: "1" }, { name: "Dana kıyma", amount: "300 g", packs: 99 }] }), ok: (g) => g.name === "Karnıyarık" && g.serves === 4 && g.items.length === 2 && g.items[0].qty === 1 && g.items[1].qty === 20 }],
  ["forma satır, geri okunur", { desc: "\"300 g Dana kıyma\", \"Fesleğen - birkaç yaprak\", \"2 paket Spagetti\"", fn: () => [{ name: "Dana kıyma", amount: "300 g", qty: 1 }, { name: "Fesleğen", amount: "birkaç yaprak", qty: 1 }, { name: "Spagetti", amount: "", qty: 2 }].map((i) => { const l = itemLine(i); const p = parseIngredient(l); return `${l}=${p.name}/${p.amount}/${p.qty}`; }).join("|"), ok: (g) => g === "300 g Dana kıyma=Dana kıyma/300 g/1|Fesleğen - birkaç yaprak=Fesleğen/birkaç yaprak/1|2 paket Spagetti=Spagetti/2 paket/2" }],
]);

const un = findProduct(LIST, "Un");
const rowOf = (menu, name, n, pick) => menuRows(menu, LIST, n, pick).find((r) => r.item.name === name);
group("Marka, ölçü / paket ve tarif")([
  ["Un: varsayılan marka", { desc: "Söke 1 kg; satırda \"Söke · 1 kg\"", fn: () => [un.brand, packOf(un)], ok: (g) => g[0] === "Söke" && g[1] === "Söke · 1 kg" }],
  ["Un markaları", { desc: "Sinangil, Söke, Bağdat (ucuzdan pahalıya)", fn: () => alternatives(LIST, un).map((p) => p.brand).join(), ok: (g) => g === "Sinangil,Söke,Bağdat" }],
  ["varsayılan tükenince", { desc: "Söke stok 0 → stokta olan başka marka", fn: () => findProduct(LIST.map((p) => (p.id === un.id ? { ...p, stock: 0 } : p)), "Un")?.brand, ok: (g) => g && g !== "Söke" }],
  ["söke un", { desc: "markayla arama", fn: (s) => search(LIST, s).map((p) => p.brand), ok: (g) => g.length === 1 && g[0] === "Söke" }],
  ["sepet satırında marka", { desc: "makeLine brand taşır", fn: () => makeLine(un, 1).brand, ok: (g) => g === "Söke" }],
  ["ölçü hesabı", { desc: "3 yemek kaşığı / 1 kg un = 0,045; 2 adet soğan / 1 kg = 0,3; yarım demet = 0,5; 8 yumurta / 10'lu = 0,8; 500 g / 500 g = yok", fn: () => [partOf("3 yemek kaşığı", un), partOf("2 adet", findProduct(LIST, "Kuru soğan")), partOf("yarım demet", findProduct(LIST, "Maydanoz")), partOf("8 adet", findProduct(LIST, "Yumurta")), partOf("500 g", findProduct(LIST, "Dana kıyma"))].join("|"), ok: (g) => g === "0.045|0.3|0.5|0.8|" }],
  ["lazanya unu: ölçü önde", { desc: "ölçü ₺2 (en az), Paket seçilince ₺32", fn: () => { const r = rowOf(laz, "Un"); return [byMeasure(r), rowPrice(r), rowPrice(r, { Un: "paket" })]; }, ok: (g) => g[0] && g[1] === 2 && g[2] === 32 }],
  ["marka ölçüde de geçer", { desc: "Sinangil seçilince ölçü satırı Sinangil", fn: () => { const sin = alternatives(LIST, un)[0]; const c = menuToCart([], [rowOf(laz, "Un", 4, { Un: sin })]); return [c[0].brand, c[0].size, c[0].part]; }, ok: (g) => g[0] === "Sinangil" && g[1] === "3 yemek kaşığı" && g[2] === 0.045 }],
  ["2 kişilik ölçü", { desc: "kıyma 250 g → 0,5 paket ₺163; un 1,5 yemek kaşığı", fn: () => { const k = rowOf(laz, "Dana kıyma", 2), u = rowOf(laz, "Un", 2); return [k.part, rowPrice(k), u.amount]; }, ok: (g) => g[0] === 0.5 && g[1] === 163 && g[2] === "1,5 yemek kaşığı" }],
  ["paket ve ölçü ayrı satır", { desc: "aynı unun paketi ve ölçüsü sepette iki satır", fn: () => { let c = bump([], un, 1); c = menuToCart(c, [rowOf(laz, "Un")]); return c.map(lineKey).join(); }, ok: (g) => g === "un-1-kg,un-1-kg~0.045" }],
  ["ölçünün stoğu", { desc: "un ölçüsü 0,045 paket bekler, teslimde stok 49,955", fn: () => { const h = holdFor(MAP, menuToCart([], [rowOf(laz, "Un")])); return [h.products[un.id].held, deliverFor(h.products, h.lines)[un.id].stock]; }, ok: (g) => g[0] === 0.045 && g[1] === 49.955 }],
  ["6 patlıcan", { desc: "1,5 kg → 2 paket (ölçü yok)", fn: () => { const r = rowOf(SAMPLE_MENUS.find((x) => x.id === "karniyarik"), "Patlıcan"); return [r.part, r.qty]; }, ok: (g) => g[0] === null && g[1] === 2 }],
  ["eski katalog yükseltilir", { desc: "v yok: markalar eklenir, fiyat korunur, bekleyeni olmayan set silinir; v güncel: dokunulmaz", fn: () => { const old = { [un.id]: { id: un.id, name: "Un", size: "1 kg", cat: "temel", price: 50, stock: 3, held: 1 }, "set-lazanya-4": { id: "set-lazanya-4", cat: "set", held: 0 } }; const up = upgradeKatalog(old, 2, MAP); return [up[un.id].price, up[un.id].brand, !!up["set-lazanya-4"], Object.keys(upgradeKatalog(old, KATALOG_V, MAP)).length]; }, ok: (g) => g[0] === 50 && g[1] === "Söke" && !g[2] && g[3] === 2 }],
  ["örnek tarifler", { desc: "her menüde adım var; Lazanya 1 sa 10 dk", fn: () => [SAMPLE_MENUS.every((x) => x.steps.length >= 3), dur(minutesOf(laz))], ok: (g) => g[0] && g[1] === "1 sa 10 dk" }],
  ["eski kayıtlı menüye tarif", { desc: "steps yoksa örnekten; kendi menüsüne dokunulmaz", fn: () => [withRecipe({ id: "lazanya", name: "Lazanya", items: [] }).steps?.length, withRecipe({ id: "benim", name: "X", items: [] }).steps], ok: (g) => g[0] === 6 && g[1] === undefined }],
  ["tarif satırı", { desc: "\"2. Soğanı kavur. (5 dk)\" ↔ { text, min }", fn: () => { const st = parseStep("2. Soğanı kavur. (5 dk)"); return [st.text, st.min, stepLine(st)].join("|"); }, ok: (g) => g === "Soğanı kavur.|5|Soğanı kavur. (5 dk)" }],
  ["yapay zeka tarifi", { desc: "boş adım atılır, süre adımlardan", fn: () => cleanMenu({ name: "x", items: [{ name: "Un", amount: "1", packs: 1 }], steps: [{ text: "Karıştır", min: 5 }, { text: " ", min: 3 }, { text: "Pişir", min: 20 }] }), ok: (g) => g.steps.length === 2 && g.minutes === 25 }],
]);
