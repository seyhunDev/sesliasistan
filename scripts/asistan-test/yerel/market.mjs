// Velora'da kalan market parçası (src/market): ana sayfadaki açık market siparişi kartı ve iptali. Market alışverişi, yönetimi ve
// hazır menüler 2026-10-25'ten beri Velora Sanal'da (depo velora-sanal, kendi testleri orada).
import { existsSync } from "node:fs";
import { isOpenOrder, packOf, lineKey, packsOf, cartCount, deliverFor, releaseFor, stockStep, tl } from "@/market/catalog";
import { suite } from "./ortak.mjs";

const { group } = suite("market");
const un = { id: "un-1-kg", name: "Un", size: "1 kg", brand: "Söke", price: 32, stock: 50, held: 1.045 };
const paket = { id: un.id, name: "Un", size: "1 kg", brand: "Söke", qty: 1, price: 32, total: 32 };
const olcu = { id: un.id, name: "Un", size: "3 yemek kaşığı", brand: "Söke", part: 0.045, qty: 1, price: 2, total: 2 };
const gone = (p) => !existsSync(new URL(`../../../src/${p}`, import.meta.url));

group("Market siparişi (ana sayfa kartı)")([
  ["açık sipariş", { desc: "gönderildi/hazırlanıyor/yolda açık; teslim ve iptal değil", fn: () => ["sent", "preparing", "onTheWay", "delivered", "cancelled"].map((s) => isOpenOrder({ status: s })).join(), ok: (g) => g === "true,true,true,false,false" }],
  ["satır yazısı", { desc: "\"Söke · 1 kg\", ölçü \"Söke · 3 yemek kaşığı\"", fn: () => [packOf(paket), packOf(olcu)].join("|"), ok: (g) => g === "Söke · 1 kg|Söke · 3 yemek kaşığı" }],
  ["paket ve ölçü ayrı satır", { desc: "lineKey farklı; 3 ürün", fn: () => [lineKey(paket), lineKey(olcu), cartCount([paket, { ...olcu, qty: 2 }])].join(), ok: (g) => g === "un-1-kg,un-1-kg~0.045,3" }],
  ["iptalde bekleyen açılır", { desc: "paket 1 + ölçü 0,045 bekliyordu → 0", fn: () => releaseFor({ [un.id]: un }, [paket, olcu])[un.id].held, ok: (g) => g === 0 }],
  ["teslimde stoktan düşer", { desc: "50 − 1,045 = 48,955", fn: () => deliverFor({ [un.id]: un }, [paket, olcu])[un.id].stock, ok: (g) => g === 48.955 }],
  ["silinmiş ürün atlanır", { desc: "katalogda yoksa dokunulmaz", fn: () => Object.keys(releaseFor({}, [paket])).length, ok: (g) => g === 0 }],
  ["durum geçişleri", { desc: "teslim → düş, iptal → aç, yolda → yok, teslimden sonra → yok", fn: () => [stockStep("onTheWay", "delivered"), stockStep("sent", "cancelled"), stockStep("sent", "onTheWay"), stockStep("delivered", "cancelled"), packsOf({ part: 0.045, qty: 2 })].join(), ok: (g) => g === "deliver,release,,,0.09" }],
  ["tutar", { desc: "₺1.234", fn: () => tl(1234.4), ok: (g) => g === "₺1.234" }],
  ["eski market ekranları Velora'da yok", { desc: "yönetim, menüler, sepet, sesli market, /api/market-menu Velora Sanal'da", fn: () => ["market/sample.js", "market/menus.js", "market/voice.js", "market/ai.js", "market/ui/MarketAdmin.jsx", "market/ui/MenuView.jsx", "app/api/market-menu/route.js", "app/(app)/market", "features/assistant/isler/market.js"].filter((p) => !gone(p)), ok: (g) => g.length === 0 }],
]);
