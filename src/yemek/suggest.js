// Yemek önerisi: söylenen cümle → istek (parseAsk), geçmiş + puanlar → her ürüne puan (RULES), en iyi birkaçı + tek kısa neden.
// Yeni bir davranış eklemek için RULES'a bir kural yazılır: (aday, bağlam) → { puan, neden? }.
// Yapay zeka (sonraki adım) bu listenin ilk ~20 ürününden seçer; burası hızlı, ücretsiz ve çevrimdışı çalışır.
import { isOpenAt, unitPrice, defaultPicks } from "./order";
import { distanceKm } from "./address";
import { travelMin } from "./order";

const low = (s) => (s || "").toLocaleLowerCase("tr");
const DAY = 86400000;

// Mutfak sözleri (cümlede geçen kelime → katalogdaki mutfak adı)
const CUISINE_WORDS = [
  [/pizza|pizzac/, "pizza"],
  [/hamburger|burger|smash/, "burger"],
  [/su[sş]i|sushi|uzak ?do[gğ]u|noodle/, "sushi"],
  [/d[oö]ner|d[uü]r[uü]m|iskender/, "döner"],
  [/kebap|kebab|adana|urfa|lahmacun/, "kebap"],
  [/bal[ıi]k|levrek|[çc]upra|somon|deniz [uü]r[uü]n|kalamar|karides|midye/, "balık"],
  [/ev yeme[gğ]|sulu yemek|esnaf|lokanta|tencere/, "ev yemeği"],
  [/[çc]orba/, "çorba"],
  [/tatl[ıi]|dondurma|baklava|cheesecake|k[uü]nefe|s[uü]tla[çc]/, "tatlı"],
  [/kahvalt[ıi]|menemen|tost/, "kahvaltı"],
  [/makarna|penne|fettuccine|spagetti/, "makarna"],
];
const NUM = { bir: 1, iki: 2, "üç": 3, uc: 3, "dört": 4, dort: 4, "beş": 5, bes: 5, "altı": 6 };

// Cümle → istek. places verilirse restoran ve yemek adı da aranır.
export function parseAsk(text, places = []) {
  const t = low(text);
  const ask = { text: text || "" };
  for (const [re, c] of CUISINE_WORDS) if (re.test(t)) { ask.cuisine = c; break; }
  if (/d[uü]n(k[uü])?/.test(t)) ask.repeat = "yesterday";
  else if (/ge[çc]en hafta/.test(t)) ask.repeat = "week";
  else if (/ge[çc]en(ki)?|son s[oö]yled|son sipari|ayn[ıi]s[ıi]|her zamanki|bildi[gğ]im/.test(t)) ask.repeat = "last";
  if (/uygun|ucuz|hesapl[ıi]|ekonomik|b[uü]t[çc]e|pahal[ıi] olmas/.test(t)) ask.cheap = true;
  if (/hafif|diyet|az kalori|sa[gğ]l[ıi]kl[ıi]/.test(t)) ask.light = true;
  if (/doyurucu|[çc]ok a[çc][ıi]m|kurt gibi|kar[ıi]n doyur/.test(t)) ask.filling = true;
  if (/vejetaryen|etsiz|vegan/.test(t)) ask.veg = true;
  if (/ac[ıi]s[ıi]z|ac[ıi] olmas[ıi]n|ac[ıi] istemiyorum/.test(t)) ask.noSpicy = true;
  else if (/ac[ıi]l[ıi]/.test(t)) ask.spicy = true;
  if (/h[ıi]zl[ıi]|[çc]abuk|acele|hemen gel/.test(t)) ask.fast = true;
  if (/yeni bir|farkl[ıi]|denemedi[gğ]im|hi[çc] yemedi[gğ]im|de[gğ]i[sş]iklik/.test(t)) ask.novel = true;
  const ppl = /(\d+|bir|iki|üç|uc|dört|dort|beş|bes|altı) ki[sş]i/.exec(t);
  if (ppl) ask.people = Number(ppl[1]) || NUM[ppl[1]] || 1;
  // Restoran adı: tam ad ya da ilk kelime; ilk kelime mutfak ya da yer adıysa ("Pizza Rüzgar", "Burger Koy", "Dikili …") sayılmaz
  const common = new Set(["dikili", ...places.flatMap((p) => (p.cuisines || []).map(low))]);
  for (const p of places) {
    const n = low(p.name);
    const first = n.split(" ")[0];
    if (t.includes(n) || (first.length > 3 && !common.has(first) && new RegExp(`(^|\\s)${first}`, "u").test(t))) { ask.placeId = p.id; break; }
  }
  for (const p of places) for (const c of p.menu || []) for (const it of c.items) {
    const n = low(it.name).replace(/\s*\(.*\)$/, "");
    if (n.length > 3 && t.includes(n) && !(it.tags || []).includes("içecek")) { ask.dish = n; break; }
  }
  return ask;
}

// Geçmişten özet: ürün başına kaç kez, ortalama puan, son tarih; mutfak başına son tarih. Bir kez hesaplanır.
// history: [{ placeId, cuisines, lines:[{itemId}], at, rating, review }]
export function tasteOf(history = []) {
  const items = {}, places = {}, cuisines = {};
  for (const o of history) {
    if (o.status === "cancelled") continue;
    const at = new Date(o.at || o.times?.sent || 0).getTime();
    const bad = /bir daha (alma|s[oö]yleme)|berbat|k[oö]t[uü]yd[uü]|be[gğ]enmedim/i.test(o.review || "");
    const pl = (places[o.placeId] ||= { n: 0, sum: 0, rated: 0, last: 0, bad: false });
    pl.n++; pl.last = Math.max(pl.last, at);
    if (o.rating) { pl.sum += o.rating; pl.rated++; }
    if (bad) pl.bad = true;
    for (const c of o.cuisines || []) cuisines[c] = Math.max(cuisines[c] || 0, at);
    for (const l of o.lines || []) {
      const it = (items[l.itemId] ||= { n: 0, sum: 0, rated: 0, last: 0, bad: false });
      it.n++; it.last = Math.max(it.last, at);
      if (o.rating) { it.sum += o.rating; it.rated++; }
      if (bad) it.bad = true;
    }
  }
  const avg = (x) => (x?.rated ? x.sum / x.rated : 0);
  return { items, places, cuisines, avg };
}

const isDrink = (it) => (it.tags || []).includes("içecek");
const isSweet = (it) => (it.tags || []).includes("tatlı");
const SIDE = /yan|meze|ba[sş]lang|i[çc]ecek/i;
const isSide = (c) => SIDE.test(c.cat?.name || "");
// Ürünün mutfağı: kategori kendi mutfağını taşıyorsa o (pizzacıda Makarnalar → makarna), yoksa restoranınki + çorba/tatlı etiketi
const cuisinesOf = (c) => (c.cat?.cuisine ? [c.cat.cuisine] : [...(c.place.cuisines || []), ...(c.item.tags || []).filter((t) => t === "çorba" || t === "tatlı")]);
const fmtPts = (n) => String(n).replace(".", ",");

// Kurallar: her biri { score, why } döner; why en yüksek artı puanlı kuraldan seçilir.
// c: { place, item, price, km, min }, x: { ask, taste, now }
export const RULES = [
  function asked(c, x) {
    const { ask } = x;
    if (ask.placeId && c.place.id !== ask.placeId) return { score: -100 };
    if (ask.cuisine) {
      const has = cuisinesOf(c).some((k) => k === ask.cuisine) || (ask.cuisine === "makarna" && /noodle/i.test(c.item.name));
      if (!has) return { score: -100 };
    }
    if (ask.dish) return low(c.item.name).includes(ask.dish) ? { score: 6 } : { score: -3 };
    // Yan ürün (patates, cacık, meze) ve tatlı tek başına önerilmez; mutfak söylendiyse hiç gelmez
    const extra = isSide(c) || (isSweet(c.item) && ask.cuisine !== "tatlı");
    if (extra) return { score: ask.cuisine && ask.cuisine !== "tatlı" ? -100 : -5 };
    return { score: ask.cuisine ? 2 : 0 };
  },
  function rules(c, x) {
    const tags = c.item.tags || [];
    const { ask } = x;
    if (ask.veg && !tags.includes("vejetaryen")) return { score: -100 };
    if (ask.noSpicy && tags.includes("acılı")) return { score: -100 };
    let s = 0, why;
    if (ask.spicy && tags.includes("acılı")) { s += 3; why = "Acılı"; }
    if (ask.light) { if (tags.includes("hafif")) { s += 3; why = "Hafif"; } if (tags.includes("doyurucu")) s -= 3; }
    if (ask.filling && tags.includes("doyurucu")) { s += 3; why = "Doyurucu"; }
    if (ask.people >= 2 && tags.includes("paylaşım")) { s += 3; why = `${ask.people} kişilik`; }
    return { score: s, why };
  },
  function myRating(c, x) {
    const { taste } = x;
    const it = taste.items[c.item.id], pl = taste.places[c.place.id];
    if (it?.bad || pl?.bad) return { score: -8 };
    const r = taste.avg(it) || taste.avg(pl);
    if (!r) return { score: 0 };
    return { score: (r - 3) * 1.6, why: r >= 4 ? `Puanın ★${fmtPts(Math.round(r))}` : undefined };
  },
  function often(c, x) {
    const n = x.taste.items[c.item.id]?.n || 0;
    return n >= 2 ? { score: Math.min(n, 5) * 0.5, why: "Sık söylüyorsun" } : { score: n * 0.3 };
  },
  function tired(c, x) {
    // Dün/bugün yediğin mutfak biraz geri (istenmediyse); uzun süredir yemediğin sevdiğin mutfak biraz öne
    if (x.ask.cuisine || x.ask.dish) return { score: 0 };
    let worst = 0, best = 0, why;
    for (const k of cuisinesOf(c)) {
      const last = x.taste.cuisines[k];
      if (!last) continue;
      const days = (x.now - last) / DAY;
      if (days < 1.5) worst = Math.min(worst, -2.5);
      else if (days >= 3 && days < 30 && (x.taste.avg(x.taste.places[c.place.id]) >= 4 || x.taste.items[c.item.id])) {
        best = 1; why = `${Math.floor(days)} gündür ${k} yemedin`;
      }
    }
    return { score: worst + best, why: worst ? undefined : why };
  },
  function novel(c, x) {
    const tried = x.taste.items[c.item.id] || x.taste.places[c.place.id];
    if (tried) return { score: x.ask.novel ? -3 : 0 };
    if (x.ask.novel) return { score: 3, why: `Hiç denemedin · puanı ${fmtPts(c.place.rating)}` };
    return c.place.rating >= 4.6 ? { score: 0.6, why: `Hiç denemedin · puanı ${fmtPts(c.place.rating)}` } : { score: 0 };
  },
  function placeRating(c) {
    return { score: ((c.place.rating || 4) - 4.2) * 2 + ((c.item.tags || []).includes("popüler") ? 1 : 0) };
  },
  function openNow(c, x) {
    return isOpenAt(c.place, new Date(x.now)) && !x.closed?.[c.place.id] ? { score: 0 } : { score: -100 };
  },
  function speed(c, x) {
    const s = -c.min / (x.ask.fast ? 8 : 30);
    return x.ask.fast && c.min <= 25 ? { score: s + 1, why: `Hızlı · ${c.min} dk` } : { score: s };
  },
  function price(c, x) {
    if (x.ask.cheap) return { score: -c.price / 25, why: `Uygun · ₺${c.price}` };
    return { score: -c.price / 800 };
  },
  function mealTime(c, x) {
    const h = new Date(x.now).getHours();
    const breakfast = cuisinesOf(c).includes("kahvaltı");
    if (breakfast && !x.ask.cuisine) return h >= 7 && h < 12 ? { score: 1.5, why: "Kahvaltı saati" } : { score: -3 };
    if (isSweet(c.item) && x.ask.cuisine !== "tatlı") return { score: -4 };
    return { score: 0 };
  },
];

// Bütün ürünler aday olur (içecekler hariç). pos: teslimat adresinin konumu (süre için).
export function candidates(places, pos) {
  const out = [];
  for (const place of places) {
    const km = pos && place.pos ? distanceKm(pos, place.pos) : 2;
    const min = (place.prepMin || 20) + travelMin(km);
    for (const cat of place.menu || []) for (const item of cat.items) {
      if (!item.available || isDrink(item)) continue;
      out.push({ place, item, cat, km, min, price: unitPrice(item, defaultPicks(item)) });
    }
  }
  return out;
}

// En iyi n öneri; aynı restorandan en çok bir (çeşit olsun diye). Her öneride: { place, item, price, min, score, why }
export function suggest({ places, history = [], ask = {}, now = Date.now(), pos, n = 3, taste, closed }) {
  const x = { ask, closed, taste: taste || tasteOf(history), now: typeof now === "number" ? now : new Date(now).getTime() };
  const scored = candidates(places, pos).map((c) => {
    let score = 0, why, top = 0;
    for (const rule of RULES) {
      const r = rule(c, x) || { score: 0 };
      score += r.score;
      if (r.why && r.score > top) { top = r.score; why = r.why; }
    }
    return { ...c, score, why: why || `${c.place.name} · ${c.min} dk` };
  }).filter((c) => c.score > -50).sort((a, b) => b.score - a.score);
  const seen = new Set(), out = [];
  for (const c of scored) {
    if (seen.has(c.place.id) && !ask.placeId) continue;
    seen.add(c.place.id);
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

// "Dünkünden / geçen haftaki / aynısı": isteğe uyan son sipariş (mutfak ya da restoran söylendiyse ona göre)
export function findRepeat(history = [], ask = {}, now = Date.now()) {
  const t = typeof now === "number" ? now : new Date(now).getTime();
  const start = new Date(t); start.setHours(0, 0, 0, 0);
  const from = ask.repeat === "yesterday" ? start.getTime() - DAY : ask.repeat === "week" ? start.getTime() - 7 * DAY : 0;
  const to = ask.repeat === "yesterday" ? start.getTime() : Infinity;
  return history
    .filter((o) => o.status !== "cancelled")
    .filter((o) => { const at = new Date(o.at || o.times?.sent).getTime(); return at >= from && at < to; })
    .filter((o) => !ask.placeId || o.placeId === ask.placeId)
    .filter((o) => !ask.cuisine || (o.cuisines || []).includes(ask.cuisine))
    .sort((a, b) => new Date(b.at || b.times?.sent) - new Date(a.at || a.times?.sent))[0] || null;
}

// Asistan ve "Bugün ne yiyelim?" düğmesi için tek giriş: cümle → { repeat?, picks, say }
export function answerFood({ text, places, history = [], now = Date.now(), pos, closed }) {
  const ask = parseAsk(text, places);
  const picks = suggest({ places, history, ask, now, pos, closed });
  const label = ask.cuisine || (ask.placeId && places.find((p) => p.id === ask.placeId)?.name) || "";
  if (ask.repeat) {
    const order = findRepeat(history, ask, now);
    if (order) {
      const what = order.lines.map((l) => l.name).join(", ");
      return { ask, repeat: order, picks, say: `${like(ask.repeat)} ${den(order.placeName)} ${what}. ₺${order.total}. Sepete koyayım mı?` };
    }
    if (!picks.length) return { ask, picks, say: `${when(ask.repeat)} ${label || "sipariş"} yoktu, uygun bir yer de bulamadım.` };
    const p = picks[0];
    return { ask, picks, say: `${when(ask.repeat)} ${label || "sipariş"} yoktu. ${den(p.place.name)} ${p.item.name} önereyim mi? ₺${p.price}.` };
  }
  if (!picks.length) return { ask, picks, say: label ? `Şu an açık ${label} yeri bulamadım.` : "Şu an açık bir yer bulamadım." };
  const p = picks[0];
  const more = picks.slice(1).map((c) => `${den(c.place.name)} ${c.item.name}`).join(" ya da ");
  return { ask, picks, say: `${den(p.place.name)} ${p.item.name}, ₺${p.price}. ${cap(p.why)}.${more ? ` Ya da ${more}.` : ""}` };
}
const like = (r) => (r === "yesterday" ? "Dünkü gibi" : r === "week" ? "Geçen haftaki gibi" : "Geçen seferki gibi");
const when = (r) => (r === "yesterday" ? "Dün" : r === "week" ? "Geçen hafta" : "Son siparişin");
// Türkçe ayrılma eki: "Pizza Rüzgar'dan", "Smash Dikili'den", "Taş Fırın'dan", "Esnaf Lokantası'ndan"
export function den(name) {
  const w = low(name.trim().split(" ").pop());
  const v = [...w].reverse().find((ch) => "aıoueiöü".includes(ch)) || "e";
  const back = "aıou".includes(v);
  const hard = /[çfhkpsşt]$/.test(w);
  const buf = /(s[ıiuü]|l[ae]r[ıi])$/.test(w) ? "n" : ""; // "Lokantası'ndan", "Yemekleri'nden"
  return `${name}'${buf}${hard && !buf ? "t" : "d"}${back ? "a" : "e"}n`;
}
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
