// Yemek siparişi (src/yemek): örnek veri, sepet hesabı, adres seçimi, cümleden istek, öneri kuralları.
// Saat sabit: Çarşamba 2026-10-21 19:30 (akşam yemeği; kahvaltı ve tatlı öne çıkmaz).
import { SAMPLE_PLACES, catalogOf } from "@/yemek/sample";
import { unitPrice, pickProblem, defaultPicks, makeLine, cartTotals, isOpenAt, etaFrom, minutesLeft, lineDetail, stepRows } from "@/yemek/order";
import { pickAddress, addressBySpeech, distanceM, parseReverse, addressText, tileOf } from "@/yemek/address";
import { parseAsk, suggest, findRepeat, answerFood, tasteOf, den } from "@/yemek/suggest";
import { photoUrl } from "@/yemek/photo";
import { liveView } from "@/yemek/demo";
import { decodeLine, pointAlong, progressOn, rideMin, roadMin } from "@/yemek/route";
import { foodOrderAsk, planVoiceOrder } from "@/yemek/voice";
import { busyOrder, courierState, nearestFree, sortCouriers, DEMO_COURIERS, courierOnOrder, pickCourier } from "@/yemek/couriers";
import { accountCourier, courierCan, deliverPatch, pickupPatch } from "@/yemek/steps";
import { qrText, parseQr, qrCells, orderNo, pickupOf } from "@/yemek/qr";
import jsQR from "@/lib/vendor/jsQR.cjs";
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
  ["süre doldu ama teslim edilmedi", { desc: "en az 1 dk gösterilir", fn: () => minutesLeft(new Date(NOW - 10 * 60000).toISOString(), new Date(NOW)), ok: (g) => g === 1 }],
  ["kurye kapıda", { desc: "en az 5 dk (yol alt sınırı)", fn: () => minutesLeft(liveView({ ...real, courier: { id: "k1", name: "Ali", pos: ADDR[1].pos } }, pr, NOW).eta, new Date(NOW)), ok: (g) => g === 5 }],
  ["Yönetim'den kapatılan restoran", { desc: "pizza aranınca Pizza Rüzgar önerilmez", fn: () => suggest({ places: all, history: HISTORY, ask: parseAsk("pizza", all), now: NOW, pos: ADDR[1].pos, closed: { "pizza-ruzgar": true } }), ok: (g) => g.length && !g.some((c) => c.place.id === "pizza-ruzgar") }],
]);

// Haritadan adres (Nominatim ters arama cevabı) ve adresin tek satırı
group("Haritadan adres")([
  ["mahalle ve sokak kısaltılır", { desc: "1453 Sokak → 1453 Sk. No 12; Cumhuriyet Mahallesi → Cumhuriyet Mah., Dikili", fn: () => parseReverse({ address: { road: "1453 Sokak", house_number: "12", suburb: "Cumhuriyet Mahallesi", town: "Dikili", county: "Dikili" } }), ok: (g) => g.street === "1453 Sk. No 12" && g.area === "Cumhuriyet Mah., Dikili" }],
  ["cadde, numara yok", { desc: "Atatürk Cd.", fn: () => parseReverse({ address: { road: "Atatürk Caddesi", neighbourhood: "Gazipaşa Mahallesi", city: "Dikili" } }), ok: (g) => g.street === "Atatürk Cd." && g.area === "Gazipaşa Mah., Dikili" }],
  ["sokak bulunamadı", { desc: "boş sokak, yalnız ilçe", fn: () => parseReverse({ address: { county: "Dikili" } }), ok: (g) => g.street === "" && g.area === "Dikili" }],
  ["cevap yok", { desc: "boş", fn: () => parseReverse(null), ok: (g) => g.street === "" && g.area === "" }],
  ["adres satırı", { desc: "sokak, kat, daire, zil · mahalle", fn: () => addressText({ street: "1453 Sk. No 12", floor: "2", flat: "5", bell: "Yıldız", area: "Cumhuriyet Mah., Dikili" }), ok: (g) => g === "1453 Sk. No 12, Kat 2, Daire 5, Zil Yıldız · Cumhuriyet Mah., Dikili" }],
  ["boş alanlar yazılmaz", { desc: "yalnız sokak", fn: () => addressText({ street: "Liman Cd.", floor: "", flat: "" }), ok: (g) => g === "Liman Cd." }],
  ["küçük harita karoları", { desc: "Dikili z16: 4 karo, yerin çevresindeki 128 px dolu (sağ kenara yakın → sağdaki karo da)", fn: () => tileOf({ lat: 39.0712, lng: 26.8889 }), ok: (g) => { const mx = Math.min(...g.map((t) => t.dx)), my = Math.min(...g.map((t) => t.dy)); return g.length === 4 && g.some((t) => t.url.endsWith("/16/37662/25029.png")) && g.some((t) => t.url.includes("/16/37663/")) && mx <= -128 && mx + 512 >= 128 && my <= -128 && my + 512 >= 128; } }],
]);

// Yollardan rota (OSRM polyline6): çözme, yol üzerinde ilerleme, araca göre süre, deneme kuryesi yolda
const LINE = "gk|oiAwsahr@f{Cg^v|A~{Bv|Av|A"; // 39.0745,26.8875 → 39.0720,26.8880 → 39.0705,26.8860 → 39.0690,26.8845
const R = { line: LINE, km: 1.4, min: 6 };
group("Rota")([
  ["polyline çözülür", { desc: "4 nokta, ilk ve son doğru", fn: () => decodeLine(LINE), ok: (g) => g.length === 4 && Math.abs(g[0][1] - 39.0745) < 1e-6 && Math.abs(g[3][0] - 26.8845) < 1e-6 }],
  ["yolun yarısı", { desc: "uçlar arasında, yol üzerinde", fn: () => pointAlong(decodeLine(LINE), 0.5), ok: (g) => g.lat < 39.0745 && g.lat > 39.069 && progressOn(decodeLine(LINE), g).off < 5 }],
  ["kuryenin yoldaki yeri", { desc: "2. köşede ≈ %35", fn: () => progressOn(decodeLine(LINE), { lat: 39.072, lng: 26.888 }), ok: (g) => g.off < 1 && g.f > 0.25 && g.f < 0.45 }],
  ["araca göre süre", { desc: "araba 6, motor 5, bisiklet 6 (1,4 km / 15 km/sa)", fn: () => ["araba", "motor", "bisiklet"].map((v) => rideMin(R, v)), ok: (g) => g[0] === 6 && g[1] === 5 && g[2] === 6 }],
  ["rotasız sipariş", { desc: "kuş uçuşu tahmin (en az 5 dk)", fn: () => roadMin({ address: ADDR[1] }, place("pizza-ruzgar")), ok: (g) => g === 5 }],
  ["deneme kuryesi rotada", { desc: "yolun yarısında kurye yol üzerinde, motorlu", fn: () => { const o = { ...demoOrder, route: R }; const v0 = liveView(o, pr, NOW); return liveView(o, pr, new Date(v0.eta).getTime() - 2.5 * 60000); }, ok: (g) => g.status === "onTheWay" && g.courier.vehicle === "motor" && progressOn(decodeLine(LINE), g.courier.pos).off < 5 && g.f > 0.3 && g.f < 0.7 }],
  ["gerçek kurye rotada", { desc: "kalan süre rotanın kalanından (motor 5 dk × %65 ≈ 3)", fn: () => { const v = liveView({ ...real, route: R, courier: { vehicle: "motor", pos: { lat: 39.072, lng: 26.888 } } }, pr, NOW); return [minutesLeft(v.eta, new Date(NOW)), v.f]; }, ok: (g) => g[0] >= 3 && g[0] <= 4 && g[1] > 0.25 }],
]);

// Sesle sipariş (asistan, isler/yemek.js): cümle → öneri / hemen sipariş; sipariş 3 sn çizgiyle CartSheet'te verilir
const VA = (s, recent) => foodOrderAsk(s, all, recent)?.mode || null;
const VME = { addresses: ADDR, lastAddressId: "ev" };
const VP = (s, extra = {}) => planVoiceOrder({ s, ask: foodOrderAsk(s, all, !!extra.last), places: all, history: HISTORY, me: VME, now: NOW, ...extra });
const VM = (want, recent) => ({ desc: want || "sipariş değil", fn: (s) => VA(s, recent), ok: (g) => g === want });
group("Sesle sipariş: ne istendi")([
  ["bana yemek siparişi ver hemen şimdi", VM("suggest")],
  ["yemek söyle", VM("suggest")],
  ["bugün ne yiyelim", VM("suggest")],
  ["sen bir şey seç sipariş ver", VM("auto")],
  ["sen seç yemek söyle", VM("auto")],
  ["pizza söyle", VM("order")],
  ["Pizza Rüzgar'dan karışık pizza sipariş ver", VM("order")],
  ["dün söylediğimden sipariş ver", VM("order")],
  ["iskender istiyorum", VM("order")],
  ["pizza yedim", VM(null)],
  ["öğlen tavuk pilav yedim", VM(null)],
  ["Ali'ye mesaj gönder", VM(null)],
  ["listeye süt ekle", VM(null)],
  ["ilkini ver", VM("pick", true)],
  ["evet", VM("pick", true)],
  ["ikincisi", VM("pick", true)],
  ["ilkini ver", VM(null, false), "öneri yokken"],
]);
group("Sesle sipariş: ne yapılır")([
  ["bana yemek siparişi ver", { desc: "3 öneri, \"Hangisini vereyim?\"", fn: (s) => VP(s, { pos: ADDR[0].pos }), ok: (g) => g.kind === "suggest" && g.picks.length === 3 && /Hangisini vereyim\?$/.test(g.say) }],
  ["sen seç sipariş ver", { desc: "ilk öneri hemen, Ev adresine", fn: (s) => VP(s, { pos: ADDR[0].pos }), ok: (g) => g.kind === "order" && g.address.id === "ev" && g.lines.length === 1 && /Veriyorum\.$/.test(g.say) }],
  ["Pizza Rüzgar'dan karışık pizza söyle", { desc: "Pizza Rüzgar, karışık", fn: (s) => VP(s, { pos: ADDR[0].pos }), ok: (g) => g.kind === "order" && g.place.id === "pizza-ruzgar" && g.lines.some((l) => l.itemId === "pr-karisik") }],
  ["dün söylediğimden sipariş ver", { desc: "dünkü sepet (karışık + kola)", fn: (s) => VP(s, { pos: ADDR[0].pos }), ok: (g) => g.kind === "order" && g.place.id === "pizza-ruzgar" && g.lines.length === 2 }],
  ["kulübe pizza söyle", { desc: "Kulüp adresine", fn: (s) => VP(s, { pos: ADDR[0].pos }), ok: (g) => g.kind === "order" && g.address.id === "kulup" }],
  ["ikincisi", { desc: "son önerilerin ikincisi", fn: (s) => { const sug = VP("yemek söyle", { pos: ADDR[0].pos }); return [sug.picks[1].place.id, VP(s, { pos: ADDR[0].pos, last: sug.picks })]; }, ok: ([id, g]) => g.kind === "order" && g.place.id === id }],
  ["pizza söyle (adres yok)", { desc: "sepete konur, adres sorulur", fn: () => planVoiceOrder({ s: "pizza söyle", ask: { mode: "order" }, places: all, history: HISTORY, me: {}, now: NOW, pos: ADDR[0].pos }), ok: (g) => g.kind === "noAddress" && g.lines.length > 0 }],
  ["pizza söyle (hepsi kapalı)", { desc: "açık yer yok", fn: () => VP("pizza söyle", { pos: ADDR[0].pos, open: () => false }), ok: (g) => g.kind === "none" }],
]);

// Siparişin kare kodu (fiş, restoran ekranı) ve kuryenin okutması
const scanBack = (text) => {
  const { n, dark } = qrCells(text), s = 4, q = 4, w = (n + 2 * q) * s;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const r = Math.floor(y / s) - q, c = Math.floor(x / s) - q;
    if (r >= 0 && c >= 0 && r < n && c < n && dark(r, c)) { const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  }
  return jsQR(px, w, w)?.data;
};
const LIVE = (id, status) => ({ id, status, live: { status } });
const TODAY = [LIVE("o1aaaa", "sent"), LIVE("o2bbbb", "preparing"), LIVE("o3cccc", "accepted"), LIVE("o4dddd", "onTheWay"), LIVE("o5eeee", "delivered")];
group("Sipariş kare kodu")([
  ["kod üretilir ve okunur", { desc: "çizilen kod okununca aynı sipariş", fn: () => parseQr(scanBack(qrText("Xy12AbCdEf34"))), ok: (g) => g === "Xy12AbCdEf34" }],
  ["kısa numara", { desc: "son 4 hane büyük harf", fn: () => orderNo("Xy12AbCdEf34"), ok: (g) => g === "EF34" }],
  ["başka kod", { desc: "sipariş değil", fn: () => [parseQr("https://example.com"), parseQr(""), parseQr("VY:a")], ok: (g) => g.every((x) => x === null) }],
  ["hazırlanan sipariş", { desc: "kuryeye verilebilir", fn: () => pickupOf(TODAY, qrText("o2bbbb")).why, ok: (g) => g === "ok" }],
  ["onaylandı", { desc: "kuryeye verilebilir", fn: () => pickupOf(TODAY, qrText("o3cccc")).why, ok: (g) => g === "ok" }],
  ["henüz onaylanmadı", { desc: "bekle", fn: () => pickupOf(TODAY, qrText("o1aaaa")).why, ok: (g) => g === "wait" }],
  ["zaten yolda", { desc: "yolda", fn: () => pickupOf(TODAY, qrText("o4dddd")).why, ok: (g) => g === "road" }],
  ["teslim edilmiş", { desc: "kapanmış", fn: () => pickupOf(TODAY, qrText("o5eeee")).why, ok: (g) => g === "done" }],
  ["bilinmeyen sipariş", { desc: "yok", fn: () => pickupOf(TODAY, qrText("zzzzzz")).why, ok: (g) => g === "none" }],
]);

// Kuryeler: müsait / siparişte, en yakın müsait kuryeye atama, deneme kuryeleri
const PR = place("pizza-ruzgar");
const KC = DEMO_COURIERS;
const ORD = (cid, status) => ({ id: `o-${cid}-${status}`, placeName: "X", courier: { id: cid }, status, live: { status } });
group("Kuryeler")([
  ["deneme kuryeleri", { desc: "6 kurye, hepsi konumlu, ikisi siparişte", fn: () => KC, ok: (g) => g.length === 6 && g.every((c) => c.pos && c.demo) && g.filter((c) => c.demoBusy).length === 2 }],
  ["yoldaki sipariş", { desc: "kurye siparişte", fn: () => courierState(KC[0], [ORD("dk-murat", "onTheWay")]).busy, ok: (g) => g === true }],
  ["atanmış, hazırlanıyor", { desc: "kurye siparişte", fn: () => courierState(KC[0], [ORD("dk-murat", "preparing")]).busy, ok: (g) => g === true }],
  ["teslim edildi", { desc: "kurye müsait", fn: () => courierState(KC[0], [ORD("dk-murat", "delivered")]).busy, ok: (g) => g === false }],
  ["en yakın müsait", { desc: "Pizza Rüzgar'a en yakın Ayşe (bisiklet, ~300 m)", fn: () => nearestFree(KC, [], PR.pos)?.id, ok: (g) => g === "dk-ayse" }],
  ["en yakın siparişteyse", { desc: "sıradaki yakın müsait (siparişteki ve deneme-siparişteki atlanır)", fn: () => nearestFree(KC, [ORD("dk-ayse", "onTheWay")], PR.pos)?.id, ok: (g) => g && g !== "dk-ayse" && !KC.find((c) => c.id === g).demoBusy }],
  ["tek kurye siparişte", { desc: "yine ona atanır (Sırada)", fn: () => pickCourier([KC[2]], [ORD("dk-ayse", "onTheWay")], PR.pos)?.id, ok: (g) => g === "dk-ayse" }],
  ["müsait varken", { desc: "müsait olana", fn: () => pickCourier(KC, [ORD("dk-ayse", "onTheWay")], PR.pos)?.id, ok: (g) => g && g !== "dk-ayse" && !KC.find((c) => c.id === g).demoBusy }],
  ["hepsi siparişte", { desc: "atanmaz", fn: () => nearestFree(KC, KC.map((c) => ORD(c.id, "onTheWay")), PR.pos), ok: (g) => g === null }],
  ["konumsuz kurye", { desc: "atanmaz", fn: () => nearestFree([{ id: "k1", name: "A" }], [], PR.pos), ok: (g) => g === null }],
  ["kurye seçme listesi", { desc: "müsaitler önce, yakına göre; siparişteki seçilemez (busy)", fn: () => sortCouriers(KC, [ORD("dk-murat", "onTheWay")], PR.pos), ok: (g) => g.slice(0, 3).every((c) => !c.busy) && g.at(-1).busy && g[0].km <= g[1].km && g.find((c) => c.id === "dk-murat").busy }],
  ["siparişteki kuryenin siparişi", { desc: "hangi sipariş", fn: () => busyOrder(KC[0], [ORD("dk-murat", "preparing")])?.id, ok: (g) => g === "o-dk-murat-preparing" }],
  ["siparişe yazılan kurye", { desc: "ad, araç; konum yola çıkınca", fn: () => courierOnOrder(KC[2]), ok: (g) => g.name === "Ayşe" && g.vehicle === "bisiklet" && g.pos === null }],
  ["deneme siparişinde atanan kurye", { desc: "yolda görünen kurye atanan (Ayşe, bisiklet)", fn: () => { const o = { ...demoOrder, courier: courierOnOrder(KC[2]) }; const t = new Date(o.at).getTime(); return liveView(o, pr, t + (pr.prepMin + 3) * 60000).courier; }, ok: (g) => g?.name === "Ayşe" && g.vehicle === "bisiklet" }],
]);

// Kurye hesabı (kendi kayıt olan kurye): sunucu yalnız uygun adımı yapar
const REAL = (status, cid) => ({ id: "r1", placeId: "pizza-ruzgar", status, demo: false, at: new Date(NOW).toISOString(), times: {}, address: { pos: { lat: 39.075, lng: 26.89 } }, ...(cid ? { courier: { id: cid } } : {}) });
const ME = accountCourier("u1", "Seyhun", "0532");
group("Kurye hesabı")([
  ["kayıtlı kurye satırı", { desc: "kimliği uid, hesaplı, motor", fn: () => ME, ok: (g) => g.id === "u1" && g.uid === "u1" && g.account && g.vehicle === "motor" }],
  ["hazırlanan sipariş", { desc: "teslim alabilir", fn: () => courierCan(REAL("preparing"), PR, "u1", NOW), ok: (g) => g === "pickup" }],
  ["onaylanmamış sipariş", { desc: "teslim alamaz", fn: () => courierCan(REAL("sent"), PR, "u1", NOW), ok: (g) => g === "" }],
  ["kendisindeki yoldaki", { desc: "teslim edebilir", fn: () => courierCan(REAL("onTheWay", "u1"), PR, "u1", NOW), ok: (g) => g === "deliver" }],
  ["başkasındaki yoldaki", { desc: "hiçbir şey yapamaz", fn: () => courierCan(REAL("onTheWay", "u2"), PR, "u1", NOW), ok: (g) => g === "" }],
  ["teslim edilmiş", { desc: "hiçbir şey yapamaz", fn: () => courierCan(REAL("delivered", "u1"), PR, "u1", NOW), ok: (g) => g === "" }],
  ["teslim alma", { desc: "Yolda, kurye ve varış yazılır", fn: () => pickupPatch(REAL("preparing"), PR, ME, NOW), ok: (g) => g.status === "onTheWay" && g.courier.id === "u1" && g.times.onTheWay && g.eta > new Date(NOW).toISOString() && g.demo === false }],
  ["teslim etme", { desc: "Teslim edildi saati", fn: () => deliverPatch(REAL("onTheWay", "u1"), NOW), ok: (g) => g.status === "delivered" && g.times.delivered === new Date(NOW).toISOString() }],
]);

// Takip › Adım adım: onay ve hazırlık aynı dakikadaysa tek satır; her satır kendi saatiyle
group("Adım adım")([
  ["onay ile hazırlık aynı an", { desc: "tek satır 'Onaylandı, hazırlanıyor'", fn: () => stepRows({ sent: new Date(2026, 9, 21, 19, 0).toISOString(), accepted: new Date(2026, 9, 21, 19, 3).toISOString(), preparing: new Date(2026, 9, 21, 19, 3).toISOString() }).map((r) => r.title), ok: (g) => g.length === 2 && g[0] === "Onaylandı, hazırlanıyor" && g[1] === "Gönderildi" }],
  ["farklı saatler", { desc: "her adım ayrı, yeniden eskiye", fn: () => stepRows({ sent: new Date(2026, 9, 21, 19, 0).toISOString(), accepted: new Date(2026, 9, 21, 19, 1).toISOString(), preparing: new Date(2026, 9, 21, 19, 2).toISOString(), onTheWay: new Date(2026, 9, 21, 19, 20).toISOString() }).map((r) => r.s), ok: (g) => g.join() === "onTheWay,preparing,accepted,sent" }],
  ["iptal", { desc: "iptal en üstte", fn: () => stepRows({ sent: new Date(2026, 9, 21, 19, 0).toISOString(), cancelled: new Date(2026, 9, 21, 19, 2).toISOString() }, true).map((r) => r.s), ok: (g) => g.join() === "cancelled,sent" }],
]);
