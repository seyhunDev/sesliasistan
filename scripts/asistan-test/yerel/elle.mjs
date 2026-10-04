// Elle işlemler ve hesaplar: ek bildirimler, yoklama raporu, etkinlik bütçesi (sayfalardaki düğmelerin arkasındaki mantık).
import { suite } from "./ortak.mjs";

const { group } = suite("elle");
const F = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
// Ek bildirimler (notifyExtra.js): doğum günü, rüzgâr, haftalık özet
const NX = await import("@/lib/notifyExtra");
const WROWS = Array.from({ length: 24 }, (_, i) => ({ hh: String(i).padStart(2, "0"), wind: i >= 14 && i <= 18 ? 23 : 10, gust: i >= 14 && i <= 18 ? 30 : 14 }));
const WPLANS = [{ title: "Optimist antrenmanı", date: "2026-10-05", time: "16:00", cat: "Antrenman" }, { title: "Toplantı", date: "2026-10-05", time: "16:00", cat: "Toplantı" }];
group("Ek bildirimler")([
  ["doğum günü bugün", F("Ali Kaya, 12 yaş", () => /Ali Kaya \(12 yaşında\)/.test(NX.birthdayText([{ name: "Ali Kaya", month: 10, day: 5, year: 2014 }, { name: "Veli", month: 11, day: 5 }], "2026-10-05")?.title || ""))],
  ["doğum günü yok", F("bildirim yok", () => NX.birthdayText([{ name: "Veli", month: 11, day: 5 }], "2026-10-05") === null)],
  ["rüzgâr eşik üstü", F("antrenman için uyarı", () => /Optimist antrenmanı: rüzgâr 23 kn/.test(NX.windAlert({ rows: WROWS, plans: WPLANS, today: "2026-10-05", kn: 20 })?.body || ""))],
  ["rüzgâr eşik altı", F("uyarı yok (eşik 25)", () => NX.windAlert({ rows: WROWS, plans: WPLANS, today: "2026-10-05", kn: 25 }) === null)],
  ["sabah antrenmanı sakin", F("uyarı yok", () => NX.windAlert({ rows: WROWS, plans: [{ ...WPLANS[0], time: "09:00" }], today: "2026-10-05", kn: 20 }) === null)],
  ["toplantıda rüzgâr", F("uyarı yok", () => NX.windAlert({ rows: WROWS, plans: [WPLANS[1]], today: "2026-10-05", kn: 20 }) === null)],
  ["plan saatindeki rüzgâr", F("16:00 antrenmanı 23/30 kn, eşik üstü", () => { const x = NX.planWind(WROWS, WPLANS[0]); return x.wind === 23 && x.gust === 30 && NX.overWind(x, 20) && !NX.overWind(x, 25); })],
  ["saatsiz plan", F("08–19 arası bakılır", () => NX.planWind(WROWS, { title: "x" }).wind === 23)],
  ["saat verisi yok", F("null, uyarı yok", () => NX.planWind([], WPLANS[0]) === null && !NX.overWind(null))],
  ["pazartesi", F("2026-10-05 pazartesi", () => NX.isMonday("2026-10-05") && !NX.isMonday("2026-10-06"))],
  ["haftalık özet", F("2 plan, 1 görev, 1 geciken", () => {
    const r = NX.weeklyText({ plans: [{ title: "A", date: "2026-10-05", time: "10:00" }, { title: "B", date: "2026-10-09" }, { title: "C", date: "2026-10-13" }], tasks: [{ title: "x", due: "2026-10-07", done: false }, { title: "y", due: "2026-10-01", done: false }], today: "2026-10-05", uid: "u", name: "Seyhun Yıldız" });
    return r.title === "Bu hafta, Seyhun" && /^2 plan · 1 görev · 1 geciken/.test(r.body) && /Pzt 10:00 A/.test(r.body) && /Cum B/.test(r.body);
  })],
]);

// Yoklama ay raporu (attendanceReport.js)
const AR = await import("@/features/athletes/attendanceReport");
const ATH = [
  { id: "1", studentName: "Zeynep", currentClassId: "c", att: { 2026: { "10-01": "present", "10-02": "absent", "10-03": "excused", "09-30": "present" } } },
  { id: "2", studentName: "Ali", currentClassId: "c", att: { 2026: { "10-01": "present", "10-02": "present" } } },
  { id: "3", studentName: "Emre", currentClassId: "c", att: {} },
];
group("Yoklama raporu")([
  ["ekim 2026", F("3 gün, Ali %100, Zeynep %50, Emre boş", () => {
    const r = AR.monthReport(ATH, "2026-10", { c: "Optimist" });
    const by = Object.fromEntries(r.rows.map((x) => [x.name, x]));
    return r.days.join(",") === "10-01,10-02,10-03" && r.rows[0].name === "Ali" && by.Ali.rate === 100 && by.Zeynep.rate === 50 && by.Zeynep.excused === 1 && by.Emre.rate === null && by.Ali.cls === "Optimist";
  })],
  ["excel tabloları", F("özet ve gün tablosu", () => {
    const { summary, grid } = AR.reportSheets(AR.monthReport(ATH, "2026-10"));
    return summary[0][5] === "Devam %" && summary.length === 4 && grid[0][1] === "01.10" && grid.find((x) => x[0] === "Zeynep").slice(1).join("") === "GYİ";
  })],
  ["ay kaydırma", F("ocak ← aralık", () => AR.shiftMonth("2026-01", -1) === "2025-12" && AR.shiftMonth("2025-12", 1) === "2026-01")],
]);

// Etkinlik bütçesi ve kayıt temizliği (eventModel.js)
const EM = await import("@/features/events/eventModel");
group("Etkinlik planı (bütçe ve temizlik)")([
  ["kişi başı ve ortak", { desc: "4 kişi: 4×500×2 + 1200 = 5200, kişi başı 1300", fn: () => EM.totals(EM.cleanEvent({ people: 4, budget: [{ title: "Yemek", amount: 500, unit: "person", qty: 2 }, { title: "Yakıt", amount: 1200, unit: "shared" }] })), ok: (r) => r.total === 5200 && r.perPerson === 1300 }],
  ["kişi yok", { desc: "1 kişi sayılır", fn: () => EM.totals(EM.cleanEvent({ budget: [{ title: "Bilet", amount: 900, unit: "person" }] })), ok: (r) => r.total === 900 && r.people === 1 }],
  ["bozuk veri", { desc: "tür, tarih, boş kalemler süzülür", fn: () => EM.cleanEvent({ kind: "xx", startDate: "7 Ekim", endDate: "2020-01-01", needs: [{ title: "" }, { title: "Çadır", cat: "Barınma" }], todos: [{ title: "Yer ayırt", date: "yarın" }] }), ok: (r) => r.kind === "diger" && r.startDate === "" && r.endDate === "" && r.needs.length === 1 && r.todos[0].date === "" }],
  ["özet cümlesi", { desc: "ihtiyaç, tahmini bütçe, kişi başı", fn: () => EM.countsText(EM.cleanEvent({ people: 2, needs: [{ title: "Çadır" }], budget: [{ title: "Yakıt", amount: 1000, unit: "shared", est: true }] })), ok: (r) => /1 ihtiyaç/.test(r) && /tahmini bütçe 1\.000\s₺/.test(r) && /kişi başı 500\s₺/.test(r) }],
]);
const EV = { people: 4, startDate: "2026-10-09", endDate: "2026-10-11", budget: [{ title: "Benzin", amount: "1.200", unit: "shared" }, { title: "Yemek", amount: 350, unit: "person", qty: 3, est: true }], needs: [{ title: "Çadır", cat: "Barınma" }], todos: [{ title: "Yer ayır", date: "2026-10-05" }] };
group("Etkinlik (hesap ve tarih)")([
  ["gün sayısı", { desc: "9-11 Ekim → 3 gün, bitişsiz 1, tarihsiz 0", fn: () => [EM.daysOf(EM.cleanEvent(EV)), EM.daysOf({ startDate: "2026-10-09" }), EM.daysOf({})], ok: (r) => r.join() === "3,1,0" }],
  ["binlik nokta", { desc: "\"1.200\" → 1200", fn: () => EM.cleanEvent(EV).budget[0].amount, ok: (r) => r === 1200 }],
  ["toplam", { desc: "1200 + 350×3×4 = 5400, kişi başı 1350, tahmini", fn: () => EM.totals(EM.cleanEvent(EV)), ok: (r) => r.total === 5400 && r.perPerson === 1350 && r.est === true }],
  ["hesap yazısı", { desc: "350 ₺ × 3 × 4 kişi", fn: () => EM.howText(EM.cleanEvent(EV).budget[1], 4).replace(/ /g, " "), ok: (r) => r === "350 ₺ × 3 × 4 kişi" }],
  ["tarih aralığı", { desc: "aynı ay, iki ay", fn: () => [EM.rangeText("2030-10-09", "2030-10-11"), EM.rangeText("2030-09-30", "2030-10-02")], ok: ([a, b]) => a === "9-11 Ekim 2030" && b === "30 Eylül-2 Ekim 2030" }],
  ["boş etkinlik", { desc: "tür diger, listeler boş", fn: () => EM.freshEvent("xx"), ok: (r) => r.kind === "diger" && !r.needs.length && !r.budget.length && r.source === "manual" }],
]);

// Fişler (receipts.js): tutar okuma, KDV hesabı, fişteki toplamla uyuşmazlık
const RC = await import("@/lib/receipts");
group("Fiş hesapları")([
  ["tutar yazımları", { desc: "1.234,56 · 1234.56 · 12,5 TL · ₺3.500 · 12.50 · 7,5 sayı", fn: () => ["1.234,56", "1234.56", "12,5 TL", "₺3.500", "12.50", 7.5].map(RC.parseTL).join(), ok: (r) => r === "123456,123456,1250,350000,1250,750" }],
  ["geçersiz tutar", { desc: "boş ve harf → NaN", fn: () => [RC.parseTL(""), RC.parseTL("abc")].map(Number.isNaN).join(), ok: (r) => r === "true,true" }],
  ["form alanı", { desc: "123456 kuruş → 1234,56", fn: () => RC.toInput(123456), ok: (r) => r === "1234,56" }],
  ["KDV", { desc: "%20'lik 20 TL + %10'luk 5 TL → KDV 3,78", fn: () => RC.calcTotals([{ q: 2, u: 1000, r: 20 }, { q: 1, u: 500, r: 10 }]), ok: (r) => r.gross === 2500 && r.vat === 378 && r.net === 2122 && r.byRate.length === 2 }],
  ["adet", { desc: "\"1,5\" → 1.5, boş → 1", fn: () => [RC.parseQty("1,5"), RC.parseQty("")].join(), ok: (r) => r === "1.5,1" }],
  ["toplam uyuşmazlığı", { desc: "fişte 30 TL, kalemler 25 TL → uyarı", fn: () => [RC.mismatch({ declared: 3000, items: [{ q: 1, u: 2500, r: 20 }] }), RC.mismatch({ declared: 2500, items: [{ q: 1, u: 2500, r: 20 }] })].join(), ok: (r) => r === "true,false" }],
]);

// Fiş numarası, ödeme durumu ve muhasebe Excel'i (receipts.js)
const RCX = [
  { no: 2, date: "2026-10-03", merchant: "Shell", taxId: "123", docType: "fatura", docNo: "A1", cat: "Yakıt", pay: "Kart", items: [{ n: "Benzin", q: 1, u: 120000, r: 20 }], totals: RC.calcTotals([{ q: 1, u: 120000, r: 20 }]), createdBy: { name: "Ali Kaya" }, payStatus: "pending" },
  { no: 1, date: "2026-10-01", merchant: "Migros", cat: "Market", pay: "Nakit", note: "Kamp malzemesi", items: [{ n: "Su", q: 2, u: 1000, r: 10 }], totals: RC.calcTotals([{ q: 2, u: 1000, r: 10 }]), createdBy: { name: "Seyhun" }, payStatus: "paid", paidAt: "2026-10-01T10:00:00.000Z" },
  { date: "2026-09-20", merchant: "Eski", items: [{ n: "x", q: 1, u: 500, r: 0 }], totals: RC.calcTotals([{ q: 1, u: 500, r: 0 }]), createdBy: { name: "Seyhun" } },
];
group("Fiş numarası ve muhasebe")([
  ["numara yazısı", F("7 → F-0007, boş → \"\"", () => RC.noText(7) === "F-0007" && RC.noText(12345) === "F-12345" && RC.noText(null) === "" && RC.noText(0) === "")],
  ["ana hesabın fişi ödendi", F("staff bekliyor, ana hesap ödendi + görüldü", () => { const a = RC.newPay(true, "Ali", "t"); const b = RC.newPay(false, "Seyhun", "t"); return a.payStatus === "pending" && !a.paidAt && b.payStatus === "paid" && b.paidBy.name === "Seyhun" && b.paySeenAt === "t"; })],
  ["eski ana hesap fişi", F("payStatus boş → Ödendi", () => RC.payOf({}) === "paid" && RC.payText({}) === "Ödendi" && RC.payText({ payStatus: "pending" }) === "Ödeme bekliyor")],
  ["Excel sırası ve sütunlar", F("numaraya göre, numarasız sonda", () => { const s = RC.accountingSheets(RCX).Fişler; return s[0][0] === "Fiş no" && s[0].length === 16 && s[1][0] === "F-0001" && s[2][0] === "F-0002" && s[3][0] === "" && s[1][1] === "01.10.2026"; })],
  ["Excel tutarları", F("Shell 1.200 TL, KDV 200, matrah 1.000; toplam satırı", () => { const s = RC.accountingSheets(RCX).Fişler; const r = s[2]; const t = s[s.length - 1]; return r[9] === 1000 && r[10] === "%20" && r[11] === 200 && r[12] === 1200 && r[13] === "Ali Kaya" && r[14] === "Ödeme bekliyor" && r[15] === "" && t[0] === "Toplam" && t[12] === 1225; })],
  ["Excel açıklama ve ödeme", F("not açıklamada, ödendi tarihi", () => { const r = RC.accountingSheets(RCX).Fişler[1]; return r[6] === "Kamp malzemesi" && r[14] === "Ödendi" && r[15] === "01.10.2026" && r[4] === "Fiş"; })],
  ["kategori sayfası", F("Yakıt önce, toplam 12,25+1200", () => { const k = RC.accountingSheets(RCX).Kategoriler; return k[1][0] === "Yakıt" && k[1][4] === 1200 && k[k.length - 1][1] === 3 && k[k.length - 1][4] === 1225; })],
]);

// Plan hatırlatmaları (reminders.js): zamanlayıcının hangi planı ne zaman bildireceği (İstanbul saati)
const RM = await import("@/lib/reminders");
const RP = { id: "p", date: "2026-10-05", time: "10:00", title: "Antrenman" };
const due = (plan, lead, iso, uid) => RM.dueReminders([plan], { lead, now: new Date(iso), uid }).length;
group("Plan hatırlatmaları")([
  ["1 saat önce", { desc: "09:05'te gider", fn: () => due(RP, 60, "2026-10-05T06:05:00Z"), ok: (r) => r === 1 }],
  ["pencere dışı", { desc: "09:30'da gitmez (15 dk geçti)", fn: () => due(RP, 60, "2026-10-05T06:30:00Z"), ok: (r) => r === 0 }],
  ["zaten gönderildi", { desc: "aynı kişiye ikinci kez gitmez", fn: () => due({ ...RP, reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T06:05:00Z", "u1"), ok: (r) => r === 0 }],
  ["başka kişi", { desc: "ikinci kişiye gider", fn: () => due({ ...RP, reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T06:05:00Z", "u2"), ok: (r) => r === 1 }],
  ["tüm gün, 1 gün önce", { desc: "önceki sabah 08:00", fn: () => due({ ...RP, time: "" }, 1440, "2026-10-04T05:05:00Z"), ok: (r) => r === 1 }],
  ["saat değişince", { desc: "plan saati değişirse yeniden gider", fn: () => due({ ...RP, time: "11:00", reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T07:05:00Z", "u1"), ok: (r) => r === 1 }],
]);

// Takvim, görev grupları, doğum günleri (agenda.js)
const AG = await import("@/lib/agenda");
const TT = [{ title: "a", due: "2026-10-01" }, { title: "b", due: "2026-10-03" }, { title: "c", due: "2026-10-04" }, { title: "d", due: "2026-10-08" }, { title: "e", due: "2026-10-20" }, { title: "f" }];
group("Takvim ve görev grupları")([
  ["görev grupları", { desc: "Gecikti, Bugün, Yarın, Bu hafta, Daha sonra, Tarihsiz", fn: () => AG.groupTasks(TT, "2026-10-03").map((g) => `${g.label}:${g.items.length}`).join(), ok: (r) => r === "Gecikti:1,Bugün:1,Yarın:1,Bu hafta:1,Daha sonra:1,Tarihsiz:1" }],
  ["son tarih yazısı", { desc: "2 gün gecikti / 4 gün kaldı", fn: () => [AG.dueLabel("2026-10-01", "2026-10-03"), AG.dueLabel("2026-10-07", "2026-10-03")], ok: ([a, b]) => a.text === "2 gün gecikti" && a.late && b.text === "4 gün kaldı" && !b.late }],
  ["ay ızgarası", { desc: "Ekim 2026: 28 Eylül pazartesiden 1 Kasım'a, 35 gün", fn: () => AG.monthGrid("2026-10"), ok: (r) => r.length === 35 && r[0].day === "2026-09-28" && !r[0].inMonth && r[34].day === "2026-11-01" && r[3].day === "2026-10-01" && r[3].inMonth }],
  ["29 Şubat", { desc: "artık olmayan yılda 28 Şubat", fn: () => [AG.birthdayIn({ month: 2, day: 29 }, 2027), AG.birthdayIn({ month: 2, day: 29 }, 2028)].join(), ok: (r) => r === "2027-02-28,2028-02-29" }],
  ["yaklaşan doğum günleri", { desc: "30 gün içinde, yakından uzağa, yaş", fn: () => AG.upcomingBirthdays([{ name: "A", month: 11, day: 1, year: 2000 }, { name: "B", month: 10, day: 10 }, { name: "C", month: 3, day: 1 }], "2026-10-03"), ok: (r) => r.map((x) => x.name).join() === "B,A" && r[1].age === 26 && r[0].age === null }],
  ["gün adı", { desc: "Bugün, Yarın, hafta içi gün adı", fn: () => [AG.dayLabel("2026-10-03", "2026-10-03"), AG.dayLabel("2026-10-04", "2026-10-03"), AG.dayLabel("2026-10-07", "2026-10-03")].join(), ok: (r) => r === "Bugün,Yarın,Çarşamba" || r === "Bugün,Yarın,çarşamba" }],
]);

// Instagram gönderisi (postModel.js): etiketler, sporcu satırları, yarıştan gönderi, kayıt temizliği
const PM = await import("@/features/posts/postModel");
const SIX = ["Ali Kaya", "Ayşe Su", "Can Ak", "Ege Demir", "Deniz Öz", "Zeynep Kara"].map((name) => ({ name, cls: "Optimist" }));
group("Instagram gönderisi")([
  ["etiketler", { desc: "boşluk ve # temizlenir, tekrar ve tek harf atılır", fn: () => PM.cleanTags(["#Dikili Yelken", "yelken", "#YELKEN", "a"]).join(" "), ok: (r) => r === "#DikiliYelken #yelken" }],
  ["en çok 15 etiket", { desc: "15", fn: () => PM.cleanTags(Array.from({ length: 30 }, (_, i) => `etiket${i}`)).length, ok: (r) => r === 15 }],
  ["az sporcu", { desc: "Ad · sınıf satırları", fn: () => PM.peopleLines(SIX.slice(0, 2)), ok: (r) => r === "Ali Kaya · Optimist\nAyşe Su · Optimist" }],
  ["kalabalık", { desc: "6 sporcumuz yarışta + ilk adlar", fn: () => PM.peopleLines(SIX), ok: (r) => r.startsWith("6 sporcumuz yarışta\nAli, Ayşe, Can") }],
  ["görsel satırı en çok 4", { desc: "4 satır", fn: () => PM.cleanPeople("a\nb\nc\nd\ne\nf").split("\n").length, ok: (r) => r === 4 }],
  ["yarış duyurusu", { desc: "bitmemiş yarış → duyuru, başlık ve alt satır", fn: () => PM.postFromRace({ name: "Foça Kupası", district: "Foça", city: "İzmir", startDate: "2026-10-07", endDate: "2026-10-08", athleteIds: ["1", "2"] }, "2026-10-03"), ok: (r) => r.kind === "duyuru" && r.tag === "YARIŞ DUYURUSU" && r.headline === "Foça Kupası" && r.sub === "Sporcularımız, Foça'nın rüzgarlı sularında kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı." && r.race.count === 2 && r.race.place === "Foça, İzmir" }],
  ["yarış sonucu", { desc: "biten yarış → sonuç", fn: () => PM.postFromRace({ name: "Ege Kupası", startDate: "2026-09-01", endDate: "2026-09-02" }, "2026-10-03").kind, ok: (r) => r === "sonuc" }],
  ["kişisel bilgi gitmez", { desc: "yarıştan yalnız ad ve sınıf", fn: () => JSON.stringify(PM.raceBrief({ name: "X" }, [{ name: "Ali Kaya", cls: "ILCA", tc: "12345678901", parentPhone: "0532" }])), ok: (r) => !/12345678901|0532/.test(r) && /Ali Kaya/.test(r) }],
  ["bozuk kayıt", { desc: "tür, biçim, zemin, konum varsayılan; odak 0-100", fn: () => PM.cleanPost({ kind: "x", format: "y", theme: "z", pos: "orta", focus: 250, thumb: "http://kötü" }), ok: (r) => r.kind === "diger" && r.format === "square" && r.theme === "deniz" && r.pos === "bottom" && r.focus === 100 && r.thumb === "" }],
  ["fotoğraf büyütme", { desc: "zoom 100-250, yatay kaydırma 0-100, varsayılan 100/50", fn: () => [PM.cleanPost({ zoom: 900, fx: -5 }), PM.cleanPost({ zoom: 20 }), PM.cleanPost({})].map((x) => `${x.zoom}/${x.fx}`).join(" "), ok: (r) => r === "250/0 100/50 100/50" }],
  ["paylaşım metni", { desc: "açıklama + boş satır + etiketler", fn: () => PM.fullCaption(PM.cleanPost({ caption: "Harika gün ⛵", hashtags: ["yelken", "dikili"] })), ok: (r) => r === "Harika gün ⛵\n\n#yelken #dikili" }],
  ["ilgi eki", { desc: "Foça'nın, Çeşme'nin, Bodrum'un, Göcek'in", fn: () => ["Foça", "Çeşme", "Bodrum", "Göcek", "Kuşadası"].map(PM.genitive).join(" "), ok: (r) => r === "Foça'nın Çeşme'nin Bodrum'un Göcek'in Kuşadası'nın" }],
  ["alt satır 1 sporcu", { desc: "Sporcumuz Mete Ok, Foça'nın…", fn: () => PM.raceSub({ place: "Foça, İzmir", athletes: [{ name: "Mete Ok" }] }), ok: (r) => r === "Sporcumuz Mete Ok, Foça'nın rüzgarlı sularında kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı." }],
  ["alt satır 2 sporcu", { desc: "Sporcularımız A ve B", fn: () => PM.raceSub({ place: "Çeşme", athletes: SIX.slice(0, 2) }, "sonuc"), ok: (r) => r === "Sporcularımız Ali Kaya ve Ayşe Su, Çeşme'nin rüzgarlı sularında kulübümüzü başarıyla temsil etti." }],
  ["alt satır 3+ sporcu", { desc: "yalnız Sporcularımız, ad ve sayı yok", fn: () => PM.raceSub({ place: "Foça", athletes: SIX }), ok: (r) => r.startsWith("Sporcularımız, Foça'nın") && !/Ali|6/.test(r) }],
  ["yarıştan 1 sporcu", { desc: "ad alt satırda, ayrı sporcu satırı yok", fn: () => PM.postFromRace({ name: "Foça Kupası", district: "Foça", startDate: "2026-10-07", athletes: [{ name: "Mete Ok", cls: "Optimist" }] }, "2026-10-03"), ok: (r) => r.sub.startsWith("Sporcumuz Mete Ok, Foça'nın") && r.people === "" }],
  ["tarih aralığı", { desc: "7-11 Ekim 2026 · 28 Eylül-2 Ekim 2026", fn: () => [PM.dateRange("2026-10-07", "2026-10-11"), PM.dateRange("2026-09-28", "2026-10-02"), PM.dateRange("", "")], ok: ([a, b, c]) => a === "7-11 Ekim 2026" && b === "28 Eylül-2 Ekim 2026" && c === "" }],
]);

// Tekrarlayan plan (repeat.js): "her salı 16:00 antrenman" → haftalık kopyalar
const RPT = await import("@/lib/repeat");
group("Tekrarlayan plan")([
  ["her salı antrenman", F("salı bulunur", () => JSON.stringify(RPT.repeatOf("her salı 16:00 antrenman")?.days) === "[2]")],
  ["her salı ve perşembe", F("iki gün", () => JSON.stringify(RPT.repeatOf("her salı ve perşembe saat 5'te antrenman")?.days) === "[2,4]")],
  ["cumartesileri", F("cumartesi", () => JSON.stringify(RPT.repeatOf("cumartesileri yarış antrenmanı")?.days) === "[6]")],
  ["her hafta toplantı", F("gün yok, haftalık", () => JSON.stringify(RPT.repeatOf("her hafta toplantı yapalım")?.days) === "[]")],
  ["tek seferlik", F("tekrar yok", () => RPT.repeatOf("salı 16:00 antrenman") === null && RPT.repeatOf("herkese haber ver") === null)],
  ["varsayılan bitiş", F("12 hafta", () => RPT.seriesDates("2026-10-06").length === 12)],
  ["bitiş tarihi", F("6 Eki → 27 Eki: 4 hafta", () => RPT.seriesDates("2026-10-06", "2026-10-27").join() === "2026-10-06,2026-10-13,2026-10-20,2026-10-27")],
  ["en çok yarım yıl", F("26 hafta", () => RPT.seriesDates("2026-10-06", "2027-12-31").length === 26)],
  ["yapay zeka kaçırdı", F("pazartesi bugünken salıya kayar, haftalık olur", () => {
    const r = RPT.applyRepeat([{ type: "plan", title: "Antrenman", date: "", time: "16:00" }], "her salı 16:00 antrenman", "2026-10-05");
    return r.length === 1 && r[0].repeat === "week" && r[0].date === "2026-10-06";
  })],
  ["iki gün iki seri", F("salı ve perşembe ayrı", () => {
    const r = RPT.applyRepeat([{ type: "plan", title: "Antrenman", date: "2026-10-06", time: "17:00" }], "her salı ve perşembe 17:00 antrenman", "2026-10-05");
    return r.map((x) => x.date).join() === "2026-10-06,2026-10-08" && r.every((x) => x.repeat === "week");
  })],
  ["yapay zeka zaten işaretledi", F("dokunulmaz", () => RPT.applyRepeat([{ type: "plan", title: "A", date: "2026-10-06", repeat: "week" }], "her salı A", "2026-10-05")[0].date === "2026-10-06")],
  ["görev etkilenmez", F("görev tekrar etmez", () => !RPT.applyRepeat([{ type: "task", title: "Tekneleri yıka", date: "" }], "her salı tekneleri yıka", "2026-10-05")[0].repeat)],
  ["etiket", F("Ekim'e kadar", () => RPT.repeatLabel("2026-10-27") === "Her hafta · 27 Ekim'e kadar" && RPT.repeatLabel("2026-12-29") === "Her hafta · 29 Aralık'a kadar")],
]);

// Plan iptali (cancelPlan.js) ve gelmeyenin velisine haber (absent.js)
const CP = await import("@/lib/cancelPlan");
const AB = await import("@/lib/absent");
const REM = await import("@/lib/reminders");
group("İptal ve veliye haber")([
  ["rüzgâr iptal metni", F("Bugün 16:00 … rüzgâr nedeniyle iptal edildi.", () => CP.cancelText({ title: "Optimist antrenmanı", date: "2026-10-05", time: "16:00" }, "wind", "2026-10-05") === "Bugün 16:00 Optimist antrenmanı rüzgâr nedeniyle iptal edildi.")],
  ["yarın, nedensiz", F("Yarın … iptal edildi.", () => CP.cancelText({ title: "Antrenman", date: "2026-10-06" }, "other", "2026-10-05") === "Yarın Antrenman iptal edildi.")],
  ["iptal edilebilir mi", F("geçmiş ve iptal olmuş hayır", () => CP.canCancel({ date: "2026-10-05" }, "2026-10-05") && !CP.canCancel({ date: "2026-10-04" }, "2026-10-05") && !CP.canCancel({ date: "2026-10-06", status: "cancelled" }, "2026-10-05"))],
  ["iptalde hatırlatma yok", F("dueReminders iptali atlar", () => REM.dueReminders([{ id: "a", date: "2026-10-05", time: "16:00", status: "cancelled" }], { lead: 60, now: new Date("2026-10-05T12:05:00Z"), windowMin: 15 }).length === 0)],
  ["iptalde rüzgâr uyarısı yok", F("windAlert boş", () => NX.windAlert({ rows: WROWS, plans: [{ ...WPLANS[0], status: "cancelled" }], today: "2026-10-05", kn: 20 }) === null)],
  ["uyarıdan plana", F("tek planda bağlantı plana gider", () => NX.windAlert({ rows: WROWS, plans: [{ ...WPLANS[0], id: "x1" }], today: "2026-10-05", kn: 20 })?.url === "/?open=plan:x1")],
  ["telefon biçimi", F("0532… → 90532…", () => AB.waPhone("0532 123 45 67") === "905321234567" && AB.waPhone("+90 (532) 123-4567") === "905321234567" && AB.waPhone("5321234567") === "905321234567" && AB.waPhone("123") === "")],
  ["veli metni", F("Ali bugünkü antrenmana gelmedi", () => /^Merhaba, Ali bugünkü antrenmana gelmedi\./.test(AB.absentText("Ali Kaya", "2026-10-05", "2026-10-05")))],
  ["geçmiş gün", F("4 Ekim günkü", () => /Ali 4 Ekim günkü antrenmana/.test(AB.absentText("Ali Kaya", "2026-10-04", "2026-10-05")))],
  ["veli bildirimi", F("Devamsızlık: Ali", () => AB.absentPush("Ali Kaya", "2026-10-05", "2026-10-05").title === "Devamsızlık: Ali")],
]);

// Belge bitiş takibi (expiry.js): lisans vizesi, sağlık raporu, sigorta
const EX = await import("@/lib/expiry");
const EXA = { id: "1", studentName: "Ali", licenseUntil: "2026-09-30", healthUntil: "2026-10-20", insuranceUntil: "2027-05-01" };
group("Belge bitiş takibi")([
  ["durumlar", F("bitti, yakında, tamam", () => EX.expiryOf(EXA, "2026-10-05").map((x) => x.state).join() === "expired,soon,ok")],
  ["tarih yok", F("uyarı yok", () => EX.alertsOf({ id: "2" }, "2026-10-05").length === 0)],
  ["metin", F("bitti / 15 gün sonra", () => { const [a, b] = EX.alertsOf(EXA, "2026-10-05"); return EX.alertText(a) === "Lisans vizesi bitti (30 Eyl 2026)" && EX.alertText(b) === "Sağlık raporu 15 gün sonra bitiyor"; })],
  ["liste sırası", F("önce biten", () => { const l = EX.expiryList([{ id: "2", healthUntil: "2026-10-25" }, EXA, { id: "3" }], "2026-10-05"); return l.length === 2 && l[0].a.id === "1"; })],
  ["yarışta geçersiz", F("yarış sonu 31 Eki: sağlık raporu da biter", () => EX.raceExpired(EXA, { startDate: "2026-10-26", endDate: "2026-10-31" }).map((x) => x.key).join() === "licenseUntil,healthUntil")],
]);

// Veri yedeği (backup.js)
const BK = await import("@/lib/backup");
group("Veri yedeği")([
  ["sayfalar", F("7 sayfa, planlar sıralı, iptal yazılı", () => {
    const s = BK.backupSheets({ plans: [{ date: "2026-10-09", title: "B" }, { date: "2026-10-05", title: "A", status: "cancelled", assignees: ["u1"] }], receipts: [{ date: "2026-10-01", merchant: "Migros", declared: 64290, payStatus: "paid" }] }, (u) => (u === "u1" ? "Ali Kaya" : ""));
    return Object.keys(s).length === 7 && s.Planlar[1][3] === "A" && s.Planlar[1][6] === "İptal" && s.Planlar[1][7] === "Ali Kaya" && s.Fişler[1][2] === 642.9 && s.Fişler[1][3] === "Ödendi";
  })],
  ["gizli alanlar atılır", F("push, thumb, reminded yok; zaman damgası ISO", () => {
    const c = BK.clean({ name: "Ali", push: { x: 1 }, thumb: "data:…", at: { toDate: () => new Date("2026-10-05T10:00:00Z") }, list: [{ reminded: { u: 1 }, t: 1 }] });
    return !c.push && !c.thumb && c.at === "2026-10-05T10:00:00.000Z" && !c.list[0].reminded && c.list[0].t === 1;
  })],
  ["dosya adı", F("sesli-asistan-yedek-2026-10-05.xlsx", () => BK.backupName("2026-10-05", "xlsx") === "sesli-asistan-yedek-2026-10-05.xlsx")],
]);

// Kullanım ekranı (aiUsage.js)
const AU = await import("@/lib/aiUsage");
group("Kullanım ekranı")([
  ["satırlar", F("çoktan aza, bilinmeyen ve by atılır", () => { const u = AU.usageRows({ month: "2026-10", org: "o", by: { u: 9 }, receipt: 2, assistant: 7, xyz: 5 }); return u.total === 9 && u.rows[0][0] === "Asistan" && u.rows[1][0] === "Fiş okuma"; })],
  ["boş ay", F("0 istek", () => AU.usageRows(undefined).total === 0)],
  ["para", F("$0,55", () => AU.usd(0.546) === "$0,55")],
]);

// iPhone takvimi (ics.js)
const IC = await import("@/lib/ics");
const ICS = IC.icsOf(
  [
    { id: "a", title: "Optimist antrenmanı", date: "2026-10-06", time: "16:00", place: "Dikili, iskele", cat: "Antrenman" },
    { id: "b", title: "Foça yarışı", date: "2026-10-07", endDate: "2026-10-11" },
    { id: "c", title: "Toplantı", date: "2026-10-08", time: "10:00", status: "cancelled" },
    { id: "d", title: "Tarihsiz" },
  ],
  { now: new Date("2026-10-03T09:00:00Z") },
);
group("iPhone takvimi")([
  ["saat UTC'ye", F("16:00 İstanbul → 13:00Z", () => IC.utcStamp("2026-10-06", "16:00") === "20261006T130000Z" && IC.utcStamp("2026-10-06", "02:00") === "20261005T230000Z")],
  ["saatli plan", F("başlangıç, 60 dk bitiş, yer kaçışlı", () => /DTSTART:20261006T130000Z\r\nDTEND:20261006T140000Z/.test(ICS) && ICS.includes("LOCATION:Dikili\\, iskele"))],
  ["çok günlü", F("tüm gün, bitiş ertesi gün", () => ICS.includes("DTSTART;VALUE=DATE:20261007\r\nDTEND;VALUE=DATE:20261012"))],
  ["iptal", F("İPTAL: başlık ve STATUS", () => ICS.includes("SUMMARY:İPTAL: Toplantı") && ICS.includes("STATUS:CANCELLED"))],
  ["tarihsiz atlanır", F("3 etkinlik", () => ICS.split("BEGIN:VEVENT").length === 4 && !ICS.includes("Tarihsiz"))],
  ["biçim", F("VCALENDAR, CRLF, uzun satır katlanır", () => {
    const long = IC.icsOf([{ id: "x", title: "Ş".repeat(120), date: "2026-10-06" }]);
    return ICS.startsWith("BEGIN:VCALENDAR\r\n") && ICS.trimEnd().endsWith("END:VCALENDAR") && long.split("\r\n").every((l) => Buffer.byteLength(l) <= 75) && long.includes("ŞŞ");
  })],
]);

// Antrenman günlüğü (trainingLog.js)
const TL = await import("@/lib/trainingLog");
const TPL = [
  { id: "1", title: "Optimist", cat: "Antrenman", date: "2026-10-01", time: "16:00", log: { wind: 12, dir: "Poyraz", topics: ["Start", "Rota"], min: 90 } },
  { id: "2", title: "ILCA", cat: "Antrenman", date: "2026-10-02", log: { wind: 18, topics: ["Start"], min: 60 } },
  { id: "3", title: "Optimist", cat: "Antrenman", date: "2026-10-03" },
  { id: "4", title: "İptal", cat: "Antrenman", date: "2026-10-04", status: "cancelled" },
  { id: "5", title: "Toplantı", cat: "Toplantı", date: "2026-10-02" },
];
group("Antrenman günlüğü")([
  ["temizle", F("sayılar, yön, tekrar eden konu", () => { const l = TL.cleanLog({ wind: "14,4", dir: "Lodos", topics: ["Start", "Start", " "], min: "abc", rating: "3", note: " iyi " }); return l.wind === 14 && l.dir === "Lodos" && l.topics.length === 1 && l.min === null && l.rating === 3 && l.note === "iyi" && !!l.at; })],
  ["boş günlük", F("null (silinir)", () => TL.cleanLog({ wind: "", topics: [], note: " " }) === null)],
  ["satır", F("12 kn Poyraz · Start, Rota · 90 dk", () => TL.logLine(TPL[0].log) === "12 kn Poyraz · Start, Rota · 90 dk")],
  ["kim yazabilir", F("geçmiş antrenman evet, gelecek/iptal/toplantı hayır", () => TL.canLog(TPL[2], "2026-10-03") && !TL.canLog(TPL[2], "2026-10-02") && !TL.canLog(TPL[3], "2026-10-05") && !TL.canLog(TPL[4], "2026-10-05"))],
  ["ay özeti", F("2/3, 150 dk, 15 kn, Start 2", () => { const m = TL.monthLog(TPL, "2026-10"); return m.total === 3 && m.logged.length === 2 && m.minutes === 150 && m.avgWind === 15 && m.topics[0][0] === "Start" && m.topics[0][1] === 2 && m.logged[0].id === "2"; })],
]);

// Aidat takibi (dues.js): EFT açıklamasından sporcu eşleştirme (örnek adlar uydurmadır)
const DU = await import("@/lib/dues");
const DA = [
  { id: "a1", studentName: "Deniz Şahin", parentName: "Ayşe Şahin" },
  { id: "a2", studentName: "Ege Yılmaz", parentName: "Mehmet Yılmaz" },
  { id: "a3", studentName: "Ada Yılmaz", parentName: "Mehmet Yılmaz" },
  { id: "a4", studentName: "Kaan Öztürk", motherName: "Elif", fatherName: "Can" },
  { id: "a5", studentName: "Mert Öztürk", parentName: "Selin Öztürk" },
];
const DCFG = { fee: 1500, fees: { a3: 1000 } };
const mvt = (desc, amount = 1500, date = "05.10.2026 10:12") => ({ desc, amount, date, currency: "TL", account: "TL|1234|" });
group("Aidat takibi")([
  ["Türkçe harfsiz banka yazısı", F("AYSE SAHIN → Deniz Şahin, emin", () => { const r = DU.matchMovement(mvt("FAST GELEN AYSE SAHIN EKIM AIDAT"), DA, DCFG); return r.sure && r.picks.length === 1 && r.picks[0].id === "a1"; })],
  ["anne adı kartta ayrı alanda", F("ELIF OZTURK → Kaan (Mert değil)", () => { const r = DU.matchMovement(mvt("EFT ELIF OZTURK"), DA, DCFG); return r.sure && r.picks[0].id === "a4"; })],
  ["kardeşler, tutar tutuyor", F("2500 TL → Ege + Ada", () => { const r = DU.matchMovement(mvt("HAVALE MEHMET YILMAZ", 2500), DA, DCFG); return r.picks.length === 2 && r.sure && /kardeş/.test(r.why); })],
  ["kardeş, tutar tek aidat", F("1500 TL → Ege önerilir, emin değil", () => { const r = DU.matchMovement(mvt("HAVALE MEHMET YILMAZ"), DA, DCFG); return !r.sure && r.picks[0]?.id === "a2" && r.list.length === 2; })],
  ["kardeş, tutar ikisine de uymuyor", F("800 TL: seçtirir", () => { const r = DU.matchMovement(mvt("HAVALE MEHMET YILMAZ", 800), DA, DCFG); return !r.sure && r.picks.length === 0; })],
  ["sporcu adı açıklamada", F("ADA YILMAZ AIDAT → Ada", () => { const r = DU.matchMovement(mvt("FATMA KAYA ADA YILMAZ AIDAT", 1000), DA, DCFG); return r.picks[0]?.id === "a3"; })],
  ["öğrenilmiş gönderen", F("başka soyadlı dede → Deniz", () => { const r = DU.matchMovement(mvt("EFT HASAN KARA"), DA, { ...DCFG, payers: { a1: ["HASAN KARA"] } }); return r.sure && r.picks[0].id === "a1"; })],
  ["eşleşme yok", F("boş", () => DU.matchMovement(mvt("KIRA ODEMESI"), DA, DCFG).picks.length === 0)],
  ["gönderen adı öğrenme", F("AYSE SAHIN", () => DU.payerOf("FAST GELEN AYSE SAHIN EKIM", DA[0]) === "AYSE SAHIN")],
  ["kardeşe bölme", F("2500 → 1500 + 1000", () => { const s = DU.splitAmount(2500, [DA[1], DA[2]], DCFG); return s[0][1] === 1500 && s[1][1] === 1000; })],
  ["ayın gelenleri", F("giden, başka ay, kullanılmış ve 'aidat değil' çıkar", () => {
    const list = [mvt("A", 1500), mvt("B", -200), mvt("C", 1500, "28.09.2026 09:00"), mvt("D", 1000), mvt("E", 700)];
    const used = new Set([DU.movKey(list[3])]);
    const r = DU.incomingOf(list, "2026-10", used, [DU.movKey(list[4])]);
    return r.length === 1 && r[0].desc === "A";
  })],
  ["ay tablosu", F("ödedi / eksik / bekliyor, toplamlar", () => {
    const t = DU.monthRows(DA.slice(0, 3), { paid: { a1: [{ amt: 1500, via: "eft" }], a3: [{ amt: 500, via: "cash" }] } }, DCFG);
    return t.paidCount === 1 && t.rows[0].a.id === "a2" && t.rows[1].state === "part" && t.paid === 2000 && t.expected === 4000 && t.eft === 1;
  })],
]);

// Instagram yeni tasarım (postModel.js): başarı satırı, sınıflar, kendiliğinden yazılar, yarıştan sporcular, asistan cümleleri
const ONE = { name: "TYF Ligi", place: "Foça, İzmir", dates: "7-11 Ekim 2026", athletes: [{ name: "Mete Ok", cls: "ILCA 4" }] };
group("Instagram tasarım")([
  ["başarı satırı", F("1 sporcu Sporcumuza, çok Sporcularımıza, sonuçta tebrik", () => PM.raceWish(ONE) === "Sporcumuza başarılar!" && PM.raceWish({ ...ONE, athletes: SIX }) === "Sporcularımıza başarılar!" && PM.raceWish(ONE, "sonuc") === "Sporcumuzu tebrik ederiz!" && PM.raceWish(null) === "")],
  ["sınıflar", F("talimattaki sınıflar, yoksa sporcularınki; tekrarsız, en çok 4", () => PM.raceClasses({ classes: "ILCA 4, ILCA 6" }).join() === "ILCA 4,ILCA 6" && PM.raceClasses({ athletes: [...SIX, { name: "X", cls: "ILCA 4" }] }).join() === "Optimist,ILCA 4")],
  ["yer · tarih", F("ilçe · tarih", () => PM.raceMeta(ONE) === "Foça · 7-11 Ekim 2026" && PM.raceMeta(null) === "")],
  ["yarıştan ilk hali", F("başlık, alt satır, dilek, etiket gelir", () => { const r = PM.postFromRace({ name: "TYF Ligi", district: "Foça", startDate: "2026-10-07", athletes: [{ name: "Mete Ok", cls: "ILCA 4" }] }, "2026-10-03"); return r.wish === "Sporcumuza başarılar!" && r.tag === "YARIŞ DUYURUSU" && r.meta === true && r.style === "afis"; })],
  ["tür değişince", F("kendiliğinden yazılar yenilenir, elle yazılan başlık kalır", () => {
    const a = PM.cleanPost({ kind: "duyuru", race: ONE, ...PM.autoOf({ kind: "duyuru", race: ONE }), headline: "Benim başlığım" });
    const b = PM.reauto(a, { ...a, kind: "sonuc" });
    return b.headline === "Benim başlığım" && b.wish === "Sporcumuzu tebrik ederiz!" && b.tag === "YARIŞ SONUCU" && b.sub.endsWith("başarıyla temsil etti.");
  })],
  ["sporcu çıkarılınca", F("2 → 1 sporcu: alt satır ve dilek tekile döner", () => {
    const race = { ...ONE, athletes: SIX.slice(0, 2) };
    const a = PM.cleanPost({ kind: "duyuru", race, ...PM.autoOf({ kind: "duyuru", race }) });
    const b = PM.reauto(a, { ...a, race: { ...race, athletes: race.athletes.slice(0, 1), count: 1 } });
    return b.sub.startsWith("Sporcumuz Ali Kaya,") && b.wish === "Sporcumuza başarılar!";
  })],
  ["yarış kaldırılınca", F("yarıştan gelen yazılar silinir", () => { const a = PM.cleanPost({ kind: "duyuru", race: ONE, ...PM.autoOf({ kind: "duyuru", race: ONE }) }); const b = PM.reauto(a, { ...a, race: null }); return b.headline === "" && b.sub === "" && b.wish === ""; })],
  ["yarışın sporcuları", F("kimliklerden ad ve sınıf, kişisel bilgi yok, dereceli önce", () => {
    const r = PM.raceWithAthletes({ athleteIds: ["a", "b", "yok"], results: { rows: { b: { place: 2 } } } }, { athletes: [{ id: "a", studentName: "Ali Kaya", currentClassId: "o", studentTc: "12345678901" }, { id: "b", studentName: "Ece Su", currentClassId: "i" }], classes: [{ id: "o", name: "Optimist" }, { id: "i", name: "ILCA 4" }] });
    return r.athletes.length === 2 && r.athletes[0].name === "Ece Su" && r.athletes[0].cls === "ILCA 4" && !/12345678901/.test(JSON.stringify(r.athletes));
  })],
  ["şablon kaydı", F("bilinmeyen şablon Afiş, dilek 60 karakter", () => PM.cleanPost({ style: "x" }).style === "afis" && PM.cleanPost({ style: "bant" }).style === "bant" && PM.cleanPost({ wish: "a".repeat(90) }).wish.length === 60 && PM.cleanPost({ meta: false }).meta === false)],
  ["yer ve sınıf düzenlenir", F("yarıştan dolar, alan olarak kaydedilir, eski kayıt doldurulur", () => {
    const a = PM.cleanPost({ kind: "duyuru", race: { ...ONE, classes: "ILCA 4, ILCA 6" }, ...PM.autoOf({ kind: "duyuru", race: { ...ONE, classes: "ILCA 4, ILCA 6" } }) });
    const old = PM.withInfo(PM.cleanPost({ race: ONE }));
    return a.info === "Foça · 7-11 Ekim 2026" && a.classes === "ILCA 4, ILCA 6" && PM.classList("Optimist, ILCA 4,, Laser, 420, 29er").join() === "Optimist,ILCA 4,Laser,420" && old.classes === "ILCA 4" && old.info === "Foça · 7-11 Ekim 2026";
  })],
  ["başlıkta sınıf", F("yarışın sınıfı başa eklenir, ILCA 4/6 tek ILCA, yazılıysa eklenmez", () =>
    PM.raceHeadline(ONE) === "ILCA TYF Ligi" &&
    PM.raceHeadline({ ...ONE, classes: "ILCA 4, ILCA 6" }) === "ILCA TYF Ligi" &&
    PM.raceHeadline({ ...ONE, classes: "Optimist, ILCA 4" }) === "Optimist ve ILCA TYF Ligi" &&
    PM.raceHeadline({ ...ONE, name: "TYF Yelken Ligi ILCA 1. Ayak" }) === "TYF Yelken Ligi ILCA 1. Ayak" &&
    PM.withClass("TYF Ligi'nde 1. Ayak Yarışları", { athletes: SIX }) === "Optimist TYF Ligi'nde 1. Ayak Yarışları" &&
    PM.withClass("Kulüp Haberi", null) === "Kulüp Haberi" &&
    PM.autoOf({ kind: "duyuru", race: ONE }).headline === "ILCA TYF Ligi")],
  ["türe göre renk", F("her tür ayrı zemin; tür değişince renk değişir, elle seçilen kalır", () => {
    const set = new Set(PM.KINDS.map(([k]) => PM.kindTheme(k)));
    const a = PM.cleanPost({ kind: "duyuru", race: ONE, ...PM.autoOf({ kind: "duyuru", race: ONE }) });
    const b = PM.reauto(a, { ...a, kind: "sonuc" });
    const c = PM.reauto({ ...a, theme: "kum" }, { ...a, theme: "kum", kind: "sonuc" });
    return set.size === PM.KINDS.length && a.theme === "deniz" && b.theme === "gun" && c.theme === "kum" && PM.freshPost("antrenman").theme === "gece" && PM.postFromRace({ name: "X", startDate: "2026-09-01" }, "2026-10-03").theme === "gun";
  })],
  ["görselde en çok 2 sporcu", F("yarışta sporcu satırı yok, 3+ satır görselde yazılmaz", () =>
    PM.racePeople({ ...ONE, athletes: SIX }) === "" &&
    PM.autoOf({ kind: "duyuru", race: { ...ONE, athletes: SIX } }).people === "" &&
    PM.imagePeople("Ali Kaya · Optimist\nEce Su · ILCA 4") === "Ali Kaya · Optimist\nEce Su · ILCA 4" &&
    PM.imagePeople("A\nB\nC") === "")],
  ["ayrıntılı türler", F("yarış duyurusu/sonucu etiketleri, her türün ayrı rengi", () => {
    const tags = Object.fromEntries(PM.KINDS.map(([k, , , t]) => [k, t]));
    return tags.duyuru === "YARIŞ DUYURUSU" && tags.sonuc === "YARIŞ SONUCU" && tags.kayit === "KAYITLAR AÇIK" && PM.KINDS.length >= 8 && PM.cleanPost({ kind: "kutlama" }).kind === "kutlama" && PM.freshPost("kutlama").theme === "bordo" && PM.RACE_KINDS.includes("sonuc");
  })],
  ["asistan: gönderi hazırla", F("gönderi isteği tanınır, sayfa açma ve mesaj değil", () => PM.wantsPost("Foça yarışı için Instagram gönderisi hazırla") && PM.wantsPost("yelken okulu kayıtları için gönderi hazırla") && PM.wantsPost("insta postu yap") && !PM.wantsPost("Instagram'ı aç") && !PM.wantsPost("gönderileri aç") && !PM.wantsPost("Ali'ye mesaj gönder"))],
  ["asistan: görsel", F("görsel isteği tanınır", () => PM.wantsPostImage("gün batımında teknelerle görsel üret") && PM.wantsPostImage("başka bir resim yap") && !PM.wantsPostImage("daha kısa yaz"))],
]);

// Instagram hikâye boyutu (postModel.js)
const PMs = await import("@/features/posts/postModel");
group("Instagram hikâye")([
  ["hikâye boyutu", F("1080×1920, oran 9/16", () => { const f = PMs.formatOf("story"); return f[2] === 1080 && f[3] === 1920 && PMs.aspectOf("story") === "9 / 16"; })],
  ["kayıtta korunur", F("cleanPost story kalır, bilinmeyen kare olur", () => PMs.cleanPost({ format: "story" }).format === "story" && PMs.cleanPost({ format: "x" }).format === "square")],
  ["reels boyutu", F("1080×1920, kayıtta kalır, sağda ve altta güvenli alan", () => { const f = PMs.formatOf("reels"); const s = PMs.safeOf("reels"); return f[3] === 1920 && PMs.aspectOf("reels") === "9 / 16" && PMs.cleanPost({ format: "reels" }).format === "reels" && s.r > 0 && s.b > PMs.safeOf("story").b && PMs.safeOf("square").b === 0; })],
  ["afiş şablonu", F("yeni gönderi Afiş şablonuyla açılır, eski şablonlar korunur", () => PMs.freshPost("duyuru").style === "afis" && PMs.cleanPost({ style: "kart" }).style === "kart" && PMs.STYLES[0][0] === "afis")],
  ["karartma", F("varsayılan 55, 0-100 arası", () => PMs.cleanPost({}).shade === 55 && PMs.cleanPost({ shade: 140 }).shade === 100 && PMs.cleanPost({ shade: -5 }).shade === 0 && PMs.cleanPost({ shade: 20 }).shade === 20)],
  ["üç boyut", F("gönderi + hikâye + reels; gönderi seçili Kare/Dikey, yoksa Dikey", () => PMs.setOf("square").join() === "square,story,reels" && PMs.setOf("portrait").join() === "portrait,story,reels" && PMs.setOf("reels").join() === "portrait,story,reels")],
  ["profil ızgarası", F("karede yazı ortadaki 3:4'te (sağ/sol 66 px ek kenar), yeni gönderi Dikey", () => { const s = PMs.safeOf("square"); return s.l === 66 && s.r === 66 && PMs.safeOf("portrait").l === 0 && PMs.freshPost().format === "portrait" && PMs.cleanPost({ format: "square" }).format === "square"; })],
]);

// Notlar: thread'lerin notlar/yeni/ dosyaları NOTLAR.md'ye taşınır (scripts/notlar-topla.mjs)
const NT = await import("../../notlar-topla.mjs");
group("Notlar toplama")([
  ["bölümler", F("Nerede kaldım ve Sıradaki işler ayrı okunur", () => {
    const n = NT.parseNote("## Nerede kaldım\n- A yapıldı\n\n## Sıradaki işler\n0. A'yı dene\n");
    return n["Nerede kaldım"] === "- A yapıldı" && n["Sıradaki işler"] === "0. A'yı dene" && !NT.parseNote("## Nerede kaldım\n- B")["Sıradaki işler"];
  })],
  ["en üste eklenir", F("ilk verilen not en üstte, eski satırlar korunur", () => {
    const main = "# Notlar\n\n## Nerede kaldım\n\n- eski\n\n## Sıradaki işler\n\n0. eski iş\n\n## Tasarım\n";
    const s = NT.insertNotes(main, [{ "Nerede kaldım": "- yeni", "Sıradaki işler": "0. yeni iş" }, { "Nerede kaldım": "- daha eski" }]);
    return s === "# Notlar\n\n## Nerede kaldım\n\n- yeni\n- daha eski\n- eski\n\n## Sıradaki işler\n\n0. yeni iş\n0. eski iş\n\n## Tasarım\n";
  })],
]);

// Instagram özel gün şablonları (postModel.js DAYS)
group("Instagram özel gün")([
  ["yaklaşan günler", F("en yakın önce, bugün dahil, yıl dönerse gelecek yıl", () => {
    const l = PMs.nextDays("2026-10-04");
    const t = PMs.nextDays("2026-11-10");
    return l[0].id === "29ekim" && l[0].left === 25 && l[1].id === "10kasim" && l.find((d) => d.id === "yilbasi").at === "2027-01-01" && t[0].id === "10kasim" && t[0].left === 0 && l.length === PMs.DAYS.length;
  })],
  ["yıl dönümü", F("29 Ekim 2026 → 103. yıl, 10 Kasım 2026 → 88. yıl, 30 Ağustos 2027 → 105. yıl", () => {
    const a = PMs.autoOf({ kind: "ozel", day: "29ekim", year: 2026 });
    const b = PMs.autoOf({ kind: "ozel", day: "10kasim", year: 2026 });
    const c = PMs.autoOf({ kind: "ozel", day: "30agustos", year: 2027 });
    return a.tag === "29 EKİM" && a.wish === "Cumhuriyetimizin 103. yılı kutlu olsun!" && a.theme === "al" && /88\. yılında/.test(b.sub) && b.wish === "" && !/kutlu/i.test(b.headline + b.sub) && b.theme === "antrasit" && /105\./.test(c.wish);
  })],
  ["hareketli günler", F("Anneler Günü mayısın 2. pazarı, Babalar Günü haziranın 3. pazarı, bayram tarihi listeden", () =>
    PMs.dayDate(PMs.dayOf("anneler"), 2026) === "2026-05-10" && PMs.dayDate(PMs.dayOf("babalar"), 2026) === "2026-06-21" && PMs.dayDate(PMs.dayOf("ramazan"), 2026) === "2026-03-20" && PMs.dayDate(PMs.dayOf("ramazan"), 1990) === "")],
  ["şablon sınırları", F("tüm günlerde etiket ≤18, dilek ≤60, başlık ≤90, alt satır ≤200", () =>
    PMs.DAYS.every((d) => d.tag.length <= 18 && d.wish(2030).length <= 60 && d.head(2030).length <= 90 && d.sub(2030).length <= 200))],
  ["kayıt ve gün değişimi", F("gün kayıtta kalır; gün değişince dokunulmamış yazılar yenilenir, elle yazılan kalır", () => {
    const p = PMs.cleanPost({ kind: "ozel", day: "29ekim", year: 2026, ...PMs.autoOf({ kind: "ozel", day: "29ekim", year: 2026 }) });
    const q = PMs.reauto(p, { ...p, day: "10kasim" });
    const r = PMs.reauto({ ...p, headline: "Kendi başlığım" }, { ...p, headline: "Kendi başlığım", day: "10kasim" });
    return p.day === "29ekim" && PMs.cleanPost({ day: "yok" }).day === "" && q.tag === "10 KASIM" && q.headline === "Saygı, Minnet ve Özlemle" && r.headline === "Kendi başlığım" && r.tag === "10 KASIM";
  })],
  ["asistan: gün tanınır", F("“29 Ekim gönderisi hazırla”, “Atatürk'ü anma postu”, “kabotaj bayramı”", () =>
    PMs.dayIn("29 Ekim gönderisi hazırla", "2026-10-04")?.id === "29ekim" && PMs.dayIn("10 Kasım Atatürk'ü anma gönderisi", "2026-10-04")?.year === 2026 && PMs.dayIn("kabotaj bayramı için post yap", "2026-10-04")?.year === 2027 && PMs.dayIn("Foça yarışı için gönderi", "2026-10-04") === null)],
]);

// Aidat ödemeleri listesi (paymentsOf)
group("Aidat ödemeleri listesi")([
  ["onaylı, öneri, nakit", F("3 satır, aidat değil ve ilgisiz para yok, en yeni önce", () => {
    const mv = [mvt("FAST AYSE SAHIN", 1500, "03.10.2026 09:00"), mvt("EFT ELIF OZTURK", 1500, "06.10.2026 11:00"), mvt("KIRA", 9000, "07.10.2026 10:00"), mvt("HAVALE MEHMET YILMAZ", 800, "08.10.2026 10:00")];
    const month = { paid: { a1: [{ amt: 1500, via: "eft", mov: DU.movKey(mv[0]) }], a2: [{ amt: 1500, via: "cash", date: "2026-10-02", at: "2026-10-02T10:00:00Z" }] }, ignored: [DU.movKey(mv[3])] };
    const l = DU.paymentsOf(mv, month, DA, DCFG, "2026-10");
    return l.length === 3 && l[0].state === "guess" && l[0].names[0] === "Kaan Öztürk" && l[1].state === "ok" && l[1].names[0] === "Deniz Şahin" && l[2].state === "cash";
  })],
]);

// Banka Excel'i yükleme (örnek veri uydurmadır)
const XL = await import("xlsx").then((m) => (m.read ? m : m.default));
const MP = await import("@/lib/mailParse");
const MB = await import("@/lib/mailBoard");
const fakeXls = () => {
  const aoa = [["Hesap Hareketleri"], ["IBAN:", "TR00 0000 0000 0000 0000 0012 34"], [], ["Tarih", "Açıklama", "Tutar", "Bakiye"]];
  for (let i = 0; i < 700; i++) aoa.push([`${String((i % 28) + 1).padStart(2, "0")}.0${7 + (i % 3)}.2026`, i % 2 ? "FAST AYSE SAHIN AIDAT" : "KART HARCAMA", i % 2 ? 1500 : -120, 10000]);
  const wb = XL.utils.book_new();
  XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(aoa), "Hareketler");
  return XL.write(wb, { type: "base64", bookType: "xlsx" });
};
group("Banka Excel'i yükleme")([
  ["700 satır okunur", F("500 sınırı yüklemede yok, yalnız gelenler saklanır", () => {
    const sh = MP.sheetsFromRaw([{ name: "hareketler.xlsx", data: fakeXls() }], XL, 5000);
    const all = MB.movementsOf([{ at: "2026-10-03T00:00:00Z", sheets: sh }]);
    const kept = DU.filedMoves(all);
    return sh[0].rows.length === 700 && kept.length > 0 && kept.every((m) => m.amount > 0);
  })],
  ["tarih aralığı", F("en eski – en yeni gün", () => { const r = DU.rangeOf([{ ts: Date.UTC(2026, 6, 2, 9) }, { ts: Date.UTC(2026, 8, 30, 9) }]); return r.from === "2026-07-02" && r.to === "2026-09-30"; })],
  ["mail ile dosya aynı hareket", F("saatli/saatsiz tarih bir kez sayılır", () => {
    const a = { date: "05.10.2026 10:12", amount: 1500, desc: "FAST AYSE SAHIN AIDAT", ts: 2 };
    const b = { date: "05.10.2026", amount: 1500, desc: "FAST AYSE SAHIN AIDAT", ts: 1 };
    const c = { date: "06.10.2026", amount: 1500, desc: "FAST AYSE SAHIN AIDAT", ts: 3 };
    const m = DU.mergeMoves([a], [b, c]);
    return m.length === 2 && m.includes(a) && m.includes(c);
  })],
]);

// Aidat tablosu (sporcu × ay)
group("Aidat tablosu")([
  ["son 6 ay", F("2026-05 … 2026-10, yıl geçişi", () => { const m = DU.lastMonths("2026-10"); const y = DU.lastMonths("2026-02", 3); return m.length === 6 && m[0] === "2026-05" && m[5] === "2026-10" && y.join() === "2025-12,2026-01,2026-02"; })],
  ["hücreler ve toplam", F("adına göre sıralı, ay başına ödeyen", () => {
    const g = DU.gridOf(DA.slice(0, 3), { "2026-09": { paid: { a1: [{ amt: 1500 }] } }, "2026-10": { paid: { a1: [{ amt: 1500 }], a3: [{ amt: 400 }] } } }, DCFG, ["2026-09", "2026-10"]);
    return g.rows[0].a.id === "a3" && g.rows[0].cells["2026-10"].state === "part" && g.rows[1].cells["2026-09"].state === "paid" && g.totals["2026-10"].paidCount === 1 && g.totals["2026-09"].count === 3;
  })],
  ["bekleyenler", F("ay ay, en yeni ay önce, onaylı olan çıkmaz", () => {
    const a = mvt("FAST AYSE SAHIN", 1500, "03.09.2026 09:00");
    const b = mvt("EFT ELIF OZTURK", 1500, "06.10.2026 11:00");
    const p = DU.pendingOf([a, b], { "2026-09": {}, "2026-10": {} }, DA, DCFG, ["2026-09", "2026-10"]);
    const p2 = DU.pendingOf([a, b], { "2026-09": { paid: { a1: [{ amt: 1500, mov: DU.movKey(a) }] } } }, DA, DCFG, ["2026-09", "2026-10"]);
    return p.length === 2 && p[0].ym === "2026-10" && p[0].r.picks[0].id === "a4" && p2.length === 1;
  })],
]);

// Ana sayfadaki büyük kartlar (Aidatlar, Yarışlar, Instagram, Antrenman günlüğü)
const HT = await import("@/lib/homeTiles");
group("Ana sayfa kartları")([
  ["aidat", F("12/30, bekleyen banka ödemesi uyarı; eski ay özeti gösterilmez", () => {
    const a = HT.duesTile({ ym: "2026-10", paidCount: 12, count: 30, pending: 3 }, "2026-10");
    const b = HT.duesTile({ ym: "2026-10", paidCount: 30, count: 30, pending: 0 }, "2026-10");
    const c = HT.duesTile({ ym: "2026-09", paidCount: 5, count: 30 }, "2026-10");
    return a.big === "12/30" && a.warn && a.sub.includes("3 banka") && b.sub.includes("hepsi ödedi") && !b.warn && c.big === "Ekim";
  })],
  ["yarış", F("Foça · 5 gün · 2 iş", () => {
    const a = HT.raceTile({ name: "Foça", when: "5 gün", left: 2 }, 1);
    return a.big === "Foça" && a.sub === "5 gün · 2 iş" && a.warn && HT.raceTile(null, 0).big === "Yarış yok";
  })],
  ["instagram", F("sayı ve son gönderi", () => {
    const now = Date.parse("2026-10-03T12:00:00");
    const a = HT.postsTile({ count: 4, last: { title: "Foça'da", at: Date.parse("2026-10-01T09:00:00") } }, now);
    return a.big === "4 gönderi" && a.sub === "Son: 2 gün önce · Foça'da" && HT.postsTile(null).sub === "Yeni gönderi hazırla";
  })],
  ["antrenman", F("bu ay sayısı, yazılmayan günlük uyarı", () => {
    const plans = [
      { cat: "Antrenman", date: "2026-10-01", log: { wind: 12 } },
      { cat: "Antrenman", date: "2026-10-02" },
      { cat: "Antrenman", date: "2026-10-09" },
      { cat: "Antrenman", date: "2026-10-02", status: "cancelled" },
    ];
    const t = HT.trainingTile(plans, "2026-10-03");
    return t.big === "3 antrenman" && t.sub === "1 günlük yazılmadı" && t.warn;
  })],
]);

// Günlük banka mailinden aidatın kendiliğinden yazılması ve bildirimi
const DAU = await import("@/lib/duesAuto");
group("Aidat otomatik")([
  ["emin ve tutar tutuyor", F("AYSE SAHIN 1500 → Deniz'e yazılır, gönderen öğrenilir", () => {
    const r = DAU.autoDues([mvt("FAST AYSE SAHIN EKIM AIDAT")], { ...DCFG, roster: DA }, {});
    const p = r.months["2026-10"]?.paid?.a1?.[0];
    return r.paid.length === 1 && p?.amt === 1500 && p.by === "auto" && r.payers?.a1?.[0] === "AYSE SAHIN" && r.open === 0;
  })],
  ["tutar tutmuyor ya da emin değil", F("onaya kalır, open sayılır", () => {
    const r = DAU.autoDues([mvt("FAST AYSE SAHIN", 900), mvt("HAVALE MEHMET YILMAZ"), mvt("EFT BILINMEYEN KISI")], { ...DCFG, roster: DA }, {});
    return r.paid.length === 0 && r.open === 2 && !Object.keys(r.months).length;
  })],
  ["kardeşler toplamı", F("2500 → Ege 1500 + Ada 1000", () => {
    const r = DAU.autoDues([mvt("HAVALE MEHMET YILMAZ", 2500)], { ...DCFG, roster: DA }, {});
    const m = r.months["2026-10"]?.paid || {};
    return m.a2?.[0].amt === 1500 && m.a3?.[0].amt === 1000 && r.paid[0].names.length === 2;
  })],
  ["aynı hareket iki kez yazılmaz", F("zaten yazılmış ya da aidat değil", () => {
    const m = mvt("FAST AYSE SAHIN");
    const a = DAU.autoDues([m], { ...DCFG, roster: DA }, { "2026-10": { paid: { a1: [{ amt: 1500, mov: DU.movKey(m) }] } } });
    const b = DAU.autoDues([m], { ...DCFG, roster: DA }, { "2026-10": { ignored: [DU.movKey(m)] } });
    return !a.paid.length && !b.paid.length && !b.open;
  })],
  ["liste yoksa hiçbir şey", F("Aidatlar sayfası açılmamış", () => DAU.autoDues([mvt("FAST AYSE SAHIN")], DCFG, {}).paid.length === 0 && DAU.duesText(DAU.autoDues([], DCFG)) === null)],
  ["bildirim metni", F("Aidat geldi: Deniz Şahin / 2 sporcu · onay bekliyor", () => {
    const a = DAU.duesText({ paid: [{ names: ["Deniz Şahin"], amount: 1500 }], open: 0 });
    const b = DAU.duesText({ paid: [{ names: ["Ege Yılmaz", "Ada Yılmaz"], amount: 2500 }], open: 1 });
    const c = DAU.duesText({ paid: [], open: 2 });
    return a.title === "Aidat geldi: Deniz Şahin" && a.body === "Deniz Şahin 1.500 TL" && b.title === "Aidat geldi: 2 sporcu" && b.body === "Ege Yılmaz ve Ada Yılmaz 2.500 TL · 1 ödeme onay bekliyor" && c.title === "Aidat: 2 ödeme onay bekliyor";
  })],
  ["maildeki hesap özetinden yazma", F("runAutoDues ayar + ay okur, ayı ve gönderenleri yazar", async () => {
    const store = { "orgs/u1/dues/settings": { ...DCFG, roster: DAU.rosterOf(DA) } };
    const io = { get: async (p) => store[p] || null, set: async (p, f) => void (store[p] = { ...(store[p] || {}), ...f }) };
    const mail = { at: "2026-10-05T07:00:00Z", sheets: [{ columns: ["Tarih", "Açıklama", "Tutar", "Bakiye"], rows: [{ v: ["05.10.2026 10:12", "FAST AYSE SAHIN", 1500, 9000] }, { v: ["05.10.2026 11:00", "KIRA", -3000, 6000] }], sum: { currency: "TL" } }] };
    const r = await DAU.runAutoDues(io, "u1", [mail]);
    return r.paid.length === 1 && store["orgs/u1/dues/2026-10"]?.paid?.a1?.length === 1 && store["orgs/u1/dues/settings"].payers.a1[0] === "AYSE SAHIN";
  })],
]);

// Toplantı modu (lib/meeting/result.js): yapay zeka çıktısını temizleme, başlıklı özet, mesaj alıcısı
const MR = await import("@/lib/meeting/result");
const MPEOPLE = ["Ali Kaya", "Sanver Demir"];
const MCONTACTS = [{ name: "Gökhan Yılmaz", uid: "g1" }, { name: "Ali Kaya", uid: "a1" }];
const MRAW = {
  title: "Ekim hazırlığı",
  sections: [{ heading: "Tekne bakımı", points: ["Motorlar kontrol edilecek", ""] }, { heading: "", points: [] }],
  decisions: ["Cumartesi antrenman var"],
  items: [
    { type: "task", title: "Motorları kontrol et", assignTo: ["Sanver'e"], date: "2026-10-08" },
    { type: "plan", title: "Antrenman", date: "2026-10-10", time: "10:00", assignTo: [] },
    { type: "task", title: "Boya al", assignTo: ["Mehmet"] },
    { type: "bad", title: "x" },
  ],
  messages: [{ to: "gökhan", text: "Cumartesi 10'da kulüpte ol." }, { to: "velilere", text: "Cumartesi antrenman var." }, { to: "Ali", text: "" }],
  message: "2 görev, 1 plan, 2 mesaj çıkardım.",
};
group("Toplantı modu")([
  ["sorumlulu görev", F("Sanver'e → Sanver Demir, listede olmayan kişi atılır", () => {
    const r = MR.cleanMeeting(MRAW, { people: MPEOPLE, names: ["Gökhan Yılmaz", "Ali Kaya", "Ekip"] });
    return r.items.length === 3 && r.items[0].assignTo.join() === "Sanver Demir" && r.items[0].date === "2026-10-08" && r.items[2].assignTo.length === 0 && r.items[1].time === "10:00";
  })],
  ["mesajlar", F("boş mesaj atılır, ad listedeki yazıma çevrilir", () => {
    const r = MR.cleanMeeting(MRAW, { people: MPEOPLE, names: ["Gökhan Yılmaz", "Ali Kaya"] });
    return r.messages.length === 2 && r.messages[0].to === "Gökhan Yılmaz" && r.messages[1].to === "velilere";
  })],
  ["başlıklı özet", F("boş bölüm ve madde atılır", () => {
    const r = MR.cleanMeeting(MRAW);
    return r.sections.length === 1 && r.sections[0].heading === "Tekne bakımı" && r.sections[0].points.length === 1;
  })],
  ["yalnız konuşma", F("iş ve mesaj yoksa onlyTalk", () => {
    const r = MR.cleanMeeting({ title: "Sohbet", sections: [{ heading: "Hava", points: ["Rüzgâr konuşuldu"] }], decisions: [], items: [], messages: [] });
    return MR.onlyTalk(r) && !MR.onlyTalk(MR.cleanMeeting(MRAW));
  })],
  ["eski biçim özet", F("'- madde' satırları başlıksız bölüm olur", () => {
    const r = MR.cleanMeeting({ summary: "- Bir\n- İki" });
    return r.title === "Toplantı" && r.sections[0].heading === "" && r.sections[0].points.join("|") === "Bir|İki";
  })],
  ["not metni", F("başlıklar, maddeler, kararlar", () => MR.summaryText(MR.cleanMeeting(MRAW)) === "Tekne bakımı\n- Motorlar kontrol edilecek\n\nKararlar\n- Cumartesi antrenman var")],
  ["alıcı: kişi", F("gökhan → g1, olmayan kişi null", () => MR.recipientOf("gökhan", MCONTACTS, {})?.uid === "g1" && MR.recipientOf("Mehmet", MCONTACTS, {}) === null)],
  ["alıcı: grup", F("velilere → Sporcular, ekibe → Ekip, üyesi olunmayan grup yok", () => {
    const g = { team: "Ekip", athletes: "Sporcular" };
    return MR.recipientOf("velilere", MCONTACTS, g)?.group === "athletes" && MR.recipientOf("Ekip", MCONTACTS, g)?.group === "team" && MR.recipientOf("aileye", MCONTACTS, g) === null;
  })],
  ["süre", F("65 sn 01:05, 1 saat 2 dk 5 sn 1:02:05", () => MR.clock(65000) === "01:05" && MR.clock(3725000) === "1:02:05")],
]);

// Ayarlar › Bu cihazdaki veriler (deviceData.js)
const DD = await import("@/lib/deviceData");
group("Cihazdaki veriler")([
  ["boyut yazısı", F("0, 2 KB, 3,2 MB, 1,5 GB", () => [DD.sizeText(0), DD.sizeText(2048), DD.sizeText(3355443), DD.sizeText(1610612736)].join("|") === "0 KB|2 KB|3,2 MB|1,5 GB")],
  ["kayıt boyutu", F("dosyalar ve yazılar toplanır", () => DD.bytesOf({ id: "a", blob: new Blob(["x".repeat(1000)]), parts: [{ blob: new Blob(["y".repeat(500)]) }] }) > 1500)],
  ["evrak türleri", F("hazırlanan, eklenen, talimat ayrı; ad hazırlanan evraktan", () => {
    const n = (id) => (id === "r1" ? "Foça yarışı" : "");
    const a = DD.raceFileInfo({ id: "r1", name: "Foca-evrak.pdf", pages: 10 }, n);
    const b = DD.raceFileInfo({ id: "r1:extra", files: [{}, {}] }, n);
    const c = DD.raceFileInfo({ id: "notice:x", name: "talimat.pdf" }, n);
    return a.kind === "docs" && a.title === "Foça yarışı" && /10 sayfa/.test(a.sub) && b.kind === "extra" && /2 dosya/.test(b.sub) && c.kind === "notice" && c.title === "talimat.pdf";
  })],
  ["ayar boyutu", F("anahtar + değer, 2 bayt/karakter", () => DD.storageBytes([["ab", "cd"], ["x", null]]) === 10)],
]);
