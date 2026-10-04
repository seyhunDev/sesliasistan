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

// Yarış iş listesi (races.js): talimattaki işler + elle işler + evrak, tekrarsız
const RS = await import("@/features/athletes/races");
const RACE_T = { notice: { tasks: [{ title: "Online kayıt", date: "2026-10-01" }, { title: "Online kayıt" }] }, todos: [{ title: "Römork" }, { title: "römork" }, { title: "" }], checks: { docs: true, "m:römork": true } };
group("Yarış iş listesi")([
  ["iş sırası", { desc: "talimat, elle, evrak; tekrar atılır", fn: () => RS.stepsOf(RACE_T).map((s) => s.key).join(), ok: (r) => r === "t:online-kayıt,m:römork,docs,parents,schools,gsim" }],
  ["biten iş", { desc: "6 işten 2'si bitti", fn: () => RS.doneCount(RACE_T), ok: (r) => r === 2 }],
  ["eski talimat", { desc: "son tarih, ücret, otelden iş çıkar", fn: () => RS.noticeTasks({ deadlines: [{ title: "Kayıt son gün", date: "2026-10-01" }], fees: [{ amount: "1500" }], hotels: [{ name: "Otel A" }] }).map((t) => t.label).join(), ok: (r) => r === "Kayıt son gün,Kayıt ücretini öde,Konaklamayı ayarla" }],
  ["boş yarış", { desc: "yalnız 4 evrak işi", fn: () => RS.stepsOf({}).length, ok: (r) => r === 4 }],
  ["elle iş temizliği", { desc: "boş başlık atılır, bozuk tarih silinir", fn: () => RS.cleanTodos([{ title: "  A  ", date: "7 Ekim" }, { title: "" }]), ok: (r) => r.length === 1 && r[0].title === "A" && r[0].date === "" }],
  ["talimat temizliği", { desc: "bilinmeyen alan atılır", fn: () => RS.cleanNotice({ venue: "Foça", hack: "x", classes: ["ILCA", 5] }), ok: (r) => r.venue === "Foça" && !("hack" in r) && r.classes.join() === "ILCA" }],
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
  ["güncellemesiz", { desc: "dolu alanlara dokunulmaz", fn: () => RN.applyNotice({ name: "Foça", startDate: "2026-10-07", endDate: "2026-10-11", city: "", district: "" }, { startDate: "2026-10-08" }).startDate, ok: (r) => r === "2026-10-07" }],
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
group("Yarış evrakı")([
  ["bulunma eki", { desc: "İZMİR’de ANTALYA’da ÇEŞME’de İZMİT’te FOÇA’da", fn: () => ["İzmir", "Antalya", "Çeşme", "İzmit", "Foça"].map(RD.locative).join(" "), ok: (r) => r === "İZMİR’de ANTALYA’da ÇEŞME’de İZMİT’te FOÇA’da" }],
  ["tarih aralığı", { desc: "07-11 EKİM 2026 · 28 EYLÜL-02 EKİM 2026", fn: () => [RD.rangeText("2026-10-07", "2026-10-11"), RD.rangeText("2026-09-28", "2026-10-02"), RD.rangeTitle("2026-10-07", "2026-10-11")], ok: ([a, b, c]) => a === "07-11 EKİM 2026" && b === "28 EYLÜL-02 EKİM 2026" && c === "07-11 Ekim 2026" }],
  ["yazı sayısı", { desc: "GID-2026-09 + 2 → GID-2026-11", fn: () => RD.nextNo("GID-2026-09", 2), ok: (r) => r === "GID-2026-11" }],
  ["sporcu bilgisi", { desc: "büyük harf ad, sınıf okul adından", fn: () => RD.athleteInfo(DOC_ATH[0]), ok: (r) => r.name === "ALİ KAYA" && r.cls === "9/B" && r.letterSchool === "GELİŞİM LİSESİ" && r.parents === "VELİ/AYŞE" }],
  ["eksik alanlar", { desc: "boş kartta 17 eksik (katılım formu seçili değilse 14; sicil, yelken no, cinsiyet aranmaz)", fn: () => [RD.missing(DOC_ATH[1]).length, RD.missing(DOC_ATH[1], ["school", "hotel"]).length], ok: ([a, b]) => a === 17 && b === 14 }],
  ["kulüp yazısı bilgisi", { desc: "boşlar yarıştan gelir", fn: () => RD.clubInfo(DOC_RACE), ok: (r) => r.event === DOC_RACE.name && r.place === "Foça-İzmir" && r.from === "2026-10-07" && r.to === "2026-10-11" }],
  ["otel izni bilgisi", { desc: "otel boş, tarihler yarıştan", fn: () => RD.hotelInfo(DOC_RACE), ok: (r) => r.hotel === "" && r.from === "2026-10-07" && r.to === "2026-10-11" }],
  ["tek evrak tarihi", { desc: "kulüp yazısı, otel izni ve TYF basım zamanı evrak tarihinden (eski kulüp tarihi sayılmaz)", fn: () => { const r = { ...DOC_RACE, letterDate: "2026-10-01", clubDate: "2026-09-20", docsAt: "2026-10-01T09:05:00" }; return [RD.clubInfo(r).date, RD.hotelInfo(r).date, RD.stamp(r), RD.stamp({ ...r, letterDate: "2026-10-03" })]; }, ok: ([a, b, c, d]) => a === "2026-10-01" && b === "2026-10-01" && c === "01.10.2026 09:05" && d === "03.10.2026" }],
  ["tüm evrak PDF", { desc: "2 sporcu: okul 1 + kafile 1 + seyahat 1 + veli 2 + kulüp 2 + otel 1 + antrenör 1 + katılım 1 = 10 sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS)), ok: (r) => r === 10 }],
  ["tek belge", { desc: "yalnız otel izni → 1 sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, DOC_ATH, FONTS, ["hotel"])), ok: (r) => r === 1 }],
  ["kalabalık otel izni", { desc: "25 sporcu yine tek sayfa", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, studentName: `Sporcu ${i + 1}` })), FONTS, ["hotel"])), ok: (r) => r === 1 }],
  ["TYF formları sınıfa göre", { desc: "ILCA 4 ve Optimist sporcuları → 2 antrenör + 2 katılım formu; yarışta sınıf yazılınca 1 + 1", fn: async () => {
    const list = [{ ...DOC_ATH[0], boatClass: "ILCA 4" }, { ...DOC_ATH[1], boatClass: "Optimist" }];
    return [await pages(await RD.buildRaceDocs(DOC_RACE, list, FONTS, ["coach", "entry"], COACH)), await pages(await RD.buildRaceDocs({ ...DOC_RACE, entryClass: "ILCA 4" }, list, FONTS, ["coach", "entry"], COACH))];
  }, ok: ([a, b]) => a === 4 && b === 2 }],
  ["kalabalık katılım formu", { desc: "40 sporcu sonraki sayfaya taşar, başlık tekrarlanır", fn: async () => pages(await RD.buildRaceDocs(DOC_RACE, Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, studentName: `Sporcu ${i + 1}`, tyfNo: "0295134", sailNo: "216382" })), FONTS, ["entry"], COACH)), ok: (r) => r === 2 }],
  ["katılım formu sporcu satırı", { desc: "sicil, yelken no, cinsiyet büyük harf, doğum tarihi noktalı", fn: () => RD.athleteInfo({ studentName: "Mete Ok", tyfNo: "0295134", sailNo: "216382", studentGender: "Erkek", studentBirthDate: "2013-04-29" }), ok: (r) => r.tyfNo === "0295134" && r.sailNo === "216382" && r.gender === "ERKEK" && r.birthDot === "29.04.2013" }],
  ["antrenör bilgisi", { desc: "başlangıçta ad/e-posta hesaptan, destek botu kulübün; eksik: T.C., sicil, telefon", fn: () => RD.coachMissing(RD.cleanCoach(RD.coachStart({ name: "Deneme Antrenör", email: "a@b.c" }))), ok: (r) => r.join() === "T.C.,sicil no,telefon" }],
  ["bütçe PDF", { desc: "bütçe çıktısı açılır", fn: async () => pages(await BD.buildBudgetPdf(DOC_RACE, DOC_ATH, FONTS)), ok: (r) => r >= 1 }],
]);

// Yarış sonuçları (raceResults.js)
const RR = await import("@/lib/raceResults");
const RF = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
group("Yarış sonuçları")([
  ["temizlik", RF("sıra sayı, boşlar atılır", () => { const c = RR.cleanResults({ fleet: "24", rows: { a1: { place: "3", note: " ILCA 4 " }, a2: { place: "", note: "" }, "x/y": { place: 1 } } }); return c.fleet === 24 && c.rows.a1.place === 3 && c.rows.a1.note === "ILCA 4" && !c.rows.a2 && !c.rows["x/y"]; })],
  ["metin", RF("3. / 24 · ILCA 4", () => RR.placeText({ fleet: 24, rows: { a1: { place: 3, note: "ILCA 4" } } }, "a1") === "3. / 24 · ILCA 4")],
  ["başladı mı", RF("başlangıç bugün/önce", () => RR.resultsOpen({ startDate: "2026-10-05" }, "2026-10-05") && !RR.resultsOpen({ startDate: "2026-10-06" }, "2026-10-05"))],
  ["sporcu geçmişi", RF("yeniden eskiye, yalnız katıldıkları", () => { const h = RR.historyOf([{ id: "r1", name: "A", startDate: "2026-05-01", athleteIds: ["a1"], results: { fleet: 10, rows: { a1: { place: 2 } } } }, { id: "r2", name: "B", startDate: "2026-09-01", athleteIds: ["a1"] }, { id: "r3", name: "C", startDate: "2026-10-01", athleteIds: ["a2"] }], "a1"); return h.map((x) => x.id).join() === "r2,r1" && h[1].text === "2. / 10"; })],
  ["Instagram sırası", RF("dereceli önce, sonuç satırda", () => { const l = RR.withResults([{ name: "Ali" }, { name: "Ece" }], ["a1", "a2"], { fleet: 0, rows: { a2: { place: 1 } } }); return l[0].name === "Ece" && l[0].res === "1." && !l[1].res; })],
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
