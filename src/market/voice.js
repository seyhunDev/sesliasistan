// Sesle market (Seyhun 2026-10-24, ana hesap; isler/market.js yürütür):
//   "Lazanya malzemelerini sepete ekle", "bu akşam karnıyarık yapacağım, malzemeleri al" → menünün malzemeleri market sepetine
//   "marketten 2 süt ve ekmek al", "market sepetine kıyma ekle" → ürünler market sepetine
// Sipariş sesle verilmez (para): sepet açılır, "Siparişi ver" kullanıcıda. Markette olmayanlar söylenir ve İstekler'e gider.
// "lazanya söyle" yemek siparişidir (restoran), "listeye süt ekle" alışveriş listesidir; buraya gelmez.
import { SAMPLE_MENUS } from "./menus";
import { search } from "./catalog";

const lower = (s = "") => s.toLocaleLowerCase("tr");
const fold = (s = "") => lower(s).replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]);
// Türkçe kelime sınırı (\b Türkçe harflerde çalışmaz)
const W = (re) => new RegExp(`(?<![\\p{L}])(?:${re})(?![\\p{L}])`, "u");
const WG = (re) => new RegExp(`(?<![\\p{L}])(?:${re})(?![\\p{L}])`, "gu");
const NUM = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
const MARKET = "market\\p{L}*";
const ACT = "ekle\\p{L}*|al|alsana|alalım|alır mısın|sipariş\\p{L}*|sepet\\p{L}*|getir\\p{L}*";
const FILL = `${MARKET}|sepet\\p{L}*|sipariş\\p{L}*|ver\\p{L}*|ekle\\p{L}*|alsana|alalım|alır mısın|al|getir\\p{L}*|bana|için|lütfen|biraz|da|de|ayrıca`;

// menus: hazır menüler (yoksa örnekler). Dönen: { op: "menu", id, name } | { op: "add", items: [{ name, qty }] } | null
export function marketAsk(s = "", menus = SAMPLE_MENUS) {
  const t = lower(s).replace(/[.!?]+/g, " ").replace(/\s+/g, " ").trim();
  const market = W(MARKET).test(t);
  const menu = [...menus].sort((a, b) => b.name.length - a.name.length).find((m) => fold(t).includes(fold(m.name)));
  const forMenu = /(?<![\p{L}])malzeme/u.test(t) || market || W("yapaca\\p{L}*|yapalım|yapmak|pişirece\\p{L}*").test(t);
  // Menü: adı geçiyor ve malzeme / yapacağım / market deniyor ("lazanya söyle" restorandan yemek siparişidir)
  if (menu && forMenu) return { op: "menu", id: menu.id, name: menu.name };
  // Ürünler: "market" geçmeli ve ekle / al / sipariş / sepet
  if (!market || !W(ACT).test(t)) return null;
  const body = t.replace(WG(FILL), " ").replace(/\s+/g, " ").trim();
  const items = body
    .split(/\s*,\s*|\s+ve\s+|\s+ile\s+/u)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const m = /^(\d+|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)\s+(?:(?:adet|tane|paket|kutu|şişe)\s+)?(.+)$/u.exec(x);
      const qty = m ? Number(m[1]) || NUM[m[1]] : 1;
      return { name: m ? m[2] : x, qty: Math.max(1, Math.min(20, qty)) };
    })
    .filter((x) => x.name.length >= 2);
  return items.length ? { op: "add", items } : null;
}

// Söylenen ürün adı → katalogdaki ürün. Belirtme eki atılarak da denenir ("sütü" → Süt, "ekmeği" → Ekmek, "kıymayı" → Dana kıyma):
// önce adı tam tutan, yoksa aramada ilk çıkan
export function findSpoken(list, name) {
  const n = lower(name).trim();
  const bare = n.replace(/(?<=\p{L}{2})(y?[ıiuü]|n[ıiuü])$/u, "");
  const forms = [...new Set([n, bare, bare.replace(/ğ$/u, "k"), bare.replace(/b$/u, "p").replace(/c$/u, "ç").replace(/d$/u, "t")])].filter((x) => x.length >= 2);
  const same = (p, f) => fold(p.name) === fold(f);
  for (const f of forms) {
    const p = list.find((x) => same(x, f));
    if (p) return p;
  }
  for (const f of forms) {
    const p = search(list, f)[0];
    if (p) return p;
  }
  return null;
}
