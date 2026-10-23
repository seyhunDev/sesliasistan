// Sesli asistanla yemek siparişi (Seyhun 2026-10-23): "yemek siparişi ver" → beğendiklerine göre öneri;
// "sen seç, sipariş ver" → en iyi öneri hemen sipariş; "Pizza Rüzgar'dan karışık söyle", "dünkünden pizza söyle" → o, hemen;
// öneriden sonra "ilkini ver" → o. Saf işlevler; asistan işi src/features/assistant/isler/yemek.js.
// "pizza yedim" burada değil, Fitness › Beslenme (asistan yönlendirmesi önce bunu sorar).
import { parseAsk, suggest, findRepeat, den } from "./suggest";
import { makeLine, cartTotals } from "./order";
import { pickAddress, addressBySpeech } from "./address";

const low = (s) => String(s || "").toLocaleLowerCase("tr");
const ORDER = /(?<![\p{L}])(s[oö]yle(?:r misin|yelim|sene|yin)?|sipari[sş](?:i|ini|imi)?\s*(?:ver\p{L}*|et\p{L}*|ge[çc]\p{L}*|olu[sş]tur\p{L}*)|[ıi]smarla\p{L}*|getirt\p{L}*|al(?:ır m[ıi]s[ıi]n|al[ıi]m)|istiyorum|isterim|canım [çc]ekti)(?![\p{L}])/u;
const FOODWORD = /(?<![\p{L}])(yemek\p{L}*|ak[sş]am yeme[gğ]\p{L}*|[oö][gğ]le yeme[gğ]\p{L}*|kahvalt[ıi]\p{L}*|bir [sş]ey(?:ler)? (?:yiyelim|yesek|yiyeyim)|ac[ıi]kt[ıi]m)(?![\p{L}])/u;
const SUGGEST = /ne yiyelim|ne yesek|ne yiyeyim|ne yesem|ne s[oö]yleyelim|ne s[oö]yleyeyim|yemek [oö]ner|[oö]neri(?:n|)\s|bir [sş]ey [oö]ner/u;
const AUTO = /sen se[çc]|sen karar ver|ne istersen|rastgele|fark etmez|s[uü]rpriz|bir [sş]ey se[çc]|kendin se[çc]|sen bul/u;
const ORD = [[/(?<![\p{L}])(ilk|birinci)\p{L}*/u, 0], [/(?<![\p{L}])ikinci\p{L}*/u, 1], [/(?<![\p{L}])([uü][çc][uü]nc[uü]|son)\p{L}*/u, 2]];
const ATE = /(yedim|i[çc]tim|yemi[sş]tim|yedik)(?![\p{L}])/u; // "pizza yedim": beslenme kaydı

// Cümle yemek siparişi mi? null ya da { mode: "suggest" | "auto" | "order" | "pick", i? }
// recent: az önce öneri yapıldı (ilkini/ikincisini cevabı ona)
export function foodOrderAsk(s, places = [], recent = false) {
  const t = low(s).trim();
  if (!t || ATE.test(t)) return null;
  if (recent) {
    for (const [re, i] of ORD) if (re.test(t) && t.split(/\s+/).length <= 6) return { mode: "pick", i };
    if (/^(evet|olur|tamam|ver|onu ver|onu s[oö]yle|s[oö]yle|sipari[sş] ver)[\s.!]*$/u.test(t)) return { mode: "pick", i: 0 };
  }
  const ask = parseAsk(s, places);
  const specific = !!(ask.cuisine || ask.dish || ask.placeId);
  const food = specific || FOODWORD.test(t) || (ask.repeat && /sipari[sş]/.test(t));
  if (AUTO.test(t) && (food || /sipari[sş]/.test(t))) return { mode: "auto" };
  if (SUGGEST.test(t) && !ORDER.test(t.replace(SUGGEST, ""))) return { mode: "suggest" };
  if (!ORDER.test(t) || !food) return null;
  // "pizza söyle", "Pizza Rüzgar'dan karışık söyle", "dünkünden pizza söyle" → o; "yemek siparişi ver" → öneri
  if (specific || ask.repeat) return { mode: "order" };
  return { mode: "suggest" };
}

// Siparişin satırları: tekrar siparişte eski satırlar güncel fiyatla, yoksa önerilen ürün
function linesFor(place, from) {
  const items = place.menu.flatMap((c) => c.items);
  if (from.lines) {
    return from.lines.map((l) => items.find((i) => i.id === l.itemId) && items.find((i) => i.id === l.itemId).available !== false
      ? makeLine(items.find((i) => i.id === l.itemId), { qty: l.qty, picks: l.picks, note: l.note || "" }) : null).filter(Boolean);
  }
  return [makeLine(from.item)];
}

// Ne yapılacak: { kind: "suggest", picks, say } | { kind: "order", place, lines, address, totals, say } |
// { kind: "short", place, lines, say } (en az sipariş tutulmadı: sepete) | { kind: "noAddress", say } | { kind: "none", say }
// ask: foodOrderAsk sonucu; last: son önerilen picks (pick için); open(place): restoran şu an sipariş alıyor mu
export function planVoiceOrder({ s, ask, places, history = [], me = {}, pos, now = Date.now(), closed, last = [], open = () => true }) {
  const want = parseAsk(s, places);
  const addresses = me.addresses || [];
  const address = addressBySpeech(addresses, s) || pickAddress(addresses, pos, me.lastAddressId).address || addresses.find((a) => a.id === me.lastAddressId) || null;
  const picks = suggest({ places, history, ask: want, now, pos: address?.pos || pos, n: 3, closed });
  if (ask.mode === "suggest") {
    if (!picks.length) return { kind: "none", say: "Şu an sipariş alan uygun bir yer bulamadım." };
    const list = picks.map((c, i) => `${["Birincisi", "İkincisi", "Üçüncüsü"][i]} ${den(c.place.name)} ${c.item.name}, ₺${c.price}`).join(". ");
    return { kind: "suggest", picks, say: `${list}. Hangisini vereyim?` };
  }
  let place = null, from = null;
  if (ask.mode === "pick") {
    const c = last[ask.i] || last[0];
    if (!c) return { kind: "none", say: "Hangi öneriyi kastettiğini bulamadım. Ne yiyelim diye yeniden sorabilirsin." };
    place = places.find((p) => p.id === c.place.id);
    from = c;
  } else {
    const rep = want.repeat ? findRepeat(history, want, now) : null;
    const rp = rep && places.find((p) => p.id === rep.placeId);
    if (rp && open(rp)) {
      place = rp;
      from = rep;
    } else if (picks.length) {
      place = places.find((p) => p.id === picks[0].place.id);
      from = picks[0];
    }
  }
  if (!place) return { kind: "none", say: want.cuisine ? `Şu an ${want.cuisine} yapan açık bir yer bulamadım.` : "Şu an sipariş alan uygun bir yer bulamadım." };
  if (!open(place)) return { kind: "none", say: `${place.name} şu an sipariş almıyor.` };
  const lines = linesFor(place, from);
  if (!lines.length) return { kind: "none", say: `${place.name} menüsünde o ürün artık yok.` };
  const totals = cartTotals(place, lines);
  const what = lines.map((l) => `${l.qty > 1 ? `${l.qty} ` : ""}${l.name}`).join(", ");
  if (totals.short > 0) return { kind: "short", place, lines, say: `${den(place.name)} ${what} sepete koydum. En az sipariş için ₺${totals.short} daha eklemek gerek.` };
  if (!address) return { kind: "noAddress", place, lines, say: "Kayıtlı adresin yok. Sepete koydum, adresi ekleyip siparişi verebilirsin." };
  return { kind: "order", place, lines, address, totals, say: `${den(place.name)} ${what}, ₺${totals.total}, ${address.name} adresine. Veriyorum.` };
}
