// Velora Market (src/market): örnek ürünler, arama, sepet, stok (bekleyen, teslim, iptal).
import { SAMPLE_PRODUCTS, AISLES } from "@/market/sample";
import { search, bump, cartTotal, cartCount, free, holdFor, deliverFor, releaseFor, stockStep, linesText, makeLine } from "@/market/catalog";
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
