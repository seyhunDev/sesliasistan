// Sesle market (Seyhun 2026-10-24; ana hesap): menünün malzemeleri ya da söylenen ürünler market sepetine eklenir,
// Alışveriş › Market sepeti açık gelir. Sipariş sesle verilmez (para; "Siparişi ver" kullanıcıda).
// Markette olmayanlar söylenir ve yönetimin İstekler listesine yazılır. Karar src/market/voice.js.
import { marketAsk, findSpoken } from "@/market/voice";
import { menuRows, menuToCart, missingOf } from "@/market/menus";
import { bump, free } from "@/market/catalog";
import { loadMarket, noteMissing, readCart, writeCart } from "@/market/store";

const listText = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} ve ${a.at(-1)}` : a[0] || "");

export async function marketCmd(ctx, s, viaVoice, ask = null) {
  const { owner, isStaff, profile, reply, leave, router, showPage } = ctx;
  if (!owner || isStaff || !profile?.orgId) return undefined;
  const { products, menus } = await loadMarket(profile.orgId);
  const a = ask?.op === "menu" ? { ...ask, menu: menus.find((m) => m.id === ask.id) } : ask || marketAsk(s, menus);
  if (!a) return undefined;
  const list = Object.values(products);
  let cart = readCart(), added = 0, missing = [], from = "";
  if (a.op === "menu") {
    const menu = a.menu || menus.find((m) => m.id === a.id);
    if (!menu) return reply(`${a.name} menüsü bulunamadı.`, { engine: "local" }, viaVoice), true;
    const rows = menuRows(menu, list);
    cart = menuToCart(cart, rows);
    added = rows.filter((r) => r.product && free(r.product) > 0).length;
    missing = missingOf(rows);
    from = menu.name;
  } else {
    for (const it of a.items) {
      const p = findSpoken(list, it.name);
      if (!p || free(p) <= 0) missing.push(p ? `${p.name} (tükendi)` : it.name);
      else {
        cart = bump(cart, p, Math.min(it.qty, free(p)));
        added++;
      }
    }
  }
  if (added) writeCart(cart);
  const lost = missing.filter((x) => !x.endsWith("(tükendi)"));
  if (lost.length) noteMissing(profile.orgId, lost, from).catch(() => {});
  const miss = missing.length ? ` ${listText(missing.map((x) => x.replace(/^\p{L}/u, (c) => c.toLocaleUpperCase("tr"))))} markette yok.` : "";
  if (!added) return reply(`Ürün bulunamadı.${miss}`, { engine: "local" }, viaVoice), true;
  router.push("/shopping?tab=market&sepet=1");
  leave(`${from ? `${from} için ` : ""}${added} ürün sepete eklendi.${miss}`, viaVoice);
  showPage();
  return true;
}
