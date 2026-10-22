// Yemek siparişi (src/yemek): örnek veri, sepet hesabı, adres seçimi, cümleden istek, öneri kuralları.
// Saat sabit: Çarşamba 2026-10-21 19:30 (akşam yemeği; kahvaltı ve tatlı öne çıkmaz).
import { SAMPLE_PLACES, catalogOf } from "@/yemek/sample";
import { unitPrice, pickProblem, defaultPicks, makeLine, cartTotals, isOpenAt, etaFrom, minutesLeft, lineDetail } from "@/yemek/order";
import { pickAddress, addressBySpeech, distanceM } from "@/yemek/address";
import { parseAsk, suggest, findRepeat, answerFood, tasteOf, den } from "@/yemek/suggest";
import { photoUrl } from "@/yemek/photo";
import { liveView } from "@/yemek/demo";
import { suite } from "./ortak.mjs";

const { group } = suite("yemek");
const NOW = new Date(2026, 9, 21, 19, 30).getTime();
const ago = (d, h = 20) => new Date(2026, 9, 21 - d, h, 0).toISOString();
const place = (id) => SAMPLE_PLACES.find((p) => p.id === id);
const item = (pid, iid) => place(pid).menu.flatMap((c) => c.items).find((i) => i.id === iid);
const order = (pid, iids, d, extra = {}) => {
  const p = place(pid);
  const lines = iids.map((i) => makeLine(item(pid, i)));
  return { placeId: pid, placeName: p.name, cuisines: p.cuisines, lines, total: cartTotals(p, lines).total, at: ago(d), status: "delivered", ...extra };
};
// Geçmiş: dün Pizza Rüzgar Karışık (★4), 5 gün önce Burger Koy (★5), 9 gün önce Usta Dönerci (★5), 12 gün önce Sakura (★2 "bir daha alma")
const HISTORY = [
  order("pizza-ruzgar", ["pr-karisik", "pr-kola"], 1, { rating: 4, review: "biraz geç geldi" }),
  order("burger-koy", ["bk-cheese-m"], 5, { rating: 5 }),
  order("usta-donerci", ["ud-iskender"], 9, { rating: 5 }),
  order("usta-donerci", ["ud-iskender"], 16, { rating: 5 }),
  order("sakura", ["sk-cali"], 12, { rating: 2, review: "bir daha alma, soğuktu" }),
];
const ADDR = [
  { id: "ev", name: "Ev", text: "Cumhuriyet Mah., Dikili", pos: { lat: 39.0750, lng: 26.8950 } },
  { id: "kulup", name: "Kulüp", text: "Yelken Kulübü, Dikili", pos: { lat: 39.0690, lng: 26.8845 } },
];
const all = SAMPLE_PLACES;
const ids = (r) => r.map((c) => `${c.place.id}/${c.item.id}`);

group("Örnek veri")([
  ["10 restoran, farklı mutfaklar", { desc: "pizza ×2, burger ×2, ev yemeği ×2, sushi, döner, balık, tatlı", fn: () => all.map((p) => p.cuisines[0]), ok: (g) => g.length === 10 && g.filter((c) => c === "pizza").length === 2 && g.filter((c) => c === "burger").length === 2 && g.filter((c) => c === "ev yemeği").length === 2 && ["sushi", "döner", "balık", "tatlı"].every((c) => g.includes(c)) }],
  ["her ürünün kimliği tek", { desc: "aynı id yok", fn: () => { const a = all.flatMap((p) => p.menu.flatMap((c) => c.items.map((i) => i.id))); return a.length - new Set(a).size; }, ok: (g) => g === 0 }],
  ["her ürünün fiyatı ve fotoğrafı var", { desc: "fiyat > 0, foto adresi images.unsplash.com", fn: () => all.flatMap((p) => p.menu.flatMap((c) => c.items)).filter((i) => !(i.price > 0) || !photoUrl(i.photo).startsWith("https://images.unsplash.com/")).map((i) => i.id), ok: (g) => g.length === 0 }],
  ["katalog belgesi menü taşımaz", { desc: "menu yok, itemCount var", fn: () => catalogOf(all)[2], ok: (g) => !g.menu && g.itemCount > 8 && g.name === "Pizza Rüzgar" }],
]);

const karisik = item("pizza-ruzgar", "pr-karisik");
group("Sepet ve fiyat")([
  ["Karışık, Büyük + İnce + Ekstra peynir + Zeytin", { desc: "260 + 70 + 30 + 15 = 375", fn: () => unitPrice(karisik, { Boy: ["Büyük"], Hamur: ["İnce"], Ekstra: ["Ekstra peynir", "Zeytin"] }), ok: (g) => g === 375 }],
  ["hazır seçim: Orta, İnce", { desc: "ek fiyatsız ilk seçenek", fn: () => defaultPicks(karisik), ok: (g) => g.Boy[0] === "Orta" && g.Hamur[0] === "İnce" && !g.Ekstra }],
  ["zorunlu seçim eksik", { desc: "\"Boy seç\"", fn: () => pickProblem(karisik, { Hamur: ["İnce"] }), ok: (g) => g === "Boy seç" }],
  ["tek seçimde iki seçenek", { desc: "uyarı", fn: () => pickProblem(karisik, { Boy: ["Orta", "Büyük"], Hamur: ["İnce"] }), ok: (g) => /tek seçim/.test(g) }],
  ["2 adet satır + not", { desc: "toplam 520, açıklama", fn: () => makeLine(karisik, { qty: 2, note: "Az pişmiş" }), ok: (g) => g.total === 520 && lineDetail(g) === 'Orta · İnce · "Az pişmiş"' }],
  ["min sepet altı", { desc: "Napoli min 250, 140'lık sepet → 110 eksik", fn: () => cartTotals(place("napoli"), [makeLine(item("napoli", "np-tiramisu"))]), ok: (g) => g.short === 110 && g.total === 160 }],
  ["Napoli 17:00'de açılır", { desc: "16:00 kapalı, 20:00 açık", fn: () => [isOpenAt(place("napoli"), new Date(2026, 9, 21, 16)), isOpenAt(place("napoli"), new Date(2026, 9, 21, 20))], ok: (g) => !g[0] && g[1] }],
  ["Smash gece 01:00'e kadar", { desc: "00:30 açık", fn: () => isOpenAt(place("smash"), new Date(2026, 9, 22, 0, 30)), ok: (g) => g === true }],
  ["yolda: kalan süre", { desc: "1 km → 5 dk yol", fn: () => minutesLeft(etaFrom({ status: "onTheWay", times: { onTheWay: new Date(NOW).toISOString() } }, place("pizza-ruzgar"), 1, new Date(NOW)), new Date(NOW)), ok: (g) => g === 5 }],
]);

group("Adres seçimi")([
  ["kulüpteyim (≈50 m)", { desc: "Kulüp, konuma göre", fn: () => pickAddress(ADDR, { lat: 39.0694, lng: 26.8847 }), ok: (g) => g.address?.id === "kulup" && g.why === "near" && !g.ask }],
  ["İzmir'deyim", { desc: "yakın adres yok → sor", fn: () => pickAddress(ADDR, { lat: 38.42, lng: 27.14 }, "ev"), ok: (g) => g.ask && !g.address }],
  ["konum izni yok", { desc: "son kullanılan (Ev)", fn: () => pickAddress(ADDR, null, "ev"), ok: (g) => g.address?.id === "ev" && g.why === "last" }],
  ["hiç adres yok", { desc: "sor", fn: () => pickAddress([], { lat: 39, lng: 26 }), ok: (g) => g.ask }],
  ["\"kulübe gönder\"", { desc: "Kulüp", fn: (s) => addressBySpeech(ADDR, s)?.id, ok: (g) => g === "kulup" }],
  ["\"eve gelsin\"", { desc: "Ev", fn: (s) => addressBySpeech(ADDR, s)?.id, ok: (g) => g === "ev" }],
  ["mesafe", { desc: "Ev–Kulüp ≈ 1,1 km", fn: () => Math.round(distanceM(ADDR[0].pos, ADDR[1].pos)), ok: (g) => g > 1000 && g < 1250 }],
]);

const P = (s) => parseAsk(s, all);
group("Cümleden istek")([
  ["Ben pizza söylemek istiyorum, dün söylediğimden olsun", { desc: "pizza + dün", fn: P, ok: (g) => g.cuisine === "pizza" && g.repeat === "yesterday" }],
  ["Daha uygun fiyatlı bir şey olsun", { desc: "ucuz", fn: P, ok: (g) => g.cheap }],
  ["Hafif bir şey yiyelim", { desc: "hafif", fn: P, ok: (g) => g.light && !g.cuisine }],
  ["İki kişilik suşi", { desc: "sushi, 2 kişi", fn: P, ok: (g) => g.cuisine === "sushi" && g.people === 2 }],
  ["Acısız bir dürüm", { desc: "döner, acısız", fn: P, ok: (g) => g.cuisine === "döner" && g.noSpicy }],
  ["Geçen haftaki dönerciden", { desc: "döner, geçen hafta", fn: P, ok: (g) => g.cuisine === "döner" && g.repeat === "week" }],
  ["Napoli'den bir şey", { desc: "restoran Napoli", fn: P, ok: (g) => g.placeId === "napoli" }],
  ["Bir iskender söyle", { desc: "yemek adı iskender", fn: P, ok: (g) => g.dish === "iskender" && g.cuisine === "döner" }],
  ["Farklı bir şey deneyelim", { desc: "yeni", fn: P, ok: (g) => g.novel }],
  ["Çok açım, hızlı gelsin", { desc: "doyurucu + hızlı", fn: P, ok: (g) => g.filling && g.fast }],
]);

const S = (s, extra = {}) => suggest({ places: all, history: HISTORY, ask: parseAsk(s, all), now: NOW, pos: ADDR[1].pos, ...extra });
group("Öneri")([
  ["Bugün ne yiyelim?", { desc: "3 farklı restoran, dün yenen pizza ilk değil, Sakura yok (\"bir daha alma\")", fn: (s) => S(s), ok: (g) => g.length === 3 && new Set(g.map((c) => c.place.id)).size === 3 && g[0].place.cuisines[0] !== "pizza" && !g.some((c) => c.place.id === "sakura") }],
  ["öneride neden yazıyor", { desc: "her birinde kısa neden", fn: () => S("ne yiyelim").map((c) => c.why), ok: (g) => g.every((w) => w && w.length < 40) }],
  ["Pizza istiyorum", { desc: "yalnız pizza, iki pizzacı da (\"pizza\" Pizza Rüzgar demek değil)", fn: (s) => S(s), ok: (g) => g.length === 2 && g.every((c) => c.place.cuisines.includes("pizza")) && new Set(g.map((c) => c.place.id)).size === 2 }],
  ["Pizza Rüzgar'dan bir şey", { desc: "yalnız Pizza Rüzgar", fn: (s) => parseAsk(s, all).placeId, ok: (g) => g === "pizza-ruzgar" }],
  ["burger yiyelim", { desc: "restoran seçilmez (Burger Koy değil)", fn: (s) => parseAsk(s, all).placeId, ok: (g) => !g }],
  ["Pizza, daha uygun olsun", { desc: "ilk öneri en ucuz pizzalardan (≤ ₺215)", fn: (s) => S(s), ok: (g) => g[0].price <= 215 && g[0].place.cuisines.includes("pizza") }],
  ["Burger", { desc: "★5 verdiğin Burger Koy önde", fn: (s) => S(s), ok: (g) => g[0].place.id === "burger-koy" }],
  ["Vejetaryen bir şey", { desc: "hepsi vejetaryen", fn: (s) => S(s), ok: (g) => g.every((c) => c.item.tags.includes("vejetaryen")) }],
  ["Acısız döner", { desc: "acılı ürün yok", fn: (s) => S(s), ok: (g) => g.length && g.every((c) => !c.item.tags.includes("acılı")) }],
  ["Farklı bir şey deneyelim", { desc: "hiç sipariş vermediğin yerler", fn: (s) => S(s), ok: (g) => g.every((c) => !HISTORY.some((o) => o.placeId === c.place.id)) }],
  ["Sushi (Sakura tek sushici, puanın düşük)", { desc: "yine de sushi gelir (istenen), geri itilmiş olsa da", fn: () => S("sushi"), ok: (g) => g.length >= 1 && g[0].place.id === "sakura" }],
  ["Saat 16:00 Napoli kapalı", { desc: "Napoli önerilmez", fn: () => suggest({ places: all, history: HISTORY, ask: parseAsk("pizza", all), now: new Date(2026, 9, 21, 16).getTime() }), ok: (g) => !g.some((c) => c.place.id === "napoli") }],
  ["Sabah 09:00 ne yiyelim", { desc: "kahvaltı önerilir", fn: () => suggest({ places: all, history: HISTORY, ask: {}, now: new Date(2026, 9, 21, 9).getTime() }), ok: (g) => g.some((c) => c.place.id === "tatli-liman") }],
  ["geçmişten zevk", { desc: "iskender 2 kez, ★5", fn: () => { const t = tasteOf(HISTORY); return [t.items["ud-iskender"].n, t.avg(t.items["ud-iskender"])]; }, ok: (g) => g[0] === 2 && g[1] === 5 }],
]);

const A = (s) => answerFood({ text: s, places: all, history: HISTORY, now: NOW, pos: ADDR[1].pos });
group("Sesli cevap")([
  ["Pizza söylemek istiyorum, dünkünden olsun", { desc: "dünkü Karışık + kola, sepete koyayım mı", fn: A, ok: (g) => g.repeat?.placeId === "pizza-ruzgar" && /Dünkü gibi Pizza Rüzgar'dan Karışık, Kola 1 L/.test(g.say) && /Sepete koyayım mı/.test(g.say) }],
  ["Dünkü burgerden olsun", { desc: "dün burger yok → öneri", fn: A, ok: (g) => !g.repeat && /Dün burger yoktu/.test(g.say) && /Burger Koy'dan/.test(g.say) }],
  ["Geçen haftaki dönerciden", { desc: "9 gün önceki değil, hafta içinde yok → öneri; (16 gün önceki de değil)", fn: A, ok: (g) => !g.repeat && /Geçen hafta döner yoktu/.test(g.say) }],
  ["Her zamanki dönerden", { desc: "son döner siparişi (iskender)", fn: A, ok: (g) => g.repeat?.lines[0].itemId === "ud-iskender" }],
  ["Ne yiyelim?", { desc: "3 öneri, ilk + \"Ya da\"", fn: A, ok: (g) => g.picks.length === 3 && / Ya da /.test(g.say) }],
  ["Türkçe ek", { desc: "Rüzgar'dan, Dikili'den, Fırın'dan, Lokantası'ndan, Koy'dan", fn: () => ["Pizza Rüzgar", "Smash Dikili", "Napoli Taş Fırın", "Dikili Esnaf Lokantası", "Burger Koy", "Liman Balık"].map(den).join(" "), ok: (g) => g === "Pizza Rüzgar'dan Smash Dikili'den Napoli Taş Fırın'dan Dikili Esnaf Lokantası'ndan Burger Koy'dan Liman Balık'tan" }],
]);

// Deneme modu: Pizza Rüzgar (hazırlık 25 dk) → Kulüp (~150 m, yol 5 dk); hiçbir şey yazılmaz, saatten hesaplanır
const T0 = new Date(NOW).toISOString();
const demoOrder = { demo: true, status: "sent", at: T0, times: { sent: T0 }, address: ADDR[1] };
const at = (m) => liveView(demoOrder, place("pizza-ruzgar"), NOW + m * 60000);
group("Deneme modu")([
  ["30 sn sonra", { desc: "Gönderildi", fn: () => at(0.5).status, ok: (g) => g === "sent" }],
  ["1,5 dk sonra", { desc: "Onaylandı", fn: () => at(1.5).status, ok: (g) => g === "accepted" }],
  ["10 dk sonra", { desc: "Hazırlanıyor, kurye yok", fn: () => at(10), ok: (g) => g.status === "preparing" && !g.courier }],
  ["27 dk sonra", { desc: "Yolda, kurye restoranla adres arasında", fn: () => at(27), ok: (g) => g.status === "onTheWay" && g.courier && g.courier.pos.lat < place("pizza-ruzgar").pos.lat && g.courier.pos.lat > ADDR[1].pos.lat }],
  ["31 dk sonra", { desc: "Teslim edildi, 5 adımın saati", fn: () => at(31), ok: (g) => g.status === "delivered" && Object.keys(g.times).length === 5 }],
  ["iptal edilen", { desc: "İptal kalır", fn: () => liveView({ ...demoOrder, status: "cancelled" }, place("pizza-ruzgar"), NOW + 40 * 60000).status, ok: (g) => g === "cancelled" }],
]);

// Restoran ve kurye ekranları: restoran onaylayınca sipariş gerçek olur (demo: false); kalan süre kuryenin konumundan
const real = { ...demoOrder, demo: false, status: "onTheWay", eta: new Date(NOW + 30 * 60000).toISOString() };
const pr = place("pizza-ruzgar");
group("Restoran ve kurye")([
  ["onaylanan sipariş saatten ilerlemez", { desc: "Hazırlanıyor kalır", fn: () => liveView({ ...demoOrder, demo: false, status: "preparing" }, pr, NOW + 60 * 60000).status, ok: (g) => g === "preparing" }],
  ["kurye konumu yok", { desc: "kayıtlı varış saati", fn: () => liveView(real, pr, NOW).eta, ok: (g) => g === real.eta }],
  ["kurye adrese ~1,5 km", { desc: "kalan ~5 dk (kuryeden adrese)", fn: () => minutesLeft(liveView({ ...real, courier: { id: "k1", name: "Ali", pos: { lat: ADDR[1].pos.lat + 0.0135, lng: ADDR[1].pos.lng } } }, pr, NOW).eta, new Date(NOW)), ok: (g) => g >= 4 && g <= 5 }],
  ["kurye kapıda", { desc: "en az 5 dk (yol alt sınırı)", fn: () => minutesLeft(liveView({ ...real, courier: { id: "k1", name: "Ali", pos: ADDR[1].pos } }, pr, NOW).eta, new Date(NOW)), ok: (g) => g === 5 }],
  ["Yönetim'den kapatılan restoran", { desc: "pizza aranınca Pizza Rüzgar önerilmez", fn: () => suggest({ places: all, history: HISTORY, ask: parseAsk("pizza", all), now: NOW, pos: ADDR[1].pos, closed: { "pizza-ruzgar": true } }), ok: (g) => g.length && !g.some((c) => c.place.id === "pizza-ruzgar") }],
]);
