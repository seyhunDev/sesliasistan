// Elle işlemler ve hesaplar: ek bildirimler, yoklama raporu, etkinlik bütçesi (sayfalardaki düğmelerin arkasındaki mantık).
import { suite } from "./ortak.mjs";

const { group } = suite("elle");
const F = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
// Ek bildirimler (notifyExtra.js): doğum günü, rüzgâr, haftalık özet
const NX = await import("@/lib/notifyExtra");
const WROWS = Array.from({ length: 24 }, (_, i) => ({ hh: String(i).padStart(2, "0"), wind: i >= 14 && i <= 18 ? 23 : 10, gust: i >= 14 && i <= 18 ? 30 : 14 }));
const WPLANS = [{ title: "Optimist antrenmanı", date: "2026-10-05", time: "16:00", cat: "Antrenman" }, { title: "Toplantı", date: "2026-10-05", time: "16:00", cat: "Toplantı" }];
group("Ek bildirimler")([
  ["doğum günü bugün", F("Ali Kaya, 12 yaş", () => /Ali Kaya \(12 yaşında\)/.test(NX.birthdayText([{ name: "Ali Kaya", month: 10, day: 5, year: 2014 }, { name: "Veli", month: 11, day: 5 }], "2026-10-05")?.body || ""))],
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
  ["yarış duyurusu", { desc: "bitmemiş yarış → duyuru, başlık ve alt satır", fn: () => PM.postFromRace({ name: "Foça Kupası", district: "Foça", city: "İzmir", startDate: "2026-10-07", endDate: "2026-10-08", athleteIds: ["1", "2"] }, "2026-10-03"), ok: (r) => r.kind === "duyuru" && r.tag === "YARIŞ" && r.headline === "Foça Kupası" && r.sub === "Foça · 7-8 Ekim" && r.race.count === 2 && r.race.place === "Foça, İzmir" }],
  ["yarış sonucu", { desc: "biten yarış → sonuç", fn: () => PM.postFromRace({ name: "Ege Kupası", startDate: "2026-09-01", endDate: "2026-09-02" }, "2026-10-03").kind, ok: (r) => r === "sonuc" }],
  ["kişisel bilgi gitmez", { desc: "yarıştan yalnız ad ve sınıf", fn: () => JSON.stringify(PM.raceBrief({ name: "X" }, [{ name: "Ali Kaya", cls: "ILCA", tc: "12345678901", parentPhone: "0532" }])), ok: (r) => !/12345678901|0532/.test(r) && /Ali Kaya/.test(r) }],
  ["bozuk kayıt", { desc: "tür, biçim, zemin, konum varsayılan; odak 0-100", fn: () => PM.cleanPost({ kind: "x", format: "y", theme: "z", pos: "orta", focus: 250, thumb: "http://kötü" }), ok: (r) => r.kind === "diger" && r.format === "square" && r.theme === "deniz" && r.pos === "bottom" && r.focus === 100 && r.thumb === "" }],
  ["paylaşım metni", { desc: "açıklama + boş satır + etiketler", fn: () => PM.fullCaption(PM.cleanPost({ caption: "Harika gün ⛵", hashtags: ["yelken", "dikili"] })), ok: (r) => r === "Harika gün ⛵\n\n#yelken #dikili" }],
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
