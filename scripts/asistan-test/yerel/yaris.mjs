// Yarış testleri: bütçe hesabı, iş listesi, evrak (PDF), yarış çevresi (harita yerleri), yarış havası.
import { readFileSync } from "node:fs";
import { suite } from "./ortak.mjs";

const { group } = suite("yaris");
// Yarışın çevresi (raceAround.js): OpenStreetMap sonuçlarından en yakın yerler, kayıt temizliği, harita bağlantıları
const RA = await import("@/features/athletes/raceAround");
const VEN = { lat: 38.6667, lon: 26.7611 };
const HOT = { lat: 38.6800, lon: 26.7700 };
const EL = [
  { type: "node", id: 1, lat: 38.6670, lon: 26.7615, tags: { shop: "supermarket", name: "Migros" } },
  { type: "node", id: 2, lat: 38.6801, lon: 26.7702, tags: { shop: "convenience", name: "Bakkal Ali" } },
  { type: "way", id: 3, center: { lat: 38.6668, lon: 26.7612 }, tags: { amenity: "pharmacy" } },
  { type: "node", id: 4, lat: 38.6669, lon: 26.7613, tags: { amenity: "restaurant" } },
  { type: "node", id: 5, lat: 38.9, lon: 26.9, tags: { shop: "supermarket", name: "Uzak Market" } },
  { type: "node", id: 6, lat: 38.67, lon: 26.762, tags: { tourism: "museum", name: "Foça Müzesi" } },
];
group("Yarış çevresi")([
  ["yakın yerler", { desc: "uzak ve adsız restoran atılır; eczane adsızsa 'Eczane'; otel yakını ayrı", fn: () => RA.pickPlaces(EL, { venue: VEN, hotel: HOT }), ok: (r) => r.length === 3 && r.find((p) => p.name === "Bakkal Ali")?.near === "hotel" && r.find((p) => p.kind === "pharmacy")?.name === "Eczane" && !r.some((p) => p.name === "Uzak Market") }],
  ["gezilecek aday", { desc: "yalnız müze/plaj/kale gibi yerler", fn: () => RA.pickSights(EL, VEN), ok: (r) => r.length === 1 && r[0].name === "Foça Müzesi" && r[0].sub === "Müze" }],
  ["kayıt temizliği", { desc: "bozuk konum ve tür atılır, çizgi düz dizi olur (Firestore)", fn: () => RA.cleanAround({ venue: { q: "Foça", lat: 38.66, lon: 26.76 }, hotel: { q: "x", lat: "a" }, route: { km: 4.24, min: 8.4, line: [[38.6, 26.7], [38.7, 26.8]] }, places: [{ id: "n/1", kind: "market", name: "A", lat: 38.6, lon: 26.7, m: 10 }, { id: "n/2", kind: "otel", name: "B", lat: 38.6, lon: 26.7 }, { id: "n/1", kind: "market", name: "A", lat: 38.6, lon: 26.7 }] }), ok: (r) => r.hotel === null && r.route.km === 4.2 && r.route.min === 8 && r.route.line.length === 4 && r.places.length === 1 }],
  ["konumsuz yarış alanı", { desc: "kayıt yok", fn: () => RA.cleanAround({ venue: { q: "x" } }), ok: (r) => r === null }],
  ["arama metinleri", { desc: "ad + ilçe + il, sonra sadeleşir", fn: () => RA.searchTexts("Foça Yelken Kulübü", { district: "Foça", city: "İzmir" }), ok: (r) => r[0] === "Foça Yelken Kulübü, İzmir" && r[1] === "Foça Yelken Kulübü" }],
  ["yol tarifi", { desc: "Apple ve Google bağlantıları", fn: () => [RA.routeLink(HOT, VEN, true), RA.routeLink(HOT, VEN, false)], ok: ([a, g]) => a.startsWith("https://maps.apple.com/?saddr=38.68,26.77&daddr=38.6667,26.7611") && g.includes("origin=38.68,26.77&destination=38.6667,26.7611") }],
  ["ulaşım cümlesi", { desc: "yapay zeka yoksa km, dakika, yürüme", fn: () => RA.localTransport({ km: 2.3, min: 6 }, HOT), ok: (r) => /2,3 km/.test(r) && /6 dk/.test(r) && /yürüyerek/.test(r) }],
  ["mesafe yazısı", { desc: "m ve km", fn: () => [RA.distText(240), RA.distText(4230)], ok: ([a, b]) => a === "240 m" && b === "4,2 km" }],
]);

// Yarış havası (raceWeather.js): yarış günleri, gündüz rüzgârı, kayıt temizliği, 16 günlük ufuk
const RW = await import("@/features/athletes/raceWeather");
const HRS = Array.from({ length: 48 }, (_, i) => `2026-10-0${7 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`);
const WJ = {
  hourly: { time: HRS, temperature_2m: HRS.map(() => 20), weather_code: HRS.map(() => 1), is_day: HRS.map((t) => (+t.slice(11, 13) >= 7 && +t.slice(11, 13) <= 19 ? 1 : 0)),
    wind_speed_10m: HRS.map((t) => (+t.slice(11, 13) >= 11 && +t.slice(11, 13) <= 16 ? 12 : 5)), wind_gusts_10m: HRS.map(() => 18), wind_direction_10m: HRS.map(() => 315) },
  daily: { time: ["2026-10-07", "2026-10-08"], weather_code: [1, 1], temperature_2m_max: [24, 23], temperature_2m_min: [15, 14] },
};
group("Yarış havası")([
  ["yarış günleri", { desc: "7-9 Ekim → 3 gün", fn: () => RW.raceDays({ startDate: "2026-10-07", endDate: "2026-10-09" }), ok: (r) => r.join() === "2026-10-07,2026-10-08,2026-10-09" }],
  ["gündüz rüzgârı", { desc: "5–12 kn, sağanak 18, karayel, yelkene uygun 11–17", fn: () => RW.shapeDays(WJ, ["2026-10-07", "2026-10-09"]), ok: (r) => r.length === 1 && r[0].lo === 5 && r[0].hi === 12 && r[0].gust === 18 && r[0].dir === 315 && r[0].hours.length === 6 && r[0].sail[0] === "11–17" && r[0].max === 24 }],
  ["kayıt temizliği", { desc: "konumsuz tahmin atılır, bozuk gün süzülür", fn: () => [RW.cleanWeather({ place: {}, days: [] }), RW.cleanWeather({ place: { name: "Foça", lat: 38.67, lon: 26.75 }, days: [{ date: "x" }, { date: "2026-10-07", lo: 5, hi: 12, gust: 18, dir: 315, hours: [{ hh: "10", wind: 8 }] }] })], ok: ([a, b]) => a === null && b.days.length === 1 && b.days[0].hours[0].gust === null }],
  ["16 günlük ufuk", { desc: "3 Ekim'de tahmin 18 Ekim'e kadar; 20 Ekim yarışı 5 Ekim'den sonra", fn: () => [RW.lastForecastDay("2026-10-03"), RW.forecastFrom("2026-10-20")], ok: ([a, b]) => a === "2026-10-18" && b === "2026-10-05" }],
  ["rüzgâr cümlesi", { desc: "yön ve kn", fn: () => RW.windLine({ dir: 315, lo: 5, hi: 12, gust: 18 }), ok: (r) => r === "Karayel (KB) 5–12 kn, sağanak 18 kn" }],
]);

// Yarış bütçesi (budget.js): sporcu başı / kişi başı / ortak, kulüp payı, temizlik
const BU = await import("@/features/athletes/budget");
const BUD = BU.cleanBudget({
  staff: 1,
  items: [
    { id: "k", cat: "Kayıt", title: "Kayıt ücreti", amount: 1500, unit: "athlete" },
    { id: "o", cat: "Konaklama", title: "Otel", amount: "3.500", unit: "person", qty: 3 },
    { id: "m", cat: "Ulaşım", title: "Minibüs", amount: 8000, unit: "shared", club: true },
    { id: "t", cat: "Ulaşım", title: "Tekne taşıma", amount: 0, unit: "shared", est: true },
  ],
  paid: { a: true, "kötü id!": true, b: "evet" },
});
group("Yarış bütçesi")([
  ["toplam", { desc: "4 sporcu + 1 antrenör: 6000 + 52500 + 8000 = 66500", fn: () => BU.totals(BUD, 4), ok: (r) => r.total === 66500 && r.club === 8000 && r.fromAthletes === 58500 && r.people === 5 }],
  ["sporcu payı", { desc: "1500 + 52500/4 = 14625 (kulüp payı girmez)", fn: () => BU.totals(BUD, 4).perAthlete, ok: (r) => r === 14625 }],
  ["sporcu yok", { desc: "bölme hatası yok, pay 0", fn: () => BU.totals(BUD, 0), ok: (r) => r.perAthlete === 0 && Number.isFinite(r.total) }],
  ["binlik nokta", { desc: "\"3.500\" → 3500", fn: () => BUD.items[1].amount, ok: (r) => r === 3500 }],
  ["tutarsız tahmin", { desc: "tutar 0 iken tahmini etiketi kalkar", fn: () => BUD.items[3].est, ok: (r) => r === undefined }],
  ["ödendi listesi", { desc: "yalnız geçerli kimlik ve true", fn: () => Object.keys(BUD.paid).join(), ok: (r) => r === "a" }],
  ["bozuk kalem", { desc: "kategori Diğer, birim sporcu başı, adet en az 1", fn: () => BU.cleanItem({ cat: "x", unit: "y", qty: -3, amount: "abc" }), ok: (r) => r.cat === "Diğer" && r.unit === "athlete" && r.qty === 1 && r.amount === 0 && r.title === "Diğer" }],
  ["gece sayısı", { desc: "7-11 Ekim → 4 gece", fn: () => BU.nightsOf({ startDate: "2026-10-07", endDate: "2026-10-11" }), ok: (r) => r === 4 }],
  ["hesap yazısı", { desc: "3.500 ₺ × 3 gece × 5 kişi", fn: () => { const t = BU.totals(BUD, 4); return BU.howText(t.lines[1], t).replace(/ /g, " "); }, ok: (r) => r === "3.500 ₺ × 3 gece × 5 kişi" }],
]);

// Otel odası (unit room): yalnız bizden kalanların payı
const ROOMS = BU.cleanBudget({
  staff: 1,
  items: [
    { id: "r1", cat: "Konaklama", title: "Otel odası", amount: 3200, unit: "room", cap: 3, beds: 3, qty: 4 },
    { id: "r2", cat: "Konaklama", title: "Otel odası", amount: 3200, unit: "room", cap: 3, beds: 1, qty: 4 },
    { id: "r3", cat: "Konaklama", title: "Antrenör odası", amount: 2500, unit: "room", cap: 1, who: "staff", qty: 4 },
  ],
});
group("Yarış bütçesi: otel odası")([
  ["tam oda", { desc: "3 kişilik 3200, bizden 3, 4 gece → 12800", fn: () => BU.totals(ROOMS, 4).lines[0].total, ok: (r) => r === 12800 }],
  ["bir kişi", { desc: "3 kişilik 3200, bizden 1, 4 gece → 3200/3×4", fn: () => BU.totals(ROOMS, 4).lines[1].total, ok: (r) => Math.abs(r - 3200 / 3 * 4) < 0.01 }],
  ["antrenör odası", { desc: "tek kişilik 2500 × 4 gece = 10000", fn: () => BU.totals(ROOMS, 4).lines[2].total, ok: (r) => r === 10000 }],
  ["odadakiler", { desc: "4 sporcu, 1 antrenör", fn: () => BU.roomPeople(ROOMS), ok: (r) => r.athlete === 4 && r.staff === 1 }],
  ["sınır", { desc: "bizden kalan oda kapasitesini geçmez", fn: () => BU.cleanItem({ unit: "room", cap: 2, beds: 5, amount: 1000 }), ok: (r) => r.beds === 2 && r.rooms === 1 && r.who === "athlete" }],
  ["eski kalem", { desc: "oda olmayan kaleme oda alanı eklenmez", fn: () => BU.cleanItem({ unit: "person", cap: 3, amount: 100 }), ok: (r) => !("cap" in r) && !("beds" in r) }],
  ["hesap yazısı", { desc: "3 kişilik oda · bizden 1 sporcu", fn: () => { const t = BU.totals(ROOMS, 4); return BU.howText(t.lines[1], t).replace(/ /g, " "); }, ok: (r) => r === "3 kişilik oda · bizden 1 sporcu · 3.200 ₺ ÷ 3 × 1 × 4 gece" }],
]);

// Talimattaki otel odaları (notice.hotels[].rooms)
const NR = BU.cleanRooms([
  { cap: 3, label: "3 kişilik", price: "3.200 TL", amount: 3200, per: "room" },
  { cap: 1, label: "Tek kişilik", price: "2.500 TL", amount: "2.500" },
  { cap: 2, price: "kişi başı 1.500 TL", amount: 1500, per: "person" },
  { cap: 5, label: "5 kişilik", amount: 6000, cur: "EUR" },
  { cap: 4, label: "4 kişilik" , amount: 4800 },
  {},
]);
group("Talimattaki otel odaları")([
  ["hepsi kalır", { desc: "boş satır atılır, 1-5 kişilik sırayla", fn: () => NR.map((x) => x.cap).join(), ok: (r) => r === "1,2,3,4,5" }],
  ["kişi başı fiyat", { desc: "2 kişilik kişi başı 1500 → oda 3000", fn: () => BU.roomNight(NR[1]), ok: (r) => r === 3000 }],
  ["satır", { desc: "3 kişilik · 3.200 ₺/gece oda · kişi başı 1.066,67 ₺", fn: () => BU.roomLine(NR[2]).replace(/ /g, " "), ok: (r) => r.startsWith("3 kişilik · 3.200 ₺/gece oda · kişi başı 1.066") }],
  ["döviz", { desc: "EUR yazılır", fn: () => BU.roomLine(NR[4]), ok: (r) => /6\.000 EUR\/gece/.test(r) }],
  ["bütçe kalemi", { desc: "otel adı, oda, kapasite, gece", fn: () => BU.roomFromNotice({ name: "Phokaia" }, NR[2], 4), ok: (r) => r.unit === "room" && r.amount === 3200 && r.cap === 3 && r.qty === 4 && r.title === "Phokaia · 3 kişilik" }],
  ["talimat kaydı", { desc: "oteldeki odalar kayıtta kalır", fn: async () => (await import("@/features/athletes/races")).cleanNotice({ hotels: [{ name: "X", rooms: NR }] }).hotels[0].rooms.length, ok: (r) => r === 5 }],
]);

// Yarış iş listesi (races.js): talimattaki işler + elle işler + evrak, tekrarsız
const RS = await import("@/features/athletes/races");
const RACE_T = { notice: { tasks: [{ title: "Online kayıt", date: "2026-10-01" }, { title: "Online kayıt" }] }, todos: [{ title: "Römork" }, { title: "römork" }, { title: "" }], checks: { docs: true, "m:römork": true } };
group("Yarış iş listesi")([
  ["iş sırası", { desc: "tek liste: tarihliler önde; eskiden işaretlenenler listede yok; tekrar atılır", fn: () => RS.stepsOf(RACE_T).map((s) => s.key).join(), ok: (r) => r === "t:online-kayıt,parents,schools,gsim" }],
  ["çıkarılan iş", { desc: "6 işten 2'si çıkmış (eski işaretler)", fn: () => RS.hiddenCount(RACE_T), ok: (r) => r === 2 }],
  ["listeden çıkarma", { desc: "talimat ve evrak işi de × ile çıkar; tarihli iş öne gelir", fn: () => { const r = { notice: { tasks: [{ title: "Ödeme" }, { title: "Kayıt", date: "2026-11-02" }] }, todos: [{ title: "Römork", date: "2026-11-01" }], skips: ["t:ödeme", "gsim"] }; return [RS.stepsOf(r).map((s) => s.key).join(), RS.hiddenCount(r)]; }, ok: ([a, n]) => a === "m:römork,t:kayıt,docs,parents,schools" && n === 2 }],
  ["eski talimat", { desc: "son tarih, ücret, otelden iş çıkar", fn: () => RS.noticeTasks({ deadlines: [{ title: "Kayıt son gün", date: "2026-10-01" }], fees: [{ amount: "1500" }], hotels: [{ name: "Otel A" }] }).map((t) => t.label).join(), ok: (r) => r === "Kayıt son gün,Kayıt ücretini öde,Konaklamayı ayarla" }],
  ["boş yarış", { desc: "yalnız 4 evrak işi", fn: () => RS.stepsOf({}).length, ok: (r) => r === 4 }],
  ["yurt dışı yarış", { desc: "Türkiye'de yapılacaklar listesi gelir, GSİM il dışı oluru yerine yurt dışı görev oluru", fn: () => RS.stepsOf({ abroad: true }), ok: (r) => r.filter((s) => s.group === "abroad").length === RS.ABROAD_STEPS.length && !r.some((s) => s.key === "gsim") && r.some((s) => s.key === "a:gsim") && r.filter((s) => s.group === "docs").length === 3 }],
  ["yurt dışı listeden çıkarma", { desc: "çıkarılan iş listede yok; bozuk anahtar atılır", fn: () => [RS.stepsOf({ abroad: true, skips: ["a:vize", "x"] }).some((s) => s.key === "a:vize"), RS.cleanSkips(["a:vize", "a:vize", "t:x", "x", "gsim", 5])], ok: ([a, b]) => a === false && b.join() === "a:vize,t:x,gsim" }],
  ["yapıldı işareti", { desc: "yapılan iş Yapılacaklar'dan çıkar, altta 'yapıldı' listesinde kalır; çıkarılan sayısına girmez", fn: () => { const r = { todos: [{ title: "Römork", date: "2026-11-01" }], done: ["m:römork", "docs", "x"] }; return [RS.stepsOf(r).map((s) => s.key).join(), RS.doneSteps(r).map((s) => s.key).join(), RS.hiddenCount(r)]; }, ok: ([a, b, n]) => a === "parents,schools,gsim" && b === "m:römork,docs" && n === 0 }],
  ["yapıldı: son tarih", { desc: "aynı günün işi yapıldıysa talimattaki son tarih de yapıldı sayılır; diğer gün sayılmaz", fn: () => { const r = { notice: { deadlines: [{ title: "Online kayıt son gün", date: "2099-11-01" }, { title: "Ödeme son gün", date: "2099-11-05" }], tasks: [{ title: "Online kaydı yap", date: "2099-11-01" }, { title: "Ücreti öde", date: "2099-11-05" }] }, done: ["t:online-kaydı-yap"] }; return [RS.doneFor(r, "Online kayıt son gün", "2099-11-01"), RS.doneFor(r, "Ödeme son gün", "2099-11-05")]; }, ok: ([a, b]) => a === true && b === false }],
  ["ana sayfa yarış planı", { desc: "\"Foça Kupası: Online kayıt son gün\" planı yarışı ve işi bulur; Yapıldı işi Yapılanlar'a yazar; yarışın kendi planı whole", fn: () => {
    const list = [{ id: "r1", name: "Foça", notice: { tasks: [{ title: "Online kayıt yap" }] } }, { id: "r2", name: "Foça Kupası", notice: { tasks: [{ title: "Online kayıt yap", date: "2026-10-20" }, { title: "Ücreti öde" }] } }];
    const a = RS.planRaceStep({ title: "Foça Kupası: Online kayıt son gün" }, list);
    const b = RS.planRaceStep({ title: "Foça Kupası" }, list);
    const c = RS.planRaceStep({ title: "Doktor" }, list);
    const d = RS.withStepDone(a.race, a.step.key);
    return [a.race.id, a.step.key, b.whole, c, RS.stepsOf(d).some((s) => s.key === a.step.key), RS.doneSteps(d).map((s) => s.key).join()];
  }, ok: ([id, key, whole, none, still, done]) => id === "r2" && key === "t:online-kayıt-yap" && whole === true && none === null && still === false && done === "t:online-kayıt-yap" }],
  ["yapıldı: sesle eşleşme", { desc: "\"velilere imzalattık\" değil \"veli imza yapıldı\" gibi sözler işi bulur; belirsizse yok", fn: () => [RS.matchStep({}, "velilere imzalat")?.key, RS.matchStep({ abroad: true }, "vize başvurusu")?.key, RS.matchStep({}, "deniz")], ok: ([a, b, c]) => a === "parents" && b === "a:vize" && c === null }],
  ["oteller: talimattakiler", { desc: "elle düzenlenmediyse talimattaki oteller, adsız atlanır", fn: () => RS.raceHotels({ notice: { hotels: [{ name: "A Otel", phone: "0232 111 22 33" }, { name: "" }, { name: "B Pansiyon" }] } }).map((h) => h.name), ok: (a) => a.join("|") === "A Otel|B Pansiyon" }],
  ["oteller: elle düzenlenen önce", { desc: "hotels alanı varsa talimata bakılmaz", fn: () => RS.raceHotels({ hotels: [{ name: "C Otel" }], notice: { hotels: [{ name: "A Otel" }] } }).map((h) => h.name), ok: (a) => a.join("|") === "C Otel" }],
  ["oteller: arama bağlantısı", { desc: "telefon tel: bağlantısı olur, kısa/boş olmaz", fn: () => [RS.telOf("0232 (111) 22-33"), RS.telOf("+90 532 000 00 00"), RS.telOf("123"), RS.telOf("")], ok: ([a, b, c, d]) => a === "tel:02321112233" && b === "tel:+905320000000" && c === "" && d === "" }],
  ["oteller: yeni talimatla birleşme", { desc: "elle girilen telefon kalır, oda fiyatı yenilenir, yeni otel eklenir, elle eklenen silinmez", fn: () => RS.mergeHotels([{ name: "A Otel", phone: "0532 000 00 00", note: "", rooms: [] }, { name: "Elle Otel", phone: "", note: "", rooms: [] }], [{ name: "a  otel", phone: "0232 111 22 33", note: "Kod YELKEN", rooms: [{ cap: 2, amount: 3000, price: "3.000 TL" }] }, { name: "B Pansiyon", phone: "0232 999 88 77" }]), ok: (a) => a.length === 3 && a[0].phone === "0532 000 00 00" && a[0].note === "Kod YELKEN" && a[0].rooms.length === 1 && a[1].name === "Elle Otel" && a[2].name === "B Pansiyon" && a[2].phone === "0232 999 88 77" }],
  ["oteller: düzenlenmemişte birleşme yok", { desc: "hotels alanı yoksa null (talimattakiler kullanılır)", fn: () => RS.mergeHotels(undefined, [{ name: "A" }]), ok: (x) => x === null }],
  ["tahmini plan satırları", { desc: "çıkış, çıkış yeri, buluşma (farklıysa), dönüş; boşlar yok", fn: () => [RS.tripRows({ departDate: "2026-10-11", departTime: "07:00", departFrom: "Dikili", meetPoint: "Belediye önü", returnDate: "2026-10-16" }), RS.tripRows({ departFrom: "Dikili", meetPoint: "Dikili" }), RS.tripRows({})], ok: ([a, b, c]) => a.map((x) => x[0]).join("|") === "Çıkış|Çıkış yeri|Buluşma noktası|Dönüş" && a[0][1].endsWith("· 07:00") && b.length === 1 && c.length === 0 }],
  ["yolculuk özeti", { desc: "çıkış, buluşma, dönüş satırları; boşsa satır yok", fn: () => [RS.tripText({ departDate: "2026-10-11", departTime: "07:00", departFrom: "Dikili", meetPoint: "Belediye önü", returnDate: "2026-10-16", returnTime: "18:00" }), RS.tripText({})], ok: ([a, b]) => a.length === 2 && a[0].startsWith("Çıkış: 11 Eki") && a[0].includes("07:00 · Dikili · buluşma Belediye önü") && a[1].startsWith("Dönüş: 16 Eki") && a[1].endsWith("18:00") && b.length === 0 }],
  ["yolculuklu plan", { desc: "plan çıkış saatinde başlar, dönüşte biter, yeri buluşma noktası", fn: async () => { let got; await RS.addRacePlan(async (d) => ((got = d[0]), { plans: 1 }), { name: "Foça", startDate: "2026-10-12", endDate: "2026-10-15", district: "Foça", city: "İzmir", departDate: "2026-10-11", departTime: "07:00", departFrom: "Dikili", meetPoint: "", returnDate: "2026-10-16" }, {}); return got; }, ok: (p) => p.date === "2026-10-11" && p.time === "07:00" && p.endDate === "2026-10-16" && p.place === "Dikili" }],
  ["yurt içi varsayılan", { desc: "eski yarış (abroad yok) yurt içi; kayıt temizliği boolean", fn: () => [RS.freshRace().abroad, RS.stepsOf({ skips: ["a:vize"] }).some((s) => s.group === "abroad")], ok: ([a, b]) => a === false && b === false }],
  ["elle iş temizliği", { desc: "boş başlık atılır, bozuk tarih silinir", fn: () => RS.cleanTodos([{ title: "  A  ", date: "7 Ekim" }, { title: "" }]), ok: (r) => r.length === 1 && r[0].title === "A" && r[0].date === "" }],
  ["talimat temizliği", { desc: "bilinmeyen alan atılır", fn: async () => (await import("@/features/athletes/races")).cleanNotice({ venue: "Foça", hack: "x", classes: ["ILCA", 5] }), ok: (r) => r.venue === "Foça" && !("hack" in r) && r.classes.join() === "ILCA" }],
]);

// Talimat dosyası: yeniden yüklenen talimat kayıtlı bilgiyle karşılaştırılır (raceNotice.js), künye temizliği (races.js)
const RN = await import("@/features/athletes/raceNotice");
const OLD_N = { name: "Foça", startDate: "2026-10-07", endDate: "2026-10-11", notice: { deadlines: [{ date: "2026-10-01", title: "Kayıt son gün" }], schedule: [{ date: "2026-10-07", title: "Kayıt" }], fees: [{ title: "Kayıt", amount: "1.250 TL" }], classes: ["ILCA 4", "ILCA 6"] } };
group("Talimat dosyası")([
  ["aynı talimat", { desc: "başka kelimelerle okunsa da fark yok", fn: () => RN.noticeDiff(OLD_N, { name: "Foça Ligi", startDate: "2026-10-07", endDate: "2026-10-11", deadlines: [{ date: "2026-10-01", title: "Online kayıt bitişi" }], schedule: [{ date: "2026-10-07", title: "Kayıt ve ölçüm" }], fees: [{ title: "Kayıt ücreti", amount: "1250 TL" }], classes: ["ilca 4", "ILCA6"] }).length, ok: (r) => r === 0 }],
  ["tarih farkı", { desc: "yarış tarihi ve yeni son tarih", fn: () => RN.noticeDiff(OLD_N, { startDate: "2026-10-08", endDate: "2026-10-12", deadlines: [{ date: "2026-10-03", title: "Kayıt son gün" }] }).join(" | "), ok: (r) => r.includes("Yarış tarihi: 7.10-11.10 → 8.10-12.10") && r.includes("Yeni son tarih: 3.10 Kayıt son gün") && r.includes("Artık yok: 1.10 Kayıt son gün") }],
  ["ücret farkı", { desc: "1.250 TL → 1.500 TL", fn: () => RN.noticeDiff(OLD_N, { deadlines: OLD_N.notice.deadlines, fees: [{ amount: "1.500 TL" }] }).join(), ok: (r) => r === "Ücretler: 1.250 TL → 1.500 TL" }],
  ["ilk talimat", { desc: "kayıtlı talimat yoksa fark aranmaz (eksik alan fark sayılmaz)", fn: () => RN.noticeDiff({ name: "A" }, { classes: ["Optimist"] }).length, ok: (r) => r === 0 }],
  ["bilgileri güncelle", { desc: "tarih ve yer talimattan, ad kalır", fn: () => RN.applyNotice({ name: "Foça", city: "İzmir", district: "Foça", startDate: "2026-10-07", endDate: "2026-10-11" }, { name: "TYF Ligi", startDate: "2026-10-08", endDate: "2026-10-12", district: "Çeşme" }, true), ok: (r) => r.name === "Foça" && r.startDate === "2026-10-08" && r.district === "Çeşme" && r.city === "İzmir" }],
  ["yurt dışı talimat", { desc: "İngilizce ilan yurt dışı derse yarış yurt dışı olur, il/ilçe yerine ülke/şehir", fn: () => RN.applyNotice({ name: "D'Azur", city: "İzmir", district: "", startDate: "", endDate: "" }, { abroad: true, city: "Fransa", district: "Cannes", startDate: "2027-02-12", endDate: "2027-02-16" }), ok: (r) => r.abroad === true && r.city === "Fransa" && r.district === "Cannes" && r.startDate === "2027-02-12" }],
  ["yurt dışı kalır", { desc: "yurt içi talimat yurt dışı yarışı yurt içine çevirmez", fn: () => RN.applyNotice({ name: "A", abroad: true, city: "Fransa", district: "Cannes", startDate: "2027-02-12", endDate: "2027-02-16" }, { abroad: false, city: "İzmir" }).abroad, ok: (r) => r === true }],
  ["güncellemesiz", { desc: "dolu alanlara dokunulmaz", fn: () => RN.applyNotice({ name: "Foça", startDate: "2026-10-07", endDate: "2026-10-11", city: "", district: "" }, { startDate: "2026-10-08" }).startDate, ok: (r) => r === "2026-10-07" }],
  ["eklenen evrak künyesi", { desc: "Storage adresi olmayan ya da bozuk kimlikli evrak atılır (races.js cleanRaceFiles)", fn: () => RS.cleanRaceFiles([{ id: "abc123", name: "dekont.pdf", size: "500", url: "https://firebasestorage.googleapis.com/v0/b/x/o/a" }, { id: "a/b", url: "https://firebasestorage.googleapis.com/x" }, { id: "ok1", url: "https://kotu.site/x" }, null]), ok: (r) => r.length === 1 && r[0].size === 500 && r[0].name === "dekont.pdf" }],
  ["yarışta evrak alanı", { desc: "files temizlenip saklanır", fn: () => RS.RACE_FIELDS.includes("files"), ok: (r) => r === true }],
  ["künye", { desc: "bozuk kimlik atılır", fn: () => [RS.cleanNoticeFile({ id: "a/b" }), RS.cleanNoticeFile({ id: "Ab12", name: "x.pdf", size: "2000", parts: 0 })], ok: ([a, b]) => a === null && b.size === 2000 && b.parts === 1 }],
]);

// Yarış evrakı (raceDocs.js, budgetDoc.js): yazı yardımcıları ve gerçek PDF üretimi (yazı tipleri public/fonts)
const RD = await import("@/features/athletes/raceDocs");
const BD = await import("@/features/athletes/budgetDoc");
const { PDFDocument } = await import("pdf-lib");
const pub = (f) => new Uint8Array(readFileSync(new URL(`../../../public/${f}`, import.meta.url)));
const FONTS = { ...Object.fromEntries(Object.entries(RD.FONT_FILES).map(([k, f]) => [k, pub(`fonts/${f}`)])), logo: pub("club-logo.png"), tyf: pub("forms/tyf-logo.png"), gsb: pub("forms/gsb-logo.png") };
const DOC_ATH = [
  { id: "a", studentName: "Ali Kaya", studentTc: "11111111110", studentSchoolAndClass: "Gelişim Lisesi 9/B", parentName: "Veli Kaya", fatherName: "Veli", motherName: "Ayşe" },
  { id: "b", studentName: "Zeynep Su" },
];
const DOC_RACE = { name: "TYF Yelken Ligi ILCA 1. Ayak", district: "Foça", city: "İzmir", startDate: "2026-10-07", endDate: "2026-10-11", clubNo: "GID-2026-09", budget: BUD, athleteIds: ["a", "b"] };
const COACH = { name: "Deneme Antrenör", tc: "11111111110", sicil: "0001234", phone: "555 000 00 00", email: "a@b.c", club: "SERBEST", city: "İZMİR", boatLength: "520" };
const pages = async (bytes) => (await PDFDocument.load(bytes)).getPageCount();

// Veli bilgi notu (athleteSheet.js): sporcu başına tek sayfa
const BGT = await import("@/features/athletes/budget");
const RF = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
const AS = await import("@/features/athletes/athleteSheet");
const SHEET_RACE = {
  ...DOC_RACE,
  departDate: "2026-10-06", departTime: "07:00", departFrom: "Dikili",
  notice: { schedule: [{ date: "2026-10-07", time: "09:00", title: "Kayıt" }, { date: "2026-10-07", time: "13:00", title: "1. yarış" }, { date: "2026-10-08", time: "11:00", title: "Yarışlar" }] },
  hotels: [{ name: "Foça Otel", phone: "0232 000 00 00" }],
  budget: { staff: 1, nights: 4, items: [{ id: "k", cat: "Kayıt", title: "Kayıt ücreti", amount: 500, unit: "athlete", qty: 1 }, { id: "m", cat: "Ulaşım", title: "Minibüs", amount: 2000, unit: "shared", qty: 1 }, { id: "c", cat: "Diğer", title: "Antrenör yolluğu", amount: 1000, unit: "shared", qty: 1, club: true }] },
};
group("Veli bilgi notu")([
  ["program günleri", { desc: "talimattaki program güne göre toplanır", fn: () => AS.programDays(SHEET_RACE).map((d) => d.items.length), ok: (r) => r.join() === "2,1" }],
  ["sporcu payı", { desc: "kayıt 500 + minibüs 2000/2 = 1500; kulübün kalemi girmez", fn: () => AS.sheetData(SHEET_RACE, DOC_ATH[0], 2).money, ok: (m) => m.total === 1500 && m.lines.length === 2 && m.club.join() === "Antrenör yolluğu" }],
  ["konaklama", { desc: "evrakta yazılan otel öne çıkar, giriş-çıkış yarış tarihleri", fn: () => AS.stayOf({ ...SHEET_RACE, hotelName: "foça otel" }), ok: (s) => s.hotels.length === 1 && s.hotels[0].phone && s.nights === 4 }],
  ["eksik bölümler", { desc: "bilgisiz yarışta dört bölüm de boş görünür", fn: () => AS.sheetParts({ name: "A", startDate: "2026-10-07" }, 1).filter((x) => !x[2]).map((x) => x[0]), ok: (r) => r.join() === "Yolculuk,Program,Konaklama,Son tarihler,Bütçe" }],
  ["yaklaşan son tarihler", { desc: "geçmiş tarih atlanır, sıralı, kalan gün yazılır", fn: () => AS.upcomingDates({ notice: { deadlines: [{ title: "Kayıt son gün", date: "2026-10-19" }, { title: "Eski", date: "2026-10-01" }] }, todos: [{ title: "Ölçüm", date: "2026-10-13" }] }, "2026-10-12"), ok: (r) => r.map((x) => `${x.title}:${x.left}`).join() === "Ölçüm:1,Kayıt son gün:7" }],
  ["bölüm seçimi", { desc: "kapatılan bütçe ve program notta yer almaz", fn: () => AS.sheetData(SHEET_RACE, DOC_ATH[0], 2, { budget: false, program: false }), ok: (d) => !d.money.lines.length && !d.days.length && d.stay.hotels.length === 1 }],
  ["PDF son tarihli", { desc: "son tarihler bölümüyle de tek sayfa", fn: async () => pages(await AS.buildAthleteSheet({ ...SHEET_RACE, notice: { ...SHEET_RACE.notice, deadlines: [{ title: "Kayıt ücreti son gün", date: "2099-01-05" }] } }, [DOC_ATH[0]], FONTS)), ok: (r) => r === 1 }],
  ["PDF", { desc: "iki sporcuya iki sayfa", fn: async () => pages(await AS.buildAthleteSheet(SHEET_RACE, DOC_ATH, FONTS)), ok: (r) => r === 2 }],
  ["PDF boş yarış", { desc: "bilgisiz yarışta da tek sayfa açılır", fn: async () => pages(await AS.buildAthleteSheet({ name: "A" }, [DOC_ATH[1]], FONTS)), ok: (r) => r === 1 }],
  ["otel oda fiyatları", { desc: "talimattaki odalar: 2 kişilik 3.000/gece, kişi başı 1.500; kişi başı yazılan 3 kişilik 1.000 → oda 3.000", fn: () => AS.stayOf({ ...SHEET_RACE, hotels: [{ name: "Foça Otel", rooms: [{ cap: 2, amount: 3000, per: "room", board: "Oda kahvaltı" }, { cap: 3, amount: 1000, per: "person" }] }] }).hotels[0].rooms, ok: (r) => r.length === 2 && r[0].name === "2 kişilik" && /3\.000/.test(r[0].night) && /1\.500/.test(r[0].each) && r[0].board === "Oda kahvaltı" && /3\.000/.test(r[1].night) }],
  ["PDF oda fiyatlı", { desc: "3 otel, 5'er oda tipi ve uzun programla tek sayfa", fn: async () => pages(await AS.buildAthleteSheet({ ...SHEET_RACE, hotels: [1, 2, 3].map((i) => ({ name: `Otel ${i}`, phone: "0232", rooms: [1, 2, 3, 4, 5].map((c) => ({ cap: c, amount: 1000 * c, per: "room", board: "Yarım pansiyon" })) })), notice: { schedule: Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-0${1 + Math.floor(i / 6)}`, time: "10:00", title: `Yarış ${i}` })) } }, [DOC_ATH[0]], FONTS)), ok: (r) => r === 1 }],
  ["yalnız bir sporcunun kalemi", { desc: "Ali'ye yazılan ekipman 800 yalnız Ali'nin notunda; Zeynep'inkinde yok", fn: () => { const r = { ...SHEET_RACE, budget: { ...SHEET_RACE.budget, items: [...SHEET_RACE.budget.items, { id: "e", cat: "Tekne/Ekipman", title: "Ekipman", amount: 800, unit: "athlete", qty: 1, only: ["a"] }] } }; return [AS.sheetData(r, DOC_ATH[0], 2).money.total, AS.sheetData(r, DOC_ATH[1], 2).money.total]; }, ok: ([a, b]) => a === 2300 && b === 1500 }],
  ["uzun program iki sütun", { desc: "6 gün × 6 madde tek sütuna sığmaz: iki sütun, hiçbir madde atılmaz, ilk günler solda", fn: () => { const days = Array.from({ length: 6 }, (_, i) => ({ date: `2026-10-0${i + 1}`, items: Array.from({ length: 6 }, (_, j) => ({ time: `${9 + j}:00`, title: `Madde ${i}-${j}` })) })); const l = AS.programLayout(days, 300, 500, (t, z) => String(t).length * z * 0.5); const items = l.cols.flatMap((c) => c.rows.filter((x) => !x.day)); return [l.cols.length, items.length, l.h <= 300, l.cols[0].rows[0].label.includes("1 Ekim")]; }, ok: ([n, c, fit, first]) => n === 2 && c === 36 && fit && first }],
  ["kısa program tek sütun", { desc: "sığan program tek sütunda kalır", fn: () => AS.programLayout(AS.programDays(SHEET_RACE), 300, 500, (t, z) => String(t).length * z * 0.5).cols.length, ok: (r) => r === 1 }],
  ["yapıldı: son tarih (farklı gün)", { desc: "işin tarihi son tarihten farklı olsa da adı benzeyen iş yapıldıysa son tarih yapıldı sayılır", fn: () => { const r = { notice: { deadlines: [{ title: "Online kayıt son gün", date: "2099-11-03" }, { title: "Ödeme son gün", date: "2099-11-05" }], tasks: [{ title: "Online kaydı yap", date: "2099-11-01" }, { title: "Kayıt ücretini öde", date: "2099-11-05" }, { title: "Ölçüm belgesini hazırla", date: "2099-11-03" }] }, done: ["t:online-kaydı-yap"] }; return [RS.doneFor(r, "Online kayıt son gün", "2099-11-03"), RS.doneFor(r, "Ödeme son gün", "2099-11-05")]; }, ok: ([a, b]) => a === true && b === false }],
  ["son tarih yapıldı", { desc: "uygulamada yapıldı işaretlenen iş notta 'Yapıldı' olur, diğeri kalan gün", fn: () => AS.upcomingDates({ todos: [{ title: "Römork", date: "2099-01-05" }, { title: "Can yeleği", date: "2099-01-07" }], done: ["m:römork"] }, "2099-01-01").map((d) => `${d.title}:${d.done}`).join(), ok: (r) => r === "Römork:true,Can yeleği:false" }],
  ["PDF uzun program", { desc: "8 günlük, 48 maddelik programla da tek sayfa", fn: async () => pages(await AS.buildAthleteSheet({ ...SHEET_RACE, notice: { deadlines: [{ title: "Kayıt son gün", date: "2099-01-05" }], schedule: Array.from({ length: 48 }, (_, i) => ({ date: `2026-10-0${1 + Math.floor(i / 6)}`, time: `${9 + (i % 6)}:00`, title: `Yarışlar ve ölçüm işlemleri ${i + 1}` })) } }, [DOC_ATH[0]], FONTS)), ok: (r) => r === 1 }],
]);
group("Bütçe: yalnız seçilen sporcular")([
  ["pay", RF("sporcu başı 500 yalnız Ali'ye: toplam 500, Ali 500, Zeynep 0; ortak kalem ikiye bölünür", () => { const t = BGT.totals({ items: [{ id: "x", cat: "Diğer", title: "Ekipman", amount: 500, unit: "athlete", qty: 1, only: ["a"] }, { id: "m", cat: "Ulaşım", title: "Minibüs", amount: 2000, unit: "shared", qty: 1 }] }, 2, ["a", "b"]); return t.total === 2500 && BGT.forAthlete(t, "a") === 1500 && BGT.forAthlete(t, "b") === 1000 && t.perAthlete === 1000 && t.varies; })],
  ["varsayılan herkes", RF("only yoksa ya da yarıştan çıkan sporcuysa kalem herkese", () => { const t = BGT.totals({ items: [{ id: "x", cat: "Diğer", title: "Ekipman", amount: 500, unit: "athlete", qty: 1, only: ["z"] }] }, 2, ["a", "b"]); return t.total === 1000 && !t.varies && !t.lines[0].only; })],
  ["yazı", RF("satırda kaç sporcu için olduğu yazar", () => { const t = BGT.totals({ items: [{ id: "x", cat: "Diğer", title: "Lisans", amount: 300, unit: "athlete", qty: 1, only: ["a", "b"] }] }, 3, ["a", "b", "c"]); return /2 sporcu/.test(BGT.howText(t.lines[0], t)) && t.total === 600; })],
  ["temizlik", RF("geçersiz kimlik atılır, tekrar yok", () => BGT.cleanItem({ id: "x", title: "A", amount: 1, unit: "athlete", only: ["a", "a", "x/y"] }).only.join() === "a")],
  ["asistan adları", RF("'Ali için' → yalnız Ali; yarışta olmayan ad herkese kalır", async () => { const { whoFor } = await import("@/features/athletes/raceBudgetAi"); const r = whoFor([{ title: "Ekipman", for: "Ali" }, { title: "Lisans", for: "Mehmet" }, { title: "Otel" }], DOC_ATH); return r.items[0].only?.join() === "a" && !r.items[1].only && !r.items[2].only && r.missed.join() === "Mehmet"; })],
]);
group("Yarış evrakı")([
  ["bulunma eki", { desc: "İZMİR’de ANTALYA’da ÇEŞME’de İZMİT’te FOÇA’da", fn: () => ["İzmir", "Antalya", "Çeşme", "İzmit", "Foça"].map(RD.locative).join(" "), ok: (r) => r === "İZMİR’de ANTALYA’da ÇEŞME’de İZMİT’te FOÇA’da" }],
  ["tarih aralığı", { desc: "07-11 EKİM 2026 · 28 EYLÜL-02 EKİM 2026", fn: () => [RD.rangeText("2026-10-07", "2026-10-11"), RD.rangeText("2026-09-28", "2026-10-02"), RD.rangeTitle("2026-10-07", "2026-10-11")], ok: ([a, b, c]) => a === "07-11 EKİM 2026" && b === "28 EYLÜL-02 EKİM 2026" && c === "07-11 Ekim 2026" }],
  ["yazı sayısı", { desc: "GID-2026-09 + 2 → GID-2026-11", fn: () => RD.nextNo("GID-2026-09", 2), ok: (r) => r === "GID-2026-11" }],
  ["sporcu bilgisi", { desc: "büyük harf ad, sınıf okul adından", fn: () => RD.athleteInfo(DOC_ATH[0]), ok: (r) => r.name === "ALİ KAYA" && r.cls === "9/B" && r.letterSchool === "GELİŞİM LİSESİ" && r.parents === "VELİ/AYŞE" }],
  ["eksik alanlar", { desc: "boş kartta 17 eksik (katılım formu seçili değilse 14; sicil, yelken no, cinsiyet aranmaz)", fn: () => [RD.missing(DOC_ATH[1]).length, RD.missing(DOC_ATH[1], ["school", "hotel"]).length], ok: ([a, b]) => a === 17 && b === 14 }],
  ["kulüp yazısı bilgisi", { desc: "boşlar yarıştan gelir", fn: () => RD.clubInfo(DOC_RACE), ok: (r) => r.event === DOC_RACE.name && r.place === "Foça-İzmir" && r.from === "2026-10-07" && r.to === "2026-10-11" }],
  ["otel izni bilgisi", { desc: "otel boş, tarihler yarıştan", fn: () => RD.hotelInfo(DOC_RACE), ok: (r) => r.hotel === "" && r.from === "2026-10-07" && r.to === "2026-10-11" }],
  ["tek evrak tarihi", { desc: "kulüp yazısı, otel izni ve TYF basım zamanı evrak tarihinden (eski kulüp tarihi sayılmaz)", fn: () => { const r = { ...DOC_RACE, letterDate: "2026-10-01", clubDate: "2026-09-20", docsAt: "2026-10-01T09:05:00" }; return [RD.clubInfo(r).date, RD.hotelInfo(r).date, RD.stamp(r), RD.stamp({ ...r, letterDate: "2026-10-03" })]; }, ok: ([a, b, c, d]) => a === "2026-10-01" && b === "2026-10-01" && c === "01.10.2026 09:05" && d === "03.10.2026" }],
  ["belge seçimi", { desc: "yeni yarışta yalnız kulüp izin yazısı kapalı, diğerleri seçili; son yarışın seçimi taşınmaz; bilinmeyen anahtar atılır", fn: () => [RD.DOC_DEFAULT.join(), RS.freshRace({ docs: ["kafile"] }).docs, RD.cleanDocs(["club", "x", "kafile"]).join()], ok: ([a, b, c]) => a === RD.DOCS.map(([k]) => k).filter((k) => k !== "club").join() && b === null && c === "kafile,club" }],
  ["seyahat dilekçesi ek sayısı", { desc: "2 sporcu + antrenör → (3 Adet)", fn: async () => { const { PDFDocument: P } = await import("pdf-lib"); const b = await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS, ["travel"], COACH); return new TextDecoder("latin1").decode(b).length > 0 && RD.kafileRows(DOC_ATH.map(RD.athleteInfo), COACH).length === 3 && (await P.load(b)).getPageCount() === 1; }, ok: (r) => r === true }],
  ["veli izni telefon", { desc: "İrtibat Telefonu her zaman veli telefonu (sporcununki değil); veli telefonu yoksa veli izni hazırlanmaz (yalnız veli izni seçiliyse)", fn: () => [RD.athleteInfo({ parentPhone: "0532 111 22 33" }).phone, RD.athleteInfo({ studentPhone: "0555", parentPhone: "0532" }).phone, RD.phoneMissing([{ studentName: "A", parentPhone: "0532" }, { studentName: "B", studentPhone: "0555" }], ["parent"]).map((a) => a.studentName).join(), RD.phoneMissing([{ studentName: "B" }], ["kafile"]).length], ok: ([a, b, c, d]) => a === "0532 111 22 33" && b === "0532" && c === "B" && d === 0 }],
  ["sporcu başına sayfa", { desc: "2 sporculu veli izni 2 ayrı tek sayfalık PDF olur (tek sporcunun belgesi paylaşılsın)", fn: async () => { const l = await RD.splitPages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS, ["parent"])); return [l.length, ...(await Promise.all(l.map(pages)))]; }, ok: ([n, a, b]) => n === 2 && a === 1 && b === 1 }],
  ["EK-2 antrenör satırı", { desc: "kafile listesinde önce antrenör (lisans no kayıtlıysa yazılır, yoksa boş; ANTRENÖR), sonra sporcular; antrenör adı yoksa satır yok", fn: () => [RD.kafileRows([RD.athleteInfo(DOC_ATH[0])], { name: "Deneme Antrenör" }), RD.kafileRows([RD.athleteInfo(DOC_ATH[0])], {}), RD.kafileRows([], { name: "X", license: "A-7" })], ok: ([a, b, c]) => a.length === 2 && a[0].name === "DENEME ANTRENÖR" && a[0].license === "" && a[0].role === "ANTRENÖR" && a[1].role === "SPORCU" && b.length === 1 && c[0].license === "A-7" }],
  ["EK-3/C antrenör", { desc: "1 sayfa; seçiliyse eksik: baba, anne adı, doğum yeri ve tarihi de sorulur", fn: async () => [await pages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS, ["adult"], COACH)), RD.coachMissing(RD.cleanCoach(COACH), ["adult"]).join(), RD.coachMissing(RD.cleanCoach(COACH), ["kafile"]).length], ok: ([a, b, c]) => a === 1 && b === "baba adı,anne adı,doğum yeri,doğum tarihi" && c === 0 }],
  ["tüm evrak PDF", { desc: "2 sporcu: okul 1 + kafile 1 + seyahat 1 + veli 2 + EK-3/C 1 + kulüp 2 + otel 1 + antrenör 1 + katılım 1 = 11 sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS)), ok: (r) => r === 11 }],
  ["tek belge", { desc: "yalnız otel izni → 1 sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS, ["hotel"])), ok: (r) => r === 1 }],
  ["kalabalık otel izni", { desc: "25 sporcu yine tek sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, studentName: `Sporcu ${i + 1}` })), FONTS, ["hotel"])), ok: (r) => r === 1 }],
  ["TYF formları sınıfa göre", { desc: "ILCA 4 ve Optimist sporcuları → 2 antrenör + 2 katılım formu; yarışta sınıf yazılınca 1 + 1", fn: async () => {
    const list = [{ ...DOC_ATH[0], boatClass: "ILCA 4" }, { ...DOC_ATH[1], boatClass: "Optimist" }];
    return [await pages(await RD.buildRaceDocs(DOC_RACE, list, FONTS, ["coach", "entry"], COACH)), await pages(await RD.buildRaceDocs({ ...DOC_RACE, entryClass: "ILCA 4" }, list, FONTS, ["coach", "entry"], COACH))];
  }, ok: ([a, b]) => a === 4 && b === 2 }],
  ["kalabalık katılım formu", { desc: "40 sporcu sonraki sayfaya taşar, başlık tekrarlanır", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, studentName: `Sporcu ${i + 1}`, tyfNo: "0295134", sailNo: "216382" })), FONTS, ["entry"], COACH)), ok: (r) => r === 2 }],
  ["katılım formu sporcu satırı", { desc: "sicil, yelken no, cinsiyet büyük harf, doğum tarihi noktalı", fn: () => RD.athleteInfo({ studentName: "Mete Ok", tyfNo: "0295134", sailNo: "216382", studentGender: "Erkek", studentBirthDate: "2013-04-29" }), ok: (r) => r.tyfNo === "0295134" && r.sailNo === "216382" && r.gender === "ERKEK" && r.birthDot === "29.04.2013" }],
  ["antrenör bilgisi", { desc: "başlangıçta ad/e-posta hesaptan, destek botu kulübün; eksik: T.C., sicil, telefon", fn: () => RD.coachMissing(RD.cleanCoach(RD.coachStart({ name: "Deneme Antrenör", email: "a@b.c" }))), ok: (r) => r.join() === "T.C.,sicil no,telefon" }],
  ["bütçe PDF: tahmini plan", { desc: "yolculuk bilgisiyle bütçe çıktısı açılır", fn: async () => pages(await BD.buildBudgetPdf({ ...DOC_RACE, departDate: "2026-10-11", departTime: "07:00", departFrom: "Dikili", meetPoint: "Belediye önü", returnDate: "2026-10-16", returnTime: "18:00" }, DOC_ATH, FONTS)), ok: (r) => r >= 1 }],
  ["bütçe PDF", { desc: "bütçe çıktısı açılır", fn: async () => pages(await BD.buildBudgetPdf(DOC_RACE, DOC_ATH, FONTS)), ok: (r) => r >= 1 }],
]);

// Yarış sonuçları (raceResults.js)
const RR = await import("@/lib/raceResults");
group("Yarış sonuçları")([
  ["temizlik", RF("sıra sayı, boşlar atılır", () => { const c = RR.cleanResults({ fleet: "24", rows: { a1: { place: "3", note: " ILCA 4 " }, a2: { place: "", note: "" }, "x/y": { place: 1 } } }); return c.fleet === 24 && c.rows.a1.place === 3 && c.rows.a1.note === "ILCA 4" && !c.rows.a2 && !c.rows["x/y"]; })],
  ["metin", RF("3. / 24 · ILCA 4", () => RR.placeText({ fleet: 24, rows: { a1: { place: 3, note: "ILCA 4" } } }, "a1") === "3. / 24 · ILCA 4")],
  ["başladı mı", RF("başlangıç bugün/önce", () => RR.resultsOpen({ startDate: "2026-10-05" }, "2026-10-05") && !RR.resultsOpen({ startDate: "2026-10-06" }, "2026-10-05"))],
  ["sporcu geçmişi", RF("yeniden eskiye, yalnız katıldıkları", () => { const h = RR.historyOf([{ id: "r1", name: "A", startDate: "2026-05-01", athleteIds: ["a1"], results: { fleet: 10, rows: { a1: { place: 2 } } } }, { id: "r2", name: "B", startDate: "2026-09-01", athleteIds: ["a1"] }, { id: "r3", name: "C", startDate: "2026-10-01", athleteIds: ["a2"] }], "a1"); return h.map((x) => x.id).join() === "r2,r1" && h[1].text === "2. / 10"; })],
  ["Instagram sırası", RF("dereceli önce, sonuç satırda", () => { const l = RR.withResults([{ name: "Ali" }, { name: "Ece" }], ["a1", "a2"], { fleet: 0, rows: { a2: { place: 1 } } }); return l[0].name === "Ece" && l[0].res === "1." && !l[1].res; })],
]);

// Sonuç belgesi (resultSheet.js): kategori, kızlar sırası, bizim sporcuları bulma
const SH = await import("@/lib/resultSheet");
const SHEET = SH.cleanSheet([
  { cls: "OPTİMİST", rows: [
    { rank: 1, name: "Can Demir", club: "Foça YK", sex: "E" },
    { rank: 2, name: "Ela Su", cat: "J", sex: "K" },
    { rank: 3, name: "KAYA Ali", sail: "TUR 1204", club: "Dikili Yelken", cat: "Junior" },
    { rank: 4, name: "Defne Ak", cat: "", sex: "Kız" },
    { rank: 5, name: "Zeynep Yıldız", club: "Dikili Yelken", sex: "" },
    { rank: 6, name: "Ece Tan", cat: "Bambino", sex: "F" },
    { rank: 7, name: "Ali Kaya", sail: "TUR 999", club: "Ayvalık", cat: "J" },
  ] },
  { cls: "ilca4", rows: [{ rank: 2, name: "Ayşe Şahin", sex: "W" }, { rank: 1, name: "Mert Öz" }] },
]);
const OURS = [
  { id: "a1", studentName: "Ali Kaya", sailNo: "1204" },
  { id: "a2", studentName: "Zeynep Yıldız", studentGender: "Kız" },
  { id: "a3", studentName: "Ayse Sahin", studentGender: "Kız" },
  { id: "a4", studentName: "Ozan Yok" },
];
const RANK = SH.rankOurs(SHEET, OURS);
group("Yarış sonuç belgesi")([
  ["kategori", RF("J/Junior → Junior, B → Bambino, boş → Senior; ILCA 4'te belgedeki J, ILCA 6'da kategori yok", () => SH.catOf("Optimist", "J") === "Junior" && SH.catOf("Optimist", "Bambino") === "Bambino" && SH.catOf("Optimist", "") === "Senior" && SH.catOf("ILCA 4", "J") === "Junior" && SH.catOf("ILCA 4", "") === "" && SH.catOf("ILCA 6", "J") === "")],
  ["ILCA 4 Junior (doğum yılı)", RF("2026'da 2011 ve sonrası Junior, 2010 değil; tarih yazımı okunur; yılsızda belgedeki işaret; 2027'de 2012", () => {
    const f = SH.withCats(SH.cleanSheet([{ cls: "ILCA 4.7", rows: [{ rank: 1, name: "A B", born: "2010" }, { rank: 2, name: "C D", born: "12.03.2011" }, { rank: 3, name: "E F", born: "2013" }, { rank: 4, name: "G H", cat: "J" }, { rank: 5, name: "I J", born: "2009", cat: "J" }] }, { cls: "Optimist", rows: [{ rank: 1, name: "K L", born: "2015" }] }]), 2026);
    const cats = f[0].rows.map((r) => r.cat).join();
    const next = SH.withCats(SH.cleanSheet([{ cls: "ILCA 4", rows: [{ rank: 1, name: "A B", born: "2011" }, { rank: 2, name: "C D", born: "2012" }] }]), 2027)[0].rows.map((r) => r.cat).join();
    return f[0].cls === "ILCA 4" && cats === ",Junior,Junior,Junior," && f[1].rows[0].cat === "Senior" && next === ",Junior" && SH.raceYear({ startDate: "2026-11-02" }) === 2026;
  })],
  ["ILCA 4 Junior sırası", RF("Junior kendi içinde sıralanır, sonuç satırında görünür", () => { const f = SH.withCats(SH.cleanSheet([{ cls: "ILCA 4", rows: [{ rank: 1, name: "Mert Öz", born: "2010" }, { rank: 2, name: "Ali Kaya", born: "2012" }] }]), 2026); const r = SH.rankOurs(f, [{ id: "a1", studentName: "Ali Kaya" }]); return SH.resultLine(r.a1) === "ILCA 4 genel 2. / 2 · Junior 1. / 1"; })],
  ["cinsiyet", RF("K/F/W/Kız → K, E/M/Erkek → E", () => ["K", "F", "W", "Kız", "Female"].every((x) => SH.sexOf(x) === "K") && ["E", "M", "Erkek", "Boy"].every((x) => SH.sexOf(x) === "E") && SH.sexOf("") === "")],
  ["sınıf adı ve sıra", RF("OPTİMİST → Optimist, ilca4 → ILCA 4, sıraya dizilir", () => SHEET[0].cls === "Optimist" && SHEET[1].cls === "ILCA 4" && SHEET[1].rows[0].name === "Mert Öz")],
  ["ters yazılmış ad + yelken no", RF("KAYA Ali bulunur (yelken no 1204); genel 3./7, Junior 2./3", () => RANK.a1?.cls === "Optimist" && RANK.a1.cat === "Junior" && RANK.a1.place === 3 && RANK.a1.n === 7 && RANK.a1.cp === 2 && RANK.a1.cn === 3 && RANK.a1.gp === "")],
  ["Senior ve kızlar", RF("Zeynep genel 5./7, Senior'a ayrı sıra yok; kızlar bütün kategorilerden 3./4 (karttaki cinsiyet)", () => RANK.a2?.cat === "Senior" && RANK.a2.place === 5 && RANK.a2.n === 7 && RANK.a2.cp === "" && RANK.a2.gp === 3 && RANK.a2.gn === 4)],
  ["ILCA 4 ve Türkçe harfsiz ad", RF("Ayşe Şahin ILCA 4'te 2./2, kızlarda 1./1, kategori yok", () => RANK.a3?.cls === "ILCA 4" && RANK.a3.cat === "" && RANK.a3.place === 2 && RANK.a3.gp === 1 && RANK.a3.cp === "")],
  ["listede olmayan", RF("bulunmayan sporcuya sonuç yazılmaz", () => !RANK.a4)],
  ["sonuç satırı", RF("önce genel sıra, sonra Junior ve kızlar", () => SH.resultLine(RANK.a2) === "Optimist genel 5. / 7 · Kızlar 3. / 4" && SH.resultLine(RANK.a1) === "Optimist genel 3. / 7 · Junior 2. / 3" && SH.resultLine(RANK.a3) === "ILCA 4 genel 2. / 2 · Kızlar 1. / 1")],
  ["birleştirme ve silme", RF("not kalır, belge silinince satırları gider", () => { const m = SH.mergeSheet({ fleet: 0, rows: { a2: { place: 9, note: "OCS" }, a5: { place: 4 } } }, RANK, { id: "f1", name: "s.pdf" }); const d = SH.dropSheet(m, "f1"); return m.rows.a2.place === 5 && m.rows.a2.note === "OCS" && m.rows.a2.f === "f1" && m.files.length === 1 && d.rows.a5 && !d.rows.a2 && !d.files.length; })],
  ["kayıt temizliği (belgeli)", RF("genel, Junior, kızlar sırası ve belge künyesi saklanır", () => { const c = RR.cleanResults(SH.mergeSheet(null, RANK, { id: "f1", name: "s.pdf", size: 10, parts: 1, at: "2026-10-11" })); return c.rows.a2.gp === 3 && c.rows.a1.cp === 2 && c.rows.a2.cat === "Senior" && c.rows.a2.f === "f1" && c.files[0].id === "f1" && RR.placeText(c, "a1") === "Optimist genel 3. / 7 · Junior 2. / 3"; })],
  ["sporcu geçmişi (seçilmemiş)", RF("listede bulunan sporcu yarış geçmişine girer", () => RR.historyOf([{ id: "r1", name: "A", startDate: "2026-05-01", athleteIds: [], results: { rows: { a1: { place: 2, cls: "Optimist", cat: "Junior", n: 3 } } } }], "a1").length === 1)],
  ["asistan cevabı", RF("Ali'nin sonucu kategoriyle söylenir", () => /Optimist genelde 7 sporcu içinde 3\., Junior sıralamasında 3 sporcu içinde 2\./.test(SH.resultsAnswer([{ name: "Foça Kupası", results: { rows: { a1: RANK.a1 } } }], { id: "a1", studentName: "Ali Kaya" })))],
  ["asistan sorusu", RF("ad ve yarış ayrılır; sonuç yükleme sorulmaz", () => { const a = SH.resultsAsk("Ali Kaya'nın sonuçları"); const b = SH.resultsAsk("Foça yarışında Zeynep kaçıncı oldu?"); return a?.name === "ali kaya" && b?.name === "zeynep" && b.race === "foça" && SH.resultsAsk("sonuç pdf yükle") === null; })],
]);

// Bütçe: gerçekleşen harcama (bağlı fişler)
const BG = await import("@/features/athletes/budget");
const RC = await import("@/lib/receipts");
const RCP = [{ id: "f1", date: "2026-10-20", declared: 150000 }, { id: "f2", date: "2026-10-28", declared: 250050 }, { id: "f3", date: "2026-09-01", declared: 10000 }];
group("Bütçe: harcanan")([
  ["yakın fişler", RF("7 gün önce–3 gün sonra, bağlı olan her zaman", () => BG.nearReceipts(RCP, { startDate: "2026-10-26", endDate: "2026-10-31" }, ["f3"]).map((x) => x.id).join() === "f2,f1,f3")],
  ["toplam", RF("1500 + 2500,50", () => BG.spentTotal(RCP, ["f1", "f2"], RC.totalTL) === 4000.5)],
  ["temizlik", RF("geçersiz kimlik atılır, tekrar yok", () => BG.cleanBudget({ items: [], spent: ["f1", "f1", "x/y", 5] }).spent.join() === "f1")],
]);

// Antrenman yarışları (raceScore.js): düşük puan sistemi, DNC/DNF = katılan + 1, 4 yarıştan sonra en kötüsü atılır, eşitlik (A8)
const TY = await import("@/lib/raceScore");
const TP = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));
const tfin = (...ids) => ids.map((x) => (Array.isArray(x) ? { id: x[0], name: x[0].toUpperCase(), code: x[1] } : { id: x, name: x.toUpperCase() }));
const TR3 = [
  { id: "y1", name: "Yarış 1", finishes: tfin("a", "b", "c") }, // d gelmedi → DNC
  { id: "y2", name: "Yarış 2", finishes: tfin("b", ["a", "DNF"], "c", "d") }, // a DNF, c 2. olur
  { id: "y3", name: "Yarış 3", finishes: tfin("c", "a", "b", ["d", "BFD"]) },
];
const trow = (s, id) => s.rows.find((r) => r.id === id);
group("Antrenman yarışları")([
  ["kodlu yer almaz", { desc: "DNF'nin arkasındaki bir sıra öne geçer", fn: () => TY.places(TR3[1]), ok: (r) => r.b === 1 && r.c === 2 && r.d === 3 && !r.a }],
  ["ceza puanı", { desc: "4 katılan → DNC/DNF/BFD 5 puan", fn: () => TY.standings(TR3, TP), ok: (s) => s.penalty === 5 && trow(s, "d").cells[0].code === "DNC" && trow(s, "d").cells[0].pts === 5 && trow(s, "a").cells[1].pts === 5 && trow(s, "d").cells[2].code === "BFD" }],
  ["toplam ve sıra", { desc: "c 3+2+1=6, b 2+1+3=6 (eşit, son yarışta c önde), a 1+5+2=8, d 5+3+5=13", fn: () => TY.standings(TR3, TP), ok: (s) => s.rows.map((r) => `${r.id}${r.net}`).join() === "c6,b6,a8,d13" && s.discard === 0 }],
  ["yoklamada olmayan", { desc: "yarışa eklenen herkes katılan sayılır", fn: () => TY.standings([{ id: "y1", finishes: tfin("a", "e") }], TP.slice(0, 2)), ok: (s) => s.n === 3 && s.penalty === 4 && trow(s, "b").cells[0].code === "DNC" }],
  ["sonuç atma", { desc: "4 yarışta en kötü sonuç atılır", fn: () => TY.standings([...TR3, { id: "y4", finishes: tfin("d", "a", "b", "c") }], TP), ok: (s) => s.discard === 1 && trow(s, "a").cells[1].drop && trow(s, "a").net === 1 + 2 + 2 && trow(s, "a").total === 10 }],
  ["eşitlik: iyi derece", { desc: "eşit puanda daha iyi sonucu olan önde", fn: () => TY.standings([{ id: "1", finishes: tfin("a", "b", "c") }, { id: "2", finishes: tfin("c", "a", "b") }, { id: "3", finishes: tfin("b", "c", "a") }].map((r) => ({ ...r, finishes: r.finishes })), TP.slice(0, 3)), ok: (s) => s.rows.every((r) => r.net === 6) && s.rows[0].id === "b" }],
  ["eşitlik: son yarış", { desc: "sonuçlar aynıysa son yarışta önde olan", fn: () => TY.standings([{ id: "1", finishes: tfin("a", "b") }, { id: "2", finishes: tfin("b", "a") }], TP.slice(0, 2)), ok: (s) => s.rows[0].id === "b" }],
  ["bitiş ve süre", { desc: "start varsa süre yazılır, aynı sporcu iki kez eklenmez", fn: () => { let r = { id: "y1", startAt: 1000, finishes: [] }; r = TY.addFinish(r, TP[0], 76000); r = TY.addFinish(r, TP[0], 90000); return r; }, ok: (r) => r.finishes.length === 1 && r.finishes[0].t === 75 }],
  ["sayaçsız yarış", { desc: "start yoksa süre yok", fn: () => TY.addFinish({ id: "y1", finishes: [] }, TP[0], 5000), ok: (r) => !("t" in r.finishes[0]) }],
  ["sayaçtan start", { desc: "son 2 saatte 0 olan sayaç; başka yarışın startıysa alınmaz", fn: () => [TY.startFor({ id: "y2" }, [], 1000, 5000), TY.startFor({ id: "y2" }, [{ id: "y1", startAt: 1000 }], 1000, 5000), TY.startFor({ id: "y2" }, [], 1000, 1000 + 3 * 3600e3), TY.startFor({ id: "y2" }, [], 9000, 5000)], ok: ([a, b, c, d]) => a === 1000 && b === null && c === null && d === null }],
  ["kod, sıra, çıkar", { desc: "DNF ver/kaldır, yukarı taşı, çıkar", fn: () => { let r = { id: "y", finishes: tfin("a", "b", "c") }; r = TY.setCode(r, "b", "DNF"); const coded = r.finishes[1].code; r = TY.setCode(r, "b", ""); r = TY.moveFinish(r, "c", -1); r = TY.removeFinish(r, "a"); return [coded, r.finishes.map((f) => f.id).join(), "code" in r.finishes[1]]; }, ok: ([c, ids, has]) => c === "DNF" && ids === "c,b" && !has }],
  ["kayıt temizliği", { desc: "bilinmeyen kod, tekrar eden sporcu ve boş ad atılır", fn: () => TY.cleanRaces([{ name: " ", finishes: [{ id: "a", name: "A", code: "XYZ" }, { id: "a", name: "A" }, { id: "b", name: "" }] }]), ok: (r) => r[0].name === "Yarış 1" && r[0].finishes.length === 1 && !r[0].finishes[0].code }],
  ["sonuçsuz yarış", { desc: "sonucu girilmemiş yarış puan durumuna girmez", fn: () => TY.standings([...TR3, { id: "y9", finishes: [] }], TP), ok: (s) => s.races.length === 3 && s.rows.map((r) => `${r.id}${r.net}`).join() === "c6,b6,a8,d13" }],
  ["sıraya taşı", { desc: "3. sıradaki 1. sıraya", fn: () => TY.placeAt({ id: "y", finishes: tfin("a", "b", "c") }, "c", 0), ok: (r) => r.finishes.map((f) => f.id).join() === "c,a,b" }],
  ["süre ve kareler", { desc: "Bitir süresi ve şamandıra süreleri saklanır, bozuk kare atılır", fn: () => TY.cleanRaces([{ id: "s1", name: "Yarış 1", startAt: 5, fin: 610.4, marks: { Start: 0, "Şamandıra 1": 190, Kötü: 3, Finish: -1 }, finishes: [] }])[0], ok: (r) => r.fin === 610 && r.marks.Start === 0 && r.marks["Şamandıra 1"] === 190 && Object.keys(r.marks).length === 2 }],
  ["yeni yarış", { desc: "sıradaki ad ve kimlik", fn: () => TY.newRace([{ id: "y1" }, { id: "y3" }]), ok: (r) => r.name === "Yarış 3" && r.id === "y4" }],
]);

// Antrenman yarışı sonucunu sesle girme (raceVoice.js): sıra sözcükleri, kodlar, ad eşleme ve düzeltme, hangi yarış, yarışa yazma
const RV = await import("@/lib/raceVoice");
const VA = ["Ali Kaya", "Ayşe Şahin", "Mehmet Can", "Can Er", "Ece Demir", "Ali Uz"].map((n, i) => ({ id: `s${i + 1}`, studentName: n, status: "active" }));
const vres = (t, present = ["s1", "s2", "s3", "s4", "s5"], al = {}) => RV.resolveResult(RV.resultCommand(t), VA, present, al);
const vline = (r) => r.items.map((x) => `${x.name.split(" ")[0]}${x.code || x.place}`).join(",");
group("Antrenman sonucu sesle")([
  ["sıra sözcükleri", { desc: "birinci Ali, ikinci Ayşe, üçüncü Mehmet", fn: () => vline(vres("birinci Ali, ikinci Ayşe, üçüncü Mehmet")), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["rakamla", { desc: "1. Ali 2. Ayşe 3 Mehmet", fn: () => vline(vres("1. Ali 2. Ayşe 3 Mehmet")), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["bir şu oldu", { desc: "bir Ali oldu, iki Ayşe oldu, üç Mehmet oldu", fn: () => vline(vres("bir Ali oldu, iki Ayşe oldu, üç Mehmet oldu")), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["ad önce", { desc: "Ali birinci Ayşe ikinci, Can DNF", fn: () => vline(vres("Ali birinci Ayşe ikinci Can DNF")), ok: (r) => r === "Ali1,Ayşe2,CanDNF" }],
  ["kod sözleri", { desc: "bitirmedi, siyah bayrak, d n f", fn: () => vline(vres("birinci Ayşe ikinci Ali Ece bitirmedi Mehmet siyah bayrak Can d n f")), ok: (r) => r === "Ayşe1,Ali2,EceDNF,MehmetBFD,CanDNF" }],
  ["liste", { desc: "yarış sonucu: Ali, Ayşe, Mehmet", fn: () => vline(vres("yarış sonucu: Ali, Ayşe, Mehmet")), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["iki sözcüklü ad", { desc: "Ali Kaya ile Can Er ayrılır, Mehmet Can tek kişi", fn: () => vline(vres("birinci Ali Kaya ikinci Mehmet Can üçüncü Can Er")), ok: (r) => r === "Ali1,Mehmet2,Can3" }],
  ["virgül ayırır", { desc: "Mehmet, Can DNF iki kişi; Can ilk adı Can olan (Mehmet Can değil)", fn: () => vline(vres("birinci Ali, ikinci Mehmet, Can DNF")), ok: (r) => r === "Ali1,Mehmet2,CanDNF" }],
  ["gelenler önce", { desc: "iki Ali var, yalnız Ali Kaya geldi", fn: () => vres("birinci Ali ikinci Ece").items[0].name, ok: (r) => r === "Ali Kaya" }],
  ["yanlış duyulan ad", { desc: "Aişe → Ayşe Şahin (gelenlerden tek yakın)", fn: () => vres("birinci Ali ikinci Aişe"), ok: (r) => r.items[1]?.name === "Ayşe Şahin" && r.fixed[0]?.said === "aişe" && !r.unknown.length }],
  ["ses adı", { desc: "dizindeki söyleniş", fn: () => vres("birinci Memo ikinci Ali", undefined, { s3: ["memo"] }).items[0]?.name, ok: (r) => r === "Mehmet Can" }],
  ["bilinmeyen ad", { desc: "kaydedilmez, yakınlar sorulur", fn: () => vres("birinci Zeynep ikinci Ali"), ok: (r) => r.unknown.length === 1 && r.unknown[0].said === "zeynep" && r.unknown[0].place === 1 && r.items[0].place === 2 }],
  ["yarış numarası", { desc: "ikinci yarış / 3. yarış / yeni yarış / son yarış", fn: () => ["ikinci yarış: birinci Ali ikinci Ayşe", "3. yarış birinci Ali ikinci Ayşe", "yeni yarış 1 Ali 2 Ayşe", "son yarışta Can DNF"].map((t) => JSON.stringify(RV.resultCommand(t).race)), ok: (r) => r.join("|") === '{"n":2}|{"n":3}|{"new":true}|{"last":true}' }],
  ["sonuç değil", { desc: "soru, rüzgâr, sayaç, tek ad, plan", fn: () => ["Ali kaçıncı oldu", "birinci kim oldu?", "rüzgar 15 knot kuzeybatı", "5 dakikalık sayacı başlat", "Ali bitirmedi", "yarın 2 yarış var", "Ali'yi yarışa ekle", "bugün 3 kişi geldi", "yarış sonuçlarını göster"].map((t) => RV.resultCommand(t)), ok: (r) => r.every((x) => x === null) }],
  ["hangi yarış", { desc: "boş son yarış; 1. söylenince yeni; devam eden sıra eskiye; sayaç yarışı", fn: () => { const rs = [{ id: "y1", finishes: tfin("a") }, { id: "y2", finishes: [] }]; const full = [{ id: "y1", finishes: tfin("a") }]; const c = RV.resultCommand("birinci Ali ikinci Ayşe"); return [RV.pickRace(rs, c, [{ place: 1 }]).index, RV.pickRace(full, c, [{ place: 1 }]).isNew, RV.pickRace(full, c, [{ place: 4 }]).index, RV.pickRace(rs, c, [{ place: 1 }], "y1").index, RV.pickRace(full, RV.resultCommand("4. yarış birinci Ali ikinci Ayşe"), []).error]; }, ok: ([a, b, c, d, e]) => a === 1 && b === true && c === 0 && d === 0 && /1 yarış var/.test(e) }],
  ["yarışa yaz", { desc: "söylenen eski yerinden çıkar, sıraya girer, kodlu sona", fn: () => RV.applyResult({ id: "y", finishes: tfin("a", "b", "c") }, [{ id: "c", name: "C", place: 1 }, { id: "a", name: "A", code: "DNF" }]), ok: (r) => r.finishes.map((f) => f.id + (f.code || "")).join() === "c,b,aDNF" }],
  ["sonuç satırı", { desc: "kodlular sıra almaz", fn: () => RV.resultLine({ finishes: tfin("a", ["b", "DNF"], "c") }), ok: (r) => r === "1 A, B DNF, 2 C" }],
  ["sayfada yalnız adlar", { desc: "antrenman sayfası düğmesi: tetik sözcüğü olmadan ad listesi", fn: () => vline(RV.resolveResult(RV.resultCommand("Ali Ayşe Mehmet", { force: true }), VA, ["s1", "s2", "s3", "s4", "s5"], {})), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["karışık numara", { desc: "1 Ali, Ayşe, 3 Mehmet: numarasız ad sıradaki yeri alır", fn: () => vline(RV.resolveResult(RV.resultCommand("1 Ali, Ayşe, 3 Mehmet", { force: true }), VA, ["s1", "s2", "s3", "s4", "s5"], {})), ok: (r) => r === "Ali1,Ayşe2,Mehmet3" }],
  ["onaysız yaz", { desc: "bilinmeyen ad en yakına yazılır, yakını yoksa atlanır; yeni yarış açılır", fn: () => RV.voiceResult("birinci Ali ikinci Aişe üçüncü Xqzt", { races: [], athletes: VA, present: ["s1", "s2", "s3"], aliases: {}, force: true }), ok: (r) => !r.error && r.isNew && r.list.length === 1 && r.race.finishes.map((f) => f.id).join() === "s1,s2" && r.lost.join() === "xqzt" }],
  ["sesli cevap", { desc: "yazılan yarış ve sıra okunur", fn: () => RV.voiceText(RV.voiceResult("Ali Ayşe Mehmet", { races: [], athletes: VA, present: ["s1", "s2", "s3"], aliases: {}, force: true })), ok: (r) => /1 Ali Kaya/.test(r) && /3 Mehmet Can/.test(r) }],
  ["anlaşılmayan", { desc: "kimse bulunamazsa hata verir, yazmaz", fn: () => RV.voiceResult("şey", { races: [], athletes: VA, present: [], aliases: {}, force: true }).error, ok: (r) => !!r }],
]);

// Yarış multimedya sayfası (lib/raceLive.js): start sayacı bipleri, rüzgâr kaydı, startlar, fotoğraf grupları, genel sıralama, asistan cümleleri
const RL = await import("@/lib/raceLive");
const at = (hhmm) => new Date(`2026-10-19T${hhmm}:00`).toISOString();
const hm2 = (iso) => RL.hm(iso);
const seq = (dur, mode) => Array.from({ length: dur + 1 }, (_, i) => dur - i).filter((s) => RL.beepAt(s, mode)).map((s) => `${s}${RL.beepAt(s, mode)[0]}`).join(",");
const FLEET = { cls: "Optimist", rows: [{ rank: 1, name: "A", cat: "", sex: "E" }, { rank: 2, name: "B", cat: "Junior", sex: "K" }, { rank: 3, name: "C", cat: "Junior", sex: "E" }, { rank: 4, name: "D", cat: "", sex: "K" }] };
group("Yarış multimedya")([
  ["5 dk start dizisi", { desc: "4:00 ve 1:00 orta, son 10 sn kısa, 0 uzun", fn: () => seq(300, "start"), ok: (r) => r === "240m,60m,10s,9s,8s,7s,6s,5s,4s,3s,2s,1s,0l" }],
  ["1 dk aynı mantık", { desc: "1:00 (başlangıç) orta, son 10 sn, 0", fn: () => seq(60, "start"), ok: (r) => r === "60m,10s,9s,8s,7s,6s,5s,4s,3s,2s,1s,0l" }],
  ["antrenman sayacı değişmedi", { desc: "son 5 sn + 0", fn: () => seq(120, ""), ok: (r) => r === "5s,4s,3s,2s,1s,0l" }],
  ["rüzgâr cümlesi", { desc: "knot + yön (kuzeybatı, karayel, poyraz), sağanak", fn: () => [RL.windCommand("rüzgar 15 knot kuzeybatı"), RL.windCommand("rüzgarı yaz karayel 12 knot"), RL.windCommand("rüzgar poyraz 18 knot sağanak 24"), RL.windCommand("kuzeybatıdan on dört knot esiyor")], ok: ([a, b, c, d]) => a.kn === 15 && a.dir === 315 && b.dir === 315 && b.kn === 12 && c.dir === 45 && c.gust === 24 && c.kn === 18 && d?.kn === 14 }],
  ["rüzgâr sorusu kayıt değil", { desc: "soru, tahmin, yönsüz", fn: () => [RL.windCommand("yarın rüzgar kaç knot"), RL.windCommand("rüzgar 15 knot olacak mı?"), RL.windCommand("rüzgar 15 knot")], ok: (r) => r.every((x) => x === null) }],
  ["sayaç cümlesi", { desc: "süre yoksa 5 dk; dakika söylenirse o", fn: () => [RL.timerCommand("sayacı başlat"), RL.timerCommand("2 dakikalık geri sayımı başlat"), RL.timerCommand("bir dakikalık sayaç başlat"), RL.timerCommand("sayaç kaç dakika")], ok: ([a, b, c, d]) => a.sec === 300 && b.sec === 120 && c.sec === 60 && d === null }],
  ["sayaçtan start", { desc: "günün sıradaki numarası, son 90 dk'daki rüzgâr; aynı an iki kez yazılmaz", fn: () => { const w = RL.cleanWind([{ at: at("10:50"), dir: 315, kn: 14 }]); const a = RL.newStart([], at("11:05"), w); const b = RL.newStart([a], at("12:20"), w); return [a, b, RL.newStart([a], at("11:05"), w)]; }, ok: ([a, b, c]) => a.n === 1 && a.kn === 14 && a.dir === 315 && a.day === "2026-10-19" && b.n === 2 && b.kn === null && c === null }],
  ["yeniden numara", { desc: "bütün seri boyunca sıra: ertesi gün kalınan yerden", fn: () => RL.renumber([{ id: "b", day: "2026-10-19", at: at("12:00"), n: 5 }, { id: "a", day: "2026-10-19", at: at("11:00"), n: 9 }, { id: "c", day: "2026-10-20", at: at("09:00"), n: 3 }]), ok: (r) => r.map((x) => `${x.id}${x.n}`).join() === "c1,a2,b3" }],
  ["fotoğraf grupları", { desc: "son startın altında, start öncesi ayrı, yeniden eskiye", fn: () => RL.mediaGroups([{ id: "1", at: at("10:00") }, { id: "2", at: at("11:10") }, { id: "3", at: at("12:30") }], RL.cleanStarts([{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05") }, { id: "s2", day: "2026-10-19", n: 2, at: at("12:20") }]), "2026-10-19"), ok: (g) => g.map((x) => x.title).join("|") === "2. yarış · Yarış sırasında|1. yarış · Yarış sırasında|Start öncesi" && g[0].items[0].id === "3" }],
  ["grafik noktaları", { desc: "saat + dakika/60", fn: () => RL.marksFor([{ hh: "00" }, { hh: "01" }, ...Array.from({ length: 22 }, (_, i) => ({ hh: String(i + 2).padStart(2, "0") }))], RL.cleanWind([{ at: at("13:30"), dir: 0, kn: 12 }])), ok: (r) => r.length === 1 && r[0].i === 13.5 && r[0].kn === 12 && r[0].hh === "13" }],
  ["kayıt temizliği", { desc: "bozuk rüzgâr, start ve dosya atılır", fn: () => RL.cleanLive({ wind: [{ at: "x", dir: 1, kn: 2 }, { at: at("10:00"), dir: 400, kn: 2 }, { at: at("10:00"), dir: 90, kn: 8 }], starts: [{ id: "s1", day: "bozuk", at: at("10:00") }], media: [{ id: "m1", url: "http://x", at: at("10:00") }, { id: "m2", url: "https://x", at: at("10:00"), kind: "video" }] }), ok: (r) => r.wind.length === 1 && r.wind[0].src === "elle" && !r.starts.length && r.media.length === 1 && r.media[0].kind === "video" }],
  ["Junior Kızlar", RF("süzgeçte Junior Kızlar, sıra kızlar arasında; satır işareti; sonuç satırında", () => {
    const f = SH.withCats(SH.cleanSheet([{ cls: "ILCA 4", rows: [{ rank: 1, name: "Ece Su", born: "2010", sex: "K" }, { rank: 2, name: "Ela Ak", born: "2012", sex: "K" }, { rank: 3, name: "Can Öz", born: "2012", sex: "E" }, { rank: 4, name: "Ayşe Şahin", born: "2011", sex: "K" }] }]), 2026);
    const r = SH.rankOurs(f, [{ id: "a1", studentName: "Ayşe Şahin" }]);
    return RL.sheetFilters(f[0]).map((x) => x[0]).join() === "all,Junior,girls,Junior-girls"
      && RL.sheetRows(f[0], "Junior-girls").map((x) => `${x.name}${x.pos}`).join() === "Ela Ak1,Ayşe Şahin2"
      && RL.sheetTag(f[0].rows[1]) === "Junior kız" && RL.sheetTag(f[0].rows[0]) === "Kız" && RL.sheetTag(f[0].rows[2]) === "Junior" && RL.sheetTag({ cat: "Senior" }) === ""
      && SH.resultLine(r.a1) === "ILCA 4 genel 4. / 4 · Junior 3. / 3 · Kızlar 3. / 3 · Junior Kızlar 2. / 2"
      && RR.cleanResults({ rows: { a1: { place: 4, cls: "ILCA 4", cat: "Junior", jp: 2, jn: 2 } } }).rows.a1.jp === 2;
  })],
  ["ILCA 4 Junior süzgeci", RF("Genel, Junior", () => RL.sheetFilters(SH.withCats(SH.cleanSheet([{ cls: "ILCA 4", rows: [{ rank: 1, name: "A B", born: "2010" }, { rank: 2, name: "C D", born: "2012" }] }]), 2026)[0]).map((x) => x[0]).join() === "all,Junior")],
  ["sonuçlarda arama", { desc: "ad, kulüp (Türkçe harf fark etmez), yelken no rakamları; boş arama hepsi", fn: () => { const r = [{ name: "Ali Kaya", club: "Dikili YK", sail: "TUR 1234" }, { name: "Ece Şahin", club: "Çeşme Yelken", sail: "TUR 77" }]; const f = (q) => r.filter((x) => SH.sheetMatch(x, q)).map((x) => x.name[0]).join(""); return [f("dikili"), f("cesme"), f("1234"), f("TUR 77"), f("kaya ali"), f(""), f("izmir")]; }, ok: (x) => x.join("|") === "A|E|A|E|A|AE|" }],
  ["genel sıralama süzgeci", { desc: "Junior ve Kızlar kendi içinde sıralanır, yer korunur", fn: () => [RL.sheetFilters(FLEET).map((f) => f[0]).join(), RL.sheetRows(FLEET, "girls").map((r) => `${r.name}${r.pos}${r.i}`).join(), RL.sheetRows(FLEET, "Junior").length], ok: ([f, g, j]) => f === "all,Junior,girls,Junior-girls" && g === "B1 1,D2 3".replace(/ /g, "") && j === 2 }],
  ["doğum yılı ve puan", { desc: "belgeden okunur, bozuk puan boş", fn: () => SH.cleanSheet([{ cls: "Optimist", rows: [{ rank: 1, name: "Ali Kaya", club: "Dikili YK", born: "2013", pts: 12.5 }, { rank: 2, name: "Can Ak", born: "", pts: "x" }] }])[0].rows, ok: (r) => r[0].born === "2013" && r[0].pts === 12.5 && r[1].pts === "" }],
  ["sporcu etiketi", { desc: "dokun ekle, tekrar dokun çıkar; bozuk id atılır; süzgeç", fn: () => { const m = RL.cleanMedia([{ id: "m1", url: "https://x", at: at("10:00"), ath: ["a1", "a1", "bo zuk"] }, { id: "m2", url: "https://y", at: at("11:00") }]); const t = RL.tagMedia(m, "m2", "a2"); const u = RL.tagMedia(t, "m1", "a1"); return [m[0].ath.join(), m[1].ath.length, RL.mediaOf(t, "a2").map((x) => x.id).join(), u[0].ath.length, RL.mediaOf(u, "").length]; }, ok: ([a, b, c, d, e]) => a === "a1" && b === 0 && c === "m2" && d === 0 && e === 2 }],
  ["Fotoğraflar kimliği", { desc: "iPhone'da çekilen videonun Fotoğraflar kimliği künyede kalır (Velora'dan silinince oradan da silinir); boş/bozuk atılır", fn: () => { const m = RL.cleanMedia([{ id: "m1", url: "https://x", at: at("10:00"), asset: "AB12-CD/L0/001" }, { id: "m2", url: "https://y", at: at("11:00"), asset: 5 }, { id: "m3", url: "https://z", at: at("12:00"), asset: "" }]); return m.map((x) => x.asset || "-").join(); }, ok: (r) => r === "AB12-CD/L0/001,-,-" }],
  ["gün özeti", { desc: "ölçülen rüzgâr aralığı ve yön, yarışlar, bizimkiler sırayla", fn: () => RL.daySummary({ race: { name: "Ege Kupası", district: "Dikili", results: { rows: { a1: { place: 7 }, a2: { place: 3 } } } }, day: "2026-10-19", live: RL.cleanLive({ wind: [{ at: at("11:00"), dir: 315, kn: 12 }, { at: at("12:00"), dir: 320, kn: 16, gust: 21 }, { at: at("13:00"), dir: 0, kn: 14 }], starts: [{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05"), dir: 315, kn: 12 }, { id: "s2", day: "2026-10-19", n: 2, at: at("12:20"), flag: "Genel geri çağırma" }] }), ours: [{ id: "a1", studentName: "Ali Kaya" }, { id: "a2", studentName: "Can Ak" }, { id: "a3", studentName: "Ece Su" }] }), ok: (s) => s.windText === "KB 12–16 kn, sağanak 21 kn" && s.wind.pts.length === 3 && s.starts.length === 2 && s.starts[0].wind === "KB 12 kn" && s.team.map((a) => a.name).join() === "Can Ak,Ali Kaya,Ece Su" && s.text.includes("Bizimkiler:\n3. Can Ak\n7. Ali Kaya") && s.text.includes("2. 12:20 (genel geri çağırma)") }],
  ["gün özeti ölçümle", { desc: "elle rüzgâr yoksa istasyon ölçümü tahminden önce gelir", fn: () => RL.daySummary({ race: { name: "X" }, day: "2026-10-19", live: RL.cleanLive({ starts: [{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05") }] }), obs: [{ hh: "11", wind: 9, gust: null, dir: 0 }, { hh: "12", wind: 13, gust: 18, dir: 10 }, { hh: "15", wind: 20, gust: 25, dir: 0 }], rows: Array.from({ length: 24 }, (_, h) => ({ hh: String(h).padStart(2, "0"), wind: h, gust: h + 5, dir: 0 })) }), ok: (s) => s.wind.src === "ölçülen" && s.windText === "K 9–13 kn, sağanak 18 kn" && s.wind.pts.length === 2 }],
  ["gün özeti tahminle", { desc: "elle rüzgâr yoksa start saatleri arası tahmin", fn: () => RL.daySummary({ race: { name: "X" }, day: "2026-10-19", live: RL.cleanLive({ starts: [{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05") }, { id: "s2", day: "2026-10-19", n: 2, at: at("13:10") }] }), rows: Array.from({ length: 24 }, (_, h) => ({ hh: String(h).padStart(2, "0"), wind: h, gust: h + 5, dir: 0 })) }), ok: (s) => s.wind.src === "tahmin" && s.wind.lo === 11 && s.wind.hi === 14 && s.windText.endsWith("(tahmin)") && !s.text.includes("Bizimkiler") }],
  ["çekildiği an", { desc: "sayaç geri sayarken start öncesi / son 1 dakika, sonra yarış; antrenman sayacı ve uzak an sayılmaz", fn: () => { const T = { end: Date.parse(at("11:05")), mode: "start" }; const m = (hh) => RL.momentOf(at(hh), T); return [m("11:01"), m("11:04:30".slice(0, 5)), RL.momentOf(new Date(Date.parse(at("11:05")) - 42e3).toISOString(), T), m("11:17"), RL.momentOf(at("11:04"), { ...T, mode: "" }), m("10:30"), RL.momentOf(at("11:00"), { end: null })]; }, ok: ([a, b, c, d, e, f, g]) => a.phase === "pre" && a.sec === -240 && b.phase === "last" && b.sec === -60 && c.phase === "last" && c.sec === -42 && d.phase === "race" && d.sec === 720 && e === null && f === null && g === null }],
  ["an yazısı", { desc: "rozet ve uzun yazı", fn: () => [RL.momentBadge({ phase: "last", sec: -42 }), RL.momentText({ phase: "last", sec: -42 }), RL.momentBadge({ phase: "race", sec: 750 }), RL.momentText({ phase: "race", sec: 750 }), RL.momentText({ phase: "pre", sec: -192 }), RL.momentBadge({})], ok: (r) => r.join("|") === "−0:42|Son 1 dakika · 0:42 kala|+12:30|Yarış sırasında · 12:30|Start öncesi · 3:12 kala|" }],
  ["medya sayfası bölümleri", { desc: "antrenman ve yarış ayrı; başlık, gün/yer · kaç kayıt; en son çekilen üstte; Tümü kendi Medya sekmesine", fn: async () => { const L = await import("@/lib/mediaLibrary"); const r = L.librarySections([{ id: "ant-p1", media: [{ id: "a", kind: "video", at: "2026-10-21T08:00:00Z" }, { id: "b", kind: "photo", at: "2026-10-21T07:00:00Z" }] }, { id: "r1", media: [{ id: "c", kind: "video", at: "2026-10-17T08:00:00Z" }] }, { id: "ant-p2", media: [{ id: "d", kind: "video", at: "2026-10-22T08:00:00Z" }] }], { plans: [{ id: "p1", title: "Start çalışması", date: "2026-10-21" }], races: [{ id: "r1", name: "Çeşme Kupası", district: "Çeşme", startDate: "2026-10-17", endDate: "2026-10-18" }], today: "2026-10-22" }); return [r.ant.map((s) => `${s.title}|${s.sub}|${s.items.map((x) => x.id).join("")}`).join(";"), r.race.map((s) => `${s.sub}|${s.href}`).join(";")]; }, ok: ([a, b]) => a === "Antrenman|Bugün · Per 22 Eki · 1 kayıt|d;Start çalışması|Dün · Çar 21 Eki · 2 kayıt|ba" && b === "Çeşme · 17-18 Eki · 1 kayıt|/athletes/races/r1/media?tab=media" }],
  ["galeri yarışa göre", { desc: "evreler değil yarışlar gruplanır (Startan önce/sonra aynı yarışta), yarış içinde eskiden yeniye; startsız 'Diğer'", fn: () => { const S = RL.cleanStarts([{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05") }, { id: "s2", day: "2026-10-19", n: 2, at: at("11:40") }]); const M = RL.cleanMedia([{ id: "a", url: "https://x", at: at("11:03"), phase: "pre", sec: -120, end: at("11:05"), rid: "s1" }, { id: "b", url: "https://x", at: at("11:30") }, { id: "c", url: "https://x", at: at("11:45") }, { id: "e", url: "https://x", at: at("10:04") }]); return RL.mediaByRace(M, S, "2026-10-19").map((g) => `${g.title}:${g.items.map((x) => x.id).join("")}`).join("|"); }, ok: (r) => r === "2. yarış:c|1. yarış:ab|Diğer:e" }],
  ["yarış ve ana göre gruplar", { desc: "sayaçla çekilen kendi yarışına ve evresine düşer; yarışa çevrilmemiş start kendi grubunda, saat yazılmaz; an kayıtta kalır", fn: () => { const S = RL.cleanStarts([{ id: "s1", day: "2026-10-19", n: 1, at: at("11:05") }]); const end2 = at("12:20"); const M = RL.cleanMedia([{ id: "a", url: "https://x", at: at("11:03"), phase: "pre", sec: -120, end: at("11:05") }, { id: "b", url: "https://x", at: at("11:30") }, { id: "c", url: "https://x", at: at("12:19"), phase: "last", sec: -40, end: end2 }, { id: "d", url: "https://x", at: at("12:16"), phase: "pre", sec: -240, end: end2 }, { id: "e", url: "https://x", at: at("11:04"), phase: "bozuk", sec: 1, end: end2 }]); return [RL.mediaGroups(M, S, "2026-10-19").map((g) => `${g.title}:${g.items.map((x) => x.id).join("")}`).join("|"), M.find((x) => x.id === "c").sec]; }, ok: ([g, sec]) => g === "Son 1 dakika:c|Start öncesi:d|1. yarış · Yarış sırasında:b|1. yarış · Start öncesi:a|Start öncesi:e" && sec === -40 }],
  ["startan beri sınırı", { desc: "ileri sayım 59:59'da durur, eksiye düşmez", fn: () => [RL.upSec(0, 125_400), RL.upSec(0, 3_599_999), RL.upSec(0, 7_200_000), RL.upSec(1000, 0)], ok: (r) => r.join() === "125,3599,3599,0" }],
  ["yarışı iptal", { desc: "genel geri çağırılan 2. yarış numarayı bırakır, tekrarı yine 2. yarış; çekimler ayrı başlıkta, iptalden sonrakiler ona düşmez", fn: () => {
    const ms = (h) => Date.parse(at(h));
    let st = RL.beginRace([], ms("10:55"), ms("11:00")).starts;
    st = RL.finishRace(st, st[0].id, ms("11:40"));
    const b = RL.beginRace(st, ms("11:50"), ms("11:55"));
    const voided = RL.voidRace(b.starts, b.id, "Genel geri çağırma", ms("11:56"));
    const label = `${RL.nextRaceNo(voided)}. yarış`;
    const c = RL.beginRace(voided, ms("12:05"), ms("12:10"));
    const v = c.starts.find((x) => x.id === b.id);
    const inVoid = RL.momentAt(at("11:53"), c.starts);
    const after = RL.momentAt(at("11:58"), c.starts);
    const re = RL.momentAt(at("12:09"), c.starts);
    const media = [{ id: "m1", url: "https://x/1", at: at("11:53"), ...inVoid }, { id: "m2", url: "https://x/2", at: at("12:09"), ...re }];
    const g = RL.mediaGroups(RL.cleanMedia(media), c.starts, "2026-10-19").map((x) => x.title);
    const old = RL.cleanStarts([{ id: "s1", day: "2026-10-19", at: at("11:00"), flag: "Ertelendi" }])[0];
    return { label, ns: c.starts.map((x) => x.n).join(), title: RL.raceTitle(v), time: RL.raceTime(v), inVoid: inVoid?.rid === b.id && inVoid.phase, after, g, old: [old.void, old.flag], undo: RL.voidRace(voided, b.id, "", 0).map((x) => x.n).join() };
  }, ok: (r) => r.label === "2. yarış" && r.ns === "1,2,2" && r.title === "Genel geri çağırma · 2. yarış" && r.time === "" && r.inVoid === "pre" && r.after === null && r.g.join("|") === "2. yarış · Son 1 dakika|Genel geri çağırma · 2. yarış · Start öncesi" && r.old.join() === "Tehir," && r.undo === "1,2" }],
  ["sonradan düzelt", { desc: "çekimin yarışı/anı değişir, yarışsız yapılınca an silinir, etiket ve süre kalır", fn: () => {
    const media = RL.cleanMedia([{ id: "m1", url: "https://x/1", at: at("11:04"), ath: ["a1"], dur: 42, phase: "last", sec: -40, end: at("11:05"), rid: "s1" }]);
    const a = RL.fixMedia(media, "m1", { rid: "s2", phase: "race", sec: 120, end: at("11:02") })[0];
    const b = RL.fixMedia(media, "m1", null)[0];
    return { a, b };
  }, ok: ({ a, b }) => a.rid === "s2" && a.phase === "race" && a.sec === 120 && a.ath[0] === "a1" && a.dur === 42 && !b.phase && !b.rid && b.ath[0] === "a1" }],
  ["antrenman günleri", { desc: "elle eklenen gün listede; yarış günleri 1. gün, öncesi/sonrası Antrenman 1, 2", fn: () => { const rd = ["2026-10-26", "2026-10-27"]; const d = RL.liveDays(rd, RL.cleanLive({ days: ["2026-10-29", "x", "2026-10-29"], media: [{ id: "m", at: "2026-10-18T09:00:00.000Z", url: "https://a/b", path: "p", kind: "photo" }] })); return [d.join(), Object.values(RL.dayNames(rd, d)).join(), RL.dayNames(["2026-10-26"], ["2026-10-26"])["2026-10-26"]]; }, ok: ([d, n, one]) => d === "2026-10-18,2026-10-26,2026-10-27,2026-10-29" && n === "Antrenman 1,1. gün,2. gün,Antrenman 2" && one === "Yarış" }],
  ["antrenman numarası ayrı", { desc: "antrenman günü yarışları kendi içinde 1'den; yarış serisi kaymaz", fn: () => { const rd = ["2026-10-26"]; const st = (id, day, h) => ({ id, day, at: new Date(`${day}T${h}:00`).toISOString() }); const r = RL.renumber([st("a", "2026-10-18", "10:00"), st("b", "2026-10-18", "11:00"), st("c", "2026-10-26", "11:00"), st("d", "2026-10-27", "10:00")], rd); return [r.map((x) => `${x.id}${x.n}`).join(), RL.nextRaceNo(r, "2026-10-26", rd), RL.nextRaceNo(r, "2026-10-18", rd), RL.nextRaceNo(r, "2026-10-20", rd)]; }, ok: ([r, a, b, c]) => r === "a1,b2,c1,d1" && a === 2 && b === 3 && c === 1 }],
  ["akıntı ve not", { desc: "akıntı ondalıklı knot + yön, not saklanır; akıntı yoksa yön atılır", fn: () => RL.cleanWind([{ at: at("10:00"), dir: 90, kn: 12, ckn: 1.25, cdir: 180, note: "  dalga  var " }, { at: at("11:00"), dir: 90, kn: 12, ckn: 0, cdir: 180 }]), ok: ([a, b]) => a.ckn === 1.3 && a.cdir === 180 && a.note === "dalga var" && b.ckn === null && b.cdir === null && b.note === "" }],
  ["start dizisi şeridi", { desc: "5 dk: Uyarı 5 · Hazırlık 4 · Son dk 1 · Start 0; 2 dk: 2 · 1 · 0; 3:12 kala 5 geçti, 4 şimdi", fn: () => [RL.seqSteps(300).map((x) => `${x.m}${x.name}`).join(" "), RL.seqSteps(120).map((x) => x.m).join(" "), RL.seqState(RL.seqSteps(300), 192, true).join(","), RL.seqState(RL.seqSteps(300), 300, false).join(",")], ok: (r) => r.join("|") === "5Uyarı 4Hazırlık 1Son dk 0Start|2 1 0|done,now,,|,,," }],
  ["sayacın sahibi", { desc: "her sayfa yalnız kendi sayacını görür; asistanın plansız antrenman sayacı planlı sayfada da görünür; eski kayıt herkesin", fn: () => [RL.ownedBy("/athletes/races/a/media", "/athletes/races/a/media"), RL.ownedBy("/athletes/races/a/media", "/training/day"), RL.ownedBy("/athletes/races/a/media", "/athletes/races/b/media"), RL.ownedBy("/training/day", "/training/day?id=p1"), RL.ownedBy("/training/day?id=p1", "/training/day?id=p2"), RL.ownedBy("", "/training/day"), RL.pickTimer({ own: "/training/day" }).own], ok: (r) => r.join() === "true,false,false,true,false,true,/training/day" }],
  ["cihazlar arası sayaç", { desc: "başka cihazdaki başlat/iptal alınır; açılışta yalnız süren sayaç; aynıysa yazılmaz; burada sonra bitirilen sayaç dirilmez", fn: () => { const now = Date.parse("2026-10-26T11:00:00Z"); const run = { dur: 300, end: now + 200e3, left: null, mode: "start", rid: "sx", zero: null, at: now }; const stop = { dur: 300, end: null, left: null, zero: null, at: now }; const train = { dur: 120, end: now + 60e3, left: null, mode: "" }; return [RL.takeTimer(run, stop, true, now), RL.takeTimer(stop, train, true, now), RL.takeTimer(stop, run, false, now), RL.takeTimer(run, { ...run, at: 1 }, false, now), RL.takeTimer({ ...run, end: now - 4000e3 }, stop, true, now), RL.takeTimer(run, { ...stop, at: now + 5000 }, true, now)]; }, ok: (r) => r.join() === "true,false,true,false,false,false" }],
  ["bugün her zaman", { desc: "dün antrenman günü eklenmiş, yarış sonra: bugün de listede (son gün açılmaz); çok önce ve bitince eklenmez", fn: () => { const rd = ["2026-10-26", "2026-10-27"]; return [RL.withToday(["2026-10-18", ...rd], rd, "2026-10-19").join(), RL.withToday(rd, rd, "2026-10-01").length, RL.withToday(rd, rd, "2026-10-29").length, RL.withToday(rd, rd, "2026-10-28").length, RL.withToday(rd, null, "2026-10-19").length]; }, ok: ([a, b, c, d, e]) => a === "2026-10-18,2026-10-19,2026-10-26,2026-10-27" && b === 2 && c === 2 && d === 3 && e === 2 }],
  ["denemeleri sıfırla", { desc: "günler, yarışlar, rüzgâr, parkur ve sayaç sıfırlanır; fotoğraf/video yalnız istenirse; sayılar doğru", fn: () => { const l = RL.cleanLive({ days: ["2026-10-18"], starts: [{ id: "s1", day: "2026-10-18", at: "2026-10-18T10:00:00.000Z" }], wind: [{ at: "2026-10-18T10:00:00.000Z", dir: 90, kn: 10 }], media: [{ id: "m1", kind: "photo", type: "image/jpeg", url: "https://x/y", at: "2026-10-18T10:00:00.000Z" }], buoys: ["Start", "A", "Finish"] }); const a = RL.resetPatch(false, 5); const b = RL.resetPatch(true, 5); const after = RL.cleanLive({ ...l, ...a }); return [JSON.stringify(RL.resetCounts(l)), "media" in a, b.media.length, after.media.length, after.days.length + after.starts.length + after.wind.length, after.buoys.length, a.timer.end, a.timer.at]; }, ok: ([c, am, bm, keep, rest, buoys, end, at]) => c === '{"days":1,"starts":1,"wind":1,"media":1}' && !am && bm === 0 && keep === 1 && rest === 0 && buoys === 4 && end === null && at === 5 }],
  ["düz start medyası", { desc: "yarışa çevrilmemiş startan sonra çekilen 'Startan sonra' grubuna düşer (saat yazılmaz), 'Start öncesi'ne değil; yazısı 'Startan beri'", fn: () => { const end = new Date("2026-10-22T10:42:00").getTime(); const mom = RL.momentOf(new Date(end + 95e3).toISOString(), { end, mode: "start" }); const m = { id: "m1", kind: "video", at: new Date(end + 95e3).toISOString(), ...mom }; const g = RL.mediaGroups([m], [], "2026-10-22"); return [g[0].title, RL.momentText(m, []), RL.momentRaceName(m, [])]; }, ok: ([a, b, c]) => a === "Startan sonra" && b === "Startan beri · 1:35" && c === "Start 10:42" }],
  ["medya küçük resmi", { desc: "künyede küçük resim adresi kalır; https değilse atılır", fn: () => { const base = { id: "m1", kind: "video", type: "video/mp4", url: "https://x/v", at: "2026-10-21T10:00:00.000Z" }; return [RL.cleanMedia([{ ...base, thumb: "https://x/k" }])[0].thumb, "thumb" in RL.cleanMedia([{ ...base, thumb: "blob:x" }])[0]]; }, ok: ([a, b]) => a === "https://x/k" && b === false }],
  ["parkur noktaları", { desc: "Start · Ş1 · Ş2 · Finish; + / − şamandıra, Start ve Finish kalır; süreler yarış satırında, sıradaki nokta", fn: () => { const b = RL.cleanBuoys(); const s = RL.cleanStarts([{ id: "s1", day: "2026-10-26", at: "2026-10-26T10:00:00.000Z", marks: { Start: 12, "Şamandıra 1": 580, x: 5 } }])[0]; return [b.join(), RL.addBuoy(b).join(), RL.dropBuoy(RL.dropBuoy(RL.dropBuoy(b))).join(), JSON.stringify(s.marks), RL.nextBuoy(b, s), RL.cleanLive({}).buoys.length]; }, ok: ([b, a, d, m, n, l]) => b === "Start,Şamandıra 1,Şamandıra 2,Finish" && a === "Start,Şamandıra 1,Şamandıra 2,Şamandıra 3,Finish" && d === "Start,Finish" && m === '{"Start":12,"Şamandıra 1":580}' && n === "Şamandıra 2" && l === 4 }],
  ["yarış dışı gün", { desc: "yarış günleri dışında çekilen ya da start verilen gün de listede (yoksa çekilen görünmezdi)", fn: () => RL.liveDays(["2026-10-25", "2026-10-26"], { media: [{ at: at("11:00") }, { at: "x" }], starts: [{ at: "2026-10-25T09:00:00.000Z" }] }), ok: (d) => d.join() === "2026-10-19,2026-10-25,2026-10-26" }],
  ["yarış akışı", { desc: "Başlat yarışı açar, +1 dk kaydırır, 0 rüzgârı yazar, bitir süreyi verir; ertesi gün numara devam eder", fn: () => {
    const prev = RL.renumber([{ id: "d1", day: "2026-10-18", at: new Date("2026-10-18T11:00:00").toISOString() }, { id: "d2", day: "2026-10-18", at: new Date("2026-10-18T12:00:00").toISOString() }, { id: "d3", day: "2026-10-18", at: new Date("2026-10-18T13:00:00").toISOString() }]);
    const now = Date.parse(at("11:00")); const end = now + 300e3;
    const b = RL.beginRace(prev, now, end);
    const sh = RL.shiftRace(b.starts, b.id, end + 60e3);
    const z = RL.zeroRace(sh, b.id, end + 60e3, RL.cleanWind([{ at: at("10:58"), dir: 315, kn: 13 }]));
    const f = RL.finishRace(z, b.id, end + 60e3 + 2520e3);
    const s = f.find((x) => x.id === b.id);
    return [RL.raceName(s), s.cd, hm2(s.at), s.kn, RL.raceTime(s), RL.nextRaceNo(f), RL.dropRace(f, b.id).length, RL.raceName({ ...s, name: "Altın filo 1" })];
  }, ok: ([nm, cd, t, kn, dur, nx, left, named]) => nm === "4. yarış" && !!cd && t === "11:06" && kn === 13 && dur === "42:00" && nx === 5 && left === 3 && named === "Altın filo 1" }],
  ["yarışa göre an", { desc: "geri sayımda start öncesi / son 1 dakika, startan bitişe yarış sırasında, sonra 30 dk yarış sonrası", fn: () => {
    const S = RL.cleanStarts([{ id: "r1", day: "2026-10-19", n: 1, cd: at("11:00"), at: at("11:05"), fin: at("11:50") }, { id: "r2", day: "2026-10-19", n: 2, cd: at("12:10"), at: at("12:15") }]);
    const m = (hh) => RL.momentAt(at(hh), S);
    return [m("10:50"), m("11:02"), m("11:30"), m("12:00"), m("12:05"), m("12:14"), m("12:40")].map((x) => (x ? `${x.rid}:${x.phase}` : "-")).join(" ");
  }, ok: (r) => r === "- r1:pre r1:race r1:after r1:after r2:last r2:race" }],
  ["an düzeltme adı", { desc: "bağlı yarışın adı kullanılır", fn: () => RL.momentRaceName({ rid: "r1", phase: "pre", sec: -100, end: at("11:05") }, RL.cleanStarts([{ id: "r1", day: "2026-10-19", n: 4, name: "Altın 1", at: at("11:05") }])), ok: (r) => r === "Altın 1" }],
  ["hangi yarış", { desc: "açık yarış, yoksa bugün süren", fn: () => { const L = [{ id: "a", startDate: "2026-10-18", endDate: "2026-10-20" }, { id: "b", startDate: "2026-11-01" }]; return [RL.liveRace(L, "2026-10-19")?.id, RL.liveRace(L, "2026-10-25"), RL.liveRace(L, "2026-10-25", "b")?.id]; }, ok: ([a, b, c]) => a === "a" && b === null && c === "b" }],
]);

// Multimedya sayfasının hava satırları (raceWeather.js rowsFrom): o günün saatleri, yağmur olasılığı
group("Yarış günü havası")([
  ["yarışın yeri", { desc: "haritadan seçilen yer önce gelir (arama yok); bozuk yer atılır", fn: async () => { const sp = { name: " Foça Marina ", lat: 38.67031234, lon: 26.7572 }; const p = await RW.racePlace({ spot: sp, district: "Foça" }); return [p.name, p.lat, p.found, RW.cleanSpot({ lat: 200, lon: 1 }), RW.cleanSpot(null)]; }, ok: ([n, lat, f, bad, none]) => n === "Foça Marina" && lat === 38.6703 && !f && bad === null && none === null }],
  ["Foça istasyonu uzak", { desc: "Foça'ya en yakın resmî istasyon 10 km'den uzak (ölçülen rüzgâr çıkmaz, sebebi yazılır); Dikili yakın", fn: async () => { const { nearestStation } = await import("@/lib/windObs"); return [nearestStation(38.6703, 26.7572), nearestStation(39.0717, 26.8886)]; }, ok: ([f, d]) => !f.near && f.km > 10 && d.near }],
  ["günün saatleri", { desc: "yalnız istenen gün, yağmur %", fn: () => RW.rowsFrom({ hourly: { ...WJ.hourly, precipitation_probability: HRS.map(() => 30) } }, "2026-10-08"), ok: (r) => r.length === 24 && r[0].hh === "00" && r[0].rain === 30 && r[12].wind === 12 && r[0].time === "2026-10-08T00:00" }],
]);

// Yarış multimedya: kalan küçük hesaplar (gün/saat, elle eklenen günler, günün rüzgârı ve startları, yön kısaltması, iptal sebepleri)
group("Yarış multimedya: yardımcılar")([
  ["gün ve saat", { desc: "telefon saatine göre; saatsiz gün öğlen", fn: () => [RL.dayOf(RL.atOf("2026-10-19", "09:05")), RL.hm(RL.atOf("2026-10-19", "09:05")), RL.hm(RL.atOf("2026-10-19", "")), RL.hm(RL.atOf("2026-10-19", "9:5"))], ok: (r) => r.join() === "2026-10-19,09:05,12:00,12:00" }],
  ["elle eklenen günler", { desc: "bozuk tarih atılır, tekrar teke iner, sıralanır", fn: () => RL.cleanDays(["2026-10-21", "x", "2026-10-19", "2026-10-21", null, "2026-1-1"]), ok: (r) => r.join() === "2026-10-19,2026-10-21" }],
  ["günün rüzgârı ve startları", { desc: "yalnız o güne ait olanlar", fn: () => {
    const w = RL.cleanWind([{ at: RL.atOf("2026-10-19", "10:00"), dir: 300, kn: 10 }, { at: RL.atOf("2026-10-20", "10:00"), dir: 300, kn: 12 }]);
    const s = [{ day: "2026-10-19", id: "a" }, { day: "2026-10-20", id: "b" }];
    return [RL.windOn(w, "2026-10-20").map((x) => x.kn).join(), RL.startsOn(s, "2026-10-19").map((x) => x.id).join(), RL.windOn(null, "2026-10-19").length];
  }, ok: (r) => r.join() === "12,a,0" }],
  ["yön kısaltması", { desc: "315 KB, 0 K, -90 B, 359 K, yazıyla sayı", fn: () => [315, 0, -90, 359, "45"].map(RL.dirShort).join(), ok: (r) => r === "KB,K,B,K,KD" }],
  ["iptal sebepleri", { desc: "eski 'Ertelendi' bayrağı Tehir olur; bilinmeyen sebep geçersiz sayılmaz", fn: () => RL.cleanStarts([{ id: "s1", day: "2026-10-19", at: RL.atOf("2026-10-19", "11:00"), flag: "Ertelendi" }, { id: "s2", day: "2026-10-19", at: RL.atOf("2026-10-19", "12:00"), void: "Kafamda" }]).map((x) => x.void || "-").join(), ok: (r) => r === "Tehir,-" }],
  ["evre adları", { desc: "dört evre, üç rota, üç iptal sebebi", fn: () => [Object.keys(RL.PHASES).length, RL.COURSES.length, RL.VOIDS.join("/")], ok: ([p, c, v]) => p === 4 && c === 3 && v === "Tehir/Genel geri çağırma/İptal" }],
  ["bağsız çekimin yarışı", { desc: "starta 5 sn yakınsa o yarış; değilse o günün önceki startlarından sonraki", fn: () => {
    const S = RL.cleanStarts([{ id: "r1", day: "2026-10-19", n: 1, at: RL.atOf("2026-10-19", "11:00") }, { id: "r2", day: "2026-10-19", n: 2, at: RL.atOf("2026-10-19", "12:00") }]);
    return [RL.momentRace({ end: RL.atOf("2026-10-19", "12:00") }, S), RL.momentRace({ end: RL.atOf("2026-10-19", "13:00") }, S), RL.momentRace({ rid: "r1", end: RL.atOf("2026-10-19", "13:00") }, S)].join();
  }, ok: (r) => r === "2,3,1" }],
]);

// Yarış detayı › Özet › Yarış kartı (raceLinks.js): yarışın planı, son tarih planları, Instagram gönderisi
const RK = await import("@/features/athletes/raceLinks");
const PM = await import("@/features/posts/postModel");
group("Yarış detayı özeti")([
  ["yarışın planı", { desc: "adı aynı Yarış planı (harf/boşluk farkı yok), son tarihler 'Ad: iş'; başka tür ve başka yarış sayılmaz; aynı adlıdan tarihi yakın olan", fn: () => {
    const P = [
      { id: "p0", cat: "Yarış", title: "Foça Kupası", date: "2025-10-24" },
      { id: "p1", cat: "Yarış", title: "foça  kupası", date: "2026-10-25", endDate: "2026-10-28", time: "07:00" },
      { id: "p2", cat: "Yarış", title: "Foça Kupası: Online kayıt son gün", date: "2026-10-22" },
      { id: "p3", cat: "Antrenman", title: "Foça Kupası", date: "2026-10-25" },
      { id: "p4", cat: "Yarış", title: "Foça Kupası 2", date: "2026-10-25" },
    ];
    const a = RK.racePlansOf({ name: "Foça Kupası", startDate: "2026-10-26", departDate: "2026-10-25" }, P);
    return [a.main?.id, a.deadlines.map((x) => x.id).join(), RK.racePlansOf({ name: "Ege" }, P).main, RK.racePlansOf({ name: "" }, P).main];
  }, ok: ([m, d, none, empty]) => m === "p1" && d === "p2" && none === null && empty === null }],
  ["yarışın gönderisi", { desc: "yarışın kimliğiyle; eski gönderide (kimliksiz) aynı ad ve yıl; arşivde olmayan önce; başka yarışın kimliği sayılmaz", fn: () => {
    const R = { id: "r1", name: "Foça Kupası", startDate: "2026-10-26" };
    const P = [
      { id: "g1", year: 2026, archived: true, race: { id: "r1", name: "Foça Kupası" } },
      { id: "g2", year: 2026, race: { id: "r1", name: "Foça Kupası" } },
      { id: "g3", year: 2026, race: { id: "r9", name: "Foça Kupası" } },
    ];
    const old = [{ id: "o1", year: 2025, race: { name: "Foça Kupası" } }, { id: "o2", year: 2026, race: { name: "foça kupası" } }];
    return [RK.racePostOf(R, P)?.id, RK.racePostOf(R, old)?.id, RK.racePostOf(R, [P[2]]), RK.racePostOf(R, [old[0]])];
  }, ok: ([a, b, c, d]) => a === "g2" && b === "o2" && c === null && d === null }],
  ["gönderide yarışın kimliği", { desc: "yarıştan hazırlanan gönderi yarışın kimliğini taşır (yarışın sayfası gönderiyi bununla bulur)", fn: () => PM.postFromRace({ id: "r1", name: "Foça Kupası", startDate: "2026-10-26" }, "2026-10-20").race, ok: (r) => r.id === "r1" && r.name === "Foça Kupası" }],
]);
