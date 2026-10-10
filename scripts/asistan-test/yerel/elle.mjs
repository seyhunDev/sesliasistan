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

// Kendi mesajına bildirim gelmesin (pushDevices.js): aynı telefon iki hesapta kayıtlıysa gönderenin cihazı atlanır
const PD = await import("@/lib/pushDevices");
group("Kendi bildirimi")([
  ["ortak telefon", F("gönderenin telefonu çıkar, alıcının kendi telefonu kalır", () => Object.keys(PD.otherDevices({ dA: {}, dB: {} }, new Set(["dA"]))).join() === "dB")],
  ["atlanacak yok", F("bütün cihazlar kalır", () => Object.keys(PD.otherDevices({ dA: {}, dB: {} })).length === 2)],
  ["yalnız ortak telefon", F("hiç cihaz kalmaz", () => Object.keys(PD.otherDevices({ dA: {} }, new Set(["dA"]))).length === 0)],
]);

// Android uygulaması bildirimi (fcmMessage.js): Web Push yükünden Firebase Cloud Messaging iletisi
const FM = await import("@/lib/fcmMessage");
group("Android bildirimi")([
  ["başlık ve ayrıntı", F("başlık + gövde, sayfa adresi, kanal", () => {
    const m = FM.fcmMessage("tok", JSON.stringify({ title: "Yeni görev: Motor yağı", body: "Son gün yarın\nAli verdi", tag: "t1", url: "/tasks", badge: 3 }), 3600);
    return m.token === "tok" && m.notification.title === "Yeni görev: Motor yağı" && m.notification.body === "Son gün yarın · Ali verdi" && m.data.url === "/tasks" && m.data.tag === "t1" && m.android.ttl === 3600000 && m.android.notification.channelId === "genel" && m.android.notification.tag === "t1" && m.android.notification.notificationCount === 3 && m.android.collapseKey === "t1";
  })],
  ["yalnız gövde", F("gövde başlık olur", () => { const m = FM.fcmMessage("t", { body: "Bugün doğum günü: Ayşe" }); return m.notification.title === "Bugün doğum günü: Ayşe" && !m.notification.body && m.data.url === "/"; })],
  ["bozuk yük", F("düz metin gövde sayılır", () => FM.fcmMessage("t", "merhaba").notification.title === "merhaba")],
  ["boş yük", F("yedek metin, etiket yok", () => { const m = FM.fcmMessage("t", "{}"); return m.notification.title === "Yeni bildirimin var" && !m.data.tag && !m.android.notification.tag && !m.android.notification.notificationCount; })],
  ["veri alanları metin", F("FCM data yalnız metin kabul eder", () => Object.values(FM.fcmMessage("t", { url: "/x", tag: 5 }).data).every((v) => typeof v === "string"))],
  ["gelen arama", F("yalnız veri, hemen, kısa ömürlü", () => {
    const m = FM.callMessage("tok", { id: "abc123DEF456", name: "Ali\nKaya", org: "o1", sig: "s1" });
    return !m.notification && m.data.type === "call" && m.data.id === "abc123DEF456" && m.data.name === "Ali · Kaya" && m.data.org === "o1" && m.data.sig === "s1" && m.android.priority === "high" && m.android.ttl === 35000 && Object.values(m.data).every((v) => typeof v === "string");
  })],
  ["adsız arama", F("ad yoksa Biri", () => FM.callMessage("t", { id: "x" }).data.name === "Biri")],
  ["arama bitti", F("zili susturan mesaj", () => { const m = FM.callEndMessage("t", "abc"); return !m.notification && m.data.type === "call-end" && m.data.id === "abc"; })],
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
  ["yarış duyurusu", { desc: "bitmemiş yarış → duyuru, başlık ve alt satır", fn: () => PM.postFromRace({ name: "Foça Kupası", district: "Foça", city: "İzmir", startDate: "2026-10-07", endDate: "2026-10-08", athleteIds: ["1", "2"] }, "2026-10-03"), ok: (r) => r.kind === "duyuru" && r.tag === "YARIŞ" && r.headline === "Yarışa Hazırız" && r.sub === "Sporcularımız, Foça'nın rüzgarlı sularında kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı." && r.race.count === 2 && r.race.place === "Foça, İzmir" }],
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
  ["yarıştan ilk hali", F("başlık, alt satır, dilek, etiket gelir", () => { const r = PM.postFromRace({ name: "TYF Ligi", district: "Foça", startDate: "2026-10-07", athletes: [{ name: "Mete Ok", cls: "ILCA 4" }] }, "2026-10-03"); return r.wish === "Sporcumuza başarılar!" && r.tag === "YARIŞ" && r.meta === true && r.style === "afis"; })],
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
  ["kısa başlık", F("yarış bağlıyken başlık yarışın adı değil, bizden kısa söz; sonuçta değişir", () =>
    PM.raceHeadline(ONE) === "Yarışa Hazırız" &&
    PM.raceHeadline(ONE, "sonuc") === "Emeğinize Sağlık" &&
    PM.raceHeadline(null) === "" &&
    PM.autoOf({ kind: "duyuru", race: ONE }).headline.split(" ").length <= 4 &&
    !/TYF/.test(PM.autoOf({ kind: "duyuru", race: ONE }).headline))],
  ["arşiv", F("gönderi arşivlenebilir, kayıtta kalır; eski gönderi arşivde değil", () => PM.cleanPost({ archived: true }).archived === true && PM.cleanPost({}).archived === false && PM.cleanPost({ archived: "x" }).archived === true)],
  ["başlık ve yazı boyu", F("varsayılan 100; başlık 60-150, alt satır 80-150, 5'er; başlık kaldırılabilir", () => {
    const a = PM.cleanPost({});
    const b = PM.cleanPost({ headSize: 200, subSize: 40, noHead: true });
    return a.headSize === 100 && a.subSize === 100 && a.noHead === false && b.headSize === 150 && b.subSize === 80 && b.noHead === true && PM.cleanPost({ headSize: 87 }).headSize === 85;
  })],
  ["logo kapatma", F("logo ve kulüp adı kapatılabilir; asistanla kaldır / geri getir", () => PM.cleanPost({ noBrand: true }).noBrand === true && PM.cleanPost({}).noBrand === false && PM.sizeAsk("logoyu kaldır").noBrand === true && PM.sizeAsk("logo ve kulüp adı olmasın").noBrand === true && PM.sizeAsk("logoyu geri getir").noBrand === false && PM.sizeAsk("kulüp adını kaldır").noBrand === true)],
  ["asistanla başlık", F("kaldır, geri getir, bir tık küçült, alt yazıyı büyüt; yeni başlık yazdırma yapay zekaya", () => {
    const p = { headSize: 100, subSize: 100 };
    const q = (t) => JSON.stringify(PM.sizeAsk(t, p));
    return q("başlığı kaldır") === '{"noHead":true}' && q("başlık olmasın") === '{"noHead":true}' && q("başlığı geri getir") === '{"noHead":false}' &&
      q("başlığı bir tık küçült") === '{"headSize":90,"noHead":false}' && q("başlığı büyüt") === '{"headSize":120,"noHead":false}' &&
      q("alt yazıyı biraz büyüt") === '{"subSize":110}' && PM.sizeAsk("başlığı “Denizdeyiz” yap", p) === null && PM.sizeAsk("başlığı Denizdeyiz yap", p) === null && PM.sizeAsk("daha kısa yaz", p) === null &&
      PM.sizeAsk("başlığı küçült", { headSize: 60 }).headSize === 60;
  })],
  ["türe göre renk", F("her tür ayrı zemin; tür değişince renk değişir, elle seçilen kalır", () => {
    const set = new Set(PM.KINDS.map(([k]) => PM.kindTheme(k)));
    const a = PM.cleanPost({ kind: "duyuru", race: ONE, ...PM.autoOf({ kind: "duyuru", race: ONE }) });
    const b = PM.reauto(a, { ...a, kind: "sonuc" });
    const c = PM.reauto({ ...a, theme: "kum" }, { ...a, theme: "kum", kind: "sonuc" });
    return set.size === PM.KINDS.length && a.theme === "gece" && b.theme === "gun" && c.theme === "kum" && PM.freshPost("antrenman").theme === "deniz" && PM.postFromRace({ name: "X", startDate: "2026-09-01" }, "2026-10-03").theme === "gun";
  })],
  ["görselde en çok 2 sporcu", F("yarışta sporcu satırı yok, 3+ satır görselde yazılmaz", () =>
    PM.racePeople({ ...ONE, athletes: SIX }) === "" &&
    PM.autoOf({ kind: "duyuru", race: { ...ONE, athletes: SIX } }).people === "" &&
    PM.imagePeople("Ali Kaya · Optimist\nEce Su · ILCA 4") === "Ali Kaya · Optimist\nEce Su · ILCA 4" &&
    PM.imagePeople("A\nB\nC") === "")],
  ["ayrıntılı türler", F("yarış duyurusu/sonucu etiketleri, her türün ayrı rengi", () => {
    const tags = Object.fromEntries(PM.KINDS.map(([k, , , t]) => [k, t]));
    return tags.duyuru === "YARIŞ" && PM.cleanPost({ tag: "YARIŞ DUYURUSU" }).tag === "YARIŞ DUYURUSU" && tags.sonuc === "YARIŞ SONUCU" && tags.kayit === "KAYITLAR AÇIK" && PM.KINDS.length >= 8 && PM.cleanPost({ kind: "kutlama" }).kind === "kutlama" && PM.freshPost("kutlama").theme === "bordo" && PM.RACE_KINDS.includes("sonuc");
  })],
  ["asistan: gönderi hazırla", F("gönderi isteği tanınır, sayfa açma ve mesaj değil", () => PM.wantsPost("Foça yarışı için Instagram gönderisi hazırla") && PM.wantsPost("yelken okulu kayıtları için gönderi hazırla") && PM.wantsPost("insta postu yap") && !PM.wantsPost("Instagram'ı aç") && !PM.wantsPost("gönderileri aç") && !PM.wantsPost("Ali'ye mesaj gönder"))],
  ["asistan: görsel", F("görsel isteği tanınır", () => PM.wantsPostImage("gün batımında teknelerle görsel üret") && PM.wantsPostImage("başka bir resim yap") && !PM.wantsPostImage("daha kısa yaz"))],
]);

// Instagram hikâye boyutu (postModel.js)
const PMs = await import("@/features/posts/postModel");
const PIs = await import("@/features/posts/postImage");
group("Instagram hikâye")([
  ["hikâye boyutu", F("1080×1920, oran 9/16", () => { const f = PMs.formatOf("story"); return f[2] === 1080 && f[3] === 1920 && PMs.aspectOf("story") === "9 / 16"; })],
  ["kayıtta korunur", F("cleanPost story kalır, bilinmeyen kare olur", () => PMs.cleanPost({ format: "story" }).format === "story" && PMs.cleanPost({ format: "x" }).format === "square")],
  ["reels boyutu", F("1080×1920, kayıtta kalır, sağda ve altta güvenli alan", () => { const f = PMs.formatOf("reels"); const s = PMs.safeOf("reels"); return f[3] === 1920 && PMs.aspectOf("reels") === "9 / 16" && PMs.cleanPost({ format: "reels" }).format === "reels" && s.r > 0 && s.b > PMs.safeOf("story").b && PMs.safeOf("square").b === 0; })],
  ["afiş şablonu", F("yeni gönderi Afiş şablonuyla açılır, eski şablonlar korunur", () => PMs.freshPost("duyuru").style === "afis" && PMs.cleanPost({ style: "kart" }).style === "kart" && PMs.STYLES[0][0] === "afis")],
  ["karartma", F("varsayılan 55, 0-100 arası", () => PMs.cleanPost({}).shade === 55 && PMs.cleanPost({ shade: 140 }).shade === 100 && PMs.cleanPost({ shade: -5 }).shade === 0 && PMs.cleanPost({ shade: 20 }).shade === 20)],
  ["üç boyut", F("gönderi + hikâye + reels; gönderi seçili Kare/Dikey, yoksa Kare", () => PMs.setOf("square").join() === "square,story,reels" && PMs.setOf("portrait").join() === "portrait,story,reels" && PMs.setOf("reels").join() === "square,story,reels")],
  ["afiş renkleri", F("her rengin kendi etiket rengi var, türler farklı etiket rengiyle açılır", () => { const tags = PMs.THEMES.map(([k]) => PIs.afisTag(k)); const kinds = ["duyuru", "sonuc", "antrenman", "genel", "kayit", "kulup"].map((k) => PIs.afisTag(PMs.kindTheme(k))); return new Set(tags).size === tags.length && new Set(kinds).size === kinds.length && PIs.afisTag("x") === PIs.afisTag("deniz"); })],
  ["profil ızgarası", F("karede yazı ortadaki 3:4'te (sağ/sol 66 px ek kenar), yeni gönderi Kare (1080×1080)", () => { const s = PMs.safeOf("square"); return s.l === 66 && s.r === 66 && PMs.safeOf("portrait").l === 0 && PMs.freshPost().format === "square" && PMs.cleanPost({ format: "square" }).format === "square"; })],
]);

// Instagram Modern tasarım (postModel.js, postModern.js)
const PMo = await import("@/features/posts/postModern");
group("Instagram modern tasarım")([
  ["kayıtta korunur", F("modern kalır, Klasik şablonlar değişmez", () => PMs.cleanPost({ style: "modern" }).style === "modern" && PMs.cleanPost({ style: "kart" }).style === "kart" && PMs.designOf("modern") === "modern" && PMs.designOf("afis") === "klasik" && PMs.designOf("bant") === "klasik")],
  ["türe göre düzen", F("yarış/sonuç race, antrenman training, kayıt school, haberler news, özel gün Afiş", () => PMs.modernOf("duyuru") === "race" && PMs.modernOf("sonuc") === "race" && PMs.modernOf("antrenman") === "training" && PMs.modernOf("kayit") === "school" && ["genel", "kulup", "kutlama", "diger"].every((k) => PMs.modernOf(k) === "news") && PMs.modernOf("ozel") === null)],
  ["her düzenin açıklaması", F("dört düzenin ekranda açıklaması var", () => ["race", "training", "school", "news"].every((k) => PMs.MODERN_HINT[k]))],
  ["renkler", F("her rengin modern vurgusu var, türler farklı vurguyla açılır", () => { const acc = ["duyuru", "sonuc", "antrenman", "genel", "kayit", "kulup"].map((k) => PMo.modernPal(PMs.kindTheme(k)).acc); return PMs.THEMES.every(([k]) => /^#[0-9a-f]{6}$/.test(PMo.modernPal(k).acc)) && new Set(acc).size === acc.length && PMo.modernPal("x") === PMo.modernPal("deniz"); })],
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

// Ana sayfadaki özet kartları (Aidat, Yarış, Instagram, Antrenman) ve İşlemler düğmeleri
const HT = await import("@/lib/homeTiles");
group("Ana sayfa kartları")([
  ["notlar", F("sabitlenen önce, sonra en yeni; arşiv sayılmaz; en çok 5", () => {
    const ns = [
      { id: "a", title: "A", createdAt: "2026-10-01T10:00" },
      { id: "b", title: "B", createdAt: "2026-10-05T10:00" },
      { id: "c", title: "C", createdAt: "2026-09-01T10:00", pinned: true },
      { id: "d", title: "D", createdAt: "2026-10-06T10:00", archived: true },
      { id: "e", title: "E", createdAt: "2026-09-02T10:00", updatedAt: "2026-10-06T09:00" },
      ...[1, 2, 3].map((i) => ({ id: "x" + i, title: "X", createdAt: "2026-08-0" + i })),
    ];
    const r = HT.homeNotes(ns, 5);
    return r.total === 7 && r.list.map((n) => n.id).join() === "c,e,b,a,x3" && HT.homeNotes([], 5).list.length === 0;
  })],
  ["aidat canlı", F("sunucunun yazdığı ödeme sayılır, bekleyen sayısı kalır", () => {
    const cfg = { fee: 1500, roster: [{ id: "a", studentName: "Ali Kaya" }, { id: "b", studentName: "Ayşe Ok" }] };
    const r = HT.duesLive(cfg, { paid: { a: [{ amt: 1500, via: "eft", by: "auto" }] } }, "2026-10", { ym: "2026-10", paidCount: 0, count: 2, pending: 1 });
    return r.paidCount === 1 && r.count === 2 && r.pending === 1 && HT.duesLive({}, {}, "2026-10", null) === null;
  })],
  ["aidat", F("12/30, bekleyen banka ödemesi uyarı; eski ay özeti gösterilmez", () => {
    const a = HT.duesTile({ ym: "2026-10", paidCount: 12, count: 30, pending: 3 }, "2026-10");
    const b = HT.duesTile({ ym: "2026-10", paidCount: 30, count: 30, pending: 0 }, "2026-10");
    const c = HT.duesTile({ ym: "2026-09", paidCount: 5, count: 30 }, "2026-10");
    return a.big === "12/30 ödedi" && a.warn && a.sub.includes("3 ödeme onay") && b.sub.includes("herkes ödedi") && !b.warn && c.big === "Ekim aidatı";
  })],
  ["aidat", F("doluluk çubuğu: 12/30 → 0,4; herkes ödedi → 1; eski ayda yok", () => {
    const a = HT.duesTile({ ym: "2026-10", paidCount: 12, count: 30, pending: 0 }, "2026-10");
    const b = HT.duesTile({ ym: "2026-10", paidCount: 30, count: 30, pending: 0 }, "2026-10");
    const c = HT.duesTile({ ym: "2026-09", paidCount: 5, count: 30 }, "2026-10");
    return a.bar === 0.4 && b.bar === 1 && c.bar === undefined;
  })],
  ["yarış", F("5 gün kaldı · Foça yarışı · 2 iş eksik", () => {
    const a = HT.raceTile({ name: "Foça", when: "5 gün", left: 2 }, 1);
    const b = HT.raceTile({ name: "Çeşme", when: "yarın", left: 0 }, 1);
    return a.big === "5 gün kaldı" && a.sub === "Foça yarışı · 2 iş eksik" && a.warn && b.big === "Yarın" && b.sub === "Çeşme yarışı · hazır" && !b.warn && HT.raceTile(null, 0).big === "Yarış yok";
  })],
  ["instagram", F("sayı ve son gönderi", () => {
    const now = Date.parse("2026-10-03T12:00:00");
    const a = HT.postsTile({ count: 4, last: { title: "Foça'da", at: Date.parse("2026-10-01T09:00:00") } }, now);
    return a.big === "4 gönderi" && a.sub === "Sonuncusu 2 gün önce" && HT.postsTile(null).big === "Gönderi yok";
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
  ["işlemler: ana hesap", F("gruplu, Envanter ve Toplantı var, Instagram Sosyal grubunda, tek tip", () => {
    const g = HT.homeActions({ owner: true, athletes: true, races: true, training: true, receipts: true });
    const a = g.flatMap((x) => x.items);
    const l = a.map((x) => x.label);
    return g.map((x) => x.title).join(",") === "Günlük,Kulüp,Yönetim,Sosyal" && l[0] === "Planlar" && l.includes("Envanter") && l.includes("Fiş / Fatura") && l.includes("Aidatlar") && a.find((x) => x.id === "meeting") && g[3].items[0].brand === "instagram" && a.every((x) => x.icon && x.label && x.label.length <= 12 && (x.href || x.id)) && new Set(a.map((x) => x.href || x.id)).size === a.length;
  })],
  ["işlemler: çalışan ve veli", F("çalışana Envanter/Kişiler yok; veliye Toplantı yok, Yoklama var; boş grup yok", () => {
    const sg = HT.homeActions({ staff: true, receipts: true });
    const pg = HT.homeActions({ side: true, parent: true });
    const s = sg.flatMap((x) => x.items.map((i) => i.label));
    const p = pg.flatMap((x) => x.items.map((i) => i.label));
    return !s.includes("Envanter") && !s.includes("Kişiler") && s.includes("Fiş / Fatura") && !s.includes("Instagram") && !p.includes("Toplantı") && p.includes("Yoklama") && !p.includes("Fiş / Fatura") && !p.includes("Antrenman") && [...sg, ...pg].every((x) => x.items.length);
  })],
  ["kısayollar: varsayılan", F("ana hesapta Planlar, Notlar, Sporcular, Yoklama, Toplantı, Envanter, Fiş / Fatura; en çok 7", () => {
    const g = HT.homeActions({ owner: true, athletes: true, races: true, training: true, receipts: true });
    const k = HT.shortcutsOf(g).map(HT.linkKey);
    return k.join(",") === "/plans,/notes,/athletes,/athletes/attendance,meeting,/inventory,/receipts";
  })],
  ["kısayollar: çalışan ve seçim", F("eksik varsayılan sırayla tamamlanır; seçim uygulanır, olmayan sayfa atlanır; 7'den fazla eklenmez", () => {
    const sg = HT.homeActions({ staff: true, receipts: true });
    const s = HT.shortcutsOf(sg);
    const g = HT.homeActions({ owner: true, athletes: true, races: true, training: true, receipts: true });
    const p = HT.shortcutsOf(g, ["/dues", "/yok", "/posts"]).map(HT.linkKey);
    const full = ["a", "b", "c", "d", "e", "f", "g"];
    return s.length === Math.min(7, sg.flatMap((x) => x.items).length) && s[0].label === "Planlar" && s.every(Boolean) && p.join(",") === "/dues,/posts" && HT.toggleShortcut(full, "h") === null && HT.toggleShortcut(full, "a").length === 6 && HT.toggleShortcut(["a"], "b").join() === "a,b";
  })],
  ["şu an kartı", F("süren plan önce, sonra sıradaki; bugün kalmadıysa yarının ilki; iptal ve geçen sayılmaz", () => {
    const now = new Date("2026-10-07T14:20:00");
    const ps = [
      { id: "a", title: "Sabah", date: "2026-10-07", time: "09:00" },
      { id: "b", title: "Antrenman", date: "2026-10-07", time: "14:00", durationMin: 120 },
      { id: "c", title: "İptal", date: "2026-10-07", time: "16:00", status: "cancelled" },
      { id: "d", title: "Toplantı", date: "2026-10-07", time: "18:30" },
      { id: "e", title: "Bakım", date: "2026-10-08", time: "10:00" },
      { id: "f", title: "Yarış", date: "2026-10-08", time: "12:00" },
    ];
    const r = HT.nowPlans(ps, "2026-10-07", "2026-10-08", now);
    const late = HT.nowPlans(ps, "2026-10-07", "2026-10-08", new Date("2026-10-07T21:00:00"));
    const none = HT.nowPlans([], "2026-10-07", "2026-10-08", now);
    return r.main.p.id === "b" && r.main.when === "now" && r.after.p.id === "d" && !r.after.tomorrow &&
      late.main.p.id === "e" && late.main.when === "tomorrow" && late.after.p.id === "f" && none.main === null && none.after === null;
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

// Aidat hatırlatması (duesRemind.js): son gün geçince ödemeyenler, veli metni, ana hesap bildirimi
const DR = await import("@/lib/duesRemind");
const DRM = { paid: { a1: [{ amt: 1500 }], a2: [{ amt: 500 }] } };
group("Aidat hatırlatması")([
  ["son gün", F("varsayılan 10: 10'unda değil, 11'inde; ayarda 5", () => !DR.pastDue("2026-10-10", {}) && DR.pastDue("2026-10-11", {}) && DR.pastDue("2026-10-06", { dueDay: 5 }) && DR.dueDayOf({ dueDay: 40 }) === 10)],
  ["ödemeyenler", F("Deniz ödedi; Ege 1000 eksik; Ada hiç", () => {
    const l = DR.unpaidOf(DU.monthRows(DA, DRM, DCFG).rows);
    const by = Object.fromEntries(l.map((x) => [x.a.id, x]));
    return !by.a1 && by.a2?.state === "part" && by.a2.rest === 1000 && by.a3?.state === "due" && by.a3.rest === 1000;
  })],
  ["aidat tanımlı değil", F("kimse listeye girmez", () => DR.unpaidOf(DU.monthRows(DA, {}, {}).rows).length === 0)],
  ["sunucu listesi", F("roster'dan: Ege, Ada, Kaan, Mert", () => DR.unpaidRoster({ ...DCFG, roster: DA }, DRM).map((x) => x.a.id).sort().join() === "a2,a3,a4,a5")],
  ["veli metni", F("ad, ay, tutar; eksikte kalan", () => {
    const [ege, ada] = DR.unpaidRoster({ ...DCFG, roster: DA }, DRM).sort((a, b) => a.a.id.localeCompare(b.a.id));
    if (ege.a.id !== "a2" || ada.a.id !== "a3") return false;
    const t1 = DR.remindText(ege, "2026-10").replace(/\u00a0/g, " ");
    const t2 = DR.remindText(ada, "2026-10").replace(/\u00a0/g, " ");
    return /^Merhaba, Ege için ekim aidatının 1\.000 TL.si henüz/i.test(t1) && /Ada için ekim aidatı \(1\.000 TL\) henüz hesabımıza ulaşmadı/i.test(t2) && /dikkate almayın/.test(t2);
  })],
  ["bildirim", F("veliye ve ana hesaba", () => {
    const l = DR.unpaidRoster({ ...DCFG, roster: DA }, DRM);
    const p = DR.remindPush(l[0], "2026-10");
    const o = DR.ownerText(l, "2026-10");
    return /^Aidat hatırlatması: /.test(p.title) && /^Ekim aidatı/.test(p.body) && o.title === "Aidat: 4 sporcu ödemedi" && /^Ekim aidatı · .+ · velilere hatırlatmak için dokun$/.test(o.body) && DR.ownerText([], "2026-10") === null;
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

// Envanter (invModel.js): numara, yapay zeka işlemlerinin uygulanması, hedef envanter, hareket kaydı
const IM = await import("@/features/inventory/invModel");
const NOW = { now: "2026-10-05T10:00:00.000Z", by: "Seyhun" };
const club = () => IM.cleanInv({ name: "Yelken Kulübü", kind: "club", items: [
  { id: "t1", no: "001", name: "Optimist teknesi", cat: "Tekne", qty: 1 },
  { id: "s1", no: "002", name: "Şamandıra", cat: "Şamandıra", qty: 10 },
  { id: "r1", no: "007", name: "El telsizi", cat: "Telsiz", qty: 4 },
] });
group("Envanter")([
  ["hazır kategoriler", F("kulüpte tekne, direk, bumba, bot, şamandıra, telsiz, bilgisayar, yazıcı", () => ["Tekne", "Direk", "Bumba", "Bot", "Şamandıra", "Telsiz", "Bilgisayar", "Yazıcı"].every((c) => IM.cleanInv({ kind: "club" }).cats.includes(c)))],
  ["otomatik numara", F("en büyük numara + 1, önekle", () => IM.nextNo(club()) === "008" && IM.nextNo({ ...club(), prefix: "DYK" }) === "DYK-008" && IM.nextNo(IM.cleanInv({})) === "001")],
  ["hareket silme", F("tek hareket silinir, adet değişmez", () => {
    const r = IM.applyOps(club(), [{ op: "add", id: "s1", qty: 5 }, { op: "remove", id: "r1", qty: 1 }], NOW);
    const v = IM.dropLog(r.inv, IM.logKey(r.inv.log[0]));
    return v.log.length === r.inv.log.length - 1 && v.items.find((x) => x.id === "s1").qty === 15 && v.items.find((x) => x.id === "r1").qty === 3 && IM.dropLog(v, "yok") === v;
  })],
  ["silinen ürünün hareketleri", F("yalnız artık olmayan ürünlerinkiler temizlenir", () => {
    let v = IM.applyOps(club(), [{ op: "add", name: "Deneme", cat: "Diğer" }], NOW).inv;
    v = IM.dropItem(v, v.items.at(-1).id, NOW);
    v = IM.applyOps(v, [{ op: "add", id: "s1", qty: 1 }], NOW).inv;
    const w = IM.dropOrphanLogs(v);
    return IM.orphanLogs(v).length === 2 && w.log.length === 1 && w.log[0].name === "Şamandıra" && w.items.length === 3;
  })],
  ["elle değişen numara", F("DYK-120 varsa sıradaki 121", () => IM.nextNo({ items: [{ no: "DYK-120" }, { no: "5" }] }) === "121")],
  ["yeni ürün", F("numara, tarih, kategori eşleşmesi, hareket", () => {
    const r = IM.applyOps(club(), [{ op: "add", name: "Lazer yazıcı", cat: "yazıcılar", qty: 1, brand: "HP" }], NOW);
    const x = r.inv.items.at(-1);
    return x.no === "008" && x.cat === "Yazıcı" && x.addedAt === "2026-10-05" && x.brand === "HP" && r.inv.log[0].op === "add" && r.inv.log[0].by === "Seyhun" && /Ekledim: Lazer yazıcı \(No 008\)/.test(r.lines[0]);
  })],
  ["iki yeni ürün", F("ardışık numaralar", () => {
    const r = IM.applyOps(club(), [{ op: "add", name: "Optimist 2", cat: "Tekne" }, { op: "add", name: "Optimist 3", cat: "Tekne" }], NOW);
    return r.inv.items.slice(-2).map((x) => x.no).join(",") === "008,009";
  })],
  ["var olana ekleme", F("şamandıra 10 → 15", () => {
    const r = IM.applyOps(club(), [{ op: "add", id: "s1", qty: 5 }], NOW);
    return r.inv.items.find((x) => x.id === "s1").qty === 15 && /Artırdım: Şamandıra 10 → 15/.test(r.lines[0]) && r.inv.log[0].qty === 5;
  })],
  ["çıkarma", F("telsiz 4 → 0, eksiye inmez", () => {
    const r = IM.applyOps(club(), [{ op: "remove", id: "r1", qty: 9 }], NOW);
    return r.inv.items.find((x) => x.id === "r1").qty === 0 && /kalmadı/.test(r.lines[0]) && r.inv.log[0].op === "remove";
  })],
  ["değiştirme", F("durum bakımda, kimde Ali", () => {
    const r = IM.applyOps(club(), [{ op: "update", id: "t1", state: "repair", assignee: "Ali" }], NOW);
    const x = r.inv.items.find((y) => y.id === "t1");
    return x.state === "repair" && x.assignee === "Ali" && /Değiştirdim: Optimist teknesi, durum Bakımda, kimde Ali/.test(r.lines[0]);
  })],
  ["silme onay ister", F("uygulanmaz, sorulur", () => {
    const r = IM.applyOps(club(), [{ op: "delete", id: "t1" }], NOW);
    return r.deletes.length === 1 && r.inv.items.length === 3 && !r.changed && IM.dropItem(r.inv, "t1", NOW).items.length === 2;
  })],
  ["olmayan ürün", F("uydurma id atlanır", () => {
    const r = IM.applyOps(club(), [{ op: "remove", id: "yok", name: "Kano" }], NOW);
    return !r.changed && /Bulamadım: Kano/.test(r.lines[0]);
  })],
  ["hangi envanter", F("adı geçen, sayfadaki, kulüp", () => {
    const L = [{ id: "n", name: "Normal", kind: "normal" }, { id: "k", name: "Yelken Kulübü", kind: "club" }, { id: "e", name: "Ev", kind: "normal" }];
    return IM.pickInv("normal envantere kahve makinesi ekle", L).id === "n" && IM.pickInv("ev envanterine ütü ekle", L).id === "e" &&
      IM.pickInv("kulüp envanterine 2 telsiz", L).id === "k" && IM.pickInv("2 telsiz ekle", L, { here: "e" }).id === "e" && IM.pickInv("envantere 2 telsiz ekle", L).id === "k";
  })],
  ["arama", F("Türkçe harfsiz", () => IM.searchItems(club().items, "samandira").length === 1 && IM.searchItems(club().items, "007").length === 1)],
  ["tekne ve takımı", F("key ile bağlanır, sahibi tekneden gelir, tek cümle", () => {
    const r = IM.applyOps(club(), [
      { op: "add", key: "t1", name: "Optimist teknesi", cat: "Tekne", owner: "private", ownerName: "Ahmet", sailNo: "TUR 1204", year: 2021 },
      { op: "add", name: "Optimist salma", cat: "Salma", parent: "t1" },
      { op: "add", name: "Optimist dümen", cat: "Dümen", parent: "t1" },
    ], NOW);
    const boat = r.inv.items.find((x) => x.sailNo === "TUR 1204");
    const parts = r.inv.items.filter((x) => x.parent === boat.id);
    return parts.length === 2 && parts.every((x) => x.owner === "private" && x.ownerName === "Ahmet") && boat.year === 2021 &&
      r.lines.length === 1 && /takımıyla: salma, dümen/.test(r.lines[0]) && /özel \(Ahmet\)/.test(r.lines[0]) && IM.kitText(r.inv, boat) === "Eksik: direk, bumba, yelken";
  })],
  ["eksik takımı ekle", F("tam takım olur", () => {
    const r = IM.applyOps(club(), [{ op: "add", key: "a", name: "Optimist teknesi", cat: "Tekne" }], NOW);
    const id = r.inv.items.at(-1).id;
    const v = IM.addKit(r.inv, id, NOW);
    return IM.kitText(v, v.items.find((x) => x.id === id)) === "Tam takım" && v.items.some((x) => x.name === "Optimist salma" && x.cat === "Salma");
  })],
  ["salma sayımı", F("toplam, kulübün, özel, teknede", () => {
    const L = [{ qty: 1, owner: "club", parent: "b" }, { qty: 1, owner: "private", parent: "c" }, { qty: 2, owner: "club", parent: "" }];
    const c = IM.countOf(L);
    return c.total === 4 && c.club === 3 && c.own === 1 && c.onBoat === 2 && c.free === 2 && IM.countText(L, true) === "4 adet · kulübün 3 · özel 1 · 2 teknede";
  })],
  ["tekneden ayırma ve silinen tekne", F("parent boşalır", () => {
    const r = IM.applyOps(club(), [{ op: "add", key: "t", name: "ILCA", cat: "Tekne" }, { op: "add", name: "ILCA dümen", cat: "Dümen", parent: "t" }], NOW);
    const part = r.inv.items.at(-1);
    const off = IM.applyOps(r.inv, [{ op: "update", id: part.id, parent: "none" }], NOW).inv.items.at(-1).parent === "";
    const gone = IM.cleanInv(IM.dropItem(r.inv, part.parent, NOW)).items.at(-1).parent === "";
    return off && gone;
  })],
  ["eski kulüp envanteri", F("Salma ve Dümen Tekne'nin ardına eklenir, bir kez", () => {
    const v = IM.cleanInv({ kind: "club", cats: ["Tekne", "Direk", "Diğer"] });
    const again = IM.cleanInv({ ...v, cats: v.cats.filter((c) => c !== "Dümen") });
    return v.cats.join(",") === "Tekne,Salma,Dümen,Direk,Diğer" && !again.cats.includes("Dümen");
  })],
  ["bom → bumba", F("eski kayıtta kategori ve ad değişir, bir kez", () => {
    const v = IM.cleanInv({ kind: "club", v: 2, cats: ["Tekne", "Bom"], items: [{ id: "x", name: "Optimist bom", cat: "Bom" }] });
    return v.cats.join(",") === "Tekne,Bumba" && v.items[0].cat === "Bumba" && v.items[0].name === "Optimist bumba" && IM.cleanInv({ ...v, cats: [...v.cats, "Bom"] }).cats.includes("Bom");
  })],
  ["belge künyesi", F("üründe saklanır, AI işlemi silmez, hareket yazılır", () => {
    const meta = { id: "f1", name: "kutuk.jpg", type: "image/jpeg", size: 240000, parts: 1, label: "Kütük belgesi", at: "2026-10-05" };
    const v = IM.upsertItem(club(), { ...club().items[0], files: [meta] }, NOW);
    const x = v.items[0];
    const after = IM.applyOps(v, [{ op: "update", id: "t1", state: "repair" }], NOW).inv.items[0];
    return x.files.length === 1 && x.files[0].label === "Kütük belgesi" && /belge eklendi/.test(v.log[0].text) && after.files.length === 1 && IM.cleanItem({ name: "a", files: [{ id: "!!" }] }).files.length === 0;
  })],
  ["yaş", F("2021 alımı 2026'da 5 yıllık", () => IM.ageText(2021, "2026-10-05") === "5 yıllık")],
  ["excel", F("ürünler ve hareketler sayfası", () => {
    const x = IM.excelRows(IM.applyOps(club(), [{ op: "add", id: "s1", qty: 1 }], NOW).inv);
    return x.Ürünler.length === 4 && x.Hareketler.length === 2 && x.Ürünler[0][0] === "No";
  })],
  ["bot ve motor", F("motor ayrı ürün, bota bağlı; ek bilgiler ürünlerde", () => {
    const r = IM.applyOps(IM.freshInv("K", "club"), [
      { op: "add", key: "b", name: "Antrenör botu", cat: "Bot", extra: [{ k: "Dümen", v: "Hidrolik" }] },
      { op: "add", name: "Yamaha motor", cat: "Motor", parent: "b", extra: [{ k: "Güç (HP)", v: "50" }] },
    ], NOW);
    const [bot, mot] = r.inv.items;
    return r.lines.length === 1 && /motoruyla/.test(r.lines[0]) && mot.parent === bot.id && IM.motorsOf(r.inv, bot).length === 1 && bot.extra[0].v === "Hidrolik" && IM.hostsOf(r.inv, mot).some((x) => x.id === bot.id) && IM.searchItems(r.inv.items, "hidrolik").length === 1;
  })],
  ["motor bakımı", F("bakım eklenir, en yeni önde, son kontrol tarihi güncellenir", () => {
    let v = IM.applyOps(IM.freshInv("K", "club"), [{ op: "add", name: "Yamaha motor", cat: "Motor", service: { date: "2026-04-12", kind: "yaz", what: "yağ, filtre" } }], NOW).inv;
    const id = v.items[0].id;
    const r = IM.applyOps(v, [{ op: "update", id, service: { date: "2026-11-02", kind: "kis", what: "kışlama" }, extra: [{ k: "çalışma saati", v: "320" }] }], NOW);
    const x = r.inv.items[0];
    v = r.inv;
    return x.service.length === 2 && x.service[0].kind === "kis" && x.checkAt === "2026-11-02" && /bakım eklendi \(02\.11\.2026 · Kış bakımı\)/.test(r.lines[0]) && !/kontrol tarihi/.test(r.lines[0]) && IM.excelRows(v).Bakımlar.length === 3;
  })],
  ["ek bilgi", F("aynı başlık değişir (adı korunur), yenisi eklenir, boşlar atılır", () => {
    const v = IM.upsertItem(club(), { ...club().items[0], extra: [{ k: "Boy", v: "5 m" }, { k: "", v: "" }] }, NOW);
    const x = IM.applyOps(v, [{ op: "update", id: "t1", extra: [{ k: "boy", v: "5,5 m" }, { k: "Renk", v: "Beyaz" }] }], NOW).inv.items[0];
    return x.extra.length === 2 && x.extra[0].k === "Boy" && x.extra[0].v === "5,5 m" && x.extra[1].k === "Renk";
  })],
]);

// Faturalar (invoices.js): bankada ödendi mi, görev, asistan cümleleri
const IV = await import("@/lib/invoices");
const NTX = await import("@/lib/notifyText");
const INV = [
  { id: "i1", seller: "Turkcell İletişim Hizmetleri A.Ş.", no: "TCL2026000123456", date: "2026-10-01", due: "2026-10-15", amount: 1250.5, status: "open", taskId: "t1" },
  { id: "i2", seller: "Gediz Elektrik Perakende Satış A.Ş.", no: "", date: "2026-10-02", due: "2026-10-20", amount: 900, status: "open" },
  { id: "i3", seller: "Deniz Malzeme Ltd. Şti.", date: "2026-09-10", amount: 3400, status: "paid" },
];
const out = (desc, amount, date = "06.10.2026 10:15") => ({ date, desc, amount: -amount, currency: "TL", ts: Date.parse("2026-10-06T07:15:00Z") });
group("Faturalar")([
  ["firma adıyla eşleşme", F("TURKCELL ILETISIM, 1.250,50 → emin", () => IV.matchInvoice(out("EFT GIDEN TURKCELL ILETISIM", 1250.5), INV[0]).sure === true)],
  ["fatura numarasıyla", F("açıklamada TCL2026000123456", () => /fatura numarası/.test(IV.matchInvoice(out("FAST ODEME TCL2026000123456", 1250.5), INV[0]).why))],
  ["yalnız tutar", F("öneri, emin değil", () => { const r = IV.matchInvoice(out("HAVALE XYZ", 900), INV[1]); return r.ok && !r.sure; })],
  ["tutar farklı", F("eşleşmez", () => !IV.matchInvoice(out("TURKCELL", 1250), INV[0]).ok)],
  ["gelen para", F("eşleşmez", () => !IV.matchInvoice({ ...out("TURKCELL", 1250.5), amount: 1250.5 }, INV[0]).ok)],
  ["faturadan çok önce", F("eşleşmez", () => !IV.matchInvoice({ ...out("TURKCELL", 1250.5), ts: Date.parse("2026-08-01T10:00:00Z") }, INV[0]).ok)],
  ["genel kelimeler sayılmaz", F("A.Ş., Perakende, Satış sayılmaz", () => IV.sellerWords(INV[1].seller).join(",") === "GEDIZ,ELEKTRIK" && !IV.matchInvoice(out("PERAKENDE ODEME AS", 900), { ...INV[1], seller: "Perakende A.Ş." }).sure)],
  ["her hareket bir faturaya", F("iki eşleşme, ödenmişe bakılmaz", () => {
    const r = IV.bankMatches([out("TURKCELL ILETISIM", 1250.5), out("HAVALE", 900), out("DENIZ MALZEME", 3400)], INV);
    return r.length === 2 && r[0].inv.id === "i1" && r[0].sure && r[1].inv.id === "i2" && !r[1].sure;
  })],
  ["durum", F("ödendi / gecikti / ödenmedi", () => IV.stateOf(INV[2], "2026-10-05") === "paid" && IV.stateOf(INV[0], "2026-10-16") === "late" && IV.stateOf(INV[0], "2026-10-05") === "open")],
  ["özet", F("2 açık, 2.150,50 TL", () => { const s = IV.summaryOf(INV, "2026-10-05"); return s.open === 2 && s.sum === 2150.5 && s.late === 0; })],
  ["görev", F("başlık ve ödeme bilgisi", () => IV.taskTitle(INV[0]) === "Fatura öde: Turkcell İletişim Hizmetleri A.Ş." && IV.taskInvoice(INV[0]).amount === 1250.5 && /Son ödeme: 15 Eki/.test(IV.payText(INV[0])))],
  ["görevliye bildirim", F("gövdede tutar", () => NTX.assignedText({ kind: "task", title: "Fatura öde: Turkcell", due: "2026-10-15", pay: IV.payLine(IV.taskInvoice(INV[0])), from: "Seyhun" }, "2026-10-05").body === "1.250,50 TL · Son gün 15 eki · Seyhun verdi")],
  ["görev tamamlandı", F("görevli tamamlayınca da", () => IV.taskDone({ done: false, doneBy: { u2: true } }) && !IV.taskDone({ done: false }) && !IV.taskDone(null))],
  ["IBAN", F("boşluklu yazılır, hatalısı boş", () => IV.cleanIban("tr12 0006 4000 0011 2345 6789 01") === "TR12 0006 4000 0011 2345 6789 01" && IV.cleanIban("TR12") === "")],
  ["asistan: ödendi", F("Turkcell faturası ödendi → Turkcell", () => { const c = IV.invoiceCommand("Turkcell faturası ödendi"); return c?.op === "paid" && IV.pickInvoice(c.t, INV).pick?.id === "i1"; })],
  ["asistan: hangisi", F("faturayı ödendi işaretle → iki açık fatura, sorar", () => { const c = IV.invoiceCommand("faturayı ödendi işaretle"); const r = IV.pickInvoice(c.t, INV); return c.op === "paid" && !r.pick && r.list.length === 2; })],
  ["asistan: elektrik", F("elektrik faturasını ödedim → Gediz", () => IV.pickInvoice(IV.invoiceCommand("elektrik faturasını ödedim").t, INV).pick?.id === "i2")],
  ["asistan: ödenmedi", F("ödenmişlerden seçer", () => { const c = IV.invoiceCommand("Deniz malzeme faturası ödenmedi olarak işaretle"); return c?.op === "unpaid" && IV.pickInvoice(c.t, INV, "unpaid").pick?.id === "i3"; })],
  ["asistan: soru değil", F("fatura ödendi mi? → yerel değil", () => IV.invoiceCommand("Turkcell faturası ödendi mi") === null && IV.invoiceCommand("fatura çek") === null)],
  ["banka mailinden kendiliğinden", F("emin olan ödendi, görev tamam, liste kısalır", async () => {
    const store = { "orgs/u1/invoiceIndex/open": { list: IV.openIndex(INV) }, "orgs/u1/tasks/t1": { title: "x", done: false } };
    const io = { get: async (p) => store[p] || null, set: async (p, f) => void (store[p] = { ...(store[p] || {}), ...f }) };
    const r = await IV.runAutoInvoices(io, "u1", [out("EFT TURKCELL ILETISIM HIZ", 1250.5), out("HAVALE", 900)]);
    const t = IV.invoiceText(r);
    return r.paid.length === 1 && r.guess === 1 && store["orgs/u1/invoices/i1"].status === "paid" && store["orgs/u1/invoices/i1"].paidAt === "2026-10-06" && store["orgs/u1/tasks/t1"].done === true
      && store["orgs/u1/invoiceIndex/open"].list.length === 1 && t.title === "Fatura ödendi: Turkcell İletişim Hizmetleri A.Ş.".slice(0, 43) + "…" && t.body === "1.250,50 TL · bankadan görüldü";
  })],
  ["silinmiş görev", F("yeniden oluşmaz", async () => {
    const store = { "orgs/u1/invoiceIndex/open": { list: IV.openIndex(INV) } };
    const io = { get: async (p) => store[p] || null, set: async (p, f) => void (store[p] = { ...(store[p] || {}), ...f }) };
    await IV.runAutoInvoices(io, "u1", [out("TURKCELL", 1250.5)]);
    return !store["orgs/u1/tasks/t1"] && store["orgs/u1/invoices/i1"].status === "paid";
  })],
]);

// Geri düğmesi (navTrail.js): gelinen sayfaya döner, uygulama sayfada açıldıysa üst sayfaya
const NAV = await import("@/lib/navTrail");
const walk = (steps, start = ["/"]) => steps.reduce((t, [k, u]) => NAV.stepTrail(t, k, u), start);
group("Geri düğmesi")([
  ["ana sayfa › Yarışlar › geri", F("ana sayfaya döner (Sporcular'a değil)", () => { const t = walk([["push", "/athletes/races"]]); return t.length === 2 && t[t.length - 2] === "/"; })],
  ["geri basıldı", F("iz kısalır, ana sayfada geri yok", () => walk([["push", "/athletes/races"], ["pop", "/"]]).join() === "/")],
  ["Sporcular › Yoklama › geri", F("Sporcular'a döner", () => { const t = walk([["push", "/athletes"], ["push", "/athletes/attendance"], ["pop", "/athletes"]]); return t.join() === "/,/athletes"; })],
  ["yeni yarış kaydedildi", F("adres değişir, geri listeye", () => walk([["push", "/athletes/races"], ["push", "/athletes/races/new"], ["replace", "/athletes/races/r1"]]).join() === "/,/athletes/races,/athletes/races/r1")],
  ["aynı adres", F("iki kez yazılmaz", () => walk([["push", "/"]]).length === 1)],
  ["bilinmeyen adrese dönüş", F("yeni iz başlar", () => walk([["push", "/a"], ["pop", "/b"]]).join() === "/b")],
  ["boş iz", F("ilk adres yazılır", () => NAV.stepTrail([], "push", "/plans").join() === "/plans")],
  ["Aidatlar'da açıldı › geri › geri", F("döngü yok: üst sayfa yerine geçer, sonra ana sayfa", () => { const t = walk([["replace", "/athletes"]], ["/dues"]); return t.join() === "/athletes" && t.length === 1; })],
]);

// Gelen ödemeler / kişisel hesap (payee.js): banka özetinde belli bir kişi adına gelen paralar
const PY = await import("@/lib/payee");
const inc = (desc, amount, date, account = "TL|1234|Vadesiz") => ({ date, desc, amount, currency: "TL", account, accountLabel: "Vadesiz ·1234", ts: Date.parse(`${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}T09:00:00Z`) });
const PMOV = [
  inc("FAST GELEN AHMET KAYA SEYHUN YILDIZ ANTRENORLUK", 3000, "03.10.2026 12:00"),
  inc("EFT GELEN SEYHUN YILDIZ EKIM DERS", 1500, "01.10.2026 10:00"),
  inc("HAVALE MEHMET OZ AIDAT", 1200, "02.10.2026 10:00"),
  inc("EFT GELEN SEYHUN YILDIZ EYLUL", 2000, "15.09.2026 10:00"),
  inc("EFT GELEN SEYHUN YILDIZ DOLAR", 50, "16.09.2026 10:00", "USD|9999|Vadesiz"),
  { ...inc("GIDEN EFT SEYHUN YILDIZ", -700, "04.10.2026 10:00") },
];
const SY = { name: "Seyhun Yıldız", account: "" };
const MBX = await import("@/lib/mailBoard");
group("Gelen ödemeler (kişisel hesap)")([
  ["Türkçe harfsiz ad", F("SEYHUN YILDIZ = Seyhun Yıldız", () => PY.hasName("EFT SEYHUN YILDIZ", "Seyhun Yıldız") && !PY.hasName("EFT SEYHUN KAYA", "Seyhun Yıldız"))],
  ["yalnız gelen ve adı geçen", F("4 ödeme, giden ve başka ad yok", () => PY.payeeMoves(PMOV, SY).length === 4)],
  ["hesap seçimi", F("yalnız USD hesabı", () => PY.payeeMoves(PMOV, { name: "Seyhun Yıldız", account: "USD|9999|Vadesiz" }).length === 1)],
  ["ad boş", F("hesaba gelen her para", () => PY.payeeMoves(PMOV, { name: "", account: "TL|1234|Vadesiz" }).length === 4)],
  ["ay ay toplam", F("ekim 4.500, eylül 2.050, toplam 6.550", () => { const r = PY.payeeSummary(PY.payeeMoves(PMOV, SY), "2026-10"); return r.month.total === 4500 && r.month.count === 2 && r.byMonth[1].total === 2050 && r.total === 6550; })],
  ["en yeni önce", F("3 Ekim ilk", () => PY.payeeMoves(PMOV, SY)[0].amount === 3000)],
  ["varsayılan ad", F("hesabın adı, ayar varsa o", () => PY.payeeOf({ name: "Seyhun Yıldız" }).name === "Seyhun Yıldız" && PY.payeeOf({ name: "X", payee: { name: "Kulüp" } }).name === "Kulüp")],
  ["soru: bu ay", F("bu ay ne kadar ödeme aldım", () => PY.payeeAsk("Bu ay ne kadar ödeme aldım?", "2026-10-05")?.ym === "2026-10")],
  ["soru: geçen ay", F("geçen ay kaç ödeme geldi", () => PY.payeeAsk("geçen ay kaç ödeme geldi", "2026-10-05")?.ym === "2026-09")],
  ["soru: ay adı", F("kasımda (geçen yıl)", () => PY.payeeAsk("kasımda ne kadar para geldi", "2026-10-05")?.ym === "2025-11")],
  ["aidat ve fatura değil", F("kendi akışları", () => !PY.payeeAsk("bu ay kaç aidat ödemesi geldi", "2026-10-05") && !PY.payeeAsk("faturaları aç", "2026-10-05") && !PY.payeeAsk("ödeme yaptım", "2026-10-05"))],
  ["cevap", F("2 ödeme, toplam", () => /Bu ay Seyhun Yıldız adına 2 ödeme geldi, toplam 4\.500 lira\. Son ödeme 3 Ekim, 3\.000 lira\./.test(PY.payeeAnswer(PY.payeeMoves(PMOV, SY), SY, "2026-10", "2026-10")))],
  ["cevap: ödeme yok", F("görünmüyor", () => /görünmüyor/.test(PY.payeeAnswer([], SY, "2026-08", "2026-10")))],
  ["ad başka sütunda", F("text alanında SEYHUN YILDIZ", () => PY.payeeMoves([{ ...inc("FAST GELEN", 800, "05.10.2026 10:00"), text: "Gönderen: SEYHUN YILDIZ" }], SY).length === 1)],
  ["bitişik ad", F("SEYHUNYILDIZ", () => PY.hasName("EFT SEYHUNYILDIZ KIRA", "Seyhun Yıldız"))],
  ["adı geçmeyenler", F("aidat havalesi ayrı listede", () => { const r = PY.otherIncoming(PMOV, SY); return r.length === 1 && r[0].amount === 1200; })],
  ["Excel", F("başlık ve satır", () => { const c = PY.payeeCsv(PY.payeeMoves(PMOV, SY), "Seyhun Yıldız"); return /Tarih/.test(c) && /"3000"/.test(c) && c.split("\n").length === 6 && /Gönderen/.test(c); })],
  ["hesap adı sütunu", F("ona giden para ad sütunundan, açıklama bilgi", () => { const l = PY.payeeMoves(MBX.movementsOf([{ at: "2026-10-05T07:00:00Z", sheets: [{ columns: ["Tarih", "Gönderen Adı", "Açıklama", "Tutar"], rows: [{ v: ["05.10.2026 10:12", "SEYHUN YILDIZ", "Ekim kira", -5000] }, { v: ["05.10.2026 11:00", "AHMET KAYA", "SEYHUN YILDIZ icin", 300] }], sum: { currency: "TL" } }] }]), SY); return l.length === 1 && l[0].who === "SEYHUN YILDIZ" && l[0].desc === "Ekim kira" && l[0].amount === 5000 && l[0].out; })],
  ["kulüp hesabından ona giden", F("maaş + huzur hakkı aldığı ödeme, kendi yatırdığı değil", () => {
    const out = { ...inc("SEYHUN YILDIZ*TR000000000000000000000000*MAAS HUZUR HAKKI*1 R1234567890123*FAST", -300000, "10.09.2026 10:00"), who: "SEYHUN YILDIZ" };
    const own = { ...inc("SEYHUN YILDIZ*0062*kulube*1*FAST", 1000, "11.09.2026 10:00"), who: "SEYHUN YILDIZ" };
    const l = PY.payeeMoves([out, own], SY);
    return l.length === 1 && l[0].amount === 300000 && l[0].out && PY.otherIncoming([out, own], SY).length === 1;
  })],
  ["kendi hesabı seçili", F("o hesaba gelen her para", () => PY.payeeMoves([{ ...inc("X*0062*a*1*FAST", 700, "11.09.2026 10:00"), who: "ALI VELI" }], { name: "Seyhun Yıldız", account: "TL|1234|Vadesiz" }).length === 1)],
  ["açıklamadaki gönderen", F("GÖNDEREN: AD SOYAD", () => MBX.whoOf("FAST GÖNDEREN: SEYHUN YILDIZ aidat ekim") === "SEYHUN YILDIZ" && MBX.whoOf("POS SATIS MIGROS") === "")],
]);

// Hesaplar: arama ve eklenen adlar (payee.js moveHas, searchMoves, nameMoves, namesOf)
const HMOV = [
  { ...inc("X*0062*Ekim aidat*1*FAST", 1500, "03.10.2026 12:00"), who: "AHMET KAYA", note: "Ekim aidat" },
  { ...inc(`MARINA LTD*${"TR" + "0".repeat(24)}*baglama*1*FAST`, -2000, "04.10.2026 10:00"), who: "AHMET KAYA" },
  inc("HAVALE MEHMET OZ AIDAT", 1200, "02.10.2026 10:00"),
  { ...inc("EFT AHMET KAYA DOLAR", 50, "05.10.2026 10:00", "USD|9999|Vadesiz"), currency: "USD" },
];
const D = await import("@/lib/dues");
group("Hesaplar arama ve eklenen adlar")([
  ["isimle arama", F("ahmet → 3 hareket (Türkçe harfsiz, kelime başı)", () => PY.searchMoves(HMOV, "ahm").length === 3 && PY.searchMoves(HMOV, "Ahmet Kaya").length === 3)],
  ["açıklamada arama", F("aidat → 2", () => PY.searchMoves(HMOV, "aidat").length === 2)],
  ["Türkçe harf", F("Öz → MEHMET OZ", () => PY.searchMoves(HMOV, "mehmet öz").length === 1)],
  ["bulunamaz", F("ayşe → 0, boş → hepsi", () => PY.searchMoves(HMOV, "ayşe").length === 0 && PY.searchMoves(HMOV, "  ").length === 4)],
  ["eklenen ad", F("gelen ve giden, yalnız TL, en yeni önce", () => { const l = PY.nameMoves(HMOV, "Ahmet Kaya"); return l.length === 2 && l[0].amount === -2000 && l[1].amount === 1500; })],
  ["gelen/giden toplam", F("1.500 / 2.000", () => { const t = PY.inOut(PY.nameMoves(HMOV, "Ahmet Kaya")); return t.in === 1500 && t.out === 2000; })],
  ["ay özeti işaretli", F("ekim gelen 1.500 giden 2.000", () => { const r = PY.payeeSummary(PY.nameMoves(HMOV, "Ahmet Kaya"), "2026-10"); return r.month.in === 1500 && r.month.out === 2000 && r.in === 1500 && r.out === 2000; })],
  ["ad açıklamada", F("hesap adı yoksa açıklamaya bakar", () => PY.nameMoves(HMOV, "Mehmet Öz").length === 1)],
  ["eklenen ad: hesap adı ya da açıklama", F("ikisinden biri yeter", () => PY.nameMoves([{ ...inc("FAST*ALI VELI*Seyhun Yıldız için kira", 900, "06.10.2026 10:00"), who: "ALI VELI" }, { ...inc("x", 50, "07.10.2026 10:00"), who: "SEYHUN YILDIZ" }], "Seyhun Yıldız").length === 2)],
  ["en çok ödeyenler", F("bütün gelen TL paralar, gönderene göre, toplam büyükten", () => { const t = PY.topPayers([...HMOV, { ...inc("y", 700, "08.10.2026 10:00"), who: "Ahmet Kaya" }, { ...inc("z", 5000, "01.01.2025 10:00"), who: "ZEYNEP AK" }]); return t.length === 2 && t[0].who === "ZEYNEP AK" && t[1].sum === 2200 && t[1].n === 2; })],
  ["nakit aidat gelir", F("nakitler hareket olur, EFT'ler girmez", () => {
    const l = D.cashMoves({ settings: { roster: [] }, "2026-10": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-05" }, { amt: 1500, via: "eft", mov: "m1" }] } }, "2026-09": { paid: { a1: [{ amt: 1000, via: "cash", at: "2026-09-03T10:00:00Z" }] } } }, [{ id: "a1", studentName: "Deniz Şahin" }]);
    return l.length === 2 && l[0].cash && l[0].who === "Deniz Şahin" && l[0].amount === 1500 && l[0].date === "05.10.2026" && D.monthOf(l[0]) === "2026-10" && l[1].note === "Eylül 2026 aidatı" && PY.nameMoves(l, "Deniz Şahin").length === 2 && PY.topPayers(l)[0].sum === 2500;
  })],
  ["elle nakit gelir", F("tür, kişi, tarih; Hesaplar'da hareket", () => {
    const [m] = D.incomeMoves([{ id: "x1", who: "Ali Kaya", amount: 2500, cat: "Kano eğitimi", note: "2 ders", date: "2026-10-08" }, { id: "x2", amount: 0 }]);
    return m && m.manual && m.cash && m.who === "Ali Kaya" && m.cat === "Kano eğitimi" && m.note === "Kano eğitimi · 2 ders" && D.monthOf(m) === "2026-10" && D.INCOME_CATS.includes("Bağış") && PY.searchMoves([m], "kano").length === 1;
  })],
  ["ad listesi", F("boşlar ve tekrarlar atılır", () => { const n = PY.namesOf({ payeeNames: [" Ali Kaya ", "", "ALI KAYA", "Ayşe Demir"] }); return n.length === 2 && n[0] === "Ali Kaya"; })],
]);

// Banka defteri (bankLedger.js): Excel bir kez doldurur, mailler ekler, aynı hareket bir kez
const BL = await import("@/lib/bankLedger");
const mv = (date, amount, desc, extra = {}) => ({ date, desc, amount, currency: "TL", account: "TL|1234|", ts: Date.parse(`${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}T09:00:00Z`), ...extra });
group("Banka defteri")([
  ["aylara dağıtır", F("eylül ve ekim", () => { const a = BL.ledgerAdd([mv("30.09.2026 10:00", 100, "EFT A"), mv("01.10.2026 10:00", 200, "EFT B")]); return Object.keys(a).sort().join() === "2026-09,2026-10"; })],
  ["Excel ile mail aynı hareket", F("saat farkı olsa da tek anahtar", () => { const a = BL.ledgerAdd([mv("01.10.2026 10:00", 200, "EFT GELEN SEYHUN YILDIZ")]); const b = BL.ledgerAdd([mv("01.10.2026", 200, "EFT GELEN SEYHUN YILDIZ")], "f1"); return Object.keys(a["2026-10"])[0] === Object.keys(b["2026-10"])[0]; })],
  ["aynı gün iki eş hareket", F("ikisi de kalır", () => Object.keys(BL.ledgerAdd([mv("01.10.2026 10:00", 50, "POS"), mv("01.10.2026 15:00", 50, "POS")])["2026-10"]).length === 2)],
  ["Excel mailin üstüne yazmaz", F("yalnız yeni anahtar", () => { const mail = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X")]); const file = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X"), mv("02.10.2026", 300, "EFT Y")], "f1"); const n = BL.onlyNew(file, mail); return Object.keys(n["2026-10"]).length === 1 && Object.values(n["2026-10"])[0].f === "f1"; })],
  ["Excel yeniden yüklenince", F("eski Excel kaydı adla yenilenir, mail kaydının yalnız adı tamamlanır", () => {
    const oldFile = BL.ledgerAdd([mv("02.10.2026", 300, "EFT Y")], "f0");
    const mail = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X")]);
    const ex = { "2026-10": { ...oldFile["2026-10"], ...mail["2026-10"] } };
    const again = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X", { who: "ALI KAYA" }), mv("02.10.2026", 300, "EFT Y", { who: "SEYHUN YILDIZ" })], "f1");
    const n = Object.values(BL.onlyNew(again, ex)["2026-10"]);
    const y = n.find((m) => m.amount === 300);
    const x = n.find((m) => m.amount === 200);
    return n.length === 2 && y.f === "f1" && y.who === "SEYHUN YILDIZ" && !x.f && x.who === "ALI KAYA" && x.date === "01.10.2026";
  })],
  ["liste", F("en yeni önce, id anahtar", () => { const l = BL.ledgerList({ "2026-10": { moves: BL.ledgerAdd([mv("01.10.2026", 1, "A"), mv("03.10.2026", 2, "B")])["2026-10"] } }); return l[0].amount === 2 && l[0].id.startsWith("k"); })],
  ["giden de saklanır", F("eksi tutar", () => Object.values(BL.ledgerAdd([mv("01.10.2026", -90, "FATURA")])["2026-10"])[0].amount === -90)],
  ["ay aralığı", F("kasım–şubat", () => BL.monthsBetween("2025-11", "2026-02").join() === "2025-11,2025-12,2026-01,2026-02")],
]);

// Banka Excel'i incelemesi (Mailler sayfası): İş Bankası açıklama yazımından ad + açıklama, yapay zeka yanıtının denetimi
const MB2 = await import("@/lib/mailBoard");
const BA = await import("@/lib/bankAnalyze");
const BS2 = await import("@/lib/bankSheet");
const IB = "TR" + "0".repeat(24);
group("Banka Excel incelemesi")([
  ["gelen FAST", F("gönderen ve not", () => { const p = MB2.partyOf("AYSE KARA DEMIR*0062*Ekim aidat Mete*1234567890*FAST"); return p.who === "AYSE KARA DEMIR" && p.note === "Ekim aidat Mete"; })],
  ["giden FAST", F("alıcı (IBAN'dan önce)", () => { const p = MB2.partyOf(`MARINA ISLETME LTD*${IB}*Kasim baglama*1234567890 R1234567890123*FAST`); return p.who === "MARINA ISLETME LTD" && p.note === "Kasim baglama"; })],
  ["gelen havale", F("açıklama önce, gönderen sonra", () => { const p = MB2.partyOf("Eylul aidati yelken*ALI VELI*R1234567890123"); return p.who === "ALI VELI" && p.note === "Eylul aidati yelken"; })],
  ["ücret satırı", F("ad yok", () => { const p = MB2.partyOf("ÜCRET R1234567890123 12345,00 TRY ÜZ."); return p.who === "" && p.note === ""; })],
  ["hareketlerde ad", F("movementsOf who/note, tür İşlem Tipi", () => {
    const s = BS2.parseStatement([["Sayın ÖRNEK KULÜP"], ["Tarih/Saat", "İşlem Tutarı*", "Bakiye", "İşlem", "İşlem Tipi", "Açıklama"], ["01/10/2026-10:00:00", 1500, 9000, "FA", "FAST", "AYSE KARA*0062*Ekim aidat*123*FAST"]]);
    const [m] = MB2.movementsOf([{ at: "2026-10-01T10:00:00Z", sheets: [{ ...s, rows: s.rows.map((v) => ({ v })) }] }]);
    return m.who === "AYSE KARA" && m.note === "Ekim aidat" && m.kind === "FAST" && s.meta["Hesap sahibi"] === "ÖRNEK KULÜP";
  })],
  ["maske", F("IBAN ve uzun numara yapay zekaya gitmez", () => { const x = BA.maskAi(`ALI*${IB}*not*12345678901*FAST`); return !x.includes("0000000") && x.includes("IBAN"); })],
  ["uydurma ad alınmaz", F("açıklamada geçmeyen ad atılır", () => {
    const [a, b] = BA.applyAi([{ desc: "ODEME*XYZ", amount: 100 }, { desc: "Kamp ucreti MEHMET OZ odedi", amount: 200 }], [{ i: 0, who: "Hayali Kişi", cat: "Aidat" }, { i: 1, who: "Mehmet Öz", note: "Kamp ücreti", cat: "Diğer gelen" }]);
    return !a.who && a.cat === "Aidat" && b.who === "Mehmet Öz" && b.note === "Kamp ücreti";
  })],
  ["kesin okuma önce", F("partyOf adı yapay zekanınkini ezer", () => BA.applyAi([{ desc: "ALI VELI*0062*x*1*FAST", who: "ALI VELI", amount: 5 }], [{ i: 0, who: "VELI", cat: "Uydurma" }])[0].who === "ALI VELI")],
  ["yanıtsızda yerel tür", F("ücret, fatura, gelen", () => { const r = BA.applyAi([{ desc: "FAST ÜCRETİ", amount: -5 }, { desc: "ELEKTRIK FATURA", amount: -300 }, { desc: "X*Y*Z", amount: 50 }], []); return r.map((m) => m.cat).join() === "Banka ücreti,Fatura,Diğer gelen"; })],
  ["özet", F("gelen/giden, türler, en çok gönderen", () => {
    const ms = [{ ts: Date.parse("2026-07-01T09:00:00Z"), amount: 1500, who: "AYSE KARA", cat: "Aidat" }, { ts: Date.parse("2026-08-01T09:00:00Z"), amount: 1500, who: "Ayşe Kara", cat: "Aidat" }, { ts: Date.parse("2026-10-02T09:00:00Z"), amount: -200, cat: "Fatura" }, { ts: Date.parse("2026-09-01T09:00:00Z"), amount: 80, cat: "Diğer gelen" }];
    const r = BA.report(ms);
    return r.from === "2026-07-01" && r.to === "2026-10-02" && r.inN === 3 && r.inSum === 3080 && r.outSum === -200 && r.top[0].n === 2 && r.top[0].sum === 3000 && r.noWho === 1 && r.cats[0].cat === "Aidat";
  })],
  ["mail ile birleşme", F("boşluk varsa uyarır", () => BA.handoff("2026-10-02", "2026-10-03").startsWith("Sonrası") && BA.handoff("2026-10-02", "2026-10-10").startsWith("Dikkat") && BA.handoff("2026-10-02", "").includes("günlük"))],
  ["defter türü saklar", F("note ve cat, mail kaydına tamamlanır", () => {
    const mail = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X")]);
    const file = BL.ledgerAdd([mv("01.10.2026", 200, "EFT X", { note: "Ekim aidatı", cat: "Aidat" })], "f1");
    const x = Object.values(BL.onlyNew(file, mail)["2026-10"])[0];
    return !x.f && x.note === "Ekim aidatı" && x.cat === "Aidat";
  })],
]);

// Rüzgâr haritası (windMap.js): ızgara, Open-Meteo yanıtı, saat seçimi, renk
const WM = await import("@/lib/windMap");
const WPTS = WM.gridOf({ lat: 39.0717, lon: 26.8886 });
const WJ = WPTS.map((p, i) => ({ latitude: p.lat, longitude: p.lon, hourly: { time: ["2026-10-05T13:00", "2026-10-05T14:00", "2026-10-06T00:00"], wind_speed_10m: [8.4, 12 + (i % 3), 20], wind_gusts_10m: [11, 16 + (i % 3), 27], wind_direction_10m: [40, i % 2 ? 350 : 10, 200] } }));
group("Rüzgâr haritası")([
  ["ızgara", F("6×6 = 36 nokta, Dikili ortada", () => WPTS.length === 36 && Math.abs(WPTS.reduce((a, p) => a + p.lat, 0) / 36 - 39.0717) < 1e-3 && Math.abs(WPTS.reduce((a, p) => a + p.lon, 0) / 36 - 26.8886) < 1e-3 && WPTS[0].lat > WPTS[35].lat && WPTS[0].lon < WPTS[35].lon)],
  ["istek adresi", F("tek istek, tüm noktalar, knot", () => { const u = new URL(WM.mapUrl(WPTS)); return u.searchParams.get("latitude").split(",").length === 36 && u.searchParams.get("wind_speed_unit") === "kn" && u.searchParams.get("forecast_days") === "3"; })],
  ["yanıt", F("her noktaya saatlik rüzgâr", () => { const d = WM.shapeMap(WJ, WPTS, 1); return d.times.length === 3 && d.spots.length === 36 && d.spots[0].w[0] === 8 && d.spots[1].g[1] === 17; })],
  ["tek nokta yanıtı", F("dizi değilse de okunur", () => WM.shapeMap(WJ[0], WPTS.slice(0, 1)).spots[0].d[2] === 200)],
  ["eksik veri", F("boş saat oka girmez", () => { const d = WM.shapeMap([{ hourly: { time: ["a", "b"], wind_speed_10m: [null, 5], wind_gusts_10m: [1, 6], wind_direction_10m: [0, 90] } }], WPTS.slice(0, 1)); return WM.frameAt(d, 0).length === 0 && WM.frameAt(d, 1)[0].kn === 5; })],
  ["şimdiki saat", F("14:20 → 14:00 satırı", () => WM.nowIndex(["2026-10-05T13:00", "2026-10-05T14:00", "2026-10-06T00:00"], "2026-10-05T14") === 1 && WM.nowIndex(["x"], "z") === 0)],
  ["saatin özeti", F("12–14 kn, sağanak 18, yön kuzey", () => { const s = WM.frameSummary(WM.frameAt(WM.shapeMap(WJ, WPTS), 1)); return s.min === 12 && s.max === 14 && s.gust === 18 && (s.dir <= 10 || s.dir >= 350); })],
  ["günler", F("bugün ve yarın, ilk saatleriyle", () => { const d = WM.daysOf(["2026-10-05T13:00", "2026-10-05T14:00", "2026-10-06T00:00"]); return d.length === 2 && d[1].date === "2026-10-06" && d[1].from === 2; })],
  ["renk", F("hafif mavi, sert turuncu, fırtına mor", () => WM.colorOf(2) === "#7aa6d6" && WM.colorOf(23) === "#ec7a35" && WM.colorOf(40) === "#a33b9c")],
  ["önbellek", F("aynı yer ve 30 dk içinde taze", () => { const p = { lat: 39.0717, lon: 26.8886 }; const c = { place: WM.placeId(p), at: 0, times: ["x"] }; return WM.fresh(c, p, 10 * 60e3) && !WM.fresh(c, p, 31 * 60e3) && !WM.fresh(c, { lat: 38.4, lon: 27.1 }, 1); })],
]);

// İnternet göstergesi (netSync.js): üstteki şeridin yazısı
const NS = await import("@/lib/netSync");
group("İnternet göstergesi")([
  ["bağlı, bekleyen yok", F("şerit yok", () => NS.netText({ online: true, pending: false, sent: false }) === "")],
  ["internet yok", F("bağlantı gelince gönderilir", () => /^İnternet yok · kaydettiklerin bağlantı gelince gönderilir$/.test(NS.netText({ online: false })))],
  ["internet yok, kayıt var", F("kaydedildi, gönderilecek", () => /kaydedildi, bağlantı gelince gönderilecek/.test(NS.netText({ online: false, pending: true })))],
  ["zayıf bağlantı", F("gönderiliyor", () => /^Bağlantı zayıf/.test(NS.netText({ online: true, pending: true })) && NS.netTone({ online: true, pending: true }) === "wait")],
  ["hepsi gitti", F("gönderildi, yeşil", () => /gönderildi$/.test(NS.netText({ online: true, sent: true })) && NS.netTone({ online: true }) === "ok")],
]);

// Karanlık mod (theme.js): seçim ve otomatik
const TH = await import("@/lib/theme");
group("Karanlık mod")([
  ["seçenekler", F("Otomatik, Açık, Koyu", () => TH.THEMES.map((x) => x[1]).join() === "Otomatik,Açık,Koyu")],
  ["bozuk değer", F("otomatik sayılır", () => TH.cleanTheme("mavi") === "" && TH.cleanTheme("dark") === "dark")],
  ["otomatik", F("telefonun ayarını izler", () => TH.resolveTheme("", true) === "dark" && TH.resolveTheme("", false) === "light")],
  ["elle seçim", F("telefonun ayarından önce gelir", () => TH.resolveTheme("light", true) === "light" && TH.resolveTheme("dark", false) === "dark")],
  ["ilk çizim kodu", F("aynı anahtar ve kural", () => TH.THEME_SCRIPT.includes('"sa-theme"') && TH.THEME_SCRIPT.includes("prefers-color-scheme: dark"))],
]);

// Ana sayfada faturalar (invoices.js): özet kartı ve "Senin için"de yaklaşan/geciken fatura
group("Ana sayfa faturalar")([
  ["kart", F("2 ödenmedi, toplam ve en yakın son gün", () => { const t = IV.invoiceTile(INV, "2026-10-05"); return t.big === "2.150,50 TL" && t.sub === "2 ödenmedi · son gün 15 Eki" && t.warn === false; })],
  ["kart yaklaşınca", F("son gün yarın, uyarı", () => { const t = IV.invoiceTile(INV, "2026-10-14"); return t.sub === "2 ödenmedi · son gün yarın" && t.warn === true; })],
  ["kart gecikince", F("1 gecikti", () => IV.invoiceTile(INV, "2026-10-16").sub === "2 ödenmedi · 1 gecikti")],
  ["açık fatura yoksa", F("kart yok", () => IV.invoiceTile([INV[2]], "2026-10-05") === null && IV.invoiceTile([], "2026-10-05") === null)],
  ["acil faturalar", F("3 gün içinde ya da geciken, en acil önce", () => IV.urgentInvoices(INV, "2026-10-05").length === 0 && IV.urgentInvoices(INV, "2026-10-17").map((x) => x.id).join(",") === "i1,i2")],
  ["son gün yazısı", F("gecikti / bugün / tarih", () => IV.dueText(INV[0], "2026-10-18") === "Gecikti 3 gün" && IV.dueText(INV[0], "2026-10-15") === "Son gün bugün" && IV.dueText(INV[0], "2026-10-01") === "Son gün 15 Eki" && IV.dueText(INV[2], "2026-10-01") === "Son gün yok")],
]);

// Açılış ekranı (boot.js): yükleme aşamaları arasında ekran kaybolup yeniden gelmesin.
// Durum modül içinde ortak olduğu için adımlar tek denetimde sırayla çalışır.
const BT = await import("@/lib/boot");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bootSteps = async () => {
  const out = [];
  const seen = [];
  const off = BT.onBoot((v) => seen.push(v));
  // 1) oturum bitip veri yüklemesi aynı anda başlayınca ekran kalır, veri gelince bir kez çekilir
  let a = BT.holdBoot();
  a();
  let b = BT.holdBoot();
  await wait(900);
  out.push(BT.bootShown() && seen.length === 0);
  b();
  await wait(300);
  out.push(!BT.bootShown() && seen.join() === "false");
  // 2) aşamalar arasında 50 ms boşluk olsa da sönmez
  a = BT.holdBoot();
  a();
  await wait(50);
  b = BT.holdBoot();
  await wait(300);
  out.push(BT.bootShown() && seen.join() === "false,true");
  b();
  await wait(800);
  out.push(!BT.bootShown());
  // 3) iki kez bırakmak sayacı bozmaz
  a = BT.holdBoot();
  b = BT.holdBoot();
  a();
  a();
  await wait(800);
  out.push(BT.bootShown());
  b();
  await wait(800);
  out.push(!BT.bootShown());
  off();
  return out.every(Boolean) || out.map((x) => (x ? 1 : 0)).join("");
};
group("Açılış ekranı")([
  ["aşamalar", F("geçişte sönmez, kısa boşlukta sönmez, iki kez bırakma sayacı bozmaz", bootSteps)],
]);

// Geri düğmesi dokunuşu (navTrail.js goBack): arka arkaya basış tek geri; geri gidilemezse üst sayfaya.
// Tarayıcı benzeri küçük bir pencere kurulur; diğer testleri etkilemesin diye en sonda ve kendi içinde kaldırılır.
let backDone = Promise.resolve();
const backTaps = async () => {
  let done;
  backDone = new Promise((r) => (done = r));
  await wait(0);
  const loc = { pathname: "/inventory", search: "", href: "https://x.app/inventory" };
  const store = {};
  globalThis.window = { location: loc, history: { pushState() {}, replaceState() {} }, addEventListener() {} };
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
  try {
    NAV.installTrail();
    window.history.pushState(null, "", "/inventory/k1");
    loc.pathname = "/inventory/k1";
    const calls = [];
    const router = { back: () => calls.push("back"), replace: (h) => calls.push(`replace ${h}`) };
    NAV.goBack(router, "/inventory");
    NAV.goBack(router, "/inventory");
    NAV.goBack(router, "/inventory");
    const once = calls.join() === "back";
    await wait(700); // adres değişmedi: geçmiş boştu, üst sayfaya gidilir
    const fell = calls.join() === "back,replace /inventory";
    return (once && fell && !NAV.canGoBack()) || calls.join();
  } finally {
    delete globalThis.window;
    delete globalThis.sessionStorage;
    done();
  }
};
group("Geri düğmesi dokunuşu")([
  ["arka arkaya basış", F("tek geri; tepki yoksa üst sayfa", backTaps)],
]);

// Sayfa geçişinde kaydırma (navProgress.js): yeni sayfa en üstten, geri dönülen sayfa yerinde
const NP = await import("@/lib/navProgress");
// Geri düğmesi testi de pencere kurar; o bitmeden başlarsa pencereyi siler (yavaş makinede, Node 24)
const scrollTops = async () => {
  await wait(0);
  await backDone;
  const tops = [];
  globalThis.window = { scrollY: 600, scrollTo: (x, y) => tops.push(y) };
  try {
    NP.navArrived(); // ileri: en üste
    NP.navPopped();
    NP.navArrived(); // geri: dokunulmaz
    NP.navArrived(); // sonraki ileri yine en üste
    return tops.join() === "0,0" || tops.join();
  } finally {
    delete globalThis.window;
  }
};
group("Sayfa geçişinde kaydırma")([
  ["yeni sayfa", F("en üstten başlar, geri dönüşte konum kalır", scrollTops)],
]);

// Bildirim kutusu (lib/inbox): ana sayfadaki "Bildirimler" ile simgedeki sayı aynı listeden
const NB = await import("@/lib/inbox");
group("Bildirim kutusu")([
  ["eklenir, en yeni önde", F("iki bildirim, sayı 2", () => {
    let l = NB.inboxAdd([], { title: "Yeni görev: Motor yağı", body: "Ali verdi", tag: "task-1", url: "/?open=task:1" }, "2026-10-06T10:00:00.000Z");
    l = NB.inboxAdd(l, { title: "Ali", body: "Merhaba", tag: "chat-x", url: "/messages?c=x" }, "2026-10-06T11:00:00.000Z");
    return l.length === 2 && l[0].tag === "chat-x" && NB.inboxBadge(l, "") === 2;
  })],
  ["aynı etiket yerine geçer", F("aynı sohbetten ikinci mesaj tek satır", () => {
    let l = NB.inboxAdd([], { title: "Ali", body: "1", tag: "chat-x" }, "2026-10-06T10:00:00.000Z");
    l = NB.inboxAdd(l, { title: "Ali", body: "2", tag: "chat-x" }, "2026-10-06T10:05:00.000Z");
    return l.length === 1 && l[0].body === "2";
  })],
  ["görülünce sıfır", F("inboxSeen sonrası yeni olan sayılır", () => {
    let l = NB.inboxAdd([], { title: "A", tag: "a" }, "2026-10-06T10:00:00.000Z");
    const seen = l[0].at;
    if (NB.inboxBadge(l, seen) !== 0) return false;
    l = NB.inboxAdd(l, { title: "B", tag: "b" }, "2026-10-06T12:00:00.000Z");
    return NB.inboxBadge(l, seen) === 1 && NB.inboxUnread(l, seen)[0].title === "B";
  })],
  ["en çok 30", F("eskiler düşer", () => {
    let l = [];
    for (let i = 0; i < 40; i++) l = NB.inboxAdd(l, { title: `B${i}`, tag: `t${i}` }, new Date(Date.UTC(2026, 9, 6, 0, i)).toISOString());
    return l.length === NB.INBOX_MAX && l[0].title === "B39";
  })],
]);

// Plan ekranı işlemleri (src/lib/planActions.js)
const PA = await import("@/lib/planActions");
const pa = { id: "p1", title: "Antrenman", date: "2026-10-06", time: "10:00", place: "İskele" };
group("Plan detay işlemleri")([
  ["kopyalanacak metin", { desc: "başlık, zaman, yer", fn: () => PA.planText(pa), ok: (r) => r === "Antrenman\n6 Ekim Salı · 10:00\nYer: İskele" }],
  ["iptal metni", { desc: "İPTAL ile başlar", fn: () => PA.planText({ ...pa, status: "cancelled", place: "" }), ok: (r) => r.startsWith("İPTAL: Antrenman\n") && !r.includes("Yer") }],
  ["çok günlü", { desc: "aralık yazılır, saat yok", fn: () => PA.planWhen({ date: "2026-10-06", endDate: "2026-10-08" }), ok: (r) => r.includes("–") && !r.includes("Tüm gün") }],
  ["ertele", { desc: "tarih ve bitiş 1 gün ileri, ay sonu", fn: () => JSON.stringify(PA.postponePatch({ date: "2026-10-31", endDate: "2026-11-02" })), ok: (r) => r === '{"date":"2026-11-01","endDate":"2026-11-03"}' }],
  ["ertele tek gün", { desc: "bitiş eklenmez", fn: () => JSON.stringify(PA.postponePatch({ date: "2026-10-06" }, 7)), ok: (r) => r === '{"date":"2026-10-13"}' }],
]);

// Sesli arama 1. adım (src/lib/call.js): kimler arayabilir, durum yazıları, süre
const CL = await import("@/lib/call");
group("Sesli arama")([
  ["ana hesap ↔ çalışan", F("aranır", () => CL.canCall("owner", "staff") && CL.canCall("staff", "owner"))],
  ["çalışan ↔ çalışan, aile ↔ aile", F("aranır", () => CL.canCall("staff", "staff") && CL.canCall("family", "family"))],
  ["sporcu tarafı", F("şimdilik aranmaz", () => !CL.canCall("owner", "athlete") && !CL.canCall("staff", "parent") && !CL.canCall("student", "staff"))],
  ["çalışan ↔ aile", F("yazışamadığı için aranmaz", () => !CL.canCall("staff", "family"))],
  ["süre", F("0:07, 3:25, 1:02:09", () => CL.durationText(7e3) === "0:07" && CL.durationText(205e3) === "3:25" && CL.durationText(3729e3) === "1:02:09")],
  ["arayan çalıyor", F("Aranıyor…", () => CL.callLabel({ status: "ringing", role: "caller" }) === "Aranıyor…")],
  ["aranan çalıyor", F("Seni arıyor", () => CL.callLabel({ status: "ringing", role: "callee" }) === "Seni arıyor")],
  ["bağlandı", F("süre yazar", () => CL.callLabel({ status: "active", conn: "connected", ms: 65e3 }) === "1:05")],
  ["bağlanıyor", F("Bağlanıyor…", () => CL.callLabel({ status: "active", conn: "checking" }) === "Bağlanıyor…")],
  ["reddedildi", F("arayana Meşgul", () => CL.callLabel({ status: "declined", role: "caller" }) === "Meşgul")],
  ["açılmadı", F("arayana Cevap yok, arananan Cevapsız arama", () => CL.callLabel({ status: "missed", role: "caller" }) === "Cevap yok" && CL.callLabel({ status: "missed", role: "callee" }) === "Cevapsız arama")],
  ["eski çalan kayıt", F("45 sn önceki çalmaz, 10 sn önceki çalar", () => !CL.ringingFresh({ status: "ringing", atMs: 1e6 }, 1e6 + 45e3) && CL.ringingFresh({ status: "ringing", atMs: 1e6 }, 1e6 + 10e3))],
  ["bitmiş durumlar", F("declined/missed/ended/failed biter", () => ["declined", "missed", "ended", "failed"].every(CL.isOver) && !CL.isOver("active") && !CL.isOver("ringing"))],
  ["mikrofon izni", F("izin açıklaması", () => /izni yok/.test(CL.micError({ name: "NotAllowedError" })))],
  ["kopan bağlantı", F("Yeniden bağlanıyor…", () => CL.callLabel({ status: "active", conn: "disconnected", retrying: true }) === "Yeniden bağlanıyor…")],
  ["sohbete satır: cevapsız", F("bildirimli", () => { const l = CL.callLog("missed", 0); return l.text === "📞 Cevapsız sesli arama" && l.notify; })],
  ["sohbete satır: reddedildi", F("cevapsız, bildirimsiz", () => { const l = CL.callLog("declined", 0); return l.text === "📞 Cevapsız sesli arama" && !l.notify; })],
  ["sohbete satır: konuşuldu", F("süreyle, bildirimsiz", () => { const l = CL.callLog("ended", 192e3); return l.text === "📞 Sesli arama · 3:12" && !l.notify; })],
  ["TURN listesi (Cloudflare)", F("STUN başta, TURN şifreli, 53 portu atılır", () => {
    const l = CL.turnServers({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478", "turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "p" }] });
    return l.length === 2 && l[0].urls[0].startsWith("stun:stun.l.google") && l[1].urls.length === 2 && !l[1].urls.some((u) => u.includes(":53")) && CL.hasTurn(l);
  })],
  ["TURN eski biçim", F("tek nesne de okunur", () => CL.hasTurn(CL.turnServers({ iceServers: { urls: ["turn:a:3478"], username: "u", credential: "p" } })))],
  ["TURN yok", F("yalnız STUN", () => { const l = CL.turnServers(null); return l.length === 1 && !CL.hasTurn(l); })],
  ["şifresiz TURN", F("alınmaz", () => !CL.hasTurn(CL.turnServers({ iceServers: [{ urls: ["turn:a:3478"] }] })))],
  ["veri ölçümü (seçili çift)", F("bayt ve TURN", () => {
    const r = CL.pickStats([
      { id: "T", type: "transport", selectedCandidatePairId: "P" },
      { id: "P", type: "candidate-pair", state: "succeeded", nominated: true, bytesSent: 1000, bytesReceived: 3000, localCandidateId: "L", remoteCandidateId: "R" },
      { id: "L", type: "local-candidate", candidateType: "relay" },
      { id: "R", type: "remote-candidate", candidateType: "srflx" },
    ]);
    return r.sent === 1000 && r.recv === 3000 && r.relay;
  })],
  ["veri ölçümü (çift yok)", F("ses paketlerinden, TURN değil", () => {
    const r = CL.pickStats([{ id: "o", type: "outbound-rtp", bytesSent: 500 }, { id: "i", type: "inbound-rtp", bytesReceived: 700 }]);
    return r.sent === 500 && r.recv === 700 && !r.relay;
  })],
  ["MB yazısı", F("1,2 MB, 45 MB, 1,5 GB", () => CL.mbText(1.234e6) === "1,2 MB" && CL.mbText(45.2e6) === "45 MB" && CL.mbText(1.5e9) === "1,5 GB")],
  ["kota uyarısı", F("%80 ve %100 bir kez", () => CL.quotaStep(790, 810, 1000) === 80 && CL.quotaStep(810, 820, 1000) === null && CL.quotaStep(990, 1001, 1000) === 100 && CL.quotaStep(10, 20, 0) === null)],
  ["konuşma süresi", F("açılıştan bitişe", () => CL.talkMs({ answeredAt: "2026-10-08T10:00:00Z", endedAt: "2026-10-08T10:03:12Z" }) === 192e3 && CL.talkMs({ endedAt: "2026-10-08T10:00:00Z" }) === 0)],
  ["ağ durumu (bağlanamayan arama)", F("TURN yok / adres yok / sorun yok", () => CL.netNote({ turn: false, types: ["host"] }) === "TURN alınamadı" && CL.netNote({ turn: true, types: ["host", "srflx"] }) === "TURN adresi bulunamadı" && CL.netNote({ turn: true, types: ["relay"] }) === "" && CL.netNote({ turn: true, types: ["relay"], ok: false }) === "TURN vardı, yine bağlanamadı" && CL.netNote({ turn: true, types: ["relay"], ok: false, rx: 0 }) === "karşı telefonun adresleri gelmedi" && CL.netNote({ sent: 1 }) === "")],
  ["Android ses çıkışı", F("ahize ve hoparlör seçilir", () => { const l = [{ deviceId: "a", label: "Earpiece" }, { deviceId: "b", label: "Speakerphone" }]; return CL.pickSink(l, false) === "a" && CL.pickSink(l, true) === "b" && CL.pickSink([{ deviceId: "d", label: "" }], false) === null; })],
  ["sohbete satır: bağlanamadı", F("yazılmaz", () => CL.callLog("failed", 0) === null && CL.callLog("ended", 0) === null)],
]);

// Yayın bilgisi (buildInfo.js): commit başlığından açıklama ve PR, Ayarlar › Sürüm satırı, asistan cevabı
const BI = await import("@/lib/buildInfo");
const BMSG = "Ayarlar'da sürüm satırı (#247)\n\nGövde";
group("Yayın bilgisi")([
  ["sıkıştırılmış birleştirme", F("açıklama ve PR", () => { const c = BI.parseCommit("Asistan: yönlendirme tek tabloda (#246)"); return c.pr === "246" && c.text === "Asistan: yönlendirme tek tabloda"; })],
  ["Merge pull request", F("gövdenin ilk satırı", () => { const c = BI.commitOf("Merge pull request #243 from seyhunDev/claude/x\n\nAsistan: tek bilgi kanalı"); return c.pr === "243" && c.text === "Asistan: tek bilgi kanalı"; })],
  ["Sürüm satırı", F("tarih · #PR · açıklama (İstanbul saati)", () => BI.buildLine({ at: "2026-10-09T15:15:00Z", sha: "abc1234", msg: BMSG }) === "9 Ekim 18:15 · #247 · Ayarlar'da sürüm satırı")],
  ["bilgi yok", F("geliştirme sürümü", () => BI.buildLine({ at: "", msg: "" }) === "Sürüm bilgisi yok" && /bilgisi yok/.test(BI.buildSpeech({ at: "" })))],
  ["asistan cevabı", F("tarih ve değişiklik", () => BI.buildSpeech({ at: "2026-10-09T15:15:00Z", msg: BMSG }) === "Son güncelleme 9 Ekim 18:15 tarihinde yayınlandı. Değişiklik: Ayarlar'da sürüm satırı.")],
  ["soru değil", F("başka cümleler sürüm sorusu sayılmaz", () => !BI.versionAsk("yarın 10'da antrenman ekle") && !BI.versionAsk("son kaydı geri al") && BI.versionAsk("son güncelleme ne"))],
]);

// Yeni sürüm denetimi (newVersion.js): yayındaki sürüm farklıysa Güncelle düğmesi
const NV = await import("@/lib/newVersion");
group("Yeni sürüm")([
  ["farklı sürüm", F("yeni sayılır", () => NV.isNewer({ sha: "bbb" }, "aaa") && !NV.isNewer({ sha: "aaa" }, "aaa"))],
  ["bilgi yok", F("geliştirmede ya da yanıtsızda yeni sayılmaz", () => !NV.isNewer({ sha: "bbb" }, "") && !NV.isNewer(null, "aaa") && !NV.isNewer({ sha: "" }, "aaa"))],
  ["güncelleme isteği", F("başka işler sayılmaz", () => NV.updateAsk("uygulamayı güncelle") && NV.updateAsk("güncelle") && !NV.updateAsk("antrenman planını güncelle") && !NV.updateAsk("yarın 10'da antrenman ekle"))],
]);

// Fitness (lib/fitness): hareket listesi, program, takvime yazılacak günler, sonuç, takip, otomatik ilerleme, sözler
const FX = await import("@/lib/fitness/exercises");
const FM2 = await import("@/lib/fitness/model");
const FW = await import("@/lib/fitness/words");
const PROG = FM2.cleanProgram({
  title: "3 günlük", weeks: 2, start: "2026-10-12",
  days: [
    { dow: 1, time: "7:00", min: 45, name: "Üst vücut", items: [{ ex: "warmup", min: 5 }, { ex: "pushup", sets: 3, reps: 12 }, { ex: "db-row", sets: 3, reps: 10, kg: 12 }] },
    { dow: 3, time: "07:00", name: "Alt vücut", items: [{ ex: "squat", sets: 3, reps: 10, kg: 40 }, { ex: "plank", sets: 3, sec: 30 }] },
    { dow: 5, time: "07:00", name: "Tüm vücut", items: [{ name: "Koşu", min: 20 }, { ex: "uydurma-hareket", name: "" }] },
    { dow: 3, name: "Aynı gün ikinci" },
  ],
});
const FPL = (date, items, res, extra = {}) => ({ id: `${date}-${extra.id || "p"}`, date, cat: "Fitness", title: "Fitness · x", durationMin: 45, fit: { prog: "p1", name: "x", items, ...(res ? { res } : {}) }, ...extra });
const SQ = [{ ex: "squat", name: "Squat", kind: "reps", sets: 3, reps: 10, kg: 40 }];
const okSets = (n, reps, kg) => Array.from({ length: n }, () => ({ reps, kg, ok: true }));
group("Fitness")([
  ["hareket listesi", F("kimlikler tekrarsız, her grup dolu", () => new Set(FX.EXERCISES.map((e) => e.id)).size === FX.EXERCISES.length && FX.GROUPS.every((g) => FX.EXERCISES.some((e) => e.group === g)))],
  ["söylenen hareket", F("şınav, sınav (ses), squat, plank, mekik, dambıl lunge", () => FX.findExercise("şınav")?.id === "pushup" && FX.findExercise("sınavlar")?.id === "pushup" && FX.findExercise("Squat")?.id === "squat" && FX.findExercise("plank")?.id === "plank" && FX.findExercise("mekik")?.id === "crunch" && FX.findExercise("dambıl lunge")?.id === "db-lunge" && FX.findExercise("asdf") === null)],
  ["program temizliği", F("aynı gün bir kez, saat 07:00, koşu dakika, adsız hareket atılır", () => PROG.days.length === 3 && PROG.days[0].time === "07:00" && PROG.days[2].items.length === 1 && PROG.days[2].items[0].kind === "cardio" && PROG.days[2].items[0].min === 20 && PROG.days[1].items[1].sec === 30)],
  ["takvim günleri", F("2 hafta × 3 gün = 6 antrenman, ilki Pzt 12 Ekim", () => { const s = FM2.sessionsOf(PROG); return s.length === 6 && s[0].date === "2026-10-12" && s[1].date === "2026-10-14" && s[5].date === "2026-10-23" && s[5].w === 2; })],
  ["planlar", F("bugünden sonrası; başlık, saat, süre, hareketler", () => { const d = FM2.planDrafts({ ...PROG, id: "p1" }, "2026-10-15"); return d.length === 4 && d[0].date === "2026-10-16" && d[0].title === "Fitness · Tüm vücut" && d[0].time === "07:00" && d[0].fit.prog === "p1" && d[0].fit.items.length === 1; })],
  ["program satırı", F("Pzt 07:00, Çar 07:00, Cum 07:00 · 2 hafta", () => FM2.programLine(PROG) === "Pzt 07:00, Çar 07:00, Cum 07:00 · 2 hafta")],
  ["hareket satırı", F("3 × 10 · 40 kg, 3 × 30 sn, 20 dk", () => FM2.itemLine(PROG.days[1].items[0]) === "3 × 10 · 40 kg" && FM2.itemLine(PROG.days[1].items[1]) === "3 × 30 sn" && FM2.itemLine(PROG.days[2].items[0]) === "20 dk")],
  ["durum", F("yapıldı, atlandı, kaçırıldı, bugün, sırada", () => { const t = "2026-10-14"; return FM2.statusOf(FPL("2026-10-12", SQ, { st: "done" }), t) === "done" && FM2.statusOf(FPL("2026-10-12", SQ, { st: "skip" }), t) === "skip" && FM2.statusOf(FPL("2026-10-12", SQ), t) === "missed" && FM2.statusOf(FPL(t, SQ), t) === "today" && FM2.statusOf(FPL("2026-10-16", SQ), t) === "next"; })],
  ["yelken antrenmanı değil", F("fitness planı antrenman günlüğüne girmez", async () => { const TL = await import("@/lib/trainingLog"); return !TL.isTraining(FPL("2026-10-12", SQ, null, { title: "Fitness · antrenman" })) && TL.isTraining({ cat: "Antrenman", title: "Optimist" }); })],
  ["hafta özeti", F("3 plandan 1 yapıldı, 1 kaçırıldı, 1 kaldı, 45 dk, seri 1", () => {
    const pl = [FPL("2026-10-12", SQ, { st: "done", min: 45, ex: [{ sets: okSets(3, 10, 40) }] }), FPL("2026-10-14", SQ, null, { id: "b" }), FPL("2026-10-16", SQ, null, { id: "c" }), FPL("2026-10-02", SQ, null, { id: "d", status: "cancelled" })];
    const w = FM2.weekStats(pl, "2026-10-15");
    return w.planned === 3 && w.done === 1 && w.missed === 1 && w.left === 1 && w.minutes === 45 && w.streak === 1;
  })],
  ["seri", F("üç hafta aralıksız yapıldı → 3", () => FM2.weekStats([FPL("2026-09-29", SQ, { st: "done" }, { id: "a" }), FPL("2026-10-06", SQ, { st: "done" }, { id: "b" }), FPL("2026-10-12", SQ, { st: "done" }, { id: "c" })], "2026-10-15").streak === 3)],
  ["ay özeti", F("2 yapıldı, 1 kaçırıldı, %67, hacim 2400 kg", () => {
    const pl = [FPL("2026-10-05", SQ, { st: "done", ex: [{ sets: okSets(3, 10, 40) }] }, { id: "a" }), FPL("2026-10-07", SQ, { st: "done", ex: [{ sets: okSets(2, 10, 60) }] }, { id: "b" }), FPL("2026-10-09", SQ, null, { id: "c" })];
    const m = FM2.monthStats(pl, "2026-10", "2026-10-15");
    return m.done === 2 && m.missed === 1 && m.rate === 67 && m.volume === 2400;
  })],
  ["otomatik ilerleme", F("bütün setler tamam → +2,5 kg; eksik → aynı kilo", () => {
    const full = [FPL("2026-10-05", SQ, { st: "done", ex: [{ sets: okSets(3, 10, 40) }] })];
    const part = [FPL("2026-10-05", SQ, { st: "done", ex: [{ sets: [...okSets(2, 10, 40), { reps: 7, kg: 40, ok: true }] }] })];
    const a = FM2.targetFor(SQ[0], full, "2026-10-07");
    const b = FM2.targetFor(SQ[0], part, "2026-10-07");
    return a.kg === 42.5 && a.up && b.kg === 40 && !b.up && FM2.targetFor(SQ[0], [], "2026-10-07").kg === 40;
  })],
  ["kilosuz ilerleme", F("şınav 3 × 12 tamam → 13 tekrar; plank → +5 sn", () => {
    const PU = { ex: "pushup", name: "Şınav", kind: "reps", sets: 3, reps: 12 };
    const PL = { ex: "plank", name: "Plank", kind: "time", sets: 3, sec: 30 };
    const pl = [FPL("2026-10-05", [PU, PL], { st: "done", ex: [{ sets: okSets(3, 12) }, { sets: Array.from({ length: 3 }, () => ({ sec: 30, ok: true })) }] })];
    return FM2.targetFor(PU, pl, "2026-10-07").reps === 13 && FM2.targetFor(PL, pl, "2026-10-07").sec === 35;
  })],
  ["rekorlar", F("squat en iyi 60 kg × 10, 2 kez", () => {
    const pl = [FPL("2026-10-05", SQ, { st: "done", ex: [{ sets: okSets(3, 10, 40) }] }, { id: "a" }), FPL("2026-10-07", SQ, { st: "done", ex: [{ sets: okSets(3, 10, 60) }] }, { id: "b" })];
    const r = FM2.records(pl)[0];
    return r.key === "squat" && r.best.kg === 60 && r.first.kg === 40 && r.times === 2 && FM2.bestText(r) === "60 kg × 10";
  })],
  ["söylenen sonuç", F("squat 3 × 10 · 60 kg yazılır, programda olmayan koşu eklenir", () => {
    const fit = FM2.applyLog({ items: SQ }, { items: [{ ex: "squat", sets: [{ reps: 10, kg: 60 }, { reps: 10, kg: 60 }, { reps: 10, kg: 60 }] }, { name: "koşu", sets: [{ min: 20 }] }] });
    return fit.res.st === "done" && fit.items.length === 2 && fit.items[1].ex === "run" && FM2.resLine(fit) === "Squat 3 × 10 · 60 kg, Koşu 20 dk";
  })],
  ["atlandı", F("yapamadım → atlandı", () => FM2.applyLog({ items: SQ }, { st: "skip" }).res.st === "skip")],
  ["profil", F("bilinmeyen hedef atılır, kilo 82,5", () => { const p = FM2.cleanProfile({ goal: "uçmak", level: "orta", weight: "82,5", place: "ev", equip: ["dumbbell"] }); return p.goal === "" && p.level === "orta" && p.weight === 82.5 && !FM2.profileReady(p); })],
  ["fitness cümlesi", F("fitness, squat + set; yelken antrenmanı ve takvim planı değil", () =>
    FW.wantsFitness("haftada 3 gün fitness programı hazırla") && FW.wantsFitness("squat 3 set 10 tekrar 60 kilo yaptım") && FW.wantsFitness("şınav 3 set 15 tekrar") &&
    !FW.wantsFitness("dün 14 knot poyrazda start çalıştık") && !FW.wantsFitness("yarın 10'da antrenman ekle") && !FW.wantsFitness("fitness sayfasını aç"))],
  ["fitness sayfasında", F("başka iş olmayan her cümle; mesaj değil", () => FW.wantsFitness("çarşambayı bacak günü yap", true) && !FW.wantsFitness("Ali'ye mesaj at yarın gelsin", true))],
  ["yerel komutlar", F("planlara ekle, kaldır, yaptım, atladım, kaç antrenman; ayrıntı yapay zekaya", () =>
    FW.fitLocal("programı planlara ekle")?.op === "plans" && FW.fitLocal("fitness programını takvimden kaldır")?.op === "unplan" && FW.fitLocal("bugünkü antrenmanı yaptım")?.op === "done" &&
    FW.fitLocal("bugün antrenmanı atladım")?.op === "skip" && FW.fitLocal("bu hafta kaç antrenman yaptım")?.op === "stats" && FW.fitLocal("squat 3 set yaptım") === null && FW.fitLocal("çarşambayı bacak günü yap") === null)],
  ["ana sayfa düğmesi", F("ana hesapta Fitness var, çalışanda yok", async () => {
    const HT = await import("@/lib/homeTiles");
    const has = (o) => HT.homeActions(o).some((g) => g.items.some((a) => a.href === "/fitness"));
    return has({ owner: true }) && !has({ staff: true });
  })],
]);
