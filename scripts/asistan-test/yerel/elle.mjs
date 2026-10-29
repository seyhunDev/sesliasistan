// Elle işlemler ve hesaplar: ek bildirimler, yoklama raporu, etkinlik bütçesi (sayfalardaki düğmelerin arkasındaki mantık).
import { suite } from "./ortak.mjs";

const { group } = suite("elle");
const F = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
// Ek bildirimler (notifyExtra.js): doğum günü, rüzgâr, haftalık özet
const NX = await import("@/lib/notifyExtra");
const W = await import("@/lib/waTemplates");
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

// Sorumluya bildirim gitmedi (people.js ackState/pushWhy): neden plan ekranında görünür
const PP = await import("@/lib/people");
const CF = await import("@/lib/chatFile");
group("Sorumlu bildirimi gitmedi")([
  ["kayıt yok", F("Bildirim gitmedi + Ayarlar › Bildirimler", () => { const s = PP.ackState({ ack: { u: { x: { why: "device", at: "t" } } } }, "u"); return s.key === "fail" && /Bildirimler/.test(s.why); })],
  ["hesapsız kişi", F("hesap aç önerisi", () => /hesap/.test(PP.pushWhy({ why: "account" })))],
  ["ortak telefon", F("kendi hesabıyla açsın", () => /kendi hesabıyla/.test(PP.pushWhy({ why: "same" })))],
  ["yeniden gönderildi", F("x silinince Gönderildi", () => PP.ackState({ ack: { u: { s: "t" } } }, "u").key === "sent")],
  ["özet en geride olan", F("biri gitmediyse özet 'gitmedi'", () => PP.ackSummary({ assignees: ["a", "b"], ack: { a: { r: "t" }, b: { x: { why: "device" } } } }).key === "fail")],
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
  ["iPhone (APNs)", F("ses, etiket yerine geçer, rozet", () => { const m = FM.fcmMessage("t", { title: "a", tag: "t1", badge: 3 }); const e = FM.fcmMessage("t", "{}").apns; return m.apns.payload.aps.sound === "default" && m.apns.headers["apns-collapse-id"] === "t1" && m.apns.payload.aps.badge === 3 && !e.headers && !e.payload.aps.badge; })],
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
  ["10 kuruşluk fark", { desc: "10 kuruş uyarı vermez, 11 kuruş verir", fn: () => [RC.mismatch({ declared: 2510, items: [{ q: 1, u: 2500, r: 20 }] }), RC.mismatch({ declared: 2511, items: [{ q: 1, u: 2500, r: 20 }] })].join(), ok: (r) => r === "false,true" }],
  ["kontrol nedeni", { desc: "sayaç/liste aynı kaynak: nedeni kalmayan eski review sayılmaz, Garanti yabancı para sayılır, ok sayılmaz", fn: () => [
    RC.needsCheck({ status: "review", declared: 2505, items: [{ q: 1, u: 2500, r: 20 }] }),
    RC.needsCheck({ status: "review", declared: 3000, items: [{ q: 1, u: 2500, r: 20 }] }),
    RC.needsCheck({ status: "review", src: "garanti", items: [{ q: 1, u: 2500, r: 20 }] }),
    RC.needsCheck({ status: "ok", declared: 3000, items: [{ q: 1, u: 2500, r: 20 }] }),
    /Kalemler .*fişte/.test(RC.checkWhy({ status: "review", declared: 3000, items: [{ q: 1, u: 2500, r: 20 }] })),
  ].join(), ok: (r) => r === "false,true,true,false,true" }],
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
  ["geç ama başlamadan", { desc: "09:30'da yine gider (zamanlayıcı tur kaçırdıysa)", fn: () => due(RP, 60, "2026-10-05T06:30:00Z"), ok: (r) => r === 1 }],
  ["plan başladı", { desc: "10:05'te gitmez", fn: () => due(RP, 60, "2026-10-05T07:05:00Z"), ok: (r) => r === 0 }],
  ["15 dk önce pencere", { desc: "09:46'da gider, 10:00'da gitmez", fn: () => [due(RP, 15, "2026-10-05T06:46:00Z"), due(RP, 15, "2026-10-05T07:00:00Z")].join(), ok: (r) => r === "1,0" }],
  ["geç metin", { desc: "09:30'da gidince '30 dk sonra' yazar", fn: () => RM.reminderText(RP, 60, { now: new Date("2026-10-05T06:30:00Z") }).title, ok: (r) => /30 dk sonra/.test(r) }],
  ["zamanında metin", { desc: "09:02'de '1 saat sonra'", fn: () => RM.reminderText(RP, 60, { now: new Date("2026-10-05T06:02:00Z") }).title, ok: (r) => /1 saat sonra/.test(r) }],
  ["zaten gönderildi", { desc: "aynı kişiye ikinci kez gitmez", fn: () => due({ ...RP, reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T06:05:00Z", "u1"), ok: (r) => r === 0 }],
  ["başka kişi", { desc: "ikinci kişiye gider", fn: () => due({ ...RP, reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T06:05:00Z", "u2"), ok: (r) => r === 1 }],
  ["tüm gün, 1 gün önce", { desc: "önceki sabah 08:00", fn: () => due({ ...RP, time: "" }, 1440, "2026-10-04T05:05:00Z"), ok: (r) => r === 1 }],
  ["saat değişince", { desc: "plan saati değişirse yeniden gider", fn: () => due({ ...RP, time: "11:00", reminded: { u1: RM.remindKey(RP, 60) } }, 60, "2026-10-05T07:05:00Z", "u1"), ok: (r) => r === 1 }],
]);

// Plana özel "Hatırlat" (plan formu): kişinin ayarından bağımsız, sorumlulara ve ana hesaba
const AP = await import("@/lib/repeat");
const AL = await import("@/lib/assistantLocal");
group("Plana özel hatırlatma")([
  ["30 dk seçeneği", { desc: "Yok · 15 dk · 30 dk · 1 saat · 1 gün", fn: () => RM.REMIND_OPTS.map((o) => o.label).join(), ok: (r) => r === "Yok,15 dk,30 dk,1 saat,1 gün" }],
  ["planın ayarı", { desc: "yok: null, 0: kapalı, 30: 30", fn: () => [RM.planRemind(RP), RM.planRemind({ ...RP, remind: 0 }), RM.planRemind({ ...RP, remind: 30 })].join(), ok: (r) => r === ",0,30" }],
  ["kime gider", { desc: "sorumlular + ana hesap, tekrarsız", fn: () => RM.planRecipients({ ...RP, people: ["own", "ali"] }, "own").join(), ok: (r) => r === "own,ali" }],
  ["fitness planı", { desc: "yalnız sporcusuna", fn: () => RM.planRecipients({ ...RP, people: ["own"], fit: { for: "s1" } }, "own").join(), ok: (r) => r === "s1" }],
  ["30 dk önce zamanı", { desc: "09:31'de gider, 09:05'te gitmez", fn: () => [due(RP, 30, "2026-10-05T06:31:00Z", "ali"), due(RP, 30, "2026-10-05T06:05:00Z", "ali")].join(), ok: (r) => r === "1,0" }],
  ["cümleden", { desc: "yarım saat / 1 saat kala / bir gün önceden / hatırlatma olmasın", fn: () => ["yarın 10'da antrenman, Ali'ye ver, yarım saat önce hatırlat", "toplantıyı 1 saat kala hatırlat", "bir gün önceden hatırlat", "hatırlatma olmasın", "tekneleri hazırlamayı hatırlat"].map(RM.remindOf).join(), ok: (r) => r === "30,60,1440,0," }],
  ["taslağa yazılır", { desc: "plan taslağı remind 30 alır, görev almaz", fn: () => AP.applyRepeat([{ type: "plan", title: "A", date: "2026-10-05", time: "10:00" }, { type: "task", title: "B" }], "yarın 10'da antrenman yarım saat önce hatırlat", "2026-10-04").map((x) => x.remind ?? "-").join(), ok: (r) => r === "30,-" }],
  ["simge sayısı", { desc: "hatırlatma okunmamış atama bildiriminin yerine geçmez, sayı artar", fn: async () => { const NB = await import("@/lib/inbox"); let l = NB.inboxAdd([], { title: "Yeni plan: A", tag: "plan-p1" }, "2026-10-05T05:00:00.000Z"); const n0 = NB.inboxBadge(l, ""); l = NB.inboxAdd(l, RM.reminderText({ ...RP, id: "p1" }, 60, { now: new Date("2026-10-05T06:02:00Z") }), "2026-10-05T06:02:00.000Z"); return `${n0},${NB.inboxBadge(l, "")}`; }, ok: (r) => r === "1,2" }],
  ["var olan plan", { desc: "değişiklik remind'i yazar ve söyler", fn: () => [AL.buildPatch("plan", { remind: 30 }).remind, AL.describeAction({ op: "update", kind: "plan", patch: { remind: 30 } }, { title: "Antrenman" })].join("|"), ok: (r) => r === "30|Güncelle: Antrenman → 30 dk önce hatırlat" }],
]);

// Plan alarmı (iPhone uygulamasında saat alarmı; lib/planAlarm.js)
const PAL = await import("@/lib/planAlarm");
const AP0 = { id: "p1", title: "Antrenman", date: "2026-10-05", time: "10:00", people: ["ali"], alarm: 60 };
group("Plan alarmı")([
  ["cümleden", { desc: "1 saat öncesine / yarım saat önceye / saatinde / kaldır / yalnız hatırlat", fn: () => ["antrenmanın bir saat öncesine alarm kur", "alarmı yarım saat önceye kur", "toplantıya alarm kur", "alarmı kaldır", "1 saat önce hatırlat"].map(PAL.alarmOf).join(), ok: (r) => r === "60,30,0,-1," }],
  ["taslağa yazılır", { desc: "yeni plan alarm 60 alır, hatırlatma ayrı", fn: () => AP.applyRepeat([{ type: "plan", title: "A", date: "2026-10-05", time: "10:00" }], "yarın 10'da antrenman 1 saat önce alarm kur, yarım saat önce hatırlat", "2026-10-04").map((x) => `${x.alarm}/${x.remind}`).join(), ok: (r) => r === "60/30" }],
  ["alarm anı", { desc: "10:00 planda 1 saat önce 09:00; tüm gün 08:00", fn: () => [new Date(PAL.alarmAt(AP0)).getHours(), new Date(PAL.alarmAt({ ...AP0, time: "", alarm: 0 })).getHours()].join(), ok: (r) => r === "9,8" }],
  ["kime kurulur", { desc: "sorumluya ve ana hesaba; başkasına yok; geçmiş ve bitmiş yok", fn: () => { const o = { ownerId: "own", now: new Date("2026-10-04T12:00:00").getTime() }; return [PAL.alarmItems([AP0], { ...o, uid: "ali" }).length, PAL.alarmItems([AP0], { ...o, uid: "own" }).length, PAL.alarmItems([AP0], { ...o, uid: "veli" }).length, PAL.alarmItems([{ ...AP0, done: true }], { ...o, uid: "ali" }).length, PAL.alarmItems([{ ...AP0, date: "2026-10-01" }], { ...o, uid: "ali" }).length].join(); }, ok: (r) => r === "1,1,0,0,0" }],
  ["anahtar", { desc: "saat ya da başlık değişince yeni alarm", fn: () => { const o = { ownerId: "own", uid: "ali", now: new Date("2026-10-04T12:00:00").getTime() }; const k = (p) => PAL.alarmItems([p], o)[0].key; return k(AP0) !== k({ ...AP0, time: "11:00" }) && k(AP0) !== k({ ...AP0, title: "B" }) && k(AP0) === k({ ...AP0 }); }, ok: (r) => r === true }],
  ["var olan plan", { desc: "değişiklik alarmı yazar, -1 kaldırır, söyler", fn: () => [AL.buildPatch("plan", { alarm: 60 }).alarm, AL.buildPatch("plan", { alarm: -1 }).alarm, AL.describeAction({ op: "update", kind: "plan", patch: { alarm: 60 } }, { title: "Antrenman" })].join("|"), ok: (r) => r === "60||Güncelle: Antrenman → 1 saat önce alarm" }],
  ["plan formu", { desc: "Yok · Saatinde · 15 dk · 30 dk · 1 saat · 1 gün", fn: () => PAL.ALARM_OPTS.map((o) => o.label).join(), ok: (r) => r === "Yok,Saatinde,15 dk,30 dk,1 saat,1 gün" }],
]);

// iPhone uygulaması: ana ekran widget'ının planları ve titreşim türleri
const WD = await import("@/lib/widgetData");
const HP = await import("@/lib/haptic");
group("iPhone widget ve titreşim")([
  ["widget planları", { desc: "bugünden sonraki, benim, bitmemiş; saat sırasıyla", fn: () => WD.widgetPlans([
    { title: "B", date: "2026-10-06", time: "09:00", people: ["ali"] },
    { title: "A", date: "2026-10-05", time: "18:00", people: ["ali"], important: true },
    { title: "Eski", date: "2026-10-01", time: "10:00", people: ["ali"] },
    { title: "Başkası", date: "2026-10-05", time: "10:00", people: ["veli"] },
    { title: "Bitti", date: "2026-10-05", time: "11:00", people: ["ali"], done: true },
    { title: "Kamp", date: "2026-10-03", endDate: "2026-10-07", people: ["ali"] },
  ], { uid: "ali", ownerId: "own", today: "2026-10-05" }).map((p) => `${p.title}@${p.date} ${p.time}${p.important ? "!" : ""}`).join(), ok: (r) => r === "Kamp@2026-10-05 ,A@2026-10-05 18:00!,B@2026-10-06 09:00" }],
  ["widget antrenmanı", { desc: "bugünkü ve sıradaki antrenmanlar (sporcuya atanmış da), en çok 3; geçmiş, iptal ve bitmiş yok", fn: () => WD.widgetTrainings([
    { id: "a", title: "Optimist antrenmanı", date: "2026-10-06", time: "10:00", people: ["veli"] },
    { id: "b", title: "Antrenman", date: "2026-10-05", time: "16:00", people: ["ali"], place: "Dikili" },
    { id: "c", title: "Antrenman", date: "2026-10-04", time: "16:00", people: ["ali"] },
    { id: "d", title: "Antrenman", date: "2026-10-05", time: "09:00", people: ["ali"], status: "cancelled" },
    { id: "e", title: "Toplantı", date: "2026-10-05", time: "08:00", people: ["ali"] },
    { id: "f", title: "Antrenman", date: "2026-10-05", time: "08:00", done: true },
    { id: "g", title: "Antrenman", date: "2026-10-07" },
    { id: "h", title: "Antrenman", date: "2026-10-08" },
  ], { today: "2026-10-05" }), ok: (r) => r.map((x) => x.id).join() === "b,a,g" && r[0].time === "16:00" && r[0].place === "Dikili" }],
  ["widget yarış yeri", { desc: "Foça'daki yarış: yer adı ilçe, Dikili'ye 10 km'den yakınsa ya da konumsuzsa yok", fn: () => {
    const r = { id: "r", name: "Ege Kupası", startDate: "2026-10-26", endDate: "2026-10-28" };
    const home = { lat: 39.0717, lon: 26.8886 };
    return [WD.widgetRace(r, { place: "Foça, İzmir", lat: 38.67, lon: 26.75 }, home), WD.widgetRace(r, { place: "Dikili", lat: 39.075, lon: 26.89 }, home), WD.widgetRace(r, null, home), WD.widgetRace(null, { lat: 1, lon: 1 }, home)];
  }, ok: ([a, b, c, d]) => a?.place === "Foça" && a.name === "Ege Kupası" && a.end === "2026-10-28" && a.lat === 38.67 && b === null && c === null && d === null }],
  ["widget aidat", { desc: "yalnız bu ayın özeti", fn: () => [WD.widgetDues({ ym: "2026-10", paidCount: 9, count: 14 }, "2026-10"), WD.widgetDues({ ym: "2026-09", paidCount: 9, count: 14 }, "2026-10")], ok: ([a, b]) => a.paid === 9 && a.count === 14 && b === null }],
  ["titreşim türü", { desc: "8 hafif, 14 orta, 30 güçlü, [10,40,10] başarı, uzun dizi hata", fn: () => [8, 14, 30, [10, 40, 10], [30, 50, 30, 50, 30], 0].map(HP.kindOf).join(), ok: (r) => r === "light,medium,heavy,success,error," }],
]);

// Apple Watch tek sayacı yönetir (watchTimer.js): saatten gelen iş telefondaki sayaç kaydına uygulanır
const WT = await import("@/lib/watchTimer");
const N0 = 1_000_000;
group("Saatten sayaç")([
  ["saatten başlat", F("5 dk start dizisi, bugünkü antrenmanın sayfası", () => { const r = WT.watchTimerAct({ dur: 120, end: null, left: null, zero: 5 }, "start", { sn: 300, own: "/training/day?id=a", where: "Antrenman", now: N0 }); return r.end === N0 + 300000 && r.dur === 300 && r.mode === "start" && r.own === "/training/day?id=a" && r.zero === 5; })],
  ["durdur ve devam", F("kalan saniye saklanır, devamda yeniden akar", () => { const p = WT.watchTimerAct({ dur: 300, end: N0 + 252000, left: null }, "pause", { now: N0 }); const r = WT.watchTimerAct(p, "resume", { now: N0 + 5000 }); return p.end === null && p.left === 252 && r.end === N0 + 257000 && r.left === null; })],
  ["±1 dk", F("süre kayar, 1 dakikadan azken −1 yapılmaz", () => WT.watchTimerAct({ dur: 300, end: N0 + 252000 }, "add", { sn: 60, now: N0 }).end === N0 + 312000 && WT.watchTimerAct({ dur: 300, end: N0 + 30000 }, "add", { sn: -60, now: N0 }) === null)],
  ["bitir", F("start anı yarış için kalır", () => { const r = WT.watchTimerAct({ dur: 300, end: N0 - 4000, mode: "start" }, "finish", { now: N0 }); return r.end === null && r.left === null && r.zero === N0 - 4000; })],
  ["yarışa bağlı sayaç", F("saatte yalnız görünür, değiştirilmez", () => WT.watchTimerAct({ dur: 300, end: N0 + 9000, rid: "s1" }, "pause", { now: N0 }) === null && WT.watchTimerView({ dur: 300, end: N0 + 9000, rid: "s1", mode: "start" }, { now: N0 }).lock)],
  ["saatin gördüğü", F("çalışan start dizisi 5 4 1 0, adı", () => { const v = WT.watchTimerView({ dur: 300, end: N0 + 252000, mode: "start", where: "Antrenman" }, { now: N0 }); return v.state === "run" && v.steps.join() === "5,4,1,0" && v.title === "Antrenman"; })],
  ["bugünkü antrenman", F("Başlat'ın üstünde ad ve saat", () => { const r = WT.watchTraining([{ id: "b", title: "Antrenman", date: "2026-10-06", time: "10:00" }, { id: "a", title: "Optimist", date: "2026-10-05", time: "16:00" }], "2026-10-05"); return r.label === "Optimist · bugün 16:00" && r.own === "/training/day?id=a" && WT.watchTraining([], "2026-10-05").own === "/training"; })],
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
  ["veli bildirimi", F("Ali bugünkü antrenmana gelmedi", () => AB.absentPush("Ali Kaya", "2026-10-05", "2026-10-05").title === "Ali bugünkü antrenmana gelmedi")],
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
  ["şablon kaydı", F("bilinmeyen şablon Afiş, dilek 60 karakter", () => PM.cleanPost({ style: "x" }).style === "afis" && PM.cleanPost({ style: "bant" }).style === "afis" && PM.cleanPost({ wish: "a".repeat(90) }).wish.length === 60 && PM.cleanPost({ meta: false }).meta === false)],
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
  ["yazılar aç/kapa ve standart", F("etiket varsayılan kapalı, yazılar gizlenebilir, renk ve dilek boyu standart; bozuk değer atılır", () => {
    const a = PM.cleanPost({});
    const b = PM.cleanPost({ hide: ["sub", "wish", "x"], ink: { head: "yellow", sub: "pembe" }, wishSize: 400 });
    return JSON.stringify(a.hide) === '["tag"]' && JSON.stringify(a.ink) === "{}" && a.wishSize === 100 &&
      JSON.stringify(b.hide) === '["sub","wish"]' && JSON.stringify(b.ink) === '{"head":"yellow"}' && b.wishSize === 150 &&
      PM.cleanPost({ hide: [] }).hide.length === 0 && PM.inkOf("yellow") === "#f6c445" && PM.inkOf("") === "";
  })],
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
  ["tek tasarım", F("her gönderi Afiş (eski Kart/Modern de Afiş olur), seçimde 5 tür", () => PMs.freshPost("duyuru").style === "afis" && PMs.cleanPost({ style: "kart" }).style === "afis" && PMs.cleanPost({ style: "modern" }).style === "afis" && PMs.PICK_KINDS.join() === "duyuru,antrenman,sonuc,kulup,ozel")],
  ["karartma", F("varsayılan 55, 0-100 arası", () => PMs.cleanPost({}).shade === 55 && PMs.cleanPost({ shade: 140 }).shade === 100 && PMs.cleanPost({ shade: -5 }).shade === 0 && PMs.cleanPost({ shade: 20 }).shade === 20)],
  ["üç boyut", F("gönderi + hikâye + reels; gönderi seçili Kare/Dikey, yoksa Kare", () => PMs.setOf("square").join() === "square,story,reels" && PMs.setOf("portrait").join() === "portrait,story,reels" && PMs.setOf("reels").join() === "square,story,reels")],
  ["afiş renkleri", F("her rengin kendi etiket rengi var, türler farklı etiket rengiyle açılır", () => { const tags = PMs.THEMES.map(([k]) => PIs.afisTag(k)); const kinds = ["duyuru", "sonuc", "antrenman", "genel", "kayit", "kulup"].map((k) => PIs.afisTag(PMs.kindTheme(k))); return new Set(tags).size === tags.length && new Set(kinds).size === kinds.length && PIs.afisTag("x") === PIs.afisTag("deniz"); })],
  ["profil ızgarası", F("karede yazı ortadaki 3:4'te (sağ/sol 66 px ek kenar), yeni gönderi Kare (1080×1080)", () => { const s = PMs.safeOf("square"); return s.l === 66 && s.r === 66 && PMs.safeOf("portrait").l === 0 && PMs.freshPost().format === "square" && PMs.cleanPost({ format: "square" }).format === "square"; })],
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
  ["başka aya yazılan hareket", F("used ile bekleyenlere düşmez", () => {
    const a = mvt("FAST AYSE SAHIN", 1500, "03.10.2026 09:00");
    return DU.pendingOf([a], { "2026-10": { used: [DU.movKey(a)] } }, DA, DCFG, ["2026-10"]).length === 0;
  })],
  ["dağıtma: en eski borçlu ay", F("3000 → Ağu + Eyl, Ekim boş kalır", () => {
    const yms = ["2026-08", "2026-09", "2026-10"];
    const r = DU.allocate(3000, DA[0], DCFG, { "2026-10": {} }, yms);
    return r.map((x) => `${x.ym}:${x.amt}`).join() === "2026-08:1500,2026-09:1500";
  })],
  ["dağıtma: kısmi ve artan", F("eksik ay tamamlanır, artan son aya", () => {
    const yms = ["2026-09", "2026-10"];
    const m = { "2026-09": { paid: { a1: [{ amt: 1000 }] } } };
    const r = DU.allocate(500, DA[0], DCFG, m, yms);
    const r2 = DU.allocate(4000, DA[0], DCFG, m, yms);
    return r.length === 1 && r[0].ym === "2026-09" && r[0].amt === 500 && r2.at(-1).ym === "2026-10" && r2.at(-1).amt === 3500;
  })],
  ["dağıtma: seçilen aylar, borç yok", F("seçilen aylara aidat kadar; borç yoksa son aya", () => {
    const r = DU.allocate(3000, DA[0], DCFG, {}, ["2026-09", "2026-10"], ["2026-10", "2026-09"]);
    const all = { "2026-09": { paid: { a1: [{ amt: 1500 }] } }, "2026-10": { paid: { a1: [{ amt: 1500 }] } } };
    const n = DU.allocate(700, DA[0], DCFG, all, ["2026-09", "2026-10"]);
    const z = DU.allocate(700, DA[0], {}, {}, ["2026-09", "2026-10"]);
    return r.map((x) => `${x.ym}:${x.amt}`).join() === "2026-09:1500,2026-10:1500" && n[0].ym === "2026-10" && n[0].amt === 700 && z[0].ym === "2026-10";
  })],
  ["ödeme geçmişi", F("bir ödemenin parçaları tek satır, silince ikisi de gider", () => {
    const m = { "2026-09": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-05", grp: "g1", at: "x1" }] } }, "2026-10": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-05", grp: "g1", at: "x2" }, { amt: 200, via: "eft", mov: "m9", date: "2026-10-07" }] }, used: ["m9"] } };
    const h = DU.historyOf(DA[0], m, ["2026-09", "2026-10"]);
    const d = DU.dropGroup(DA[0], m, h.find((g) => g.key === "g1"));
    const d2 = DU.dropGroup(DA[0], m, h.find((g) => g.key === "m9"));
    return h.length === 2 && h[0].key === "m9" && h[1].amt === 3000 && h[1].months.join() === "2026-09,2026-10" && !d["2026-09"].paid.a1 && d["2026-10"].paid.a1.length === 1 && d2["2026-10"].used.length === 0;
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
  ["kulüpte notlar", F("Kulüp kartında en çok 3 not, sabitli önce; yapılan (arşivdeki) not yok", () => {
    const ns = [
      { id: "a", title: "A", createdAt: "2026-10-01T10:00" },
      { id: "b", title: "B", createdAt: "2026-10-05T10:00" },
      { id: "c", title: "C", createdAt: "2026-09-01T10:00", pinned: true },
      { id: "d", title: "D", createdAt: "2026-10-06T10:00", done: true, archived: true },
      { id: "e", title: "E", createdAt: "2026-10-04T10:00" },
    ];
    const r = HT.homeNotes(ns, 3);
    return r.total === 4 && r.list.map((n) => n.id).join() === "c,b,e";
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
  ["kulüp kartları", F("yalnız bilgisi olan görünür: herkes ödeyince aidat, fatura ve fiş yokken Fiş / Fatura gizli", () => {
    const ym = "2026-10";
    const a = HT.clubDues({ ym, paidCount: 12, count: 30, pending: 3 }, ym);
    const b = HT.clubDues({ ym, paidCount: 30, count: 30, pending: 0 }, ym);
    const c = HT.clubDues({ ym: "2026-09", paidCount: 5, count: 30 }, ym);
    const f = HT.clubFis({ big: "3.420 TL", sub: "2 ödenmedi · son gün yarın", warn: false }, { big: "900 ₺", sub: "Ekim harcaması" });
    const g = HT.clubFis({ big: "500 TL", sub: "1 ödenmedi · 1 gecikti" }, false);
    return a.big === "12/30" && a.sub === "3 onay bekliyor" && a.warn && b === null && c === null
      && f.big === "2 fatura" && f.sub === "3.420 TL ödenecek" && f.warn && g.sub === "1 gecikti · 500 TL"
      && HT.clubFis(null, { big: "900 ₺" }).big === "900 ₺" && HT.clubFis(null, false) === null && HT.clubPosts(null) === null;
  })],
  ["kulüp kartları", F("sıradaki yarış: tam ad, kısa tarih, sporcu, kalan gün; yarış yoksa kart yok", () => {
    const r = HT.clubRace({ name: "Foça", when: "5 gün", left: 2, title: "Foça Kupası", dates: "17-19 Ekim", count: 6, days: 5 });
    const t = HT.clubRace({ name: "Çeşme", when: "yarın", left: 0 });
    return r.title === "Foça Kupası" && r.sub === "17-19 Ekim · 6 sporcu" && r.days === 5 && r.left === 2
      && t.title === "Çeşme yarışı" && t.days === null && t.when === "Yarın" && HT.clubRace(null) === null;
  })],
  ["kulüp kartları", F("yarış kartı: tarih kutusu, yer ve hazırlık sayısı", () => {
    const r = HT.clubRace({ name: "Foça", when: "5 gün", left: 2, total: 6, title: "Foça Kupası", dates: "17-19 Ekim", place: "Foça", count: 6, start: "2026-10-17" });
    const o = HT.clubRace({ name: "Çeşme", when: "yarın", left: 3 });
    return r.day === "17" && r.mon === "EKİ" && r.done === 4 && r.total === 6 && r.sub === "17-19 Ekim · Foça · 6 sporcu"
      && o.day === "" && o.total === 3 && o.done === 0;
  })],
  ["kulüp kartları", F("antrenman gününe dokun: bugün ve geçmiş yoklamayı açar, gelecek açmaz", () => {
    const t = "2026-10-14";
    return HT.attHref("2026-10-14", t) === "/athletes/attendance?gun=2026-10-14" && HT.attHref("2026-10-12", t) === "/athletes/attendance?gun=2026-10-12"
      && HT.attHref("2026-10-15", t) === null && HT.attHref("", t) === null;
  })],
  ["kulüp kartları", F("notlar: sabitler ayrı grup, boş grup yok", () => {
    const g = HT.noteGroups([{ id: 1, pinned: true }, { id: 2 }, { id: 3 }]);
    const h = HT.noteGroups([{ id: 2 }]);
    return g.length === 2 && g[0][0] === "SABİT" && g[0][1].length === 1 && g[1][1].length === 2 && h.length === 1 && h[0][0] === "SON NOTLAR" && HT.noteGroups([]).length === 0;
  })],
  ["kulüp kartları", F("antrenman bu ay yoksa gizli, varsa sayı", () => {
    const today = "2026-10-10";
    return HT.clubTraining([], today) === null && HT.clubTraining([{ cat: "Antrenman", date: "2026-10-01", log: { wind: 10 } }], today)?.big === "1";
  })],
  ["kulüp kartları", F("antrenman haftası: yapıldı ✓, günlüksüz !, bugün, planlı; hiç yoksa kart yok", () => {
    const today = "2026-10-14";
    const plans = [
      { cat: "Antrenman", date: "2026-10-12", log: { wind: 12 } },
      { cat: "Antrenman", date: "2026-10-13" },
      { cat: "Antrenman", date: "2026-10-14" },
      { cat: "Antrenman", date: "2026-10-16" },
      { cat: "Antrenman", date: "2026-10-15", status: "cancelled" },
    ];
    const w = HT.trainingWeek(plans, today);
    const st = w.days.map((d) => d.state).join(",");
    return w.days[0].date === "2026-10-12" && w.days[0].w === "Pzt" && st === "done,miss,today,none,plan,none,none"
      && w.planned === 4 && w.done === 1 && w.missing >= 1 && w.total >= 3 && HT.trainingWeek([], today) === null;
  })],
  ["kulüp kartları", F("şeritteki ünlemin sebebi: günü geçmiş, günlüğü yazılmamış antrenman (pencerede Günlük yaz)", () => {
    const today = "2026-10-18";
    const miss = { id: "a", cat: "Antrenman", date: "2026-10-17" };
    const w = HT.trainingWeek([miss, { id: "b", cat: "Antrenman", date: "2026-10-16", log: { wind: 10 } }], today, [], 1, true);
    const sat = w.days.find((d) => d.date === "2026-10-17");
    return sat.state === "miss" && HT.needsLog(sat.sail[0], today)
      && !HT.needsLog({ ...miss, log: { wind: 8 } }, today) && !HT.needsLog({ ...miss, date: today }, today)
      && !HT.needsLog({ ...miss, status: "cancelled" }, today) && !HT.needsLog({ id: "c", title: "Doktor", date: "2026-10-17" }, today);
  })],
  ["kulüp kartları", F("Sırada: aynı yarışın planları tek satırda (başlangıç + işler), tek plan ve başka planlar ayrı", () => {
    const R = (id, title, day, cat = "Yarış") => ({ p: { id, title, cat, date: day }, day });
    const g = HT.raceGroups([R("a", "Foça Kupası: Online kayıt son gün", "2026-10-21"), R("f", "İlay · Kuvvet", "2026-10-21", "Fitness"), R("b", "foça kupası: Ücreti öde", "2026-10-22"), R("s", "Foça Kupası", "2026-10-24"), R("c", "Çeşme: Kayıt", "2026-10-25"), R("d", "Urla", "2026-10-26")]);
    const race = g[0];
    return g.length === 4 && race.race === "Foça Kupası" && race.start.p.id === "s" && race.items.map((x) => x.label).join("|") === "Online kayıt son gün|Ücreti öde"
      && g[1].p.id === "f" && !g[1].start && g[2].p.id === "c" && !g[2].start && g[3].p.id === "d" && g[3].start === true
      && HT.raceKey({ cat: "Genel", title: "X: y" }) === null && HT.raceKey({ cat: "Yarış", title: "Foça" }).whole === true;
  })],
  ["kulüp kartları", F("tek liste: yarışın yarınki işi Yarın'da değil yarışın satırında; yarının başka planı Yarın'da", () => {
    const P = (id, title, date, cat = "Yarış") => ({ id, title, cat, date });
    const next = { day: "2026-10-21", rows: [{ p: P("a", "Foça Kupası: Online kayıt son gün", "2026-10-21") }, { p: P("f", "İlay · Kuvvet", "2026-10-21", "Fitness") }] };
    const rest = [{ p: P("b", "Foça Kupası: Ücreti öde", "2026-10-22"), day: "2026-10-22" }, { p: P("s", "Foça Kupası", "2026-10-24"), day: "2026-10-24" }, { p: P("k", "Kamp", "2026-10-26", "Genel"), day: "2026-10-26" }];
    const x = HT.homeList(next, rest);
    const y = HT.homeList(null, rest);
    return x.next.length === 1 && x.next[0].p.id === "f" && x.later.length === 2 && x.later[0].race === "Foça Kupası" && x.later[0].items.length === 2 && x.later[1].p.id === "k"
      && y.next.length === 0 && y.later[0].items.length === 1;
  })],
  ["kulüp kartları", F("liste tarihi: gün adı + gün, başka ayda ay da; yarın için de tarih (Yarın yazmaz)", () => {
    const t = "2026-10-20";
    return HT.shortDay("2026-10-21", t) === "Çar 21" && HT.shortDay("2026-12-03", t) === "Per 3 Ara" && HT.shortDay("2027-06-30", t) === "Çar 30 Haz";
  })],
  ["kulüp kartları", F("WhatsApp kalıpları: sıradaki antrenman ve iptali, sıradaki yarış; geçmiş saat ve iptal sayılmaz; kayıtlılar temizlenir", () => {
    const t = "2026-10-20";
    const now = new Date("2026-10-20T12:00:00");
    const plans = [{ title: "Optimist antrenmanı", cat: "Antrenman", date: t, time: "10:00" }, { title: "Optimist antrenmanı", cat: "Antrenman", date: "2026-10-21", time: "09:30", place: "Yat limanı" }, { title: "Antrenman", cat: "Antrenman", date: "2026-10-21", time: "08:00", status: "cancelled" }];
    const x = W.athleteTemplates(plans, [{ name: "Foça Kupası", startDate: "2026-10-24" }], t, now);
    const c = W.cleanTemplates([" a ", "a", "", "b"]);
    return x[0] === "Yarın 09:30 antrenman var, yer: Yat limanı." && /Yarın 09:30 Optimist antrenmanı rüzgâr nedeniyle iptal edildi/.test(x[1]) && /^Foça Kupası 24 Ekim Cumartesi başlıyor\.$/.test(x[2]) && c.join() === "a,b";
  })],
  ["kulüp kartları", F("listede gizlenen plan: gününe homeDays'ten çok gün varken gizli, sonra görünür; alanı yoksa hep görünür", () => {
    const t = "2026-10-20";
    return HT.homeHidden({ date: "2026-11-15", homeDays: 10 }, t) && !HT.homeHidden({ date: "2026-10-30", homeDays: 10 }, t) && !HT.homeHidden({ date: "2026-11-15" }, t) && HT.homeHidden({ date: "2026-11-15" }, t, 10) && !HT.homeHidden({ date: "2026-11-15", homeDays: 30 }, t, 10);
  })],
  ["kulüp kartları", F("plan satırında kalan gün: bugün/yarın kırmızı, 2 gün sarı ünlemli, sonrası gri; geçmiş yok", () => {
    const t = "2026-10-19";
    const x = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-26", "2026-10-18"].map((d) => HT.leftTag(d, t));
    return x[0].text === "Bugün" && x[0].tone === "red" && x[1].text === "Yarın" && x[2].text === "! 2 gün" && x[2].tone === "warn" && x[3].text === "7 gün" && x[3].tone === "mut" && x[4] === null;
  })],
  ["kulüp kartları", F("ana sayfa şeridi üç hafta: sonraki ay da, planı orada olan gün görünür; dünden başlayınca bugün ikinci", () => {
    const today = "2026-10-17";
    const w = HT.trainingWeek([{ id: "x", title: "Doktor", date: "2026-10-30" }, { id: "y", cat: "Antrenman", date: "2026-11-01" }], today, [], 3);
    const last = w.days[20];
    // Ana sayfa: dünden başlar, bugün ikinci sırada, gün adları doğru
    const y = HT.trainingWeek([{ id: "z", cat: "Antrenman", date: "2026-11-05" }], today, [], 3, true);
    return w.days.length === 21 && w.days[0].date === "2026-10-12" && w.days[7].w === "Pzt" && last.date === "2026-11-01" && last.d === 1
      && last.state === "plan" && w.days[18].other.length === 1 && HT.trainingWeek([], today, [], 3) === null
      && y.days[0].date === "2026-10-16" && y.days[0].w === "Cum" && y.days[1].state === "today" && y.days[1].w === "Cmt" && y.days[2].w === "Paz"
      && y.days[20].date === "2026-11-05" && y.days[20].state === "plan" && y.days.length === 21;
  })],
  ["kulüp kartları", F("renk tonları: çalışan/sporcu/veli farklı, plan türüne göre çizgi ve etiket", () => {
    const k = ["staff", "athlete", "student", "parent", "family", undefined, "other"].map(HT.personTone).join();
    const t = [{ cat: "Antrenman" }, { cat: "Yarış" }, { category: "Toplantı" }, { cat: "Genel" }, { cat: "Fitness", fit: {} }, {}].map(HT.planTone).join();
    const tags = [{ cat: "Yarış" }, { cat: "Genel" }, {}, { cat: "Fitness", fit: {} }].map(HT.planTag).join("|");
    const s = HT.storyPeople([{ uid: "1", name: "Ali", kind: "athlete" }, { uid: "2", name: "Ayşe", kind: "parent" }]);
    return k === "st,sp,sp,ve,fa,st," && t === "st,sp,ve,gen,fit,gen" && tags === "Yarış|||Fitness" && s.map((p) => p.tone).join() === "sp,ve";
  })],
  ["kulüp kartları", F("antrenman haftası: diğer planlar da (iptal, biten, antrenman, fitness hariç)", () => {
    const today = "2026-10-14";
    const plans = [
      { id: "p1", cat: "Toplantı", title: "Toplantı", date: "2026-10-15", time: "14:00" },
      { id: "p2", title: "Kahvaltı", date: "2026-10-15", time: "09:00" },
      { id: "p3", title: "İptal", date: "2026-10-16", status: "cancelled" },
      { id: "p4", title: "Bitti", date: "2026-10-16", done: true },
      { id: "p5", cat: "Antrenman", date: "2026-10-17" },
      { id: "p6", cat: "Fitness", date: "2026-10-17", fit: {} },
    ];
    const w = HT.trainingWeek(plans, today);
    const thu = w.days[3];
    const i = HT.dayInfo(thu, false, today), fri = HT.dayInfo(w.days[4], false, today);
    const only = HT.trainingWeek([{ id: "x", title: "Doktor", date: "2026-10-18" }], today);
    return w.otherN === 2 && thu.other.map((p) => p.id).join() === "p2,p1" && i.tap && !fri.tap && w.days[5].other.length === 0
      && only && only.otherN === 1 && HT.dayInfo(only.days[6], false, today).tap;
  })],
  ["kulüp kartları", F("takvim: biten plan görünmez", async () => {
    const AG = await import("@/lib/agenda");
    const SM = await import("@/lib/summary");
    const plans = [{ id: "a", title: "Açık", date: "2026-10-14" }, { id: "b", title: "Bitti", date: "2026-10-14", done: true }];
    return AG.dayItems(plans, [], "2026-10-14").plans.map((p) => p.id).join() === "a"
      && SM.dayItems({ plans, date: "2026-10-14" }).plans.map((p) => p.id).join() === "a";
  })],
  ["kulüp kartları", F("antrenman haftası: gün penceresi (yelken yoklama, plansız gün antrenman ekle, fitness sporcuları)", () => {
    const today = "2026-10-14";
    const plans = [
      { cat: "Antrenman", date: "2026-10-13" },
      { cat: "Antrenman", date: "2026-10-14" },
      { id: "m1", cat: "Fitness", date: "2026-10-15", fit: { name: "Bacak" } },
    ];
    const others = [
      { id: "a1", cat: "Fitness", date: "2026-10-14", fit: { for: "u1", res: { st: "done" } } },
      { id: "a2", cat: "Fitness", date: "2026-10-16", fit: { for: "u2" } },
      { id: "a3", cat: "Fitness", date: "2026-10-15", fit: { for: "u1" }, status: "cancelled" },
    ];
    const people = [{ uid: "u1", name: "Ali Kaya" }, { uid: "u2", name: "Ayşe Ak" }];
    const fit = HT.fitDays(plans, others, people, "me");
    const w = HT.trainingWeek(plans, today, fit);
    const [, mon, tue, wed, thu] = [null, w.days[1], w.days[2], w.days[3], w.days[4]];
    const iMon = HT.dayInfo(mon, true, today), iTue = HT.dayInfo(tue, true, today), iWed = HT.dayInfo(wed, true, today), iThu = HT.dayInfo(thu, true, today);
    const noAtt = HT.dayInfo(tue, false, today);
    const sun = HT.dayInfo(w.days[6], true, today), sunNo = HT.dayInfo(w.days[6], false, today), past = HT.dayInfo(w.days[0], true, today);
    const onlyFit = HT.trainingWeek([], today, HT.fitDays([], others.slice(1, 2), people, "me"));
    return fit.length === 3 && tue.fit[0].name === "Ali Kaya" && tue.fit[0].st === "done" && w.fitN === 3 && w.fitDone === 1
      && iMon.tap && iMon.attHref === "/athletes/attendance?gun=2026-10-13" && iMon.sail.length === 1 && !iMon.add && !iMon.fit.length
      && iTue.tap && iTue.sail.length === 1 && iTue.fitHref === "/fitness?sporcular=1&gun=2026-10-14"
      && iWed.add && iWed.attHref === "" && iWed.fitHref === "/fitness?tab=me" && wed.fit[0].name === "Sen"
      && iThu.add && iThu.fitHref === "/fitness?sporcular=1&gun=2026-10-16"
      && past.tap && past.add && past.attHref === "/athletes/attendance?gun=2026-10-12"
      && sun.tap && sun.add && !sunNo.tap
      && noAtt.tap && !noAtt.add && noAtt.attHref === "" && noAtt.fit.length === 1
      && onlyFit && onlyFit.planned === 0 && onlyFit.fitN === 1;
  })],
  ["kulüp kartları", F("takvim: günün fitness antrenmanları (kendi + sporcular) saat sırasıyla, iptal yok", async () => {
    const AG = await import("@/lib/agenda");
    const plans = [{ id: "m1", cat: "Fitness", date: "2026-10-15", time: "18:00", fit: { name: "Bacak" } }, { id: "p1", cat: "Antrenman", date: "2026-10-15" }];
    const others = [
      { id: "a1", cat: "Fitness", date: "2026-10-15", time: "09:00", fit: { for: "u1" } },
      { id: "a2", cat: "Fitness", date: "2026-10-15", fit: { for: "u2" }, status: "cancelled" },
      { id: "a3", cat: "Fitness", date: "2026-10-16", fit: { for: "u2" } },
    ];
    const fit = HT.fitDays(plans, others, [{ uid: "u1", name: "Ali Kaya" }, { uid: "u2", name: "Ayşe Ak" }], "me");
    const day = AG.fitOn(fit, "2026-10-15");
    return day.map((f) => f.id).join() === "a1,m1" && day[0].name === "Ali Kaya" && day[1].mine && AG.fitOn(fit, "2026-10-17").length === 0;
  })],
  ["yarış satırı", F("ad tam tutmasa da yarış kaydı bulunur (yarışın sayfası açılsın)", () => {
    const open = [{ id: "r1", name: "Ege Kupası 2026" }, { id: "r2", name: "Çeşme Ligi" }, { id: "r3", name: "Foça Kupası" }, { id: "r4", name: "Foça Kupası Gençler" }];
    return HT.findRace("çeşme  ligi", open)?.id === "r2" && HT.findRace("Ege Kupası", open)?.id === "r1" && HT.findRace("Foça Kupası", open)?.id === "r3"
      && HT.findRace("Kupası", open) === null && HT.findRace("İzmir", open) === null && HT.findRace("", open) === null
      && HT.raceForPlan({ cat: "Yarış", title: "Ege Kupası: Kayıt son gün" }, open, "2026-01-01") === "r1";
  })],
  ["kulüp kartları", F("Şu an'daki Yarış planı yarışın sayfasını açar: aynı ad ya da bugün süren tek yarış", () => {
    const open = [{ id: "r1", name: "Foça Kupası", startDate: "2026-10-09" }, { id: "r2", name: "Çeşme Ligi", startDate: "2026-10-20" }];
    const t = "2026-10-10";
    return HT.raceForPlan({ cat: "Yarış", title: "Çeşme Ligi" }, open, t) === "r2" && HT.raceForPlan({ cat: "Yarış", title: "Yarış günü" }, open, t) === "r1"
      && HT.raceForPlan({ cat: "Antrenman", title: "Foça Kupası" }, open, t) === null && HT.raceForPlan({ cat: "Yarış", title: "X" }, [], t) === null
      && HT.clubRace({ id: "r2", name: "Çeşme", when: "10 gün", left: 0 }).id === "r2"
      && HT.clubRace({ name: "Foça", when: "5 gün", left: 4, steps: ["Ek-2", "Otel", "Römork", "Fazla"] }).steps.join() === "Ek-2,Otel,Römork"
      && HT.clubRace({ name: "Foça", when: "5 gün" }).steps.length === 0;
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
    return g.map((x) => x.title).join(",") === "Günlük,Kulüp,Yönetim,Sosyal" && l[0] === "Planlar" && l.includes("Envanter") && l.includes("Fiş / Fatura") && l.includes("Aidatlar") && a.find((x) => x.href === "/training/day")?.label === "Antrenman" && a.find((x) => x.href === "/training")?.label === "Ant. günlüğü" && a.find((x) => x.id === "meeting") && g[3].items[0].brand === "instagram" && a.every((x) => x.icon && x.label && x.label.length <= 12 && (x.href || x.id)) && new Set(a.map((x) => x.href || x.id)).size === a.length;
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
  ["kısayollar: düzenleme", F("varsayılandan Envanter çıkar, Fitness ekle → ana sayfada Fitness; seçim profilde okunur (homeLinks, inbox)", async () => {
    const { readFileSync } = await import("node:fs");
    const g = HT.homeActions({ owner: true, athletes: true, races: true, training: true, receipts: true });
    const start = HT.shortcutsOf(g).map(HT.linkKey);
    const less = HT.toggleShortcut(start, "/inventory");
    const more = HT.toggleShortcut(less, "/fitness");
    const shown = HT.shortcutsOf(g, more).map(HT.linkKey);
    const auth = readFileSync(new URL("../../../src/features/auth/AuthProvider.jsx", import.meta.url), "utf8");
    return HT.toggleShortcut(start, "/fitness") === null && less.length === 6 && shown.length === 7 && shown.includes("/fitness") && !shown.includes("/inventory") &&
      /homeLinks:/.test(auth) && /inbox:/.test(auth) && /inboxSeen:/.test(auth);
  })],
  ["tüm sayfalar: düğme sayfası", F("ana sayfadakiler ayrı bölümde, diğer sayfalarda tekrar etmez", () => {
    const g = HT.homeActions({ owner: true, athletes: true, races: true, training: true, receipts: true });
    const keys = HT.shortcutsOf(g).map(HT.linkKey);
    const rest = g.flatMap((x) => x.items).map(HT.linkKey).filter((k) => !keys.includes(k));
    return keys.length === 7 && rest.length > 0 && rest.every((k) => !keys.includes(k)) && keys.length + rest.length === g.flatMap((x) => x.items).length;
  })],
  ["sırada listesi", F("süren plan ŞİMDİ, sonra bugün/yarın/gün adı; iptal ve geçen sayılmaz; en çok n", () => {
    const now = new Date("2026-10-07T14:20:00");
    const ps = [
      { id: "a", title: "Sabah", date: "2026-10-07", time: "09:00" },
      { id: "b", title: "Antrenman", date: "2026-10-07", time: "14:00", durationMin: 120 },
      { id: "c", title: "İptal", date: "2026-10-07", time: "16:00", status: "cancelled" },
      { id: "d", title: "Toplantı", date: "2026-10-07", time: "18:30" },
      { id: "e", title: "Bakım", date: "2026-10-08", time: "10:00" },
      { id: "f", title: "Foça'ya çıkış", date: "2026-10-09" },
      { id: "g", title: "Uzak", date: "2026-10-20", time: "10:00" },
    ];
    const r = HT.upcoming(ps, "2026-10-07", now, 4);
    const ids = r.map((x) => x.p.id).join();
    const two = HT.upcoming(ps, "2026-10-07", now, 2);
    const none = HT.upcoming([], "2026-10-07", now, 4);
    return ids === "b,d,e,f" && r[0].label === "ŞİMDİ" && r[0].now && r[1].label === "BUGÜN" && r[2].label === "YARIN" && r[3].label === "CUMA" &&
      two.length === 2 && none.length === 0;
  })],
  ["takvim iki gün", F("bugün + en yakın dolu gün, kalanlar sırada", () => {
    const now = new Date("2026-10-07T15:00:00");
    const ps = [
      { id: "a", title: "Sabah", date: "2026-10-07", time: "09:00" },
      { id: "b", title: "Toplantı", date: "2026-10-07", time: "18:30" },
      { id: "c", title: "Kamp", date: "2026-10-10" },
      { id: "d", title: "Bakım", date: "2026-10-10", time: "10:00" },
      { id: "e", title: "Yarış", date: "2026-10-12", time: "08:00" },
      { id: "f", title: "Bitti", date: "2026-10-09", done: true },
    ];
    const r = HT.twoDays(ps, "2026-10-07", now, 4);
    const tom = HT.twoDays([{ id: "x", title: "X", date: "2026-10-08" }], "2026-10-07", now);
    const empty = HT.twoDays([], "2026-10-07", now);
    return r.days.length === 2 && r.days[0].label === "Bugün" && r.days[0].rows.map((x) => x.p.id).join() === "b" &&
      r.days[1].day === "2026-10-10" && r.days[1].label.startsWith("Cmt") && r.days[1].rows.map((x) => x.p.id).join() === "c,d" &&
      r.rest.map((x) => x.p.id).join() === "e" && tom.days[1].label === "Yarın" && empty.days.length === 1 && !empty.rest.length;
  })],
  ["kişi şeridi", F("doğum günü önde, silinen yok, kişi sayfası", () => {
    const ms = [
      { uid: "1", name: "Zeki", kind: "staff" },
      { uid: "2", name: "Ali Kaya", kind: "athlete", athleteId: "A9" },
      { uid: "3", name: "Eski", kind: "staff", status: "left" },
      { uid: "4", name: "Ayşe", kind: "family" },
    ];
    const r = HT.storyPeople(ms, [{ memberUid: "4" }]);
    return r.map((x) => x.id).join() === "4,1,2" && r[0].bday && r[2].href === "/people/p/2" && r[0].href === "/people/p/4";
  })],
]);

// Günlük banka mailinden aidatın kendiliğinden yazılması ve bildirimi
const DAU = await import("@/lib/duesAuto");
const DAR = DA.map((a) => ({ ...a, from: "2026-10" }));
group("Aidat otomatik")([
  ["emin ve tutar tutuyor", F("AYSE SAHIN 1500 → Deniz'e yazılır, gönderen öğrenilir", () => {
    const r = DAU.autoDues([mvt("FAST AYSE SAHIN EKIM AIDAT")], { ...DCFG, roster: DAR }, {});
    const p = r.months["2026-10"]?.paid?.a1?.[0];
    return r.paid.length === 1 && p?.amt === 1500 && p.by === "auto" && r.payers?.a1?.[0] === "AYSE SAHIN" && r.open === 0;
  })],
  ["tutar tutmuyor ya da emin değil", F("onaya kalır, open sayılır", () => {
    const r = DAU.autoDues([mvt("FAST AYSE SAHIN", 900), mvt("HAVALE MEHMET YILMAZ"), mvt("EFT BILINMEYEN KISI")], { ...DCFG, roster: DAR }, {});
    return r.paid.length === 0 && r.open === 2 && !Object.keys(r.months).length;
  })],
  ["kardeşler toplamı", F("2500 → Ege 1500 + Ada 1000", () => {
    const r = DAU.autoDues([mvt("HAVALE MEHMET YILMAZ", 2500)], { ...DCFG, roster: DAR }, {});
    const m = r.months["2026-10"]?.paid || {};
    return m.a2?.[0].amt === 1500 && m.a3?.[0].amt === 1000 && r.paid[0].names.length === 2;
  })],
  ["aynı hareket iki kez yazılmaz", F("zaten yazılmış ya da aidat değil", () => {
    const m = mvt("FAST AYSE SAHIN");
    const a = DAU.autoDues([m], { ...DCFG, roster: DA }, { "2026-10": { paid: { a1: [{ amt: 1500, mov: DU.movKey(m) }] } } });
    const b = DAU.autoDues([m], { ...DCFG, roster: DA }, { "2026-10": { ignored: [DU.movKey(m)] } });
    return !a.paid.length && !b.paid.length && !b.open;
  })],
  ["en eski borçlu ay", F("Eylül borçluyken Ekim'de gelen para Eylül'e, Ekim'de used", () => {
    const m = mvt("FAST AYSE SAHIN");
    const r = DAU.autoDues([m], { ...DCFG, roster: DA.map((a) => ({ ...a, from: "2026-09" })) }, {});
    return r.months["2026-09"]?.paid?.a1?.[0]?.amt === 1500 && !r.months["2026-10"]?.paid?.a1 && r.months["2026-10"]?.used?.includes(DU.movKey(m));
  })],
  ["liste yoksa hiçbir şey", F("Aidatlar sayfası açılmamış", () => DAU.autoDues([mvt("FAST AYSE SAHIN")], DCFG, {}).paid.length === 0 && DAU.duesText(DAU.autoDues([], DCFG)) === null)],
  ["bildirim metni", F("Aidat geldi: Deniz Şahin 1.500 TL / onay bekliyor", () => {
    const a = DAU.duesText({ paid: [{ names: ["Deniz Şahin"], amount: 1500 }], open: 0 });
    const b = DAU.duesText({ paid: [{ names: ["Ege Yılmaz", "Ada Yılmaz"], amount: 2500 }], open: 1 });
    const c = DAU.duesText({ paid: [], open: 2 });
    return a.title === "Aidat geldi: Deniz Şahin 1.500 TL" && b.title === "Aidat geldi: Ege Yılmaz ve Ada Yılmaz 2.500 TL. 1 ödeme onayını bekliyor" && c.title === "2 aidat ödemesi onayını bekliyor";
  })],
  ["maildeki hesap özetinden yazma", F("runAutoDues ayar + ay okur, ayı ve gönderenleri yazar", async () => {
    const store = { "orgs/u1/dues/settings": { ...DCFG, roster: DAU.rosterOf(DAR) } };
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
    return / için Ekim aidatı.* henüz görünmüyor\. Ödediyseniz dikkate almayın\.$/.test(p.title) && /^4 sporcu Ekim aidatını ödemedi: .+/.test(o.title) && DR.ownerText([], "2026-10") === null;
  })],
]);

// Yoklama hatırlatması (attRemind.js): antrenman bitince ya da gün batımında, yoklama girilmediyse bir kez
const YH = await import("@/lib/attRemind");
const YR = await import("@/lib/reminders");
const YIB = await import("@/lib/inbox");
const AT = "2026-10-13";
const APL = [{ title: "Optimist antrenmanı", date: AT, time: "16:00", durationMin: 90, cat: "Antrenman" }, { title: "Toplantı", date: AT, time: "19:00", durationMin: 60, cat: "Toplantı" }];
const ASUN = YH.sunsetHM(AT, { lat: 39.0717, lon: 26.8886 });
group("Yoklama hatırlatması")([
  ["gün batımı", F("Dikili 13 Ekim ≈ 18:37, Haziran ≈ 20:40", () => /^18:3\d$/.test(ASUN) && /^20:[34]\d$/.test(YH.sunsetHM("2026-06-21", { lat: 39.0717, lon: 26.8886 })))],
  ["bitiş saati", F("16:00 + 90 dk = 17:30; toplantı sayılmaz", () => YH.attRemindAt(APL, AT, ASUN) === "17:30")],
  ["bitiş yok", F("saatsiz antrenman: gün batımı", () => YH.attRemindAt([{ title: "Antrenman", date: AT }], AT, "18:37") === "18:37")],
  ["en geç biten", F("iki antrenmanda sonuncusu", () => YH.attRemindAt([...APL, { title: "Akşam idmanı", date: AT, time: "18:00", durationMin: 60 }], AT, ASUN) === "19:00")],
  ["zamanı gelmedi", F("17:29'da gitmez", () => YH.attRemindDue({ plans: APL, today: AT, nowHM: "17:29", sunset: ASUN }) === "")],
  ["zamanı geldi", F("17:30 sonrası gider", () => YH.attRemindDue({ plans: APL, today: AT, nowHM: "17:35", sunset: ASUN }) === "17:30")],
  ["yoklama girildi", F("attLast bugün: gitmez", () => YH.attRemindDue({ plans: APL, today: AT, nowHM: "20:00", sunset: ASUN, taken: AT }) === "")],
  ["bir kez", F("bugün gönderildiyse gitmez", () => YH.attRemindDue({ plans: APL, today: AT, nowHM: "20:00", sunset: ASUN, sent: AT }) === "")],
  ["antrenman yok / iptal", F("gitmez", () => YH.attRemindDue({ plans: [APL[1], { ...APL[0], status: "cancelled" }], today: AT, nowHM: "22:00", sunset: ASUN }) === "")],
  ["kulüp sitesinden girilen", F("sporcularda bugüne yoklama varsa alındı", () => YH.attTakenIn([{ att: {} }, { att: { 2026: { "10-13": "present" } } }], AT) && !YH.attTakenIn([{ att: { 2026: { "10-12": "absent" } } }], AT))],
  ["veliye aidat hatırlatması", F("gidecek sayfa yok: zilde tam metin", () => YIB.inboxLink({ url: "/?bildirim=1", tag: "dues-x-2026-10" }) === "")],
  ["plan hatırlatması bağlantısı", F("dokununca o plan açılır", () => YR.reminderText({ id: "p1", title: "A", date: AT, time: "10:00" }, 60).url === "/?open=plan:p1")],
  ["metin ve bağlantı", F("o günün yoklaması açılır", () => {
    const m = YH.attRemindText(APL, AT);
    return m.title === "Bugünkü antrenmanın yoklamasını almadın (Optimist antrenmanı 16:00)" && m.url === `/athletes/attendance?gun=${AT}` && m.tag === `att-remind-${AT}`;
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
  ["telefondaki medya", F("yarış başına grup, büyük önce, kalan gün ilk silinecekten", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    const d = (n) => now - n * 864e5;
    const g = DD.mediaGroups([
      { id: "a", raceId: "r1", kind: "video", size: 50, savedAt: d(1) },
      { id: "b", raceId: "r1", kind: "photo", size: 5, savedAt: d(3) },
      { id: "c", raceId: "ant-p1", kind: "video", size: 80, savedAt: d(6.5) },
    ], 7, now);
    return g.length === 2 && g[0].raceId === "ant-p1" && g[0].daysLeft === 1 && g[1].size === 55 && g[1].daysLeft === 4 && DD.mediaCount(g[1]) === "1 video · 1 foto" && g[1].ids.join() === "a,b";
  })],
  ["buluttaki medya", F("yalnız canlı belgede adresi olanlar silinir", () => {
    const ok = DD.inCloud(["a", "b", "c"], [{ id: "a", url: "https://x" }, { id: "b", url: "" }]);
    return ok.join() === "a" && DD.inCloud(["a"], null).length === 0;
  })],
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
  ["görevliye bildirim", F("metinde tutar ve son gün", () => NTX.assignedText({ kind: "task", title: "Fatura öde: Turkcell", due: "2026-10-15", pay: IV.payLine(IV.taskInvoice(INV[0])), from: "Seyhun" }, "2026-10-05").title === "Yeni görevin var: Fatura öde: Turkcell (1.250,50 TL, 15 eki kadar)")],
  ["görev tamamlandı", F("görevli tamamlayınca da", () => IV.taskDone({ done: false, doneBy: { u2: true } }) && !IV.taskDone({ done: false }) && !IV.taskDone(null))],
  ["IBAN", F("boşluklu yazılır, hatalısı boş", () => IV.cleanIban("tr12 0006 4000 0011 2345 6789 01") === "TR12 0006 4000 0011 2345 6789 01" && IV.cleanIban("TR12") === "")],
  ["asistan: ödendi", F("Turkcell faturası ödendi → Turkcell", () => { const c = IV.invoiceCommand("Turkcell faturası ödendi"); return c?.op === "paid" && IV.pickInvoice(c.t, INV).pick?.id === "i1"; })],
  ["asistan: hangisi", F("faturayı ödendi işaretle → iki açık fatura, sorar", () => { const c = IV.invoiceCommand("faturayı ödendi işaretle"); const r = IV.pickInvoice(c.t, INV); return c.op === "paid" && !r.pick && r.list.length === 2; })],
  ["asistan: elektrik", F("elektrik faturasını ödedim → Gediz", () => IV.pickInvoice(IV.invoiceCommand("elektrik faturasını ödedim").t, INV).pick?.id === "i2")],
  ["asistan: ödenmedi", F("ödenmişlerden seçer", () => { const c = IV.invoiceCommand("Deniz malzeme faturası ödenmedi olarak işaretle"); return c?.op === "unpaid" && IV.pickInvoice(c.t, INV, "unpaid").pick?.id === "i3"; })],
  ["asistan: nakit", F("Turkcell faturasını nakit ödedim → Turkcell, kasadan", () => { const c = IV.invoiceCommand("Turkcell faturasını nakit ödedim"); return c?.op === "paid" && c.cash && IV.pickInvoice(c.t, INV).pick?.id === "i1" && !IV.invoiceCommand("Turkcell faturası ödendi").cash; })],
  ["asistan: soru değil", F("fatura ödendi mi? → yerel değil", () => IV.invoiceCommand("Turkcell faturası ödendi mi") === null && IV.invoiceCommand("fatura çek") === null)],
  ["banka mailinden kendiliğinden", F("emin olan ödendi, görev tamam, liste kısalır", async () => {
    const store = { "orgs/u1/invoiceIndex/open": { list: IV.openIndex(INV) }, "orgs/u1/tasks/t1": { title: "x", done: false } };
    const io = { get: async (p) => store[p] || null, set: async (p, f) => void (store[p] = { ...(store[p] || {}), ...f }) };
    const r = await IV.runAutoInvoices(io, "u1", [out("EFT TURKCELL ILETISIM HIZ", 1250.5), out("HAVALE", 900)]);
    const t = IV.invoiceText(r);
    return r.paid.length === 1 && r.guess === 1 && store["orgs/u1/invoices/i1"].status === "paid" && store["orgs/u1/invoices/i1"].paidAt === "2026-10-06" && store["orgs/u1/tasks/t1"].done === true
      && store["orgs/u1/invoiceIndex/open"].list.length === 1 && t.title === "Fatura ödendi: Turkcell İletişim Hizmetleri A.Ş. 1.250,50 TL";
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
// Garanti BBVA kart harcaması mailleri → ödeme bekleyen fiş (garanti.js). Gerçek Garanti mailiyle denenmedi; örnekler uydurma.
const GA = await import("@/lib/garanti");
const RCx = await import("@/lib/receipts");
const GM1 = { id: "m1", from: "bilgilendirme@garantibbva.com.tr", at: "2026-10-13T11:30:00Z", subject: "Kartınızla işlem yapıldı", text: "Değerli Müşterimiz,\n1234 ile biten kartınızla 13.10.2026 tarihinde saat 14:22'de MIGROS DIKILI işyerinden 1.245,90 TL tutarında harcama yapılmıştır.\nİşlemi siz yapmadıysanız iptal etmek için 444 0 333." };
const GM2 = { id: "m2", from: "garanti@garanti.com.tr", at: "2026-10-12T06:10:00Z", subject: "Harcama bildirimi", text: "İşlem Tarihi: 12.10.2026 09:05\nİşyeri: OPET DIKILI\nTutar: 850,00 TL\nKart No: 5400 **** **** 9876" };
const GM3 = { id: "m3", from: "bilgilendirme@garantibbva.com.tr", subject: "İade bilgilendirmesi", text: "Kartınıza 50,00 TL iade yapılmıştır." };
const GM4 = { id: "m4", from: "bilgilendirme@garantibbva.com.tr", subject: "Kartınızla harcama yapıldı", text: "Bonus kartınızla harcama yapıldı. Detaylar uygulamada." };
const gio = () => {
  const db = {};
  return { db, get: async (p) => db[p] || null, set: async (p, f) => void (db[p] = f) };
};
group("Garanti kart harcaması (fiş)")([
  ["cümle biçimi", F("işyeri, tutar, tarih, saat, kart", () => { const s = GA.spendOf(GM1).spend; return s.merchant === "MIGROS DIKILI" && s.amount === 124590 && s.date === "2026-10-13" && s.time === "14:22" && s.last4 === "1234"; })],
  ["etiketli biçim", F("İşyeri: / Tutar: / Kart No", () => { const s = GA.spendOf(GM2).spend; return s.merchant === "OPET DIKILI" && s.amount === 85000 && s.last4 === "9876" && s.date === "2026-10-12"; })],
  ["iade fiş olmaz", F("skip", () => !!GA.spendOf(GM3).skip)],
  ["reklam fiş olmaz", F("harcama değil", () => GA.spendOf({ subject: "Yeni fırsatlar", text: "Bonus kampanyası seni bekliyor" }) === null)],
  ["okunamayan harcama", F("yapay zekaya", () => GA.spendOf(GM4)?.ai === true)],
  ["gönderen", F("garantibbva.com.tr ve garanti.com.tr, İş Bankası değil", () => GA.isGaranti(GM1) && GA.isGaranti(GM2) && !GA.isGaranti({ from: "bilgilendirme@ileti.isbank.com.tr" }))],
  ["yapay zeka denetimi", F("mailde geçen tutar ve işyeri alınır", () => GA.fromAi({ spend: true, merchant: "Migros Dikili", amount: 1245.9, last4: "1234" }, GM1)?.amount === 124590)],
  ["uydurma alınmaz", F("mailde olmayan işyeri ya da tutar", () => !GA.fromAi({ spend: true, merchant: "A101", amount: 1245.9 }, GM1) && !GA.fromAi({ spend: true, merchant: "Migros", amount: 99 }, GM1))],
  ["fiş alanları", F("ödeme bekliyor, Kişisel, Kart, Market", () => { const r = GA.garantiReceipt(GA.spendOf(GM1).spend, GM1, "u1"); return r.payStatus === "pending" && r.scope === "personal" && r.pay === "Kart" && r.cat === "Market" && r.src === "garanti" && r.card === "1234" && RCx.totalOf(r) === 124590 && r.people[0] === "u1" && r.createdBy.name === "Garanti BBVA"; })],
  ["kulüp kartı", F("users.cardScope'taki kart Kulüp gelir", () => GA.garantiReceipt(GA.spendOf(GM1).spend, GM1, "u1", { 1234: "club" }).scope === "club")],
  ["mail tarihi", F("metinde tarih yoksa mailin İstanbul saati", () => { const r = GA.garantiReceipt({ merchant: "X", amount: 100, currency: "TL" }, GM1, "u1"); return r.date === "2026-10-13" && r.time === "14:30"; })],
  ["çalıştırıcı", F("yalnız Garanti mailleri, aynı mail iki kez fiş olmaz", async () => { const io = gio(); const a = await GA.runGaranti(io, "u1", [GM1, GM2, GM3, { ...GM2, id: "x", from: "bilgilendirme@ileti.isbank.com.tr" }]); const b = await GA.runGaranti(io, "u1", [GM1]); return a.added.length === 2 && Object.keys(io.db).length === 2 && !!io.db["orgs/u1/receipts/g-m1"] && b === null; })],
  ["yapay zeka yolu", F("okunamayan mail yapay zekayla fiş olur", async () => { const m = { id: "m5", from: "a@garantibbva.com.tr", subject: "Kartınızla harcama yapıldı", text: "Kartınızla 320,00 TL harcama yapıldı.\nMAVI JEANS IZMIR" }; const io = { ...gio(), ai: async () => ({ spend: true, merchant: "Mavi Jeans", amount: 320 }) }; const r = await GA.runGaranti(io, "u1", [m]); return r?.added[0]?.amount === 32000 && GA.spendOf(m).ai === true; })],
  ["bildirim", F("tek harcama ve çok harcama", () => { const one = GA.garantiText({ added: [{ merchant: "MIGROS DIKILI", amount: 124590 }] }); const two = GA.garantiText({ added: [{ merchant: "A", amount: 100 }, { merchant: "B", amount: 200 }] }); return one.title === "Kart harcaması fişe eklendi: MIGROS DIKILI 1.245,90 TL" && /2 kart harcaması/.test(two.title) && GA.garantiText(null) === null; })],
  ["Hesaplar › Kişisel", F("bu ayın kişisel fişleri ve bekleyenler", () => { const r = RCx.personalReceipts([{ scope: "personal", date: "2026-10-13", totals: { gross: 1000 }, payStatus: "pending" }, { scope: "personal", date: "2026-10-01", totals: { gross: 500 }, payStatus: "paid" }, { date: "2026-10-02", totals: { gross: 900 } }, { scope: "personal", date: "2026-09-30", totals: { gross: 50 } }], "2026-10"); return r.n === 2 && r.sum === 1500 && r.wait === 1 && r.waitSum === 1000; })],
  ["kategori", F("Opet yakıt, Starbucks yemek", () => GA.catGuess("OPET DIKILI") === "Yakıt" && GA.catGuess("STARBUCKS IZMIR") === "Yemek" && GA.catGuess("XYZ LTD") === "Diğer")],
]);

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
const KB = await import("@/lib/cashbook");
const HR = await import("@/lib/hesapRows");
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
  ["nakit aidat birden çok aya", F("tek ödeme Hesaplar'da tek satır", () => {
    const l = D.cashMoves({ "2026-09": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-05", grp: "g1", at: "x1" }] } }, "2026-10": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-05", grp: "g1", at: "x2" }] } } }, []);
    return l.length === 1 && l[0].amount === 3000 && l[0].note === "Eylül, Ekim aidatı";
  })],
  ["elle nakit gelir", F("tür, kişi, tarih; Hesaplar'da hareket", () => {
    const [m] = D.incomeMoves([{ id: "x1", who: "Ali Kaya", amount: 2500, cat: "Kano eğitimi", note: "2 ders", date: "2026-10-08" }, { id: "x2", amount: 0 }]);
    return m && m.manual && m.cash && m.who === "Ali Kaya" && m.cat === "Kano eğitimi" && m.note === "Kano eğitimi · 2 ders" && D.monthOf(m) === "2026-10" && D.INCOME_CATS.includes("Bağış") && PY.searchMoves([m], "kano").length === 1;
  })],
  ["kasa: eskiler sayılmaz", F("başlangıçtan önceki nakit girişi kasada yok, eklenince sayılır", () => {
    const CB = KB;
    const [m1, m2, m3] = D.incomeMoves([
      { id: "a", amount: 1000, cat: "Bağış", who: "Ali", date: "2026-10-01", at: "2026-10-01T09:00:00Z" },
      { id: "b", amount: 500, cat: "Bağış", who: "Ayşe", date: "2026-10-12", at: "2026-10-12T09:00:00Z" },
      { id: "c", amount: 200, dir: "out", cat: "Yakıt", who: "Mehmet", date: "2026-10-12", at: "2026-10-12T10:00:00Z" },
    ]);
    const meta = { from: "2026-10-10T00:00:00Z" };
    const k = CB.kasaOf([m1, m2, m3], meta);
    const k2 = CB.kasaOf([m1, m2, m3], { ...meta, add: [m1.key] });
    return m3.amount === -200 && m3.cash && k.total === 300 && k.old.length === 1 && k.old[0].key === "i:a" && k2.total === 1300 && !k2.old.length && CB.kasaOf([m1, m2, m3], { ...meta, skip: [m2.key] }).total === -200;
  })],
  ["kasa: nakit aidat anahtarı", F("aidat nakitleri kasaya at ile girer", () => {
    const l = D.cashMoves({ "2026-10": { paid: { a1: [{ amt: 1500, via: "cash", date: "2026-10-11", at: "2026-10-11T08:00:00Z" }] } } }, []);
    return l[0].key === "d:2026-10:a1:2026-10-11T08:00:00Z" && KB.kasaOf(l, { from: "2026-10-10T00:00:00Z" }).total === 1500;
  })],
  ["Hesaplar sekme listesi", F("aylara göre en yeni önce, ay toplamları, kısa gün", () => {
    const g = HR.byMonth([{ id: "a", day: "2026-09-30", amount: 100 }, { id: "b", day: "2026-10-02", sort: "2026-10-02T08:00", amount: -40 }, { id: "c", day: "2026-10-05", amount: 300 }]);
    return g.length === 2 && g[0].ym === "2026-10" && g[0].rows[0].id === "c" && g[0].in === 300 && g[0].out === 40 && g[1].in === 100 && HR.dayText("2026-10-17") === "17 Eki" && HR.monthText("2025-03") === "Mart 2025" && HR.amt(-300) === "−300" && HR.amt(1200).startsWith("+");
  })],
  ["Hesaplar sabit sıra", F("aynı gündekiler gelen sıradan bağımsız: önce yeni eklenen, sonra kimlik", () => {
    const rows = [{ id: "b", day: "2026-10-20", sort: "2026-10-20", tie: "2026-10-20T08:00:00Z" }, { id: "a", day: "2026-10-20", sort: "2026-10-20", tie: "2026-10-20T08:00:00Z" }, { id: "c", day: "2026-10-20", sort: "2026-10-20", tie: "2026-10-20T09:00:00Z" }];
    const k = (l) => HR.byMonth(l)[0].rows.map((r) => r.id).join("");
    return k(rows) === "cab" && k([...rows].reverse()) === "cab" && HR.tieOf({ createdAt: { seconds: 0 } }) === "1970-01-01T00:00:00.000Z" && HR.tieOf({ at: 0 }) === "1970-01-01T00:00:00.000Z";
  })],
  ["kasa: kulübün verdiği borç", F("borç kasadan düşer, geri ödeme girer; kişisel borç kasaya girmez; eski borç sayılmaz", () => {
    const items = [
      { id: "d1", kind: "club", who: "Ali", amount: 500, date: "2026-10-12", at: "2026-10-12T09:00:00Z", paid: [{ id: "p1", amt: 200, date: "2026-10-13" }] },
      { id: "d2", kind: "personal", who: "Can", amount: 900, date: "2026-10-12", at: "2026-10-12T09:00:00Z", paid: [] },
      { id: "d3", kind: "club", who: "Eski", amount: 700, date: "2026-09-01", at: "2026-09-01T09:00:00Z", paid: [] },
    ];
    const l = KB.debtMoves(items);
    const k = KB.kasaOf(l, { from: "2026-10-10T00:00:00Z" });
    return l.length === 3 && k.total === -300 && k.in === 200 && k.out === 500 && !k.old.length;
  })],
  ["kasa: eski girişleri arşivleme", F("arşivlenen önceki girişlerde görünmez, kasaya sayılmaz, arşivde durur", () => {
    const l = [{ id: "a", key: "i:a", cash: true, amount: 500, at: "2026-09-01T09:00:00Z" }, { id: "b", key: "i:b", cash: true, amount: 300, at: "2026-09-02T09:00:00Z" }];
    const k = KB.kasaOf(l, { from: "2026-10-10T00:00:00Z", skip: ["i:a"] });
    return k.total === 0 && k.old.length === 1 && k.old[0].id === "b" && k.archived.length === 1 && k.archived[0].id === "a";
  })],
  ["kasa: ay ay gruplar ve süzgeç", F("en yeni ay önce, ayın giriş/çıkışı, Çıkış süzgeci, fiş bağlantısı ve simge", () => {
    const l = [
      { id: "a", amount: 1000, cat: "Aidat", date: "05.10.2026", ts: Date.parse("2026-10-05T09:00:00Z") },
      { id: "b", amount: -250, cat: "Fiş", src: "rc:R1", date: "12.10.2026", ts: Date.parse("2026-10-12T09:00:00Z") },
      { id: "c", amount: -100, cat: "Yakıt", date: "20.09.2026", ts: Date.parse("2026-09-20T09:00:00Z") },
    ];
    const g = KB.kasaMonths(l);
    const o = KB.kasaMonths(l, "in");
    const m = KB.kasaMonth(l, "2026-10");
    const k = KB.kasaLink(l[1]);
    return g.length === 2 && g[0].label === "Ekim 2026" && g[0].items[0].id === "b" && g[0].in === 1000 && g[0].out === 250 && o.length === 1 && o[0].items.length === 1 && m.in === 1000 && m.out === 250 && k.href === "/receipts/R1" && KB.kasaLink({ src: "inv:I9" }).kind === "invoice" && !KB.kasaLink(l[0]) && KB.kasaIcon(l[1]) === "receipt" && KB.kasaIcon(l[2]) === "fuel";
  })],
  ["kasa: düzenlenebilir kayıt", F("elle yazılanlar düzenlenir; fiş/fatura ödemesi, bankadan nakit ve aidat kaydı düzenlenmez", () =>
    KB.canEditCash({ manual: true, incomeId: "a", amount: -200 }) && KB.canEditCash({ manual: true, incomeId: "b", amount: 300, book: "personal" }) &&
    !KB.canEditCash({ manual: true, incomeId: "c", src: "rc:R1" }) && !KB.canEditCash({ manual: true, incomeId: "d", conv: "k1" }) && !KB.canEditCash({ amount: 500, cash: true }))],
  ["kasa: fişsiz çıkışa Fiş ekle", F("yalnız elle yazılmış, bağsız kulüp çıkışında; giriş, fişli, bankadan ve kişisel olanda yok", () =>
    KB.needsReceipt({ manual: true, amount: -200 }) && !KB.needsReceipt({ manual: true, amount: 200 }) && !KB.needsReceipt({ manual: true, amount: -200, src: "rc:R1" }) &&
    !KB.needsReceipt({ manual: true, amount: -200, conv: "k1" }) && !KB.needsReceipt({ manual: true, amount: -200, book: "personal" }) && !KB.needsReceipt({ amount: -200 }))],
  ["kasa: bankadan nakite çevirme", F("kasaya nakit giriş, kişisel hesaptan çıkar, tutarla bulunur", () => {
    const bank = [
      { id: "kaa1", amount: 20000, currency: "TL", who: "SEYHUN YILDIZ", desc: "Hesaba gelen", date: "11.10.2026 10:00", ts: Date.parse("2026-10-11T07:00:00Z") },
      { id: "kaa2", amount: 20000, currency: "TL", who: "ALI", desc: "eski", date: "01.10.2026 10:00", ts: Date.parse("2026-10-01T07:00:00Z") },
      { id: "kaa3", amount: 500, currency: "TL", desc: "x", ts: 1 },
    ];
    const pick = KB.convPick(bank, 20000, new Set());
    const inc = KB.convIncome(pick, (m) => m.who);
    const conv = KB.convSet({ conv: ["kaa1"] });
    const left = KB.withoutConv(bank, conv);
    const again = KB.convPick(bank, 20000, conv);
    const cashM = D.incomeMoves([{ id: "i1", ...inc, at: "2026-10-12T09:00:00Z" }]);
    const k = KB.kasaOf(cashM, { from: "2026-10-10T00:00:00Z" });
    return pick.id === "kaa1" && inc.amount === 20000 && inc.date === "2026-10-11" && inc.conv === "kaa1" && left.length === 2 && again.id === "kaa2" && cashM[0].conv === "kaa1" && k.total === 20000 && !KB.canConv({ id: "inc-1", cash: true, amount: 5 });
  })],
  ["bakiye: gösterilen hesaplar", F("seçim yoksa bakiyesi olanlar, seçim varsa seçilenler", () => {
    const acc = [{ key: "a", balance: 45000 }, { key: "b", balance: 0 }, { key: "c", balance: 0 }];
    const ks = (l) => l.map((x) => x.key).join("");
    return ks(MBX.shownAccounts(acc)) === "a" && ks(MBX.shownAccounts(acc, ["a", "b"])) === "ab" && ks(MBX.shownAccounts(acc, ["zz"])) === "a" && ks(MBX.shownAccounts(acc.slice(1))) === "bc";
  })],
  ["kasa: kime verildi seçenekleri", F("sporcular yok; çalışan, aile, kişi ve yazılan adlar; yeni ad bir kez", () => {
    const members = [
      { name: "Gökhan Arslan", kind: "staff" },
      { name: "Ali Kaya", kind: "athlete" },
      { name: "Zeynep Ok", kind: "student" },
      { name: "Fatma Yıldız", kind: "family" },
      { name: "Usta Mehmet", kind: "other" },
      { name: "Eski Çalışan", kind: "staff", status: "left" },
    ];
    const o = KB.whoOptions(members, ["Tekne Servisi", "gökhan arslan"]);
    const names = o.map((x) => x.name);
    return names.join("|") === "Fatma Yıldız|Gökhan Arslan|Tekne Servisi|Usta Mehmet" && o.find((x) => x.name === "Tekne Servisi").saved && !o.find((x) => x.name === "Gökhan Arslan").saved
      && KB.newWhoName("  Marina  Ofisi ", o) === "Marina Ofisi" && KB.newWhoName("tekne servisi", o) === "" && KB.newWhoName("", o) === "";
  })],
  ["kişisel defter ayrı", F("kasaya girmez; gelir, gider, ödenmemiş borç", () => {
    const l = D.incomeMoves([
      { id: "p1", book: "personal", amount: 2000, cat: "Ders", date: "2026-10-05", at: "2026-10-12T09:00:00Z" },
      { id: "p2", book: "personal", dir: "out", amount: 300, cat: "Market", date: "2026-10-06", at: "2026-10-12T09:00:00Z" },
      { id: "p3", book: "personal", dir: "debt", amount: 1000, who: "Ahmet", date: "2026-10-07", at: "2026-10-12T09:00:00Z" },
      { id: "p4", book: "personal", dir: "debt", amount: 400, who: "Can", paid: true, date: "2026-10-01", at: "2026-10-12T09:00:00Z" },
    ]);
    const b = KB.personalOf(l);
    return l.every((x) => !x.cash) && KB.kasaOf(l, { from: "2026-01-01" }).total === 0 && b.in === 2000 && b.out === 300 && b.net === 1700 && b.debt === 1000 && b.debts.length === 1 && b.moves[0].id === "inc-p3";
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
  ["akış alanı", F("kuzey rüzgârı güneye akar", () => { const f = WM.fieldOf(WM.frameAt(WM.shapeMap(WJ, WPTS), 0)); const s = WM.sampleField(f, WPTS[0].lat, WPTS[0].lon); return f.rows === 6 && f.cols === 6 && s.v < 0 && Math.abs(s.kn - 8) < 0.01; })],
  ["ara nokta", F("iki nokta arası karışır, dışarısı boş", () => { const fr = [{ r: 0, c: 0, lat: 39, lon: 26, kn: 10, gust: 10, dir: 0 }, { r: 0, c: 1, lat: 39, lon: 26 + WM.STEP_LON, kn: 20, gust: 20, dir: 0 }]; const f = WM.fieldOf(fr); const s = WM.sampleField(f, 39, 26 + WM.STEP_LON / 2); return Math.abs(s.kn - 15) < 0.01 && WM.sampleField(f, 40, 26) === null; })],
  ["renk geçişi", F("ölçek renkleri arası", () => WM.rgbOf(0).join() === "122,166,214" && WM.rgbOf(100).join() === "163,59,156" && WM.rgbOf(11)[0] > 95 && WM.rgbOf(11)[0] < 201)],
  ["günün en serti", F("o günün en yüksek knot'u", () => WM.dayMax({ w: [5, 12, null, 9] }, 0, 4) === 12 && WM.dayMax({ w: [null] }, 0, 1) === null)],
]);

// İnternet göstergesi (netSync.js): üstteki şeridin yazısı. İnternet varken bekleyen kayıt hemen şerit açmaz.
const NS = await import("@/lib/netSync");
group("İnternet göstergesi")([
  ["bağlı, bekleyen yok", F("şerit yok", () => NS.netText({ online: true, pending: false, sent: false }) === "")],
  ["internet yok", F("telefonda saklanır", () => /^İnternet yok · kaydettiklerin telefonda saklanır$/.test(NS.netText({ online: false })))],
  ["internet yok, kayıt var", F("bağlantı gelince gönderilecek", () => /telefonda, bağlantı gelince gönderilecek/.test(NS.netText({ online: false, pending: true })))],
  ["uzun süren gönderim", F("'zayıf' demeden gönderiliyor", () => NS.netText({ online: true, pending: true }) === "Kayıtların gönderiliyor…" && NS.netTone({ online: true, pending: true }) === "wait")],
  ["hepsi gitti", F("gönderildi", () => /gönderildi$/.test(NS.netText({ online: true, sent: true })) && NS.netTone({ online: true }) === "ok")],
  ["bekleme süreleri", F("internetsiz hemen, varken 12 sn sonra; kısa kopma 2,5 sn sayılmaz", () => NS.pendingGrace(false) === 0 && NS.pendingGrace(true) >= 10e3 && NS.OFFLINE_GRACE >= 2000)],
]);

// Kayıt sözü (soon.js settle, lib/firebase/write.js): internetsiz yazma takılmaz, erken hata yine görünür
const SO = await import("@/lib/soon");
const never = () => new Promise(() => {});
const later = (ms, v, bad) => new Promise((res, rej) => setTimeout(() => (bad ? rej(new Error("ret")) : res(v)), ms));
group("Kayıt sözü")([
  ["onay hızlı", F("yazmanın değeri döner", async () => (await SO.settle(later(5, "x"), 60)) === "x")],
  ["onay hiç gelmiyor (internet yok)", F("söz yine biter, takılmaz", async () => (await SO.settle(never(), 40)) === undefined)],
  ["erken ret", F("hata fırlatılır", async () => { try { await SO.settle(later(5, 0, true), 60); return false; } catch (e) { return e.message === "ret"; } })],
  ["geç ret", F("söz biter, hata arkada kalır (ekranda uyarı olayı)", async () => (await SO.settle(later(60, 0, true), 20)) === undefined && (await later(80, true)))],
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
  const on = {};
  globalThis.window = { location: loc, history: { pushState() {}, replaceState() {} }, addEventListener: (k, f) => (on[k] = f) };
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
    const firstOk = once && fell && !NAV.canGoBack();
    // Geri gerçekleşince (popstate) kilit hemen kalkar: dönülen sayfada hemen yeniden geri basılabilir
    calls.length = 0;
    window.history.pushState(null, "", "/inventory/k2");
    window.history.pushState(null, "", "/inventory/k3");
    loc.pathname = "/inventory/k3";
    NAV.goBack(router, "/inventory");
    loc.pathname = "/inventory/k2";
    on.popstate?.();
    NAV.goBack(router, "/inventory");
    const again = calls.join() === "back,back";
    await wait(700);
    return (firstOk && again) || calls.join();
  } finally {
    delete globalThis.window;
    delete globalThis.sessionStorage;
    done();
  }
};
group("Geri düğmesi dokunuşu")([
  ["arka arkaya basış", F("tek geri; tepki yoksa üst sayfa; geri olunca hemen yeniden basılır", backTaps)],
]);

// Kenardan kaydırarak geri (swipeBack.js): yalnız sol kenardan, yana çekişte; yeterince çekilince geri
const SW = await import("@/lib/swipeBack");
group("Kenardan kaydırarak geri")([
  ["kenardan başlar", F("sol kenarda evet, ortada hayır", () => SW.edgeStart(10, "/plans") && !SW.edgeStart(120, "/plans"))],
  ["alt sekme sayfası", F("ana sayfa, takvim, mesajlar, görevlerde çalışmaz", () => !SW.edgeStart(5, "/") && !SW.edgeStart(5, "/messages"))],
  ["yön", F("aşağı kaydırma kaydırmadır, sağa çekiş geridir", () => SW.swipeAxis(3, 30) === "scroll" && SW.swipeAxis(25, 4) === "swipe" && SW.swipeAxis(4, 3) === "")],
  ["bırakınca", F("ekranın üçte biri ya da hızlı çekiş geri; az çekiş geri dönmez", () => SW.swipeDone(150, 400, 430) && SW.swipeDone(60, 80, 430) && !SW.swipeDone(50, 600, 430))],
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
  ["temizleme", F("tek silinir, kalanlar durur; hepsi boşalır", () => {
    let l = NB.inboxAdd([], { title: "A", tag: "task-1", url: "/?open=task:1" }, "2026-10-06T10:00:00.000Z");
    l = NB.inboxAdd(l, { title: "B", tag: "chat-x", url: "/messages?c=x" }, "2026-10-06T11:00:00.000Z");
    const one = NB.inboxDrop(l, [l[0].id]);
    return one.length === 1 && one[0].title === "A" && NB.inboxDrop(l).length === 0;
  })],
  ["dokununca gidilen yer", F("günün özeti Planlar'a, haftalık Takvim'e, adresli olan kendi yerine, yeri olmayan boş", () =>
    NB.inboxLink({ tag: "summary-2026-10-11", url: "/" }) === "/plans" && NB.inboxLink({ tag: "evening-2026-10-11", url: "/" }) === "/plans" &&
    NB.inboxLink({ tag: "weekly-2026-10-12", url: "/calendar" }) === "/calendar" && NB.inboxLink({ tag: "plan-1", url: "/?open=plan:1" }) === "/?open=plan:1" &&
    NB.inboxLink({ tag: "dues-a-2026-10", url: "/" }) === "")],
  ["asistan: temizle", F("temizleme cümleleri; açma/kapatma ve soru değil", () =>
    ["bildirimleri temizle", "bildirimleri sil", "zildeki bildirimleri kaldır", "tüm bildirimleri temizle"].every(NB.inboxClearAsk) &&
    !["bildirimleri aç", "bildirimleri kapat", "bildirimleri sildin mi", "yarın 10'da antrenman ekle"].some(NB.inboxClearAsk))],
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

// Sporcu mesajlarda yalnız ana hesapla ve Sporcular grubunda (src/lib/kinds.js)
const KD = await import("@/lib/kinds");
group("Sporcu mesajları")([
  ["sporcu ↔ ana hesap", F("yazışır", () => KD.canTalk("athlete", "owner") && KD.canTalk("owner", "athlete"))],
  ["sporcu ↔ çalışan", F("yazışmaz", () => !KD.canTalk("athlete", "staff") && !KD.canTalk("staff", "athlete"))],
  ["sporcu ↔ sporcu, veli", F("yazışmaz", () => !KD.canTalk("athlete", "athlete") && !KD.canTalk("athlete", "parent"))],
  ["sporcu grubu", F("Sporcular'da var, Ekip'te yok", () => KD.inGroup("athletes", "athlete") && !KD.inGroup("team", "athlete"))],
  ["grup kurma", F("sporcu kuramaz, çalışan kurar", () => !KD.canGroup("athlete") && KD.canGroup("staff") && KD.canGroup("owner"))],
  ["çalışan ↔ veli", F("değişmedi", () => KD.canTalk("staff", "parent") && KD.canTalk("student", "staff"))],
]);

// Giriş ekranı (src/lib/kinds.js): e-posta ya da kullanıcı adı yazımı canlı denetlenir, hep küçük harfe çevrilir
group("Giriş ekranı")([
  ["e-posta", F("tamamı yazılınca doğru", () => KD.validLogin("Seyhun@Gmail.com") && !KD.validLogin("seyhun@gm") && !KD.validLogin("seyhun@gmail."))],
  ["kullanıcı adı", F("3-30 karakter, harf rakam nokta", () => KD.validLogin("ege.demir") && !KD.validLogin("eg") && !KD.validLogin(".ege") && !KD.validLogin("ege demir!"))],
  ["büyük I", F("ILAY → ilay (ılay değil)", () => KD.cleanLogin("ILAY") === "ilay" && KD.loginEmail("ILAY") === `ilay@${KD.USER_DOMAIN}`)],
  ["Türkçe harf", F("çağan → cagan, kullanıcı adı gibi", () => KD.cleanLogin("Çağan.Yılmaz") === "cagan.yilmaz" && KD.cleanLogin("Çağan.Yılmaz") === KD.suggestUsername("Çağan Yılmaz"))],
  ["e-postada I", F("küçük i olur", () => KD.loginEmail(" ALI@Mail.com ") === "ali@mail.com")],
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
  ["YouTube bağlantısı", F("watch, youtu.be, shorts, m., t=1m30s; YouTube olmayan atılır; harekete kaydedilir", async () => {
    const Y = await import("@/lib/fitness/youtube");
    const FMY = await import("@/lib/fitness/model");
    const id = "dQw4w9WgXcQ";
    const it = FMY.cleanItem({ ex: "squat", yt: `https://youtu.be/${id}?t=1m30s` });
    return Y.ytId(`https://www.youtube.com/watch?v=${id}&list=x`) === id && Y.ytId(`youtu.be/${id}`) === id && Y.ytId(`https://youtube.com/shorts/${id}`) === id && Y.ytId(`https://m.youtube.com/watch?v=${id}`) === id &&
      Y.ytId("https://vimeo.com/123") === "" && Y.ytId("merhaba") === "" && Y.cleanYt("https://example.com/watch?v=" + id) === null &&
      it.yt?.id === id && it.yt.start === 90 && !FMY.cleanItem({ ex: "squat", yt: "kötü" }).yt && FMY.cleanItem({ ex: "squat", yt: { id } }).yt.id === id &&
      Y.ytEmbed(id, 90).startsWith("https://www.youtube-nocookie.com/embed/" + id) && Y.ytEmbed(id, 90).includes("start=90");
  })],
  ["fotoğraf/video bağlantısı", F("https fotoğraf ve .mp4 video bağlantısı harekete kaydedilir; http ve yazı atılır", () => {
    const p = FM2.linkMedia("https://ornek.com/a/squat.jpg");
    const v = FM2.linkMedia("https://ornek.com/squat.MP4?x=1");
    const it = FM2.cleanItem({ ex: "squat", media: [p, v, { id: "lnk-k", kind: "photo", url: "http://kotu.com/a.jpg", link: true }] });
    return p?.kind === "photo" && p.link && v?.kind === "video" && FM2.linkMedia("http://a.com/x.jpg") === null && FM2.linkMedia("merhaba") === null &&
      it.media.length === 2 && it.media[0].url === p.url && it.media[1].kind === "video" && it.media.every((m) => m.link);
  })],
  ["hareket tarifi", F("her harekette 3+ adımlı Türkçe tarif; hazır örnek fotoğraf yok", async () => {
    const XG = await import("@/lib/fitness/exerciseGuide");
    const allGuide = FX.EXERCISES.every((e) => XG.guideSteps(e.id).length >= 3);
    return allGuide && XG.stockPhotos === undefined && XG.guideSteps("yok").length === 0;
  })],
  ["hareket listesi", F("kimlikler tekrarsız, her grup dolu", () => new Set(FX.EXERCISES.map((e) => e.id)).size === FX.EXERCISES.length && FX.GROUPS.every((g) => FX.EXERCISES.some((e) => e.group === g)))],
  ["söylenen hareket", F("şınav, sınav (ses), squat, plank, mekik, dambıl lunge", () => FX.findExercise("şınav")?.id === "pushup" && FX.findExercise("sınavlar")?.id === "pushup" && FX.findExercise("Squat")?.id === "squat" && FX.findExercise("plank")?.id === "plank" && FX.findExercise("mekik")?.id === "crunch" && FX.findExercise("dambıl lunge")?.id === "db-lunge" && FX.findExercise("asdf") === null)],
  ["program listesi (kopyala)", F("kime, yaş, spor, hedef, gün gün hareketler set × tekrar", () => {
    const t = FM2.programText({ ...PROG, goal: "kondisyon", level: "yeni", for: "u1", forName: "Ali Kaya", sport: "yelken" }, { age: 12 });
    return t.startsWith("Ali Kaya için fitness programı") && t.includes("12 yaş · Spor: Yelken") && t.includes("Hedef: Kondisyon") && t.includes("Haftada 3 gün · 2 hafta") &&
      t.includes("Pazartesi 07:00 · Üst vücut (45 dk)") && t.includes("2. Şınav — 3 × 12") && t.includes("3 × 10 · 12 kg") && t.includes("Plank — 3 × 30 sn") && !t.includes("undefined") &&
      FM2.programText({ ...PROG }).startsWith("3 günlük");
  })],
  ["devam ettir (seviye)", F("her seviye tekrara +2, en çok 5 seviye; süreli/kardiyo aynı; kimlik silinir", () => {
    const src = { ...PROG, id: "p1", notifiedAt: 1, plansAt: 2, active: true, for: "u1" };
    const a = FM2.levelUp(src, 1), c = FM2.levelUp(src, 3), z = FM2.levelUp(src, 9);
    const r0 = PROG.days[0].items.find((i) => i.kind === "reps");
    const r = (x) => x.days[0].items.find((i) => i.kind === "reps").reps;
    return r(a) === r0.reps + 2 && r(c) === r0.reps + 6 && r(z) === r0.reps + 10 && FM2.LEVEL_MAX === 5 &&
      a.days[1].items[1].sec === 30 && a.days[2].items[0].min === 20 && !a.id && !a.notifiedAt && !a.plansAt && a.for === "u1" && r(src) === r0.reps;
  })],
  ["başka sporcuya ver", F("kopya yeni sporcuya, yaş doğum tarihinden, başlangıç seçilen; bitiş tarihi", () => {
    const src = { ...PROG, id: "p1", notifiedAt: 1, for: "u1", forName: "Ali Kaya" };
    const k = FM2.copyFor(src, { uid: "u2", name: "Zeynep Demir", birth: "2014-03-01" }, "2026-10-20", "2026-10-15");
    return !k.id && !k.notifiedAt && k.for === "u2" && k.forName === "Zeynep Demir" && k.forAge === 12 && k.start === "2026-10-20" &&
      k.days.length === PROG.days.length && k.days[0].items !== src.days[0].items && FM2.progEnd({ start: "2026-10-12", weeks: 2 }) === "2026-10-26" && FM2.progEnd({}) === "";
  })],
  ["sporcuya gönder (ad eki)", F("Ali'ye, Zeynep'e, Mete'ye, Efe'ye, Umut'a", () => ["Ali Kaya", "Zeynep Demir", "Mete", "Efe Öz", "Umut"].map(FM2.toName).join(",") === "Ali'ye,Zeynep'e,Mete'ye,Efe'ye,Umut'a")],
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
  ["sporcu yaşı", F("doğum tarihinden yaş (doğum günü gelmeden bir eksik)", () => FM2.ageFrom("2013-11-20", "2026-10-13") === 12 && FM2.ageFrom("2013-10-13T00:00:00.000Z", "2026-10-13") === 13 && FM2.ageFrom("", "2026-10-13") === 0)],
  ["sporcu yaşı", F("yaş grubu ve cinsiyet", () => FM2.ageGroupOf(12) === "11-12" && FM2.ageGroupOf(19) === "18+" && FM2.ageGroupOf(0) === "" && FM2.sexFrom("Kız") === "k" && FM2.sexFrom("Erkek") === "e")],
  ["sporcu sporu", F("spor profilde kalır, bilinmeyen atılır", () => FM2.cleanProfile({ sport: "yelken", age: 9 }).sport === "yelken" && FM2.cleanProfile({ age: 9 }).age === 9 && FM2.cleanProfile({ sport: "golf" }).sport === "")],
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
  ["tanıtım tahmini", F("boy/kilo yoksa yok; 82 kg 175 cm: 8 haftada 78-80 kg, VKİ 26,8, yeni erkek +1-1,5 kg kas", async () => {
    const FC = await import("@/lib/fitness/forecast");
    const me = { height: 175, weight: 82, sex: "e", level: "yeni" };
    const k = FC.forecast("kilo", me), m = FC.forecast("kas", me), s = FC.forecast("saglik", me);
    return FC.forecast("kilo", { weight: 82 }) === null && k.then === "≈ 78-80 kg" && FC.bmiOf(me) === 26.8 && s.now === "Şu an VKİ 26,8 · Fazla kilolu" && m.then === "+1-1,5 kg kas" &&
      FC.forecast("kilo", { height: 175, weight: 60 }).then === "Kilon sağlıklı";
  })],
  ["adım adım: sıradaki set", F("ilk yapılmamış set, sonraki harekete geçer, hepsi bitince null", () => { const s = [[{ ok: true }, { ok: false }], [{ ok: false }]]; return FM2.nextOpen(s)?.i === 0 && FM2.nextOpen(s).k === 1 && FM2.nextOpen(s, 0, 2)?.i === 1 && FM2.nextOpen([[{ ok: true }]]) === null; })],
  ["adım adım: − / +", F("tekrar 1, kilo 2,5, saniye 5; sıfırın altına inmez", () => FM2.bump("10", "reps", 1) === "11" && FM2.bump("40", "kg", -1) === "37.5" && FM2.bump("30", "sec", 1) === "35" && FM2.bump("1", "reps", -1) === "")],
  ["sporcu: bugünkü ya da sıradaki", F("yalnız kendi antrenmanı, yapılmışı atlar", () => { const u = "s1"; const ps = [FPL("2026-10-13", SQ, { st: "done" }, { id: "a", fit2: 1 }), FPL("2026-10-15", SQ, null, { id: "b" }), FPL("2026-10-14", SQ, null, { id: "c" })].map((p, n) => ({ ...p, fit: { ...p.fit, for: n === 2 ? "x" : u } })); const r = FM2.athleteNext(ps, u, "2026-10-13"); return r && !r.today && r.plan.date === "2026-10-15" && FM2.myFit(ps, u).length === 2 && FM2.athleteNext([], u, "2026-10-13") === null; })],
  ["sporcu kısayolu", F("sporcuda yalnız antrenmanı varsa Fitness", async () => { const H = await import("@/lib/homeTiles"); const has = (o) => H.homeActions(o).some((g) => g.items.some((a) => a.href === "/fitness")); return has({ staff: false }) && !has({ staff: true }) && has({ staff: true, fit: true }); })],
]);

// Fitness: ana hesabın sporcuya hazırladığı program (fit.for)
group("Fitness: sporcu programı")([
  ["hareket fotoğraf/video", F("harekette media künyesi korunur, en çok 3, bozuk olan atılır; programdan plana geçer", () => {
    const m = [{ id: "a1", kind: "photo", type: "image/jpeg", size: 1000, parts: 1 }, { id: "a2", kind: "video", type: "video/mp4", size: 3e6, parts: 4 }, { id: "", kind: "photo" }, { id: "x", kind: "gif" }, { id: "a3", kind: "video", parts: 99 }, { id: "a4", kind: "photo" }];
    const it = FM2.cleanItem({ name: "Squat", sets: 3, reps: 10, media: m });
    const plain = FM2.cleanItem({ name: "Squat" });
    const prog = FM2.cleanProgram({ title: "P", start: "2026-10-12", weeks: 1, days: [{ dow: 1, items: [{ name: "Squat", media: m.slice(0, 1) }] }] });
    return it.media.length === 3 && it.media.map((x) => x.id).join() === "a1,a2,a3" && it.media[2].parts === 40 && !("media" in plain) &&
      FM2.planDrafts({ ...prog, id: "p" }).every((p) => p.fit.items[0].media?.[0]?.id === "a1");
  })],
  ["başkasının antrenmanı", F("fit.for başka kişi → ana hesabın takvimine girmez; kendisininki ve fit.for'suz girer", () =>
    FM2.isOthers(FPL("2026-10-12", SQ, null, { fit: { prog: "p1", for: "ali" } }), "me") && !FM2.isOthers(FPL("2026-10-12", SQ, null, { fit: { prog: "p1", for: "ali" } }), "ali") && !FM2.isOthers(FPL("2026-10-12", SQ), "me"))],
  ["sporcular listesi", F("programı ya da antrenmanı olan sporcu; bu hafta 1/2, son ve sıradaki; programsız sporcu listede yok", () => {
    const pl = [
      FPL("2026-10-12", SQ, { st: "done", ex: [] }, { id: "a", fit: { prog: "pa", for: "ali", items: SQ, res: { st: "done", ex: [] } } }),
      FPL("2026-10-14", SQ, null, { id: "b", fit: { prog: "pa", for: "ali", items: SQ } }),
      FPL("2026-10-14", SQ, null, { id: "c", fit: { prog: "pz", for: "zey", items: SQ } }),
    ];
    const rows = FM2.athleteRows([{ id: "pa", for: "ali", active: true, title: "Ali programı" }], pl, [{ uid: "zey", name: "Zeynep" }, { uid: "ali", name: "Ali" }, { uid: "can", name: "Can" }], "2026-10-13");
    return rows.length === 2 && rows[0].name === "Ali" && rows[0].prog?.title === "Ali programı" && rows[0].week.done === 1 && rows[0].week.planned === 2 &&
      rows[0].last?.date === "2026-10-12" && rows[0].next?.date === "2026-10-14" && rows[1].name === "Zeynep" && rows[1].prog === null;
  })],
  ["sporcu antrenman listesi", F("bugünden ileriye yakından uzağa; ilk hafta, Daha fazla ile her seferinde bir hafta", () => {
    const P = (date) => ({ id: date, cat: "Fitness", date, fit: { prog: "p", for: "ali", items: [] } });
    const pl = [P("2026-10-24"), P("2026-10-15"), P("2026-10-19"), P("2026-10-29"), P("2026-10-23"), P("2026-11-06")];
    const a = FM2.upcomingList(pl, "2026-10-17", 1), b = FM2.upcomingList(pl, "2026-10-17", 2), c = FM2.upcomingList(pl, "2026-10-17", 3);
    return a.list.map((p) => p.date.slice(8)).join(",") === "19,23" && a.more && b.list.map((p) => p.date.slice(8)).join(",") === "19,23,24,29" && b.more && c.list.length === 5 && !c.more;
  })],
  ["kopya program", F("başka sporcuya verilen program etkin görünmese de sporcunun programı sayılır (Programı düzenle, Değerlendirme çıkar)", () => {
    const progs = [{ id: "pb", for: "zey", active: false, title: "Kopya" }, { id: "pa", for: "ali", active: true, title: "Ali" }, { id: "po", for: "ali", active: false, title: "Eski" }];
    const rows = FM2.athleteRows(progs, [], [{ uid: "zey", name: "Zeynep" }, { uid: "ali", name: "Ali" }], "2026-10-13");
    return rows.length === 2 && rows.find((r) => r.uid === "zey").prog?.id === "pb" && rows.find((r) => r.uid === "ali").prog?.id === "pa";
  })],
  ["günün listesi", F("o günün sporcu antrenmanları: önce bekleyen, sonra yapan; özet satırı", () => {
    const pl = [
      FPL("2026-10-13", SQ, null, { id: "a", fit: { prog: "pa", for: "ali", items: SQ, res: { st: "done", ex: [] } } }),
      FPL("2026-10-13", SQ, null, { id: "b", fit: { prog: "pz", for: "zey", items: SQ } }),
      FPL("2026-10-14", SQ, null, { id: "c", fit: { prog: "pz", for: "zey", items: SQ } }),
    ];
    const rows = FM2.dayRows(pl, [{ uid: "ali", name: "Ali" }, { uid: "zey", name: "Zeynep" }], "2026-10-13", "2026-10-13");
    return rows.length === 2 && rows[0].name === "Zeynep" && rows[0].st === "today" && rows[1].st === "done" && FM2.dayLine(rows) === "Bugün 2 sporcu: 1 yaptı, 1 bekliyor" && FM2.dayLine([]) === "";
  })],
  ["sesli komutlar", F("sporcu: bugünkü ne / başla / yaptım; ana hesap: sporcular yaptı mı", async () => {
    const W = await import("@/lib/fitness/words");
    return W.fitLocal("bugünkü antrenmanım ne")?.op === "today" && W.fitLocal("antrenmana başla")?.op === "start" && W.fitLocal("bugünkü antrenmanı yaptım")?.op === "done" &&
      W.fitLocal("sporcular bugün antrenman yaptı mı")?.op === "athletes" && W.fitLocal("kimler fitness antrenmanı yapmadı")?.op === "athletes" && W.fitLocal("Ali için fitness programı hazırla") === null;
  })],
  ["fitness sıfırla (sesle)", F("“fitness'ı sıfırla”, “bütün fitness programlarını sil”; program silme ve takvim ayrı kalır", async () => {
    const W = await import("@/lib/fitness/words");
    return W.fitLocal("fitness'ı sıfırla")?.op === "reset" && W.fitLocal("bütün fitness programlarını sil")?.op === "reset" && W.fitLocal("fitness programını takvimden kaldır")?.op === "unplan" && W.fitLocal("bugünkü antrenmanı yaptım")?.op === "done";
  })],
  ["hareket dosyası Storage adresi", F("künyede yalnız firebasestorage adresi kalır", async () => {
    const FM = await import("@/lib/fitness/model");
    const ok = FM.cleanMedia([{ id: "a", kind: "video", url: "https://firebasestorage.googleapis.com/v0/b/x/o/orgs%2Fo%2FfitMedia%2Fa?alt=media&token=t" }])[0];
    const bad = FM.cleanMedia([{ id: "b", kind: "photo", url: "https://kotu.example.com/a.jpg" }])[0];
    return !!ok.url && !("url" in bad);
  })],
  ["antrenman ekranı sözleri", F("tamam/sonraki, atla, 15 saniye, nasıl yapılır, bitir, zor geçti; uzun cümle değil", async () => {
    const W = await import("@/lib/fitness/words");
    const g = (x) => W.guideWord(x)?.op;
    return g("tamam") === "done" && g("sonraki") === "done" && g("seti bitirdim") === "done" && g("set tamam") === "done" && g("bu hareketi atla") === "skip" && g("15 saniye ekle") === "more" &&
      g("nasıl yapılır") === "how" && g("antrenmanı bitir") === "finish" && W.guideWord("zor geçti")?.k === 1 && W.guideWord("kolay")?.k === 3 && !g("yarın saat 10'da Ali'ye mesaj at");
  })],
  ["sporcu adı", F("cümlede geçen sporcu; adı yapay zekaya gitmez", async () => {
    const W = await import("@/lib/fitness/words");
    const P = [{ uid: "a", name: "Ali Kaya" }, { uid: "b", name: "Alişan Er" }, { uid: "c", name: "Zeynep Ak" }];
    return W.athleteIn("Ali için program hazırla", P)?.uid === "a" && W.athleteIn("Alişan bu hafta kaç antrenman yaptı", P)?.uid === "b" && W.athleteIn("Zeynep'in antrenmanı", P)?.uid === "c" &&
      W.athleteIn("program hazırla", P) === null && W.withoutName("Ali için haftada 3 gün program hazırla", "Ali Kaya") === "haftada 3 gün program hazırla";
  })],
]);

// Beslenme (lib/fitness/food.js): hedef, su/kilo/özet sözleri, yemek cümlesi, kilo eğilimi, gün temizliği
const FD = await import("@/lib/fitness/food");
group("Beslenme")([
  ["günlük hedef", F("82 kg 178 cm 40 yaş erkek kilo vermek: 2070 kcal, 148 g protein, 11 bardak; boy yoksa yok", () => {
    const t = FD.targets({ weight: 82, height: 178, age: 40, sex: "e", goal: "kilo" }, 3);
    return t.kcal === 2070 && t.p === 148 && t.water === 11 && t.c > 50 && FD.targets({ weight: 82 }) === null;
  })],
  ["kadında alt sınır", F("çok düşük kalori 1300'ün altına inmez", () => FD.targets({ weight: 40, height: 140, age: 70, sex: "k", goal: "kilo" }, 0).kcal === 1300)],
  ["su sözleri", F("2 bardak, yarım litre, 1,5 litre, bir şişe, sade 'su içtim'", () =>
    FD.foodLocal("2 bardak su içtim")?.n === 2 && FD.foodLocal("yarım litre su içtim")?.n === 2 && FD.foodLocal("1,5 litre su içtim")?.n === 6 && FD.foodLocal("bir şişe su içtim")?.n === 2 && FD.foodLocal("su içtim")?.n === 1)],
  ["kilo sözleri", F("kilom 82, tartıldım 81,5, 80 kilo geldim; 'kilo vermek istiyorum' değil", () =>
    FD.foodLocal("kilom 82")?.kg === 82 && FD.foodLocal("tartıldım 81,5")?.kg === 81.5 && FD.foodLocal("80 kilo geldim")?.kg === 80 && !FD.weightSaid("5 kilo vermek istiyorum"))],
  ["gün özeti sorusu", F("bugün kaç kalori / protein aldım", () => FD.foodLocal("bugün kaç kalori aldım")?.op === "stats" && FD.foodLocal("bugün kaç protein aldım")?.op === "stats")],
  ["yemek cümlesi", F("yedim/içtim beslenme; yemek planlamak, mesaj, alışveriş değil; yemek + su yapay zekaya", () =>
    FD.wantsFood("öğlen tavuk pilav ve ayran içtim") && FD.wantsFood("kahvaltıda 2 yumurta yedim") && !FD.wantsFood("yarın akşam yemeği planla") &&
    !FD.wantsFood("Ali'ye mesaj at öğlen yemeği yedin mi") && !FD.wantsFood("listeye ayran ekle") && FD.foodLocal("tavuk yedim, 2 bardak su içtim") === null)],
  ["Beslenme sekmesinde", F("öğün + yemek adı yeterli", () => FD.wantsFood("öğle mercimek çorbası", true) && !FD.wantsFood("öğle mercimek çorbası"))],
  ["öğün", F("saate göre ve cümleden", () => FD.slotOf("08:30") === "kahvalti" && FD.slotOf("13:00") === "ogle" && FD.slotOf("20:00") === "aksam" && FD.slotOf("16:30") === "ara" && FD.slotFromText("akşam köfte yedim") === "aksam")],
  ["temizlik ve toplam", F("adsız yemek atılır, kalori sınırı, toplam", () => {
    const d = FD.cleanDay({ meals: [{ name: "Pilav", kcal: "520", p: "12,4" }, { name: "" }, { name: "Ayran", kcal: 99999 }], water: 3 });
    const t = FD.totals(d.meals);
    return d.meals.length === 2 && d.meals[1].kcal === 4000 && t.kcal === 4520 && t.p === 12.4 && d.water === 3;
  })],
  ["kilo eğilimi", F("aynı gün sonuncusu kalır; 30 günlük fark", () => {
    const w = FD.addWeight([{ d: "2026-09-12", kg: 84 }, { d: "2026-10-10", kg: 83 }], "2026-10-10", 82.4);
    const t = FD.weightTrend(w, "2026-10-10");
    return w.length === 2 && t.last.kg === 82.4 && t.diff === -1.6;
  })],
  ["hafta ve sık yenenler", F("7 gün, ay sınırını aşar; en sık yenen önce", () => {
    const months = { "2026-09": { days: { 30: { meals: [{ name: "Pilav", kcal: 500 }] } } }, "2026-10": { days: { 1: { meals: [{ name: "Pilav", kcal: 500 }, { name: "Elma", kcal: 80 }] } } } };
    const w = FD.weekKcal(months, "2026-10-03");
    return w.length === 7 && w[3].kcal === 500 && w[4].kcal === 580 && FD.frequent(months)[0].name === "Pilav";
  })],
  ["özet cümlesi", F("kalan kalori ve su", () => FD.dayLine({ meals: [{ kcal: 1500, p: 80 }], water: 4 }, { kcal: 2000, p: 140 }) === "Bugün 1500 kalori (hedef 2000, 500 kaldı), 80 g protein / 140, 4 bardak su.")],
]);

// Plan bitti (Arşiv'e gider) ve İngilizce kelime kartı
const HTP = await import("@/lib/homeTiles");
const EW = await import("@/lib/englishWords");
group("Plan bitti ve kelime kartı")([
  ["bitti yaması", F("done + doneAt, geri al temizler", () => {
    const d = PA.planDonePatch("2026-10-10T10:00:00Z");
    const r = PA.planReopenPatch();
    return d.done === true && d.doneAt === "2026-10-10T10:00:00Z" && r.done === false && r.doneAt === null && PA.isPlanDone(d) && !PA.isPlanDone(r);
  })],
  ["Sırada listesi bitenleri saymaz", F("biten plan atlanır", () => {
    const ps = [{ id: "a", title: "Bitti", date: "2026-10-10", time: "23:00", done: true }, { id: "b", title: "Açık", date: "2026-10-10", time: "23:30" }];
    return HTP.upcoming(ps, "2026-10-10", new Date("2026-10-10T20:00:00"), 4)[0]?.p.id === "b";
  })],
  ["hatırlatma bitenleri atlar", F("biten plana hatırlatma yok", () => RM.dueReminders([{ ...RP, done: true }], { lead: 30, now: new Date("2026-10-05T09:31:00") }).length === 0)],
  ["kelime listesi", F("en az 150, alanlar dolu, tekrar yok", () => {
    const ws = EW.WORDS.map((x) => x[0].toLowerCase());
    return EW.WORDS.length >= 150 && EW.WORDS.every((x) => x.length === 5 && x.every((v) => typeof v === "string" && v.trim())) && new Set(ws).size === ws.length;
  })],
  ["kelime sırası", F("karışık sıra her kelimeyi bir kez verir, liste bitene kadar tekrar yok", () => {
    const o = EW.wordOrder();
    const seen = new Set(Array.from({ length: o.length }, (_, i) => EW.wordAt(i, o).w));
    return new Set(o).size === EW.WORDS.length && seen.size === EW.WORDS.length && EW.wordAt(o.length, o).w === EW.wordAt(0, o).w;
  })],
  ["sıradaki kelime saklanır", F("her okumada bir ilerler", () => {
    const m = new Map();
    const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    const a = EW.nextWordIndex(st);
    const b = EW.nextWordIndex(st);
    return b === a + 1;
  })],
]);

// İngilizce kelime çalışma: Firestore destesi (orgs/{orgId}/english/deck), aralıklı tekrar, widget kartı, asistan cümleleri
{
  const T = "2026-10-22";
  const R = { en: "resilient", type: "sıfat", tr: "dirençli", ex: "Kids are resilient.", exTr: "Çocuklar dirençlidir." };
  const seeded = () => EW.seedDeck(null).deck;
  group("İngilizce kelime çalışma")([
    ["deste tohumu", F("gömülü listenin tamamı, hepsi liste", () => { const { deck, changed } = EW.seedDeck(null); return changed && deck.words.length === EW.WORDS.length + 100 && deck.words.every((w) => w.status === "list") && deck.seedV === EW.SEED_V && EW.ofKind(deck, "phrase").length === 100; })],
    ["tohum bir kez", F("güncel deste yeniden yazılmaz", () => !EW.seedDeck(seeded()).changed)],
    ["eksik kelime eklenir", F("eski destede kendi kelimesi ve durumu kalır", () => {
      const old = { words: [{ ...R, status: "study", box: 2, due: T }, { en: "achieve", tr: "başarmak", status: "known" }], seedV: 1 };
      const { deck, changed } = EW.seedDeck(old);
      return changed && deck.words.length === EW.WORDS.length + 101 && EW.findWord(deck, "resilient").box === 2 && EW.findWord(deck, "achieve").status === "known";
    })],
    ["çalışmaya al", F("ilk gün hemen kartta, çalış işaretiyle", () => { const d = EW.studyWord(seeded(), R, T); const c = EW.pickCard(d, T, 5); return c.en === "resilient" && c.study === true; })],
    ["tekrar aralığı", F("1, 2, 4 gün sonra; aynı gün ikinci gösterim saymaz", () => {
      let d = EW.studyWord(seeded(), R, T);
      d = EW.reviewWord(d, "resilient", T);
      const a = EW.findWord(d, "resilient").due;
      d = EW.reviewWord(d, "resilient", T);
      const same = EW.findWord(d, "resilient").due;
      d = EW.reviewWord(d, "resilient", "2026-10-23");
      const b = EW.findWord(d, "resilient").due;
      d = EW.reviewWord(d, "resilient", "2026-10-25");
      return a === "2026-10-23" && same === a && b === "2026-10-25" && EW.findWord(d, "resilient").due === "2026-10-29" && !EW.pickCard(d, "2026-10-26", 0).study;
    })],
    ["son aralık tekrar eder", F("öğrendim denene kadar 14 günde bir", () => {
      let d = { ...EW.studyWord(seeded(), R, T), gaps: [1, 3] };
      for (const day of ["2026-10-22", "2026-10-23", "2026-10-26"]) d = EW.reviewWord(d, "resilient", day);
      return EW.findWord(d, "resilient").due === "2026-10-29" && EW.findWord(d, "resilient").status === "study";
    })],
    ["öğrendim", F("artık kartta ve widget'ta yok", () => {
      const d = EW.knowWord(EW.studyWord(seeded(), R, T), "resilient");
      return EW.findWord(d, "resilient").status === "known" && !EW.pickCard(d, T, 0).study && EW.widgetWord(d, T).en !== "resilient";
    })],
    ["widget kartı", F("çalışma kelimesi önce, alanlar tam", () => {
      const d = EW.reviewWord(EW.studyWord(seeded(), R, T), "resilient", T);
      const w = EW.widgetWord(d, "2026-10-22");
      return w.en === "resilient" && w.study === true && ["en", "type", "tr", "ex", "exTr", "study"].every((k) => k in w);
    })],
    ["widget çalışma yokken", F("listeden günün kelimesi, gün boyu aynı", () => { const a = EW.widgetWord(seeded(), T); return a.study === false && a.en && EW.widgetWord(seeded(), T).en === a.en; })],
    ["cihaz kopyası", F("yazılan deste geri okunur", () => {
      const m = new Map();
      const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
      EW.keepDeck(EW.studyWord(seeded(), R, T), st);
      return EW.findWord(EW.cachedDeck(st), "resilient")?.status === "study";
    })],
    ["kartta Çalış", F("listedeki kelime çalışmaya girer, bugünkü tekrarı sayılır (yarın gelir)", () => {
      const d0 = seeded();
      const w = EW.pickCard(d0, T, 0);
      const d = EW.reviewWord(EW.studyWord(d0, w, T), w.en, T);
      const x = EW.findWord(d, w.en);
      return x.status === "study" && x.due === "2026-10-23" && d.words.length === d0.words.length && EW.pickCard(d, "2026-10-23", 0).en === w.en;
    })],
    ["kart ve widget cümle seçmez", F("listeden yalnız kelime", () => { const d = seeded(); return Array.from({ length: 40 }, (_, i) => EW.pickCard(d, T, i)).every((c) => c.type !== "cümle") && EW.widgetWord(d, T).type !== "cümle"; })],
    ["sayfa sayıları", F("kelime ve cümle ayrı", () => { const d = EW.knowWord(EW.studyWord(seeded(), R, T), "achieve", T); const w = EW.deckCounts(d, "word"); const p = EW.deckCounts(d, "phrase"); return w.study === 1 && w.known === 1 && w.list === EW.WORDS.length - 1 && p.list === 100 && p.known === 0; })],
    ["sayfa sıradaki", F("çalışılan önce, Sonraki geçer, hepsi geçilince baştan", () => {
      const d = EW.studyWord(seeded(), R, T);
      const a = EW.pageCard(d, { kind: "word", today: T });
      const b = EW.pageCard(d, { kind: "word", today: T, skip: [a.en] });
      const all = EW.ofKind(d, "word").map((w) => w.en);
      return a.en === "resilient" && b.en !== "resilient" && b.status === "list" && EW.pageCard(d, { kind: "word", today: T, skip: all }).en === "resilient";
    })],
    ["cümle konusu", F("konuya dokununca kart o konudan", () => { const c = EW.pageCard(seeded(), { kind: "phrase", today: T, topic: "Yarış ve spor" }); return c.topic === "Yarış ve spor" && c.kind === "phrase"; })],
    ["öğrendiklerim", F("öğrenme günüyle, en yeni önce; konu sayısı artar", () => {
      let d = EW.knowWord(seeded(), "achieve", "2026-10-20");
      d = EW.knowWord(d, "Could you give me a hand?", T);
      d = EW.knowWord(d, "adapt", T);
      const k = EW.knownList(d, "word");
      return k.map((w) => w.en).join() === "adapt,achieve" && k[0].kd === T && EW.topicStats(d)[0].known === 1 && EW.topicStats(d).length === 4;
    })],
    ["cümle ekle cümlesi", F("İngilizce söylenen cümle", () => JSON.stringify(EW.wordCommand("could you give me a hand cümlesini ekle")) === '{"op":"study","word":"could you give me a hand","kind":"phrase"}')],
    ["Türkçe cümle değil", F("bu cümleyi not al / kaydet", () => !EW.wordCommand("bu cümleyi not al") && !EW.wordCommand("bu cümleyi kaydet"))],
    ["ekle cümlesi", F("kelime ve çalıştır", () => JSON.stringify(EW.wordCommand("resilient kelimesini ekle, bana çalıştır")) === '{"op":"study","word":"resilient"}')],
    ["deyim", F("iki kelimeli", () => EW.wordCommand("İngilizce take off kelimesini çalışma listeme ekle")?.word === "take off")],
    ["öğrendim cümlesi", F("known", () => EW.wordCommand("resilient kelimesini öğrendim")?.op === "known")],
    ["çıkar cümlesi", F("drop", () => EW.wordCommand("resilient kelimesini çalışmadan çıkar")?.op === "drop")],
    ["aralık cümlesi", F("her gün, 2 günde bir, 1 3 7", () => EW.wordCommand("kelimeleri her gün göster")?.gaps?.join() === "1" && EW.wordCommand("kelimeleri iki günde bir göster")?.gaps?.join() === "2" && EW.wordCommand("kelime tekrarını 1 3 7 gün yap")?.gaps?.join() === "1,3,7")],
    ["başka cümleler değil", F("kelime geçmeyen cümle", () => !EW.wordCommand("yarın 10'da toplantı ekle") && !EW.wordCommand("not al: yeni kelime öğrendim"))],
  ]);
}

// İngilizce sayfası (2026-10-26): ek örnekler (ex2, dlg) desteye yazılır, Sına üç soru, yanlışta yarına kalır
{
  const T = "2026-10-26";
  const deck = EW.seedDeck(null).deck;
  const R = { en: "resilient", type: "sıfat", tr: "dirençli", ex: "Kids are resilient.", exTr: "Çocuklar dirençlidir.", kind: "word" };
  const M = { ex2: [{ e: "Our team was resilient after the loss.", t: "Takımımız kayıptan sonra çabuk toparlandı." }], dlg: [{ e: "How is he?", t: "Nasıl?" }, { e: "Fine, he is resilient.", t: "İyi, dirençli." }] };
  const withR = () => EW.studyWord(deck, R, T);
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  group("İngilizce sayfası: örnekler ve Sına")([
    ["ek örnek kaydı", F("ex2 ve dlg temizlenip kalır", () => { const w = EW.findWord(EW.cleanDeck(EW.setMore(withR(), "resilient", M)), "resilient"); return w.ex2.length === 1 && w.dlg.length === 2 && EW.hasMore(w); })],
    ["boş ek örnek yazılmaz", F("alan hiç yok", () => { const w = EW.cleanWord(R); return !("ex2" in w) && !("dlg" in w) && !EW.hasMore(w); })],
    ["sınır", F("en çok 3 cümle, 4 satır", () => { const w = EW.cleanWord({ ...R, ex2: Array(6).fill({ e: "a", t: "b" }), dlg: Array(9).fill({ e: "a", t: "b" }) }); return w.ex2.length === 3 && w.dlg.length === 4; })],
    ["örnek cümleler", F("kendi örneği önce, tekrar etmez", () => { const s = EW.sentencesOf({ ...R, ex2: [{ e: "kids are resilient." }, ...M.ex2] }); return s.length === 2 && s[0].e === R.ex; })],
    ["kelime sınavı", F("anlam, boşluk, dinle; 4 farklı şık, doğru şık içinde", () => {
      const qs = EW.quizFor(EW.setMore(withR(), "resilient", M), { ...R, ...M }, rnd);
      return qs.map((q) => q.kind).join() === "mean,blank,listen" && qs.every((q) => q.opts.length === 4 && new Set(q.opts).size === 4 && q.ok >= 0) && qs[0].opts[qs[0].ok] === "dirençli" && qs[1].ask.includes("___") && qs[1].opts[qs[1].ok].toLowerCase() === "resilient";
    })],
    ["cümlede geçmezse", F("Türkçesinden İngilizcesi", () => EW.quizFor(deck, { ...R, ex: "" }, rnd)[1].kind === "en")],
    ["cümle sınavı", F("anlam, İngilizcesi, dinle", () => { const p = EW.ofKind(deck, "phrase")[0]; const qs = EW.quizFor(deck, p, rnd); return qs.map((q) => q.kind).join() === "mean,en,listen" && qs[1].opts[qs[1].ok] === p.en; })],
    ["yanlışsa yarın", F("çalışmaya girer, kutu 0, yarın", () => { const w = EW.findWord(EW.missWord(deck, R, T), "resilient"); return w.status === "study" && w.box === 0 && w.due === "2026-10-27"; })],
    ["doğruysa öğrenildi", F("known", () => EW.findWord(EW.knowWord(withR(), "resilient", T), "resilient").status === "known")],
  ]);
}

const DB = await import("@/lib/debts");
{
  const D = (o) => DB.cleanDebt({ who: "Ali Kaya", amount: 1000, date: "2026-10-01", ...o });
  const list = [D({ id: "a" }), D({ id: "b", who: "Ahmet", amount: 500, kind: "club", paid: [{ amt: 200 }] }), D({ id: "c", who: "Zeynep", amount: 300, paid: [{ amt: 300 }] })];
  const C = (s) => JSON.stringify(DB.debtCommand(s));
  group("Borçlar")([
    ["kalan", F("verilen − geri gelen", () => DB.leftOf(list[1]) === 300 && DB.isClosed(list[2]))],
    ["kısmi ödeme", F("200 yazılır, kalan 800", () => DB.leftOf(DB.payDebt(list[0], 200, "2026-10-12")) === 800)],
    ["tamamı ödendi", F("tutarsız ödeme kalanı kapatır", () => DB.isClosed(DB.payDebt(list[0], 0)))],
    ["fazla ödeme", F("kalandan fazlası yazılmaz", () => DB.paidOf(DB.payDebt(list[1], 5000)) === 500)],
    ["toplam", F("açık borçlar, kişisel/kulüp", () => { const t = DB.debtTotals(list); return t.left === 1300 && t.personal === 1000 && t.club === 300 && t.people === 2; })],
    ["açık / ödenen", F("ödenen ayrı", () => { const s = DB.splitDebts(list); return s.open.length === 2 && s.closed.length === 1; })],
    ["cevap: genel", F("toplam ve kişiler", () => DB.debtAnswer(list) === "Toplam 1.300 TL alacağın var: Ali Kaya 1.000 TL, Ahmet 300 TL.")],
    ["cevap: kişi", F("Ahmet kalan", () => DB.debtAnswer(list, "Ahmet").startsWith("Ahmet için kalan borç 300 TL"))],
    ["cevap: kapanmış", F("Zeynep ödedi", () => /Zeynep borcunun hepsini ödedi/.test(DB.debtAnswer(list, "Zeynep")))],
    ["cümle: ekle", F("kişi, tutar, kişisel", () => C("Ali'ye 500 lira borç verdim") === JSON.stringify({ op: "add", who: "Ali", amount: 500, kind: "personal", note: "" }))],
    ["cümle: kulüp", F("kulüpten, bin", () => { const c = DB.debtCommand("Kulüpten Ahmet Kaya'ya 2 bin TL borç verildi"); return c.kind === "club" && c.amount === 2000 && c.who === "Ahmet Kaya"; })],
    ["cümle: kısmi geri", F("ödeme 200", () => { const c = DB.debtCommand("Ali 200 lirasını geri verdi"); return c.op === "pay" && c.amount === 200 && c.who === "Ali"; })],
    ["cümle: sil", F("silme", () => DB.debtCommand("Ali'nin borcunu sil")?.op === "delete")],
    ["kayıt temizliği", F("boş ad ya da tutar atılır", () => DB.cleanBook([{ who: "", amount: 5 }, { who: "X", amount: 0 }, { who: "Y", amount: 10 }]).length === 1)],
  ]);
}

// Afişi Dikili Yelken sitesindeki "Kulüpten haberler"e ekleme (posts/newsModel.js; kayıt clubNews.js)
const NM = await import("@/features/posts/newsModel");
group("Kulüpten haberler")([
  ["etiket ve emoji", F("başlıkta # ve emoji yok", () => NM.newsTitle("🏆 Çeşme'de Optimist #yelken") === "Çeşme'de Optimist")],
  ["uzun başlık", F("en çok 70 harf, kelimede kesilir, sonda 've' kalmaz", () => { const t = NM.newsTitle("Çeşme Optimist yarışlarında sporcularımız büyük başarı gösterdi ve kulübümüzü temsil etti"); return t.length <= 70 && !/\sve$/.test(t) && t.startsWith("Çeşme Optimist"); })],
  ["etiket satırı", F("yalnız etiketten oluşan satır çıkar", () => NM.newsBody("Harika bir yarıştı.\n#DikiliYelken #Optimist") === "Harika bir yarıştı.")],
  ["sosyal sözler", F("'linki biyografide', 'takip edin' çıkar, cümlenin kalanı kalır", () => NM.newsBody("Kayıtlar başladı! Linki biyografide.\n\nBizi takip edin. Görüşmek üzere") === "Kayıtlar başladı!\n\nGörüşmek üzere")],
  ["paragraflar", F("boş satırla ayrılır, emoji silinir", () => NM.newsBody("⛵ Birinci paragraf\n\n\n🎉 İkinci #yelken") === "Birinci paragraf\n\nİkinci")],
  ["taslak", F("başlık görseldeki başlık, tarih bugün, yayında", () => { const d = NM.newsDraft({ headline: "Yarışa Hazırız", caption: "Sporcularımız Foça'da.\n#yelken" }, "2026-10-12"); return d.title === "Yarışa Hazırız" && d.body === "Sporcularımız Foça'da." && d.date === "2026-10-12" && d.published === true; })],
  ["başlıksız taslak", F("açıklamanın ilk cümlesi", () => NM.newsDraft({ caption: "Kulübümüzde yaz okulu başladı. Kayıtlar sürüyor." }, "2026-10-12").title === "Kulübümüzde yaz okulu başladı")],
  ["kayıt alanları", F("kaynak afis-asistani, sourceId gönderi, bozuk tarih boş", () => { const f = NM.newsFields({ title: "A #b", body: "x", date: "12.10.2026", published: 1 }, "p1"); return f.source === "afis-asistani" && f.sourceId === "p1" && f.date === "" && f.published === true && f.title === "A"; })],
  ["gönderide bağlantı", F("newsId saklanır", async () => { const { cleanPost } = await import("@/features/posts/postModel"); return cleanPost({ newsId: "n1" }).newsId === "n1" && cleanPost({}).newsId === ""; })],
]);

// Yarış sonucu gönderisi: görselde yalnız fotoğraf, açıklama Seyhun'un kalıbıyla (postModel.js resultCaption)
const TEOS = { name: "9 Eylül Kurtuluş Kupası Yelken Yarışları", dates: "11-13 Eylül 2026", host: "Teos Yat ve Yelken Kulübü", classes: "Optimist, Optimist Junior, ILCA, RS Feva", athletes: [{ name: "Mete Ok", cls: "ILCA 4", r: { cls: "ILCA 4", cat: "Junior", place: 1, n: 20, cp: 1, cn: 8 } }] };
const TEOS_TEXT = "TEBRİKLER METE! 🏆\n\n11–13 Eylül tarihlerinde, Teos Yat ve Yelken Kulübü ev sahipliğinde düzenlenen 9 Eylül Kurtuluş Kupası Yelken Yarışları’nda Optimist, Optimist Junior, ILCA ve RS Feva sınıflarında sporcular mücadele etti.\n\nKulübümüz sporcusu Mete Ok, ILCA 4 ve ILCA 4 Junior kategorilerinde 1. olarak büyük bir başarıya imza attı. 🥇\n\nTebrikler Mete! Başarılarının devamını diliyoruz. ⛵💙";
group("Instagram sonuç (yalnız fotoğraf)")([
  ["Seyhun'un örneği", F("birebir aynı açıklama", () => PM.resultCaption(TEOS) === TEOS_TEXT)],
  ["bulunma eki", F("Yarışları’nda, Kupası’nda, Regatta’da, Cup’ta, Trofe’de", () => PM.locative("Ege Kupası") === "Ege Kupası’nda" && PM.locative("Bodrum Regatta") === "Bodrum Regatta’da" && PM.locative("Spring Cup") === "Spring Cup’ta" && PM.locative("Foça Trofe") === "Foça Trofe’de")],
  ["sırası yok", F("başarıyla temsil etti", () => PM.resultSentence({ name: "Ayşe Su", cls: "Optimist" }) === "Kulübümüz sporcusu Ayşe Su, Optimist sınıfında kulübümüzü başarıyla temsil etti. 👏")],
  ["ilk üç dışı", F("sınıfında 12. olarak yarışı tamamladı", () => PM.resultSentence({ name: "Ali Kaya", r: { cls: "Optimist", place: 12 } }) === "Kulübümüz sporcusu Ali Kaya, Optimist sınıfında 12. olarak yarışı tamamladı. 👏")],
  ["çok sporcu", F("TEBRİKLER SPORCULARIMIZ, her sporcu bir paragraf", () => { const t = PM.resultCaption({ ...TEOS, athletes: [...TEOS.athletes, { name: "Ali Kaya" }, { name: "Ayşe Su" }] }); return t.startsWith("TEBRİKLER SPORCULARIMIZ! 🏆") && t.split("\n\n").length === 6; })],
  ["iki sporcu", F("TEBRİKLER METE VE ALİ", () => PM.resultCaption({ ...TEOS, athletes: [...TEOS.athletes, { name: "Ali Kaya" }] }).startsWith("TEBRİKLER METE VE ALİ! 🏆"))],
  ["yarıştan ilk hali", F("bitmiş yarış: sonuç, yalnız fotoğraf, ev sahibi talimattan", () => { const p = PM.postFromRace({ name: "Ege Kupası", startDate: "2026-09-11", endDate: "2026-09-13", notice: { organizer: "Teos Yat ve Yelken Kulübü" } }, "2026-10-12"); return p.kind === "sonuc" && p.photoOnly === true && p.race.host === "Teos Yat ve Yelken Kulübü"; })],
  ["tür değişince", F("sonuca geçince yalnız fotoğraf, duyuruya dönünce yazılı", () => { const a = PM.cleanPost({ kind: "duyuru", race: TEOS }); const b = PM.reauto(a, { ...a, kind: "sonuc" }); const c = PM.reauto(b, { ...b, kind: "duyuru" }); return b.photoOnly === true && c.photoOnly === false; })],
  ["sıra saklanır", F("sporcunun derecesi gönderide kalır", () => PM.cleanPost({ kind: "sonuc", race: TEOS }).race.athletes[0].r.cp === 1)],
  ["haber başlığı", F("ilk satır başlık, gövdeden çıkar", () => { const d = NM.newsDraft({ photoOnly: true, caption: TEOS_TEXT }, "2026-10-12"); return d.title === "Tebrikler Mete!" && d.body.startsWith("11–13 Eylül") && !d.body.includes("🏆"); })],
]);

// Fitness hareket kütüphanesi (library.js): numara, aynı harekete aynı video, kulübün kendi hareketleri
const LB = await import("@/lib/fitness/library");
const FMK = await import("@/lib/fitness/model");
const YT = { id: "dQw4w9WgXcQ" };
group("Fitness hareket kütüphanesi")([
  ["numara", F("yeni hareketler 1, 2, 3; aynısı tekrar eklenmez", () => {
    const { lib, added } = LB.libAdd(LB.cleanLib(), [{ ex: "warmup" }, { ex: "wall-sit" }, { ex: "warmup" }, { name: "Sandalyede dips" }]);
    return added.length === 3 && lib.items["wall-sit"].no === 2 && lib.items["c:sandalyede-dips"].no === 3 && lib.next === 4;
  })],
  ["numara değişmez", F("ikinci programda eski numara kalır", () => {
    const a = LB.libAdd(LB.cleanLib(), [{ ex: "squat" }]).lib;
    const b = LB.libAdd(a, [{ ex: "plank" }, { ex: "squat" }]).lib;
    return b.items.squat.no === 1 && b.items.plank.no === 2;
  })],
  ["aynı video her yerde", F("duvarda oturmaya eklenen video başka programdaki duvarda oturmada da", () => {
    const lib = LB.libSetMedia(LB.cleanLib(), { ex: "wall-sit", name: "Duvarda oturma" }, { yt: YT });
    const other = LB.withLib({ ex: "wall-sit", name: "Duvarda oturma", sec: 30 }, lib);
    return other.yt?.id === YT.id && other.sec === 30 && !LB.withLib({ ex: "squat", name: "Squat" }, lib).yt;
  })],
  ["eski programın videosu", F("kütüphaneye geçer", () => {
    const { lib } = LB.libAdd(LB.cleanLib(), [{ ex: "warmup", yt: YT }]);
    return lib.items.warmup.m === true && lib.items.warmup.yt?.id === YT.id;
  })],
  ["video kaldırma", F("kütüphanede kaldırılan video programdan da kalkar", () => {
    const a = LB.libSetMedia(LB.cleanLib(), { ex: "warmup" }, { yt: YT });
    const b = LB.libSetMedia(a, { ex: "warmup" }, { yt: null });
    return !LB.withLib({ ex: "warmup", name: "Isınma", yt: YT }, b).yt;
  })],
  ["yüklenen video sporcuya", F("Storage videosu adresiyle kütüphaneden sporcunun antrenmanına geçer", () => {
    const V = { id: "v1", kind: "video", type: "video/mp4", size: 900000, parts: 1, url: "https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/orgs%2Fo%2FfitMedia%2Fv1?alt=media&token=t" };
    const lib = LB.cleanLib(LB.libSetMedia(LB.cleanLib(), { ex: "", name: "Sandalyede dips" }, { media: [V] }));
    const plan = [{ ex: "", name: "Sandalyede dips", kind: "reps", sets: 3, reps: 10 }];
    const out = LB.itemsWithLib(plan, lib);
    return out[0].media?.[0]?.url === V.url && !LB.sameMedia(plan, out) && out[0].sets === 3;
  })],
  ["aynı ad ikinci kayıt açmaz", F("listedeki hareketle aynı adlı elle yazılan (PDF) aynı kayda gider, numara ve fotoğraf ortak", () => {
    const P = { id: "p1", kind: "photo", type: "image/jpeg", size: 1000, parts: 1 };
    const a = LB.libSetMedia(LB.cleanLib(), { ex: "pushup", name: "Şınav" }, { media: [P] });
    const { lib, added } = LB.libAdd(a, [{ ex: "", name: "ŞINAV" }]);
    return !added.length && Object.keys(lib.items).length === 1 && LB.libNo(lib, { ex: "", name: "Şınav" }) === 1 &&
      LB.withLib({ ex: "", name: "şınav", sets: 3 }, lib).media?.[0]?.id === "p1";
  })],
  ["kopyaları birleştir", F("eski kopyalar: fotoğraflı kalır, bütün fotoğraf/videolar korunur, programdaki eski ad kalanı kullanır", () => {
    const M = (id, kind = "photo") => ({ id, kind, type: "image/jpeg", size: 1000, parts: 1 });
    const old = LB.cleanLib({ next: 4, items: {
      pushup: { no: 1, name: "Şınav", kind: "reps", media: [M("a"), M("b")], m: true },
      "c:sinav": { no: 2, name: "Şınav", kind: "reps", media: [M("c"), M("d", "video")], m: true },
      plank: { no: 3, name: "Plank", kind: "time" },
    } });
    const d = LB.libDupes(old);
    const lib = LB.cleanLib(LB.libMerge(old, d[0].keep, d[0].items.map((x) => x.key)));
    const ids = LB.libMediaIds(lib);
    const it = LB.withLib({ ex: "", name: "Şınav" }, lib);
    return d.length === 1 && d[0].keep === "pushup" && Object.keys(lib.items).length === 2 && ["a", "b", "c", "d"].every((x) => ids.has(x)) &&
      lib.items.pushup.media.length === 3 && lib.items.pushup.spare.length === 1 && it.media.length === 3 &&
      lib.alias["c:sinav"] === "pushup" && !LB.libDupes(lib).length && LB.libNo(lib, { ex: "", name: "Şınav" }) === 1;
  })],
  ["farklı adlı aynı hareketi birleştir", F("elle birleştirme: fotoğraflı kalır, yeni programda iki ad da onu kullanır, ikinci kayıt açılmaz", () => {
    const M = (id) => ({ id, kind: "photo", type: "image/jpeg", size: 1000, parts: 1 });
    const old = LB.cleanLib({ next: 3, items: {
      "c:backpack-split-squat": { no: 1, name: "Backpack split squat", media: [M("a"), M("b")], m: true },
      "c:sirt-cantali-split-squat": { no: 2, name: "Sırt çantalı split squat" },
    } });
    const keys = Object.keys(old.items);
    const keep = LB.libKeepOf(old, keys);
    const lib = LB.cleanLib(LB.libMerge(old, keep, keys));
    const { lib: after, added } = LB.libAdd(lib, [{ ex: "", name: "Sırt çantalı split squat" }, { ex: "", name: "Backpack split squat" }]);
    const it = LB.withLib({ ex: "", name: "Sırt çantalı split squat" }, after);
    return keep === "c:backpack-split-squat" && !added.length && Object.keys(after.items).length === 1 && it.media.length === 2;
  })],
  ["hazır program kütüphanedekini kullanır", F("yapay zeka eşleştirmesi: başka adla gelen aynı hareket yeni kayıt açmaz, kütüphanedeki adı ve fotoğrafı alır", () => {
    const M = (id) => ({ id, kind: "photo", type: "image/jpeg", size: 1000, parts: 1 });
    const cur = LB.cleanLib({ next: 3, items: { "c:backpack-split-squat": { no: 1, name: "Backpack split squat", media: [M("a")], m: true }, plank: { no: 2, name: "Plank" } } });
    const items = [{ ex: "", name: "Sırt çantalı split squat" }, { ex: "", name: "Plank" }, { ex: "", name: "Hip thrust" }];
    const fresh = LB.libNew(cur, items).map((x) => x.name);
    const lib1 = LB.libAliases(cur, items, [{ name: "Sırt çantalı split squat", key: "c:backpack-split-squat" }, { name: "Hip thrust", key: "yok" }]);
    const { lib, added } = LB.libAdd(lib1, items);
    const it = LB.withLib(items[0], lib);
    const again = LB.libNew(LB.cleanLib(lib), items);
    return fresh.join() === "Sırt çantalı split squat,Hip thrust" && added.join() === "c:hip-thrust" && it.name === "Backpack split squat" && it.media?.[0]?.id === "a" && !again.length;
  })],
  ["kendi adı korunur", F("listedeki hareket kendi adıyla kalır (yalnız eşleştirilen ad değişir)", () => {
    const { lib } = LB.libAdd(LB.cleanLib(), [{ ex: "pushup", name: "Şınav" }]);
    return LB.withLib({ ex: "pushup", name: "Diz üstü şınav" }, lib).name === "Diz üstü şınav";
  })],
  ["hareketin adı değişir", F("numara ve fotoğraf kalır; eski ve yeni adlı program hareketi yeni adı alır; aynı ad başka harekette varsa değişmez", () => {
    const M = (id) => ({ id, kind: "photo", type: "image/jpeg", size: 1000, parts: 1 });
    const cur = LB.cleanLib({ next: 3, items: { "c:backpack-split-squat": { no: 1, name: "Backpack split squat", media: [M("a")], m: true }, plank: { no: 2, name: "Plank" } } });
    const { lib: l1, err } = LB.libRename(cur, "c:backpack-split-squat", "Sırt çantalı split squat");
    const lib = LB.cleanLib(l1);
    const a = LB.withLib({ ex: "", name: "Backpack split squat" }, lib);
    const b = LB.withLib({ ex: "", name: "Sırt çantalı split squat" }, lib);
    const { added } = LB.libAdd(lib, [{ ex: "", name: "Sırt çantalı split squat" }]);
    const p = LB.cleanLib(LB.libRename(lib, "plank", "Kale").lib);
    const busy = LB.libRename(lib, "plank", "sırt çantalı split squat");
    return !err && a.name === "Sırt çantalı split squat" && b.media?.[0]?.id === "a" && !added.length && LB.libNo(lib, b) === 1 &&
      LB.withLib({ ex: "plank", name: "Plank" }, p).name === "Kale" && !!busy.err;
  })],
  ["hareket silinir", F("listeden çıkar, fotoğraf künyesi kütüphanede kalmaz (dosya Storage'da durur)", () => {
    const cur = LB.cleanLib({ next: 3, items: { plank: { no: 1, name: "Plank" }, dips: { no: 2, name: "Dips" } }, alias: { "c:dips": "dips" } });
    const lib = LB.cleanLib(LB.libDrop(cur, "dips"));
    return Object.keys(lib.items).join() === "plank" && !lib.alias && lib.next === 3;
  })],
  ["yüklenirken eklenen kaybolmaz", F("eski görüntüye göre değişiklik güncel listeye uygulanır", () => {
    const a = { id: "a" }, b = { id: "b" }, c = { id: "c" };
    const add = LB.mediaApply([a], [a, b], [a, c]);
    const drop = LB.mediaApply([a, c], [c], [a, b, c]);
    return add.map((m) => m.id).join() === "a,c,b" && drop.map((m) => m.id).join() === "b,c";
  })],
  ["hareketsiz dosya geri eklenir", F("ilk 3'ü görünür, fazlası yedekte, hiçbiri kaybolmaz", () => {
    const M = (id) => ({ id, kind: "photo", type: "image/jpeg", size: 1000, parts: 1 });
    const old = LB.cleanLib({ items: { plank: { no: 1, name: "Plank", media: [M("a"), M("b")], m: true } } });
    const lib = LB.cleanLib(LB.libAttach(old, "plank", [M("c"), M("d"), M("a")]));
    const ids = LB.libMediaIds(lib);
    return lib.items.plank.media.length === 3 && lib.items.plank.spare.length === 1 && ["a", "b", "c", "d"].every((x) => ids.has(x)) && ids.size === 4;
  })],
  ["fotoğraflı olan kalır", F("numarası büyük olsa da fotoğrafı olan kopya kalır", () => {
    const old = LB.cleanLib({ items: { "c:dips": { no: 1, name: "Dips" }, dips: { no: 5, name: "Dips", yt: YT, m: true } } });
    const d = LB.libDupes(old);
    return d[0]?.keep === "dips" && d[0].items[0].yt?.id === YT.id;
  })],
  ["değişiklik var mı", F("sameMedia", () => LB.sameMedia([{ yt: YT }], [{ yt: YT }]) && !LB.sameMedia([{ yt: YT }], [{}]))],
  ["yapay zekaya kulübün hareketleri", F("c: satırları, listedekiler girmez", () => {
    const { lib } = LB.libAdd(LB.cleanLib(), [{ ex: "squat" }, { name: "Sandalyede dips" }]);
    return LB.customCatalog(lib) === "c:sandalyede-dips: Sandalyede dips";
  })],
  ["kendi hareketi listedekine dönmez", F("ex boş + ad: squat'a çevrilmez", () => {
    const it = FMK.cleanItem({ ex: "", name: "Sandalyede tek bacak squat" });
    return it.ex === "" && it.name === "Sandalyede tek bacak squat" && LB.exKey(it).startsWith("c:");
  })],
  ["arama", F("numarayla ve adla", () => {
    const { lib } = LB.libAdd(LB.cleanLib(), [{ ex: "warmup" }, { ex: "wall-sit" }]);
    return LB.libList(lib, "2")[0]?.key === "wall-sit" && LB.libList(lib, "isinma")[0]?.key === "warmup";
  })],
]);

// Sporcunun antrenman ekranı: tahmini süre, kas grupları, bitirme ancak bütün setler yapılınca
group("Fitness antrenman ekranı")([
  ["tahmini süre", F("3×10 squat + 3×30 sn plank ≈ 15 dk", () => FMK.estMinutes([{ ex: "squat", kind: "reps", sets: 3, reps: 10, rest: 60 }, { ex: "plank", kind: "time", sets: 3, sec: 30, rest: 45 }]) === 15)],
  ["kardiyo süresi", F("20 dk koşu ≈ 25 dk", () => FMK.estMinutes([{ kind: "cardio", min: 20 }]) === 25)],
  ["boş", F("hareket yoksa 0", () => FMK.estMinutes([]) === 0)],
  ["kas grupları", F("tekrarsız, sırayla", () => { const g = FMK.groupsOf([{ ex: "squat" }, { ex: "lunge" }, { ex: "plank" }]); return g.length === new Set(g).size && g.length >= 1; })],
  ["süre hedefi", F("plank 30 sn, kardiyo 5 dk = 300 sn", () => FMK.goalSec({ kind: "time", sec: 30 }) === 30 && FMK.goalSec({ kind: "cardio", min: 5 }) === 300 && FMK.goalSec({ kind: "reps" }) === 0)],
  ["saat yazısı", F("0:30, 5:00, 1:02:05", () => FMK.clockText(30) === "0:30" && FMK.clockText(300) === "5:00" && FMK.clockText(3725) === "1:02:05")],
  ["süre kaydı saklanır", F("took ve full cleanRes'ten geçer", () => { const r = FMK.cleanRes({ ex: [{ sets: [{ ok: true, sec: 30, took: 18 }, { ok: true, sec: 30, took: 30, full: true }] }] }, [{ kind: "time", sec: 30 }]); const [a, b] = r.ex[0].sets; return a.took === 18 && !a.full && b.took === 30 && b.full === true; })],
  ["set süre yazısı", F("tamamlandı / erken geçildi", () => FMK.setTimeText({ kind: "time", sec: 30 }, { took: 30, full: true }) === "Tamamlandı · 0:30" && FMK.setTimeText({ kind: "cardio", min: 5 }, { took: 200 }) === "3:20'de geçildi (hedef 5:00)")],
  ["sonuç satırında erken geçilen", F("Plank … (2. set 0:18'de geçildi)", () => FMK.resLine({ items: [{ name: "Plank", kind: "time", sec: 30 }], res: { ex: [{ sets: [{ ok: true, sec: 30, took: 30, full: true }, { ok: true, sec: 30, took: 18 }] }] } }) === "Plank 2 × 30 sn (2. set 0:18'de geçildi)")],
  ["biten antrenman tablosu", F("set hapları, toplam set ve süre", () => { const r = FMK.resRows({ items: [{ name: "Plank", kind: "time", sec: 30 }, { name: "Squat", kind: "reps", reps: 10, sets: 2 }], res: { ex: [{ sets: [{ ok: true, sec: 30, took: 30, full: true }, { ok: true, sec: 30, took: 18 }] }, { sets: [{ ok: true, reps: 10, kg: 40 }, { ok: false }] }] } }); const [p, q] = r.rows; return p.line === "2 × 0:30" && p.sets[0].state === "full" && p.sets[1].text === "0:18 / 0:30" && q.line === "1 × 10 · 40 kg" && !q.sets.length && r.done === 3 && r.total === 4 && r.active === 48; })],
]);

const PV = await import("@/lib/fitness/pageVideo");
const PG = "https://www.muscleandstrength.com/exercises/hover.html";
group("Fitness: başka sitedeki hareket videosu")([
  ["gömülü YouTube", F("iframe embed → yt", () => PV.findPageVideo('<div><iframe src="https://www.youtube.com/embed/AbCdEfGhIjK?rel=0"></iframe></div>', PG)?.yt?.id === "AbCdEfGhIjK")],
  ["sitenin kendi videosu", F("<video><source> göreli adres → tam https", () => PV.findPageVideo('<video poster="/p.jpg"><source src="/videos/hover.mp4" type="video/mp4"></video>', PG)?.video === "https://www.muscleandstrength.com/videos/hover.mp4")],
  ["og:video", F("meta og:video mp4", () => PV.findPageVideo('<meta property="og:video" content="http://cdn.x.com/a/hover.mp4">', PG)?.video === "https://cdn.x.com/a/hover.mp4")],
  ["JSON içindeki adres", F("kaçışlı \\/ yazımı", () => PV.findPageVideo('<script>var p={"file":"https:\\/\\/cdn.x.com\\/v\\/hover.m3u8"}</script>', PG)?.video === "https://cdn.x.com/v/hover.m3u8")],
  ["önce gömülü oynatıcı", F("altbilgideki kanal bağlantısı seçilmez", () => PV.findPageVideo('<a href="https://www.youtube.com/watch?v=ZZZZZZZZZZZ">kanal</a><iframe data-src="https://www.youtube-nocookie.com/embed/AbCdEfGhIjK"></iframe>', PG)?.yt?.id === "AbCdEfGhIjK")],
  ["video yoksa", F("null", () => PV.findPageVideo("<html><img src='/a.jpg'></html>", PG) === null)],
  ["yerel ağ indirilmez", F("localhost, IP, iç ad reddedilir", () => !PV.publicPage("http://localhost/x") && !PV.publicPage("https://192.168.1.1/") && !PV.publicPage("https://a.internal/") && !!PV.publicPage(PG))],
  ["dosya mı sayfa mı", F("mp4/jpg dosya, .html sayfa", () => PV.isFileLink("https://a.com/b.mp4") && PV.isFileLink("https://a.com/b.JPG?x=1") && !PV.isFileLink(PG))],
]);

// Mesaj arşivi (lib/chatArchive.js): ana hesabın arşivi herkesten, diğerlerinin yalnız kendinden
const CA = await import("@/lib/chatArchive");
const AM = [{ id: "a", text: "bir" }, { id: "b", text: "iki", arch: true }, { id: "c", text: "üç", hide: { u2: true } }, { id: "d", text: "dört" }];
group("Mesaj arşivi")([
  ["herkesten arşiv", F("kimse görmez", () => !CA.shownMsg(AM[1], "u1") && !CA.shownMsg(AM[1], "u2"))],
  ["kendinden gizle", F("yalnız gizleyen görmez", () => !CA.shownMsg(AM[2], "u2") && CA.shownMsg(AM[2], "u1"))],
  ["arşiv listesi: ana hesap", F("herkesten arşivlenen görünür", () => AM.filter((m) => CA.inArchive(m, "u1", true)).map((m) => m.id).join() === "b")],
  ["arşiv listesi: kullanıcı", F("yalnız kendi gizledikleri", () => AM.filter((m) => CA.inArchive(m, "u2", false)).map((m) => m.id).join() === "c")],
  ["son mesaj arşivlenince özet", F("bir önceki görünen mesaj", () => CA.prevShown([AM[0], AM[1], AM[3]], AM[3])?.id === "a")],
  ["hiç kalmazsa", F("null", () => CA.prevShown([AM[1]], AM[1]) === null)],
]);
// Sıfırlama / herkes için silmeden sonra (sohbet belgesi yok): eski kopya gösterilmez (Seyhun: Sporcular grubunda mesajlar duruyordu)
const ms = (x) => x;
group("Silinen sohbet")([
  ["belge yok", F("bellekteki eski mesajlar gösterilmez", () => CA.liveMsgs([{ id: "a", at: 100 }], false, 0, ms).length === 0)],
  ["belge var", F("mesajlar görünür", () => CA.liveMsgs([{ id: "a", at: 100 }], true, 0, ms).length === 1)],
  ["yeniden açıldı", F("belgeden önceki önbellek atlanır", () => CA.liveMsgs([{ id: "eski", at: 1000 }, { id: "yeni", at: 500000 }], true, 400000, ms).map((m) => m.id).join() === "yeni")],
  ["gönderilmekte", F("zamanı olmayan kalır", () => CA.liveMsgs([{ id: "p" }], true, 400000, ms).length === 1)],
  ["henüz okunmadı", F("boş liste", () => CA.liveMsgs(null, true, 0, ms).length === 0)],
]);

// Mesajlar listesi (lib/chatList.js): mesajı olan sabit grup listede, olmayan üstte kart (Seyhun: Sporcular'a yazdım, liste boş)
{
const CLS = await import("@/lib/chatList");
const FX = ["team", "family", "athletes"];
group("Mesajlar listesi")([
  ["yazışılan grup", F("listede", () => CLS.listed({ id: "athletes", last: { text: "x" } }, FX))],
  ["mesajsız grup", F("listede yok", () => !CLS.listed({ id: "team" }, FX))],
  ["birebir ve kurulan grup", F("listede", () => CLS.listed({ id: "dm_a_b", last: {} }, FX) && CLS.listed({ id: "g1" }, FX))],
  ["kartlar", F("yalnız mesajsız gruplar", () => CLS.cardGroups(FX, [{ id: "athletes", last: {} }, { id: "team" }]).join() === "team,family")],
  ["sıfırlamadan sonra", F("hepsi kart, liste boş", () => CLS.cardGroups(FX, []).length === 3)],
]);
}

// Sporcu boy ve kilo (lib/athleteBody.js; sporcu sayfası ve asistan "Mete'nin kilosu 52")
const SBK = await import("@/lib/athleteBody");
group("Sporcu boy ve kilo")([
  ["kilo cümlesi", F("ad + kilo", () => { const r = SBK.bodyCommand("Mete'nin kilosu 52"); return r?.name === "Mete" && r.kg === 52 && !r.h && r.explicit; })],
  ["metre boy", F("1.52 → 152 cm", () => SBK.bodyCommand("Ali Kaya'nın boyu 1.52")?.h === 152)],
  ["boy ve kilo birlikte", F("148 cm, 40,5 kg", () => { const r = SBK.bodyCommand("Zeynep'in boyu 148 kilosu 40,5"); return r?.h === 148 && r.kg === 40.5; })],
  ["soru", F("kaydetmez, sorar", () => SBK.bodyCommand("Ali'nin kilosu kaç")?.op === "ask")],
  ["kendi kilom değil", F("beslenmeye kalır", () => SBK.bodyCommand("kilom 82") === null)],
  ["aynı gün birleşir", F("boy kalır, kilo güncellenir", () => { const l = SBK.addBody(SBK.addBody([], { d: "2026-10-14", h: 150 }), { d: "2026-10-14", kg: 44 }); return l.length === 1 && l[0].h === 150 && l[0].kg === 44; })],
  ["son değerler ayrı", F("son boy eski tarihten", () => { const b = SBK.lastBody([{ d: "2026-09-01", h: 149, kg: 42 }, { d: "2026-10-01", kg: 43 }]); return b.h === 149 && b.hd === "2026-09-01" && b.kg === 43; })],
  ["yazı", F("151 cm · 42,5 kg", () => SBK.bodyText({ h: 151, kg: 42.5 }) === "151 cm · 42,5 kg")],
]);

// Fitness: PDF/metinden içe aktarılan program ayrıntıları ve hazır şablon (model.js, templates.js)
const FMI = await import("@/lib/fitness/model");
const FTPL = await import("@/lib/fitness/templates");
const FRV = await import("@/lib/fitness/review");
group("Fitness: program ayrıntıları ve şablon")([
  ["aralık ve yan", F("8–12/yan, 20–30 sn/yan; üst sınır alttan küçükse atılır", () => {
    const a = FMI.cleanItem({ ex: "", name: "Split squat", sets: 3, reps: 8, repsTo: 12, side: true, rest: 75 });
    const b = FMI.cleanItem({ ex: "", name: "Side plank", sets: 2, sec: 20, secTo: 30, side: true });
    const c = FMI.cleanItem({ ex: "", name: "X", reps: 10, repsTo: 6 });
    return FMI.itemLine(a) === "3 × 8–12/yan" && FMI.itemLine(b) === "2 × 20–30 sn/yan" && !c.repsTo && a.rest === 75;
  })],
  ["motivasyon cümlesi", F("aynı gün aynı cümle, listeden biri", () => FMI.cheerOf("2026-10-19") === FMI.cheerOf("2026-10-19") && FMI.CHEERS.includes(FMI.cheerOf("2026-10-20")) && new Set(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"].map(FMI.cheerOf)).size > 1)],
  ["hareketler arası dinlenme", F("setler arası 20, sonraki harekete 60; boşsa setler arasıyla aynı; toplu ve tek tek", () => {
    const p = FMI.cleanProgram({ start: "2026-10-19", weeks: 1, days: [{ dow: 2, name: "A", items: [{ ex: "", name: "Row", sets: 3, reps: 10, rest: 20 }, { ex: "", name: "Plank", sets: 2, sec: 30, rest: 20, gap: 90 }] }] });
    const [a, b] = p.days[0].items;
    const all = FMI.setGapAll(FMI.setRestAll(p, 20), 60);
    const [x, y] = all.days[0].items;
    const d = FMI.planDrafts(all);
    return FMI.restAfter(a, false) === 20 && FMI.restAfter(a, true) === 20 && FMI.restAfter(b, true) === 90 && b.gap === 90 &&
      x.rest === 20 && x.gap === 60 && y.gap === 60 && FMI.gapAllOf(all) === 60 && FMI.restAfter(x, true) === 60 && FMI.restAfter(x, false) === 20 &&
      d[0].fit.items[0].gap === 60 && FMI.itemMore(x) === "dinlenme 20 sn · sonraki hareketten önce 60 sn";
  })],
  ["toplu dinlenme", F("programdaki bütün hareketler 20 sn olur, kardiyo değişmez; tek gün seçilebilir; ortak değer en çok kullanılan", () => {
    const p = FMI.cleanProgram({ start: "2026-10-19", weeks: 2, days: [
      { dow: 2, name: "A", items: [{ ex: "", name: "Isınma", min: 5 }, { ex: "", name: "Row", sets: 3, reps: 10, rest: 60 }, { ex: "", name: "Plank", sets: 2, sec: 30 }] },
      { dow: 4, name: "B", items: [{ ex: "", name: "Squat", sets: 3, reps: 8, rest: 90 }] },
    ] });
    const a = FMI.setRestAll(p, 20);
    const b = FMI.setRestAll(p, 45, 4);
    const all = a.days.flatMap((d) => d.items);
    const d = FMI.planDrafts(a);
    return FMI.restOf(p) === 60 && FMI.restOf(a) === 20 && all.filter((x) => x.kind !== "cardio").every((x) => x.rest === 20) && !all[0].rest &&
      b.days[0].items[1].rest === 60 && b.days[1].items[0].rest === 45 && FMI.setRestAll(p, 22).days[1].items[0].rest === 20 && d[0].fit.items[1].rest === 20;
  })],
  ["çanta ve nefes", F("çantadaki ağırlık her türde; nefes, tempo, zorluk, not, alternatif", () => {
    const a = FMI.cleanItem({ ex: "", name: "Squat", sets: 3, reps: 10, bag: 2.5, breath: "4 sn al 6 sn ver", tempo: "3-1-1", rpe: "7 · RIR 3", rest: 60, note: "Topuk aktif", alt: "Goblet squat", part: "ana" });
    return FMI.itemLine(a) === "3 × 10 · çanta 2,5 kg" && FMI.itemMore(a) === "dinlenme 60 sn · tempo 3-1-1 · RPE 7 · RIR 3 · nefes: 4 sn al 6 sn ver" && a.note === "Topuk aktif" && a.alt === "Goblet squat" && a.part === "ana";
  })],
  ["evre", F("hafif haftada setler azalır, planda evrenin adı ve notu", () => {
    const p = FMI.cleanProgram({ start: "2026-10-19", weeks: 4, days: [{ dow: 2, time: "17:45", name: "A", note: "gün notu", items: [{ ex: "", name: "Row", sets: 3, reps: 10 }] }], phases: [{ from: 4, to: 4, name: "Hafif", sets: 70, note: "az" }] });
    const d = FMI.planDrafts(p);
    return d.length === 4 && d[0].fit.items[0].sets === 3 && !d[0].fit.phase && d[3].fit.items[0].sets === 2 && d[3].fit.phase === "Hafif" && d[3].fit.note === "gün notu · az";
  })],
  ["hazır şablon", F("Yelken ev kuvveti PDF'teki hafta: 7 gün (kuvvet A, B, mikrodoz, reset günleri), bütün hareketler, 12 hafta, evreler ve kurallar", () => {
    const p = FTPL.fromTemplate("yelken-ev-12", "2026-10-19");
    const at = (n) => p.days.find((d) => d.dow === n);
    const [a, b, c] = [at(2), at(4), at(5)];
    const split = a.items.find((x) => x.name === "Sırt çantalı split squat");
    return p.weeks === 12 && p.days.length === 7 && a.time === "17:45" && a.items.length === 15 && b.items.length === 15 && c.items.length === 12 &&
      a.items.every((x) => !x.ex) && split.repsTo === 12 && split.side && split.rest === 75 && split.note.includes("çantaya 1–2 kg") && a.note.includes("gitar") &&
      p.phases.length === 6 && p.rules.includes("Trafik ışığı") && FMI.planDrafts(p).length === 84;
  })],
  ["hazır şablon rutin", F("Pzt 19:00 8 dk reset, Çrş 19:00 nefes ve mobilite, Cmt ve Paz 16:00 yelken sonrası 6 dk; Cuma 2 tur, hareketler arası 20 sn; hazırlıkta uzun dinlenme yok", () => {
    const p = FTPL.fromTemplate("yelken-ev-12", "2026-10-19");
    const at = (n) => p.days.find((d) => d.dow === n);
    const fri = at(5).items;
    return at(1).time === "19:00" && at(1).items.length === 8 && at(1).note.includes("atletizm") && at(3).items.length === 5 && at(6).time === "16:00" && at(7).items.length === 6 &&
      fri[0].name === fri[6].name && fri[0].note.startsWith("1. tur") && fri[6].note.startsWith("2. tur") && fri.every((x) => x.sets === 1 && FMI.restAfter(x, true) === 20) &&
      !at(5).time && at(2).items.filter((x) => x.part === "isinma").every((x) => FMI.restAfter(x, true) === 10) && p.rules.includes("Her gün 8 dk reset:");
  })],
  ["belgeden rutin", F("PDF'te 'Nefes ve mobilite 6 dk' başlığı hareket olmaz; yalnız rutinden oluşan gün eklenmez", () => {
    const days = FMI.dropRoutines([
      { dow: 2, name: "Kuvvet A", min: 40, items: [{ name: "Nefes ve mobilite · 6 dk", min: 6, sets: 1, part: "isinma" }, { name: "90 90 nefes", reps: 5, sets: 1, part: "isinma" }, { name: "Split squat", sets: 3, reps: 8 }] },
      { dow: 3, name: "Nefes ve mobilite", min: 5, items: [{ name: "Burun nefesi", sec: 60, sets: 1 }, { name: "Open book", reps: 5, sets: 1 }] },
      { dow: 1, name: "8 dk reset", min: 10, items: [{ name: "Wall slide", reps: 8, sets: 1 }] },
      { dow: 5, name: "Yelken mikrodozu", min: 15, items: [{ name: "Hazırlık", sets: 1 }, { name: "Band rope pull", sets: 2, reps: 10 }] },
    ]);
    return days.length === 2 && days[0].items.length === 2 && days[0].items[0].name === "90 90 nefes" && days[1].items.length === 1 && FMI.isHeading("Isınma 8 dk") && !FMI.isHeading("Burun nefesi");
  })],
  ["takip listesi", F("hazır programda 8 satırlık haftalık takip ve 5 pazar sorusu; programla birlikte kaydedilir, boşsa hiç yazılmaz", () => {
    const p = FTPL.fromTemplate("yelken-ev-12", "2026-10-19");
    const r = p.review;
    return r.rows.length === 8 && r.ask.length === 5 && r.rows[0].label === "Uyku ortalaması" && r.rows[7].unit === "Evet / Hayır" &&
      FMI.cleanProgram({ ...p, review: { rows: [{ label: "" }], ask: [" "] } }).review === undefined && FMI.cleanProgram(p).review.rows.length === 8;
  })],
  ["takip satırı", F("kayıt biçimi: saat, / 2, Evet / Hayır; değer sınırı ve yazısı", () => {
    const [a, b, c] = [{ label: "Uyku", unit: "saat" }, { label: "Ev", unit: "/ 2" }, { label: "RPE", unit: "Evet / Hayır" }];
    return FRV.rowKind(a.unit).unit === "saat" && FRV.rowKind(b.unit).of === 2 && FRV.rowKind(c.unit).yn &&
      FRV.cleanValue(a, "8,5") === 8.5 && FRV.cleanValue(b, 5) === 2 && FRV.cleanValue(c, "x") === "" && FRV.cleanValue(b, "") === "" &&
      FRV.valueText({ ...a, v: 8.5 }) === "8,5 saat" && FRV.valueText({ ...b, v: 1 }) === "1 / 2" && FRV.valueText({ ...c, v: "e" }) === "Evet";
  })],
  ["değerlendirme", F("hafta pazartesiden; liste kayda kopyalanır, eski değerler korunur, sorulara cevap", () => {
    const track = FTPL.fromTemplate("yelken-ev-12", "2026-10-19").review;
    const r = FRV.cleanReview({ for: "u1", week: "2026-10-18", rows: [{ label: "Uyku ortalaması", v: "8,5" }, { label: "Yok", v: 3 }], ask: [{ q: "Okulda enerji ve odak nasıldı?", a: "İyi" }], note: "  güzel hafta " }, track);
    return r.week === "2026-10-12" && r.rows.length === 8 && r.rows[0].v === 8.5 && r.rows[1].v === "" && r.ask[2].a === "İyi" && r.note === "güzel hafta" &&
      FRV.reviewId("u1", r.week) === "u1_2026-10-12" && FRV.weekLabel("2026-10-12") === "12–18 Eki" && FRV.weekLabel("2026-10-26") === "26 Eki – 1 Kas" && FRV.reviewFilled(r);
  })],
  ["değerlendirme yazdır", F("bu hafta, bütün antrenmanlar ve değerlendirme seçilerek yazdırılır; sonuçlar, saniyeler, kulüp logosu ve antrenör görünür", () => {
    const fit = (name, res) => ({ prog: "p", name, for: "u1", items: [{ name: "Plank", kind: "time", sets: 2, sec: 30 }, { name: "Squat", kind: "reps", sets: 2, reps: 10 }], res });
    const plans = [
      { id: "a", cat: "Fitness", date: "2026-10-06", fit: fit("Kuvvet A", { st: "done", min: 35, feel: 2, ex: [{ sets: [{ ok: true, took: 30, full: true }, { ok: true, took: 18 }] }, { sets: [{ ok: true, reps: 10 }, { ok: true, reps: 9 }] }] }) },
      { id: "b", cat: "Fitness", date: "2026-10-14", fit: fit("Kuvvet B", { st: "done", min: 40, ex: [{ sets: [{ ok: true, took: 30, full: true }] }, { sets: [] }] }) },
      { id: "c", cat: "Fitness", date: "2026-10-16", fit: fit("Kuvvet A") },
    ];
    const s = FRV.planSummary(plans[1], "2026-10-17");
    const rev = FRV.cleanReview({ week: "2026-10-12", rows: [{ label: "Ev kuvveti", v: 1 }], note: "Not <b>" }, { rows: [{ label: "Ev kuvveti", goal: "2 seans", unit: "/ 2" }], ask: [] });
    const week = FRV.reportHtml({ name: "İlay", prog: { title: "Ev" }, plans, review: rev, week: "2026-10-12", pick: { week: true }, today: "2026-10-17" });
    const all = FRV.reportHtml({ name: "İlay", prog: { title: "Ev" }, plans, review: rev, week: "2026-10-12", pick: { all: true, review: true }, today: "2026-10-17", coach: "Seyhun Yıldız", meta: "14 yaş · Yelken" });
    return FRV.weekPlans(plans, "2026-10-12").length === 2 && s.st === "done" && s.rows[0].line === "1 × 0:30" && s.rows[1].line === "Yapılmadı" &&
      week.includes("Kuvvet B") && !week.includes("Değerlendirme ·") && week.includes("1 / 2 antrenman yapıldı") &&
      all.includes("Bütün antrenmanlar") && all.includes("0:18 / 0:30") && all.includes("Değerlendirme · 12–18 Eki") && all.includes("1 / 2</td>") && all.includes("Not &lt;b&gt;") &&
      all.includes("DİKİLİ YELKEN SPOR KULÜBÜ") && all.includes("/club-logo.png") && all.includes("Seyhun Yıldız") && all.includes("İlay · 14 yaş · Yelken") && !week.includes("Antrenör</small>");
  })],
  ["program listesi", F("ayrıntılar ve evreler düz yazıda", () => {
    const t = FMI.programText(FTPL.fromTemplate("yelken-ev-12", "2026-10-19"));
    return t.includes("Sırt çantalı split squat — 3 × 8–12/yan (dinlenme 75 sn") && t.includes("4. hafta: Hafif hafta (setler %70)") && t.includes("alternatif: Glute bridge");
  })],
]);

// Kişi sayfası (personPage.js): doğum günü satırı, alt satır, açık işler, fişler, yoklama; ana sayfa bağlantısı
const PPG = await import("@/lib/personPage");
const AGD = await import("@/lib/agenda");
const KPM = { uid: "u1", name: "Mete Ok", kind: "athlete", title: "Optimist", athleteId: "a1", birth: "2013-10-17" };
group("Kişi sayfası")([
  ["doğum günü bugün", F("14 yaşına giriyor", () => PPG.bdayLine(PPG.birthOf(KPM, []), "2026-10-17") === "Bugün doğum günü · 13 yaşına giriyor")],
  ["doğum günü yarın", F("yarın satırı", () => PPG.bdayLine(PPG.birthOf(KPM, []), "2026-10-16") === "Yarın doğum günü · 13 yaşına giriyor")],
  ["doğum günü uzak", F("vurgulu satır yok", () => PPG.bdayLine(PPG.birthOf(KPM, []), "2026-10-01") === "")],
  ["bağlı doğum günü kaydı önce", F("kayıttaki gün", () => PPG.birthOf(KPM, [{ memberUid: "u1", month: 3, day: 12 }]).month === 3)],
  ["yaş", F("doğum gününden önce 12", () => PPG.ageOf(PPG.birthOf(KPM, []), "2026-10-16") === 12 && PPG.ageOf(PPG.birthOf(KPM, []), "2026-10-17") === 13)],
  ["alt satır", F("Sporcu · Optimist · 13 yaş", () => PPG.subLine(KPM, 13) === "Sporcu · Optimist · 13 yaş" && PPG.subLine({ kind: "family", relation: "Eş" }, null) === "Aile bireyi · Eş")],
  ["kulüp satırları", F("sporcuda var, çalışanda ve velide yok", () => PPG.clubSide(KPM) && !PPG.clubSide({ kind: "staff" }) && !PPG.clubSide({ kind: "parent" }))],
  ["açık işler", F("yalnız ona verilen, bitmemiş, gelecek", () => {
    const r = PPG.todoOf("u1", {
      tasks: [{ id: "t1", assignees: ["u1"], due: "2026-10-20" }, { id: "t2", assignees: ["u1"], due: "2026-10-10" }, { id: "t3", assignees: ["u1"], done: true }, { id: "t4", assignees: ["u2"] }],
      plans: [{ id: "p1", assignees: ["u1"], date: "2026-10-18" }, { id: "p2", assignees: ["u1"], date: "2026-10-01" }, { id: "p3", assignees: ["u1"], date: "2026-10-19", done: true }],
      notes: [{ id: "n1", assignees: ["u1"] }, { id: "n2", assignees: ["u1"], archived: true }],
    }, "2026-10-17");
    return r.tasks.map((t) => t.id).join() === "t2,t1" && r.plans.map((p) => p.id).join() === "p1" && r.notes.length === 1;
  })],
  ["fişler", F("ödenen 1, bekleyen 1, toplam", () => {
    const r = PPG.receiptsOf("u1", [{ createdByUid: "u1", payStatus: "pending", declared: 64000 }, { createdByUid: "u1" }, { createdByUid: "u2", payStatus: "pending", declared: 5 }]);
    return r.paid === 1 && r.pending === 1 && r.pendingTotal === 64000;
  })],
  ["yoklama", F("2 geldi 1 gelmedi %67", () => {
    const r = PPG.attendanceOf({ attendance_2026: { "10-01": "present", "10-03": "absent", "10-05": "present" } }, 2026);
    return r.present === 2 && r.absent === 1 && r.pct === 67 && r.last[0].day === "2026-10-05";
  })],
  ["bugünkü doğum günleri", F("yalnız bugün", () => AGD.birthdaysToday([{ name: "A", month: 10, day: 17 }, { name: "B", month: 10, day: 18 }], "2026-10-17").map((b) => b.name).join() === "A")],
  ["ana sayfa yuvarlakları", F("kişi sayfasına gider", () => HTP.personHref(KPM) === "/people/p/u1" && HTP.personHref(null) === "/people/staff")],
]);

// Ana sayfadaki hava satırı: eski veride (sabah açılış, bağlantı yok) bu saatin tahmini, yeni veride alındığı andaki değer
const WXN = await import("@/features/weather/weather");
group("Hava satırı")([
  ["şimdi", F("veri 20 dakikadan eskiyse bu saatin satırı, yeniyse anlık değer; satır yoksa eldeki", () => {
    const at = new Date(2026, 9, 17, 9, 30);
    const w = {
      at: new Date(2026, 9, 16, 22, 0).getTime(),
      now: { t: 18, code: 0, day: false, wind: 3, gust: 5, dir: 45 },
      hourly: [["2026-10-17T08:00", 14, 1, 1, 6, 9, 300], ["2026-10-17T09:00", 16, 2, 1, 11, 15, 315], ["2026-10-17T10:00", 18, 2, 1, 13, 18, 315]],
    };
    const old = WXN.nowOf(w, at);
    const fresh = WXN.nowOf({ ...w, at: at.getTime() - 5 * 60e3 }, at);
    const none = WXN.nowOf({ ...w, hourly: [] }, at);
    return old.t === 16 && old.wind === 11 && old.day === true && fresh.t === 18 && none.wind === 3 && WXN.nowOf(null) === null;
  })],
]);

// Ana sayfa saat çizgisi: süren planın bitişi "12:00'ye kadar" (sayının okunuşuna göre ek)
group("Bitiş saati")([
  ["ekler", F("10:00+60 → 11:00'e, 11:00 → 12:00'ye, 09:00+30 → 09:30'a, 16:00 → 17:00'ye, 20:00+60 → 21:00'e, 05:00 → 06:00'ya, 23:30 → 00:30'a", () =>
    HT.untilText("10:00") === "11:00'e kadar" && HT.untilText("11:00") === "12:00'ye kadar" && HT.untilText("09:00", 30) === "09:30'a kadar"
    && HT.untilText("16:00") === "17:00'ye kadar" && HT.untilText("20:00") === "21:00'e kadar" && HT.untilText("05:00") === "06:00'ya kadar"
    && HT.untilText("23:30") === "00:30'a kadar" && HT.untilText("10:00", 20) === "10:20'ye kadar")],
  ["saatsiz", F("boş", () => HT.untilText("") === "" && HT.untilText(undefined) === "")],
]);

// Ana sayfa Hesap alanı: kasanın bu ayki girişi (geçen ayınki sayılmaz)
group("Kasa bu ay")([
  ["giriş ve çıkış", F("bu ay 2 giriş 1.500, çıkış 200; geçen ayki giriş sayılmaz", () => {
    const now = new Date(2026, 9, 17, 12);
    const t = (d) => new Date(2026, 9, d, 10).getTime();
    const r = HT.cashMonth([{ amount: 1000, ts: t(3) }, { amount: 500, ts: t(15) }, { amount: -200, ts: t(10) }, { amount: 900, ts: new Date(2026, 8, 28).getTime() }], now);
    return r.inSum === 1500 && r.inN === 2 && r.outSum === 200;
  })],
  ["boş", F("sıfır", () => HT.cashMonth([]).inSum === 0)],
]);

// Profil fotoğrafı (avatar.js): yalnız kişinin kendi Storage klasöründeki adres kabul edilir (/api/photo)
const AVT = await import("@/lib/avatar");
const AVB = "proj.firebasestorage.app";
const AVP = "orgs/o1/avatars/u1/abc.jpg";
const AVU = (p) => `https://firebasestorage.googleapis.com/v0/b/${AVB}/o/${encodeURIComponent(p)}?alt=media&token=t`;
group("Profil fotoğrafı")([
  ["kendi klasörü", F("kabul", () => AVT.avatarOk(AVU(AVP), AVP, "o1", "u1", AVB))],
  ["başkasının klasörü", F("ret", () => !AVT.avatarOk(AVU("orgs/o1/avatars/u2/abc.jpg"), "orgs/o1/avatars/u2/abc.jpg", "o1", "u1", AVB))],
  ["başka işletme", F("ret", () => !AVT.avatarOk(AVU("orgs/o2/avatars/u1/abc.jpg"), "orgs/o2/avatars/u1/abc.jpg", "o1", "u1", AVB))],
  ["başka site", F("ret", () => !AVT.avatarOk(`https://ornek.com/x?${AVP}`, AVP, "o1", "u1", AVB))],
  ["yol ile adres uyuşmuyor", F("ret", () => !AVT.avatarOk(AVU("orgs/o1/avatars/u1/zzz.jpg"), AVP, "o1", "u1", AVB))],
  ["yeni yol", F("kişinin klasöründe .jpg", () => /^orgs\/o1\/avatars\/u1\/[a-z0-9]+\.jpg$/.test(AVT.avatarPath("o1", "u1")))],
  ["ana sayfa yuvarlağında fotoğraf", F("adres taşınır", () => HTP.storyPeople([{ uid: "1", name: "Ali", kind: "staff", photo: "https://x/y.jpg" }], [])[0].photo === "https://x/y.jpg")],
]);

// Profil fotoğrafı kırpma (avatar.js coverBox/clampPan): ortalı açılır, çerçevede boşluk kalmaz
group("Profil fotoğrafı kırpma")([
  ["dikey fotoğraf ortalı", F("genişlik çerçeve kadar, dikeyde ortada", () => {
    const b = AVT.coverBox(300, 600, 260);
    return b.w === 260 && b.h === 520 && b.left === 0 && b.top === -130;
  })],
  ["yatay fotoğraf ortalı", F("yükseklik çerçeve kadar, yatayda ortada", () => {
    const b = AVT.coverBox(800, 400, 260);
    return b.h === 260 && b.w === 520 && b.top === 0 && b.left === -130;
  })],
  ["büyütme", F("2 kat", () => AVT.coverBox(400, 400, 260, 2).w === 520)],
  ["kaydırma sınırı", F("kenar boşluğu kalmaz", () => {
    const b = AVT.coverBox(300, 600, 260);
    const p = AVT.clampPan({ x: 50, y: 500 }, b, 260);
    return p.x === 0 && p.y === 130;
  })],
]);

// Mesaj ekleri (chatFile.js): fotoğraf, dosya, sesli mesaj
group("Mesaj ekleri")([
  ["fotoğraf adı", F("📷 Fotoğraf", () => CF.fileLabel({ kind: "photo" }) === "📷 Fotoğraf")],
  ["sesli mesaj adı", F("süreyle", () => CF.fileLabel({ kind: "voice", sec: 75 }) === "🎤 Sesli mesaj 1:15")],
  ["dosya adı", F("dosya adıyla", () => CF.fileLabel({ kind: "file", name: "a.pdf" }) === "📎 a.pdf")],
  ["adressiz künye", F("kaydedilmez", () => CF.cleanChatFile({ kind: "photo", path: "x" }) === null)],
  ["fotoğraf sınırı", F("11 MB fazla", () => CF.tooBig("photo", 11 * 1024 * 1024) !== "")],
  ["dosya sınırı", F("15 MB olur", () => CF.tooBig("file", 15 * 1024 * 1024) === "")],
  ["tür", F("ses ve görüntü", () => CF.kindOfFile("audio/mp4") === "voice" && CF.kindOfFile("image/png") === "photo" && CF.kindOfFile("application/pdf") === "file")],
]);
// Sayfa çökmesi (crash.js): yeni yayından sonra kod parçası yükleme hatası tanınır, sayfa bir kez yenilenir
const CR = await import("@/lib/crash");
group("Sayfa çökmesi")([
  ["Safari", F("Importing a module script failed", () => CR.isChunkError(new TypeError("Importing a module script failed.")))],
  ["Chrome", F("ChunkLoadError", () => CR.isChunkError(Object.assign(new Error("Loading chunk 123 failed."), { name: "ChunkLoadError" })))],
  ["Vite/Firefox", F("dynamically imported module", () => CR.isChunkError(new TypeError("Failed to fetch dynamically imported module: /x.js")))],
  ["kod hatası", F("yenilemez", () => !CR.isChunkError(new TypeError("Cannot read properties of undefined (reading 'map')")))],
  ["boş", F("yenilemez", () => !CR.isChunkError(null) && !CR.isChunkError(undefined))],
]);

// Gerçekleşen rüzgâr (windObs.js): Dikili istasyonunun SYNOP raporu okunur, yalnız 10 km içindeki yere gösterilir
const WO = await import("@/lib/windObs");
const RR = await import("@/lib/rainRadar");
const { deflateSync } = await import("node:zlib");
// Deneme PNG'si: 4×2 RGBA, 2. satır "Sub" süzgeçli (radar döşemesi gibi)
const testPng = () => {
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(4, 0); ih.writeUInt32BE(2, 4); ih[8] = 8; ih[9] = 6;
  const r0 = [0, 0, 0, 0, 0, 160, 220, 255, 200, 0, 0, 0, 0, 230, 40, 40, 255];
  const r1 = [1, 30, 60, 120, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), chunk("IDAT", deflateSync(Buffer.from([...r0, ...r1]))), chunk("IEND", Buffer.alloc(0))]);
};
const SYN = {
  kn: "17180,2026,10,18,12,00,AAXX 18124 17180 42970 33006 10216 20104 30102 40124 58008 333 91108=",
  ms: "17180,2026,10,18,15,00,AAXX 18151 17180 42970 32510 10216 333 91015=",
  calm: "17180,2026,10,18,18,00,AAXX 18184 17180 42970 30000 10216=",
  big: "17180,2026,10,18,09,00,AAXX 18094 17180 42970 33099 00105 10216=",
};
group("Ölçülen rüzgâr")([
  ["sık oklar", F("uzakta ızgara noktaları, yakında aralar doldurulur; 355° ile 5° arası kuzeye yakın kalır; harita düğmeyle açılır, zoom 12", async () => {
    const R = await import("@/lib/regionMap");
    const { pts } = R.regionUrl({ lat: 39.07, lon: 26.89 });
    const g = { spots: pts.map((p, k) => ({ lat: p.lat, lon: p.lon, w: [10 + (k % 7)], d: [k % 7 < 3 ? 355 : 5] })) };
    const far = R.denseArrows(g, 0, [26.6, 38.8, 27.2, 39.3], 10);
    const near = R.denseArrows(g, 0, [26.85, 39.03, 26.93, 39.1], 13);
    const { readFileSync } = await import("node:fs");
    const rm = readFileSync(new URL("../../../src/features/weather/RegionMap.jsx", import.meta.url), "utf8");
    return far.length === 49 && near.length > 49 && near.every((a) => a.d <= 10 || a.d >= 350) && near.every((a) => a.w >= 10 && a.w <= 16) && R.denseArrows(g, -1, [0, 0, 1, 1], 12).length === 0 && /zoom: 12/.test(rm) && /Harita\n/.test(rm) && !/dragPan\.disable/.test(rm);
  })],
  ["radar döşemesi", F("Dikili z7: döşeme 73/48, piksel içeride", () => { const t = RR.tileOf(39.07, 26.89); return t.z === 7 && t.x === 73 && t.y === 48 && t.px >= 0 && t.px < 256 && t.py >= 0 && t.py < 256; })],
  ["radar rengi", F("saydam yok, açık mavi hafif, koyu mavi orta, kırmızı kuvvetli", () => RR.levelOf(0, 0, 0, 0) === 0 && RR.levelOf(160, 220, 255, 200) === 1 && RR.levelOf(30, 60, 120, 255) === 2 && RR.levelOf(230, 40, 40, 255) === 3)],
  ["radar PNG", F("RGBA + Sub süzgeci çözülür, 3×3 en şiddetlisi", () => { const img = RR.decodePng(testPng()); return img.w === 4 && img.h === 2 && img.px(2, 0)[3] === 0 && img.px(3, 0)[0] === 230 && img.px(0, 1).join() === "30,60,120,255" && img.px(1, 1).join() === "30,60,120,255" && RR.levelAt(img, 2, 0) === 3 && RR.levelAt(img, 0, 0) === 2; })],
  ["knot raporu", F("300°, 6 kn, sağanak 8", () => { const o = WO.parseSynop(SYN.kn, "17180"); return o.dir === 300 && o.kn === 6 && o.gust === 8 && o.at === "2026-10-18T12:00:00.000Z"; })],
  ["m/s raporu", F("250°, 10 m/s = 19 kn, sağanak 29", () => { const o = WO.parseSynop(SYN.ms, "17180"); return o.dir === 250 && o.kn === 19 && o.gust === 29; })],
  ["sakin", F("yön yok, 0 kn, sağanak yok", () => { const o = WO.parseSynop(SYN.calm, "17180"); return o.dir === null && o.kn === 0 && o.gust === null; })],
  ["99 üstü", F("00fff grubu", () => WO.parseSynop(SYN.big, "17180").kn === 105)],
  ["ölçülen yağış", F("6RRRt: 12 mm / 6 saat; 991 = 0,1 mm / 3 saat; iz 0; grup yoksa null; 333 bölümünden de", () => {
    const r = (x) => WO.parseSynop(`17180,2026,10,18,12,00,AAXX 18121 17180 12970 33006 10216 ${x}=`, "17180")?.rain;
    const a = r("60121 333 91108"), b = r("69917"), c = r("69901"), d = r("70212 333 60057 91108");
    return a.mm === 12 && a.h === 6 && b.mm === 0.1 && b.h === 3 && c.mm === 0 && d.mm === 5 && d.h === 3 && WO.parseSynop(SYN.kn, "17180").rain === null
      && WO.obsRows([WO.parseSynop("17180,2026,10,18,12,00,AAXX 18121 17180 12970 33006 10216 60121=", "17180")], "2026-10-18")[0].rain.mm === 12;
  })],
  ["boş rapor", F("NIL, başka istasyon, bozuk satır okunmaz", () => WO.parseSynop("17180,2026,10,18,18,00,AAXX 18184 17180 NIL=", "17180") === null && WO.parseSynop(SYN.kn.replace(/^17180/, "17220"), "17180") === null && WO.parseSynop("x", "17180") === null)],
  ["yerel saat", F("12 ve 15 UTC → 15 ve 18; başka gün çıkar", () => {
    const r = WO.obsRows([WO.parseSynop(SYN.kn), WO.parseSynop(SYN.ms), { at: "2026-10-17T12:00:00.000Z", kn: 3, gust: null, dir: 0 }], "2026-10-18");
    return r.map((x) => `${x.hh}:${x.wind}`).join() === "15:6,18:19";
  })],
  ["istek aralığı", F("yerel gün UTC'de", () => { const u = WO.utcRange("2026-10-18"); return u.begin === "202610172100" && u.end === "202610182059"; })],
  ["Dikili yakın", F("istasyon 10 km içinde", () => { const s = WO.nearestStation(39.0717, 26.8886); return s.name === "Dikili" && s.near && s.km < 1; })],
  ["Foça uzak", F("istasyon gösterilmez", () => { const s = WO.nearestStation(38.67, 26.75); return !s.near && s.km > 10; })],
  ["Bodrum", F("seçilen yer kendi istasyonunu bulur", () => { const s = WO.nearestStation(37.0344, 27.4305); return s.id === "17290" && s.near; })],
  ["Fenerbahçe", F("İstanbul'da en yakını Göztepe", () => { const s = WO.nearestStation(40.969, 29.037); return s.id === "17062" && s.near; })],
  ["istasyon listesi", F("numaralar tek, yerler Türkiye'de", () => new Set(WO.STATIONS.map((x) => x.id)).size === WO.STATIONS.length && WO.STATIONS.every((x) => /^17\d{3}$/.test(x.id) && x.name && x.lat > 35 && x.lat < 43 && x.lon > 25 && x.lon < 45))],
]);
// Hava durumu hesapları (weather.js): Open-Meteo yanıtının sadeleşmesi, günün saatleri, yelkene uygun saatler, rüzgâr adı ve şiddeti,
// gökyüzü adı ve grafik şeridi rengi, hava sorusu tanıma, yapay zekaya giden özet (ağa çıkmaz)
{
  const T = Array.from({ length: 48 }, (_, i) => `2026-10-18T${String(i % 24).padStart(2, "0")}:00`.replace("18T", i < 24 ? "18T" : "19T"));
  const J = {
    current: { time: "2026-10-18T10:15", temperature_2m: 19.6, weather_code: 1, is_day: 1, wind_speed_10m: 11.4, wind_gusts_10m: 16.5, wind_direction_10m: 315 },
    hourly: { time: T, temperature_2m: T.map(() => 18.4), weather_code: T.map(() => 2), is_day: T.map((t) => (+t.slice(11, 13) >= 7 && +t.slice(11, 13) <= 18 ? 1 : 0)),
      wind_speed_10m: T.map((t) => (+t.slice(11, 13) >= 12 && +t.slice(11, 13) <= 15 ? 12 : 4)), wind_gusts_10m: T.map(() => 15), wind_direction_10m: T.map(() => 315), precipitation_probability: T.map(() => 20), precipitation: T.map((t) => (t.startsWith("2026-10-19T1") ? [0, 0.4, 2, 5.2, 9, 3, 0, 0, 0, 0][+t[12]] : 0)) },
    daily: { time: ["2026-10-18", "2026-10-19", "2026-10-20"], weather_code: [1, 3, 61], temperature_2m_max: [23.4, 21, 18], temperature_2m_min: [14.6, 13, 12],
      wind_speed_10m_max: [12, 18, 25], wind_gusts_10m_max: [16, 24, 33], wind_direction_10m_dominant: [315, 45, 225] },
  };
  const W = WXN.shape(J, new Date(2026, 9, 18, 10, 15));
  group("Hava hesapları")([
    ["yön derecesi", F("140° yazar, 360 → 0°, eksi düzelir, yön yoksa boş", () => WXN.dirDeg(140) === "140°" && WXN.dirDeg(360) === "0°" && WXN.dirDeg(-20) === "340°" && WXN.dirDeg(null) === "")],
    ["sadeleşme", F("şimdi yuvarlanır, sonraki 15 saat 11:00'den, bugün ve yarından sonraki günler", () =>
      W.now.t === 20 && W.now.wind === 11 && W.now.day === true && W.hours.length === 15 && W.hours[0].hh === "11" && W.today.max === 23 && W.today.date === "2026-10-18"
      && W.days.length === 2 && W.days[0].date === "2026-10-19" && W.h48.length === 38 && W.hourly.length === 48 && W.hourly[0][7] === 20)],
    ["günün saatleri", F("yarının 24 saati, yağmur olasılığıyla; eski önbellekte null", () => {
      const d = WXN.dayHours(W, "2026-10-19");
      return d.length === 24 && d[13].wind === 12 && d[13].rain === 20 && d[3].day === false && WXN.dayHours({}, "2026-10-19") === null;
    })],
    ["yağış mm", F("saatlik yağış dayHours'a mm olarak gelir; eski önbellekte null", () => {
      const d = WXN.dayHours(W, "2026-10-19");
      return d[13].mm === 5.2 && d[14].mm === 9 && d[3].mm === 0 && WXN.dayHours({ hourly: [["2026-10-19T03:00", 1, 2, 1, 4, 5, 6, 20]] }, "2026-10-19")[0].mm === null;
    })],
    ["yağış rengi", F("0,1 altı boş; <1 açık, 1–4 orta, 4–8 koyu, 8+ mor", () => WXN.mmTone(0) === null && WXN.mmTone(null) === null && WXN.mmTone(0.5) === "#8fb0d0" && WXN.mmTone(2) === "#4f86c0" && WXN.mmTone(5) === "#2b5f9e" && WXN.mmTone(12) === "#7b5cc4")],
    ["kuvvetli yağış uyarısı", F("saatte 4 mm ve üstü: ilk ve son saat aralığı, günün toplamı; yoksa null", () => {
      const h = WXN.heavyRain(WXN.dayHours(W, "2026-10-19"));
      return h && h.from === "13:00" && h.to === "15:00" && h.total === 20 && WXN.heavyRain(WXN.dayHours(W, "2026-10-18")) === null && WXN.heavyRain([]) === null;
    })],
    ["yelkene uygun saatler", F("gündüz 7–16 kn, sağanak 22 altı: 12–16; tek saat sayılmaz; gece sayılmaz", () => {
      const rows = WXN.dayHours(W, "2026-10-18");
      const one = rows.map((h) => (h.hh === "09" ? { ...h, wind: 10 } : h));
      const night = rows.map((h) => ({ ...h, day: false, wind: 10 }));
      return WXN.sailWindows(rows).join() === "12–16" && WXN.sailWindows(one).join() === "12–16" && WXN.sailWindows(night).length === 0;
    })],
    ["rüzgâr adı", F("315 karayel, 45 poyraz, 225 lodos, -45 karayel, 360 yıldız", () =>
      WXN.windName(315)[0] === "Karayel" && WXN.windName(45)[0] === "Poyraz" && WXN.windName(225)[0] === "Lodos" && WXN.windName(-45)[1] === "KB" && WXN.windName(360)[0] === "Yıldız")],
    ["rüzgâr şiddeti", F("6 hafif, 7 tatlı, 12 orta, 17 sert, 22 kuvvetli, 28 fırtına", () =>
      [6, 7, 12, 17, 22, 28].map((k) => WXN.windLevel(k).label).join() === "Hafif,Tatlı,Orta,Sert,Kuvvetli,Fırtına")],
    ["gökyüzü", F("açık gündüz güneş, gece ay; yağmur, kar, fırtına, sis; bilinmeyen kod çökmez", () =>
      WXN.sky(0).icon === "sun" && WXN.sky(0, false).icon === "moon" && WXN.sky(63).label === "Yağmurlu" && WXN.sky(73).icon === "snow" && WXN.sky(96).icon === "storm" && WXN.sky(45).label === "Sisli" && WXN.sky(4).label === "—")],
    ["grafik şeridi", F("açık sarı, yağmurda mavi, yağmur ihtimali yüksekse koyu mavi, %30'da açık mavi", () =>
      WXN.skyBand(0) === "#e9b949" && WXN.skyBand(61) === "#4f7fae" && WXN.skyBand(2, 75) === "#2f5f93" && WXN.skyBand(1, 30) === "#8fb0d0" && WXN.skyBand(3) === "#8f98a3")],
    ["hava sorusu", F("rüzgâr, yağmur, knot, Türkçe harfsiz; 'karar', 'kardeş', 'dolum' hava değil", () =>
      ["yarın rüzgar kaç knot", "YAĞMUR yağacak mı", "denize çıkılır mı", "ruzgar nasil", "kar yağar mı"].every(WXN.wantsWeather) && !["karar verelim", "kardeşime yaz", "dolum tesisi", "notlarımı oku"].some(WXN.wantsWeather))],
    ["yer adı", F("ilçe · il, aynıysa tek; aynı yer konumdan tanınır", () =>
      WXN.placeLabel({ name: "Dikili", region: "İzmir" }) === "Dikili · İzmir" && WXN.placeLabel({ name: "İzmir", region: "İzmir" }) === "İzmir"
      && WXN.samePlace({ lat: 39.07171, lon: 26.8886 }, { lat: "39.0717", lon: 26.88861 }) && !WXN.samePlace(null, WXN.PLACE))],
    ["karşılaştırma bağlantıları", F("MGM il/ilçe ve Windy konumu", () => {
      const l = WXN.compareLinks({ name: "Foça", region: "İzmir", lat: 38.67, lon: 26.75 });
      return l.mgm.includes("il=%C4%B0zmir") && l.mgm.includes("ilce=Fo%C3%A7a") && l.windy.endsWith("?38.670,26.750,11");
    })],
    ["yapay zeka özeti", F("şimdi, bugün, 48 saatlik ve günlük satırlar; boş veride boş", () => {
      const d = WXN.weatherDigest(W);
      return /^## HAVA DURUMU \(Dikili · İzmir/.test(d) && /ŞİMDİ: 20°C, Az bulutlu, Karayel \(KB\) 11 kn/.test(d) && /SAATLİK/.test(d) && /GÜNLÜK:/.test(d) && WXN.weatherDigest(null) === "";
    })],
  ]);
}

// Ortak düğmeler (buttonClass.js): beş çeşit tek yerden; ghost = ikincil; yazı ve simge satırı doldurmaz
const BC = await import("@/components/ui/buttonClass");
group("Ortak düğmeler")([
  ["ana", F("btn btn-primary w-full", () => BC.buttonClass() === "btn btn-primary w-full")],
  ["eski ghost", F("ikincil olur", () => BC.buttonClass({ variant: "ghost" }) === "btn btn-secondary w-full")],
  ["tehlike küçük", F("btn-danger btn-sm", () => BC.buttonClass({ variant: "danger", size: "sm", full: false }) === "btn btn-danger btn-sm")],
  ["yazı ve simge", F("satırı doldurmaz", () => BC.buttonClass({ variant: "text" }) === "btn btn-text" && BC.buttonClass({ variant: "icon" }) === "btn btn-icon")],
  ["geri", F("btn-back, satırı doldurmaz", () => BC.buttonClass({ variant: "back" }) === "btn btn-back")],
  ["bilinmeyen çeşit", F("ana düğmeye düşer", () => BC.buttonClass({ variant: "xyz" }) === "btn btn-primary w-full")],
]);

// Ana sayfa kokpiti (homeTiles.js nextPlan, 2026-10-21): lacivert üst kısımdaki "sıradaki iş"
{
  const HT = await import("@/lib/homeTiles");
  const at = new Date("2026-10-21T13:00:00");
  const P = [
    { id: "a", title: "Sabah", date: "2026-10-21", time: "09:00" },
    { id: "b", title: "Süren", date: "2026-10-21", time: "12:30", durationMin: 90 },
    { id: "c", title: "Akşam", date: "2026-10-21", time: "18:00" },
    { id: "d", title: "Yarın", date: "2026-10-22", time: "10:00" },
  ];
  group("Ana sayfa kokpiti")([
    ["süren plan", F("12:30 + 90 dk sürüyor, o gelir", () => HT.nextPlan(P, at, "2026-10-21")?.id === "b")],
    ["biten plan", F("süren yoksa sıradaki (18:00)", () => HT.nextPlan(P.filter((p) => p.id !== "b"), at, "2026-10-21")?.id === "c")],
    ["bugün bitti", F("yarının ilk planı", () => HT.nextPlan(P.filter((p) => p.date !== "2026-10-21" || p.id === "a"), at, "2026-10-21")?.id === "d")],
    ["iptal ve fitness", F("sayılmaz", () => HT.nextPlan([{ ...P[2], status: "cancelled" }, { ...P[2], id: "f", fit: { name: "x" } }, P[3]], at, "2026-10-21")?.id === "d")],
    ["saatsiz plan", F("gün boyu sürer", () => HT.nextPlan([{ id: "s", title: "Kamp", date: "2026-10-21" }], at, "2026-10-21")?.id === "s")],
    // Seyhun 2026-10-22: bitirilip arşive giden antrenman "Bugün · Gün boyu" diye kalıyordu (plan bitti alanı done: true)
    ["bitirilen plan", F("arşivdeki (bitti) atlanır, sıradaki gelir", () => HT.nextPlan([{ id: "s", title: "Antrenman", date: "2026-10-21", done: true }, P[2], P[3]], at, "2026-10-21")?.id === "c")],
    ["8 gün sonra", F("7 günden uzak plan yok", () => HT.nextPlan([{ id: "u", date: "2026-10-30", time: "10:00" }], at, "2026-10-21") === null)],
    ["yemek kartı", F("saate göre: 8 kahvaltı, 12 öğle, 19 akşam, 2 gece", () => HT.mealLabel(8) === "Kahvaltı önerisi" && HT.mealLabel(12) === "Öğle yemeği önerisi" && HT.mealLabel(19) === "Akşam yemeği önerisi" && HT.mealLabel(2) === "Gece atıştırması")],
    ["seçilen günün planları", F("iptal ve biten çıkar, saatsiz sonda", () => HT.dayPlans([{ id: "a", date: "2026-10-26", time: "16:00" }, { id: "b", date: "2026-10-26", time: "" }, { id: "c", date: "2026-10-26", time: "10:00" }, { id: "d", date: "2026-10-26", time: "09:00", status: "cancelled" }, { id: "e", date: "2026-10-26", time: "08:00", done: true }, { id: "f", date: "2026-10-27", time: "09:00" }], "2026-10-26").map((p) => p.id).join() === "c,a,b")],
    ["seçilen günün havası", F("saatlerden en düşük/yüksek, gündüz en sert rüzgâr; özet varsa ondan; saat yoksa yok", () => {
      const rows = ["06", "09", "13", "15", "21"].map((hh, i) => ({ hh, t: [12, 15, 20, 22, 16][i], code: [0, 1, 2, 3, 0][i], wind: [20, 8, 12, 16, 25][i], gust: [24, 12, 18, 22, 30][i], dir: [0, 90, 180, 270, 45][i] }));
      const a = HT.dayWeather({ days: [] }, rows, "2026-10-29");
      const b = HT.dayWeather({ days: [{ date: "2026-10-29", min: 10, max: 24, code: 61 }] }, rows, "2026-10-29");
      return a.min === 12 && a.max === 22 && a.code === 2 && a.wind === 16 && a.gust === 22 && a.dir === 270 && b.min === 10 && b.max === 24 && b.code === 61 && HT.dayWeather({}, [], "2026-10-29") === null;
    })],
    ["yemek kartı fotoğrafı", F("saate göre: 8 kahvaltı, 13 makarna, 20 pizza, 1 burger", () => HT.mealPhoto(8) === "breakfast" && HT.mealPhoto(13) === "pasta" && HT.mealPhoto(20) === "pizza" && HT.mealPhoto(1) === "burger")],
    ["tür başlıkta", F("“Optimist antrenmanı” Antrenman etiketi almaz, toplantı alır", () => HT.planTag({ title: "Optimist antrenmanı", cat: "Antrenman" }) === "" && HT.planTag({ title: "Yönetim", cat: "Toplantı" }) === "Toplantı" && HT.planTag({ title: "Fitness · İlay", fit: { name: "İlay" } }) === "")],
  ]);
}

// Ana sayfa › Kulüp satırları (homeTiles.js clubRaceRow, lastTraining, fitWeek, 2026-10-21): yarış, son antrenman ve gelenler, haftanın fitness'ı
{
  const HT = await import("@/lib/homeTiles");
  const T = "2026-10-21";
  const R = [
    { id: "f", name: "Foça Kupası", startDate: "2026-10-25", endDate: "2026-10-26", place: "Foça", count: 6 },
    { id: "s", name: "Sonbahar", startDate: "2026-10-20", endDate: "2026-10-22", place: "Dikili", count: 4 },
  ];
  const A = [
    { studentName: "Ali Yılmaz", att: { 2026: { "10-18": "present", "10-20": "present" } } },
    { studentName: "İlay Kaya", att: { 2026: { "10-20": "present" } } },
    { studentName: "Ege Demir", att: { 2026: { "10-20": "absent", "10-25": "present" } } },
  ];
  const fit = [
    { date: "2026-10-20", plan: { date: "2026-10-20", fit: { res: { st: "done" } } } },
    { date: "2026-10-22", plan: { date: "2026-10-22" } },
    { date: "2026-10-28", plan: { date: "2026-10-28" } },
  ];
  group("Ana sayfa kulüp satırları")([
    ["süren yarış", F("başlamış, bitmemiş yarış önce: Bugün", () => HT.clubRaceRow(R, T)?.id === "s" && HT.clubRaceRow(R, T).right === "Bugün" && HT.clubRaceRow(R, T).sub.startsWith("Sürüyor"))],
    ["sıradaki yarış", F("süren yoksa en yakını, kalan gün", () => HT.clubRaceRow([R[0]], T)?.right === "4 gün" && HT.clubRaceRow([R[0]], T).sub.includes("6 sporcu"))],
    ["biten yarış", F("bitmiş yarış yok sayılır", () => HT.clubRaceRow([{ id: "x", name: "Eski", startDate: "2026-10-10", endDate: "2026-10-12" }], T) === null)],
    ["son antrenman", F("son 'geldi' günü ve gelenler (gelecek gün sayılmaz)", () => { const t = HT.lastTraining(A, [], T); return t?.date === "2026-10-20" && t.n === 2 && t.names.join(",") === "Ali,İlay"; })],
    ["yoklama yok", F("hiç 'geldi' yoksa satır yok", () => HT.lastTraining([{ studentName: "X", att: {} }], [], T) === null)],
    ["haftanın fitness'ı", F("Pazartesi-Pazar arası sayılır, yapılan 1", () => HT.fitWeek(fit, T).n === 2 && HT.fitWeek(fit, T).done === 1)],
  ]);
}

{
  const PI = await import("@/lib/planImportant");
  const D = await import("@/features/add/drafts");
  group("Önemli plan")([
    ["son tarih kendiliğinden önemli", F("adında son gün / son ödeme / son tarih geçen plan önemli, benzer sözler değil", () =>
      PI.isImportant({ title: "Foça: Online kayıt son günü" }) && PI.isImportant({ title: "Kayıt ücreti son ödeme" }) && PI.isImportant({ title: "Son tarih" }) &&
      !PI.isImportant({ title: "Sonbahar kupası" }) && !PI.isImportant({ title: "Son günler antrenmanı" }) && !PI.isImportant({ title: "Optimist antrenmanı" }))],
    ["elle önemli", F("important alanı true olan plan önemli", () => PI.isImportant({ title: "Belediye görüşmesi", important: true }) && !PI.isImportant(null))],
    ["taslaktan kayda", F("planın Önemli anahtarı kayda important olarak gider, kapalıysa false", () =>
      D.toPatch({ ...D.blank("plan"), title: "x", date: "2026-10-23", important: true }).important === true &&
      D.toPatch({ ...D.blank("plan"), title: "x", date: "2026-10-23" }).important === false)],
  ]);
}

// Sayfa geçişleri: alt sekme Mesajlar'da da ortak geri düğmesi; listeden açılıp geri dönünce liste bellekten hemen çizilir
{
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  group("Sayfa geçişleri")([
    ["Mesajlar başlığı", F("geri düğmesi + diğer sayfalarla aynı başlık boyu", () => /<BackButton href="\/"/.test(src("features/chat/ChatList.jsx")) && /<h1 className="truncate text-\[1\.375rem\] font-semibold/.test(src("features/chat/ChatList.jsx")))],
    ["Yarışlar geri dönüş", F("liste racesNow ile başlar, yarış 1 dk içindeki listeden açılır", () =>
      /useState\(\(\) => racesNow\(orgId\)\)/.test(src("app/(app)/athletes/races/page.jsx")) && /racesNow\(orgId, 60e3\)/.test(src("app/(app)/athletes/races/[id]/page.jsx")) && /stale\(\)/.test(src("features/athletes/races.js")))],
    ["Etkinlikler ve Gönderiler", F("liste bellekten başlar", () =>
      /useState\(\(\) => eventsNow\(orgId\)\)/.test(src("app/(app)/events/page.jsx")) && /useState\(\(\) => postsNow\(orgId\)\)/.test(src("app/(app)/posts/page.jsx")))],
  ]);
}

// Zildeki yapılacaklar: sporcuya verilen fitness programı tek satır; pencerede önce bildirimler
{
  const NP = await import("@/lib/fitness/newProgram");
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  const plans = Array.from({ length: 82 }, (_, i) => ({ fit: { prog: "p1" }, date: new Date(Date.parse("2026-10-23") + Math.floor(i / 3) * 864e5).toISOString().slice(0, 10), createdByUid: "s" }));
  group("Bildirim kutusu: fitness programı")([
    ["tek satır", F("82 plan tek gruba toplanır", () => { const g = NP.fitGroups(plans); return g.length === 1 && g[0].n === 82 && g[0].by === "s"; })],
    ["metin", F("hafta ve antrenman sayısı", () => NP.fitText(NP.fitGroups(plans)[0]) === "4 haftalık, 82 antrenman")],
    ["iki program", F("program başına ayrı satır", () => NP.fitGroups([...plans.slice(0, 3), { fit: { prog: "p2" }, date: "2026-10-24" }]).length === 2)],
    ["planlar ayrı çıkmaz", F("ForYou yeni planlarda fitness planını atlar", () => /!\(kind === "plan" && r\.fit\?\.prog\)/.test(src("features/home/ForYou.jsx")))],
    ["önce bildirimler", F("pencerede Bildirimler, Yapılacaklar'dan önce", () => { const s = src("features/home/Inbox.jsx"); return s.indexOf('aria-label="Bildirimler"') < s.indexOf('aria-label="Yapılacaklar"'); })],
  ]);
}

// Asistan yazı kutusunda Fotoğraf düğmesi: motor photoIn verince görünür, seçilen resmi ona verir
{
  const { readFileSync } = await import("node:fs");
  const s = readFileSync(new URL("../../../src/features/home/TabBar.jsx", import.meta.url), "utf8");
  group("Asistan: fotoğraf düğmesi")([
    ["yalnız photoIn varsa", F("photo yalnız act.current.photoIn varken verilir", () => /photo: act\.current\.photoIn \? \(f\) => act\.current\.photoIn\(f\) : undefined/.test(s))],
    ["resim seçici", F('accept="image/*" ve düğme adı Fotoğraf', () => /accept="image\/\*"/.test(s) && /aria-label="Fotoğraf"/.test(s))],
    ["seçici açıkken kapanmaz", F("kutu picking varken kendiliğinden kapanmaz", () => /!picking\.current && !text\.trim\(\)/.test(s))],
  ]);
}

// Deniz trafiği (lib/sea.js): AIS mesajı okuma, geminin durumu, asistan cevabı
{
  const S = await import("@/lib/sea");
  const now = Date.parse("2026-10-23T12:00:00Z");
  const pos = (m, lat, lon, sog, st, cog = 0, t = now) => ({ MessageType: "PositionReport", MetaData: { MMSI: m, ShipName: "TEST@@" }, Message: { PositionReport: { Latitude: lat, Longitude: lon, Sog: sog, Cog: cog, TrueHeading: 0, NavigationalStatus: st, UserID: m } } });
  const build = (rows) => rows.reduce((all, [msg, t]) => S.mergeShip(all, S.parseAis(msg, t)), {});
  const D = S.PORTS[0];
  group("Deniz trafiği")([
    ["konum mesajı", F("MMSI, ad, hız, durum okunur", () => { const p = S.parseAis(pos(271000001, 39.05, 26.85, 5.2, 0), now); return p.m === 271000001 && p.n === "TEST" && p.sog === 5.2 && p.st === 0 && p.seen === now; })],
    ["gemi bilgisi", F("tür ve gideceği yer", () => { const p = S.parseAis({ MessageType: "ShipStaticData", MetaData: { MMSI: 5 }, Message: { ShipStaticData: { Name: "NORDIC STAR", Type: 80, Destination: "ALIAGA@@" } } }); return p.t === 80 && p.dest === "ALIAGA" && S.typeLabel(p.t) === "Tanker"; })],
    ["bozuk mesaj", F("null", () => S.parseAis({ MessageType: "PositionReport", MetaData: {}, Message: {} }) === null)],
    ["limanda bağlı", F("st 5 → Limanda", () => S.shipState({ lat: D.lat, lon: D.lon, sog: 0, st: 5 }, now).key === "moored")],
    ["demirde", F("st 1 açıkta → Demirde", () => S.shipState({ lat: 39.02, lon: 26.8, sog: 0.1, st: 1 }, now).key === "anchor")],
    ["yanaşıyor", F("limana yaklaşan, dakika hesabı", () => {
      const all = build([[pos(1, 39.03, 26.8, 10, 0), now - 60e3], [pos(1, 39.04, 26.82, 10, 0), now]]);
      const st = S.shipState(all[1], now);
      return st.key === "approach" && st.port === "Dikili" && st.min > 0;
    })],
    ["ayrılıyor", F("limandan uzaklaşan", () => {
      const all = build([[pos(2, D.lat - 0.005, D.lon - 0.005, 6, 0), now - 60e3], [pos(2, D.lat - 0.02, D.lon - 0.02, 6, 0), now]]);
      return S.shipState(all[2], now).key === "leave";
    })],
    ["kalkacak", F("demirdeyken seyir durumuna geçti", () => {
      const all = build([[pos(3, 39.02, 26.8, 0, 1), now - 120e3], [pos(3, 39.02, 26.8, 0, 0), now]]);
      return S.shipState(all[3], now).key === "ready";
    })],
    ["karaya oturmuş", F("amber uyarı", () => { const st = S.shipState({ lat: 39.02, lon: 26.8, sog: 0, st: 6 }, now); return st.key === "trouble" && st.warn; })],
    ["eski gemi silinir", F("30 dk görünmeyen", () => { const all = { 1: { m: 1, seen: now - 31 * 60e3 }, 2: { m: 2, seen: now } }; S.prune(all, now); return !all[1] && !!all[2]; })],
    ["Sahil Güvenlik", F("tip 55 ya da TCSG adı", () => S.isGuard({ t: 55 }) && S.isGuard({ n: "TCSG 309" }) && !S.isGuard({ n: "MAVI RUZGAR", t: 37 }))],
    ["satır yazısı", F("Yolcu · 11,2 kn · Dikili'ye 20 dk", () => S.shipLine({ type: "Yolcu", sog: 11.2, state: { key: "approach", port: "Dikili", min: 20 } }) === "Yolcu · 11,2 kn · Dikili'ye 20 dk")],
    ["ek: Aliağa'dan", F("limandan çıkış eki", () => /Aliağa'dan çıkıyor/.test(S.shipLine({ type: "Tanker", sog: 4, state: { key: "leave", port: "Aliağa" } })))],
    ["cevap: özet", F("sayılarla", () => S.seaAnswer("summary", { ships: [{ n: "A", state: { key: "moored" } }, { n: "B", state: { key: "anchor" } }] }) === "Çevrede 2 gemi var: 1 demirde, 1 limanda.")],
    ["cevap: yanaşan yok", F("kısa cevap", () => S.seaAnswer("approach", { ships: [] }) === "Şu an yanaşan ya da ayrılan gemi yok.")],
    ["cevap: anahtar yok", F("Netlify uyarısı", () => /aisstream/.test(S.seaAnswer("summary", { error: "nokey" })))],
    ["cevap: acil", F("158 ve Kanal 16", () => /158/.test(S.seaAnswer("emergency")) && /Kanal 16/.test(S.seaAnswer("emergency")))],
    ["soru değil", F("gemi kelimesi ama başka iş", () => S.seaAsk("tekne yıkama planı ekle") === null && S.seaAsk("deniz trafiğini aç") === null && S.seaAsk("yarın 10'da antrenman") === null)],
  ]);
}

// aisstream bağlantısı (lib/server/aisStream.js): yerel sahte sunucuyla mesaj, anahtar hatası, mesajsız kapanma
{
  const { collect } = await import("@/lib/server/aisStream");
  const { WebSocketServer } = await import("ws");
  const run = (onSub) => new Promise((ok) => {
    const wss = new WebSocketServer({ port: 0 }, async () => {
      const r = await collect("anahtar", 800, `ws://127.0.0.1:${wss.address().port}`);
      wss.close();
      ok(r);
    });
    wss.on("connection", (c) => c.on("message", (m) => onSub(c, JSON.parse(String(m)))));
  });
  const pos = { MessageType: "PositionReport", MetaData: { MMSI: 271000009, ShipName: "DENEME" }, Message: { PositionReport: { Latitude: 39.05, Longitude: 26.85, Sog: 4, Cog: 90, TrueHeading: 90, NavigationalStatus: 0, UserID: 271000009 } } };
  const r1 = await run((c, sub) => sub.APIKey === "anahtar" && sub.BoundingBoxes?.length === 1 && c.send(Buffer.from(JSON.stringify(pos))));
  const r2 = await run((c) => c.send(JSON.stringify({ error: "Api Key Is Not Valid" })));
  const r3 = await run((c) => c.close(1008, "yetkisiz"));
  const r4 = await collect("x", 500, "ws://127.0.0.1:9");
  group("Deniz trafiği: aisstream bağlantısı")([
    ["mesaj gelir", F("abonelik gider, ikili mesaj okunur, sayılır", () => !r1.err && r1.n === 1 && r1.parts.length === 1 && r1.parts[0].m === 271000009)],
    ["anahtar hatası", F("hata metni döner", () => /Api Key Is Not Valid/.test(r2.err?.message || ""))],
    ["mesajsız kapanma", F("hata sayılır", () => /kapandı 1008/.test(r3.err?.message || ""))],
    ["sunucu yok", F("hata döner, takılmaz", () => !!r4.err && r4.parts.length === 0)],
  ]);
}

// Halka açık kameralar (lib/cams.js): Windy cevabı, uzaklık, süre, sesli komut
{
  const C = await import("@/lib/cams");
  const now = Date.parse("2026-10-23T12:00:00Z");
  const w = (id, lat, lon, extra = {}) => ({ webcamId: id, title: `Kamera ${id}`, status: "active", lastUpdatedOn: "2026-10-23T11:55:00Z", location: { latitude: lat, longitude: lon }, images: { current: { preview: `p${id}.jpg`, thumbnail: `t${id}.jpg` } }, player: { day: `https://webcams.windy.com/webcams/public/embed/player/${id}/day` }, urls: { detail: `https://www.windy.com/webcams/${id}` }, ...extra });
  group("Kameralar")([
    ["Windy kamerası", F("ad, görüntü, oynatıcı, bağlantı", () => { const c = C.normCam(w(7, 39.3, 26.7)); return c.id === "7" && c.preview === "p7.jpg" && /player\/7\/day/.test(c.player) && /webcams\/7$/.test(c.link) && !c.live; })],
    ["oynatıcı nesne", F("player.live { embed } canlı sayılır", () => { const c = C.normCam(w(8, 39, 26, { player: { live: { embed: "https://x/live" } } })); return c.player === "https://x/live" && c.live; })],
    ["görüntüsüz atlanır", F("images yok ya da pasif → null", () => C.normCam(w(9, 39, 26, { images: {} })) === null && C.normCam(w(9, 39, 26, { status: "inactive" })) === null)],
    ["yakından uzağa", F("km eklenir, sıralanır", () => { const l = C.camList([w(1, 38.42, 27.14), w(2, 39.32, 26.69)], C.PLACES[0]); return l[0].id === "2" && l[0].km > 20 && l[0].km < 40 && l[1].km > 60; })],
    ["km yazısı", F("<1 km, 27 km", () => C.kmLabel(0.4) === "<1 km" && C.kmLabel(27.4) === "27 km")],
    ["süre yazısı", F("şimdi, 5 dk, 2 sa, 3 gün", () => C.agoLabel(now - 20e3, now) === "şimdi" && C.agoLabel(now - 5 * 60e3, now) === "5 dk" && C.agoLabel(now - 2 * 3600e3, now) === "2 sa" && C.agoLabel(now - 3 * 86400e3, now) === "3 gün")],
    ["konumum", F("Dikili'ye yakınsa adı", () => C.nearPlace({ lat: 39.07, lon: 26.9 }) === "Dikili" && C.nearPlace({ lat: 40.5, lon: 28 }) === "")],
    ["sayfa yolu", F("/cams?yer=", () => C.camsPath("Ayvalık") === "/cams?yer=Ayval%C4%B1k" && C.camsPath("") === "/cams")],
    ["ses: yer", F("hazır ve serbest yer", () => C.camsAsk("Ayvalık kameralarını aç")?.place === "Ayvalık" && C.camsAsk("Midilli'deki kameralar")?.place === "Midilli" && C.camsAsk("Bodrum'un kameralarını göster")?.place === "Bodrum" && C.camsAsk("Çeşmedeki kameraları aç")?.place === "Çeşme")],
    ["ses: yersiz", F("kameraları aç → boş yer", () => C.camsAsk("kameraları aç")?.place === "" && C.camsAsk("canlı kameraları göster")?.place === "")],
    ["YouTube yayını", F("yer adı geçen canlı yayın, oynatıcı ve bağlantı", () => { const c = C.ytCam({ id: { videoId: "v1" }, snippet: { title: "Ayvalık Cunda &amp; Liman Canlı", channelTitle: "Ayvalık Belediyesi", liveBroadcastContent: "live", thumbnails: { high: { url: "h.jpg" } } } }, "Ayvalık"); return c.id === "yt:v1" && c.title === "Ayvalık Cunda & Liman Canlı" && /youtube-nocookie\.com\/embed\/v1/.test(c.player) && c.preview === "h.jpg" && c.km === null && c.src === "YouTube"; })],
    ["YouTube eleme", F("başka yer, haber, canlı değil → atlanır", () => C.ytList([
      { id: { videoId: "a" }, snippet: { title: "İstanbul Boğaz canlı", channelTitle: "X", liveBroadcastContent: "live" } },
      { id: { videoId: "b" }, snippet: { title: "Ayvalık haber canlı", channelTitle: "X", liveBroadcastContent: "live" } },
      { id: { videoId: "c" }, snippet: { title: "Ayvalık sahil", channelTitle: "X", liveBroadcastContent: "none" } },
      { id: { videoId: "d" }, snippet: { title: "Cunda adası", channelTitle: "Ayvalık Kent TV", liveBroadcastContent: "live" } },
    ], "Ayvalık").map((c) => c.id).join() === "yt:d")],
    ["ses: fiş kamerası değil", F("tekil kamerayı aç, fiş, ön kamera → null", () => C.camsAsk("kamerayı aç") === null && C.camsAsk("fiş kamerasını aç") === null && C.camsAsk("ön kamerayı aç") === null && C.camsAsk("yarış kamerasını aç") === null)],
  ]);
}

// Ana sayfa: Deniz trafiği ve Kameralar yalnız iki düğme (veri çeken kart yok)
{
  const { readFileSync } = await import("node:fs");
  const s = readFileSync(new URL("../../../src/features/home/OwnerHome.jsx", import.meta.url), "utf8");
  group("Ana sayfa: deniz ve kamera düğmeleri")([
    ["iki düğme", F("/sea ve /cams bağlantısı", () => /\["\/sea", "anchor", "Deniz trafiği"\], \["\/cams", "video", "Kameralar"\]/.test(s))],
    ["veri çekmez", F("SeaCard ana sayfada yok", () => !/SeaCard/.test(s))],
  ]);
}

// Asistan tek kutu (Seyhun "A · Tek kapsül", 2026-10-23): yan düğmeler yok; Fotoğraf · yazı alanı · ses düğmesi
{
  const { readFileSync } = await import("node:fs");
  const s = readFileSync(new URL("../../../src/features/home/TabBar.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../src/app/globals.css", import.meta.url), "utf8");
  group("Asistan: tek kutu")([
    ["yan düğme yok", F("aside sınıfları kalktı", () => !/aside-btn|aside-l|aside-r/.test(s + css))],
    ["tek kutu", F("solda kutu, sağda bas-konuş küresi", () => /className="apill /.test(s) && /<OrbMain mode=\{mode\} r=\{r\} onPress=\{onPress\} onRelease=\{onRelease\} \/>/.test(s))],
    ["boş alan kapatır", F("dinlerken ve taslakta değil", () => /mode !== "listening" && !draft && onClose\?\.\(\)/.test(s))],
  ]);
}

// Rüzgâr ve sağanak tek yerde "2–4" (Seyhun 2026-10-24); ölçülen saatler de aynı biçimde; ayrı en sert sağanak yazısı yok
{
  const WX = await import("@/features/weather/weather");
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  group("Rüzgâr–sağanak tek yerde")([
    ["biçim", F("2–4, sağanak yoksa 2", () => WX.kn(2, 4) === "2–4" && WX.kn(5, 5) === "5" && WX.kn(3, null) === "3")],
    ["ölçülen de aynı", F("grafik altı yazısı ölçülen saatte ölçüleni yazar", () => /kn\(o \? o\.wind : h\.wind, o \? o\.gust : h\.gust\)/.test(src("features/home/CockpitWind.jsx")))],
    ["ayrı sağanak yazısı yok", F("en sert sağanak etiketi kalktı", () => !/pkRight/.test(src("features/home/CockpitWind.jsx")))],
  ]);
}

// Ana sayfa Kulüp (Seyhun "A · Kutular" 2026-10-24): yemek kartının üstünde ikili kutular; satırlar RowTiles içinde kutu olur
{
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  const home = src("features/home/OwnerHome.jsx");
  group("Ana sayfa: Kulüp kutuları")([
    ["yemek kartından önce", F("HomeSummary tiles, ShopCards'tan önce", () => home.indexOf("<HomeSummary\n              tiles") > 0 && home.indexOf("<HomeSummary\n              tiles") < home.indexOf("<ShopCards />"))],
    ["kutu görünümü", F("Row, RowTiles içinde kutu çizer", () => /const tile = useContext\(TileCtx\);\n  if \(tile\) return <Tile/.test(src("components/ui/Row.jsx")))],
  ]);
}

// Ana sayfa Yemek · Market · Giyim yan yana (Seyhun 2026-10-25): aynı kart; Market Velora Sanal'ı açar, Giyim şimdilik bir yere gitmez;
// açık yemek / market siparişi kartları üstünde
{
  const { readFileSync, existsSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  const shop = src("features/home/ShopCards.jsx");
  const C = await import("@/market/catalog");
  group("Ana sayfa: Yemek · Market · Giyim")([
    ["üç kart yan yana", F("grid-cols-3, Yemek Market Giyim", () => /grid-cols-3/.test(shop) && ["Yemek", "Market", "Giyim"].every((t) => shop.includes(`title="${t}"`)))],
    ["Market Velora Sanal", F("Market kartı gömülü /sanal sayfasına gider", () => /title="Market"[^\n]*href="\/sanal"/.test(shop))],
    ["gömülü Sanal sayfası", F("/sanal çerçeveyi anahtarı beklemeden kökten açar, anahtarı Sanal isteyince verir", () => { const pg = src("app/(app)/sanal/page.jsx"); return /<iframe/.test(pg) && /\$\{SANAL_URL\}\/#st=/.test(pg) && /sanalToken\(\)/.test(pg) && /need-token/.test(pg) && /type: "velora-token"/.test(pg) && /e\.origin !== ORIGIN/.test(pg) && !/>Açılıyor/.test(pg); })],
    ["Sanal tam ekran", F("/sanal'da sekme çubuğu ve başlık yok, yalnız küçük Geri", () => { const pg = src("app/(app)/sanal/page.jsx"); const tb = src("features/home/TabBar.jsx"); return /fixed inset-0/.test(pg) && !/<h1/.test(pg) && /aria-label="Geri"/.test(pg) && /path === "\/sanal"/.test(tb); })],
    ["Sanal çentik payı", F("çerçeve bütün ekran, üst/alt pay st/sb ile Sanal'a gider", () => { const pg = src("app/(app)/sanal/page.jsx"); return /absolute inset-0 size-full/.test(pg) && /safe-area-inset-top/.test(pg) && /#st=\$\{st\}&sb=\$\{sb\}/.test(pg); })],
    ["süren yarış", F("liveRace: ilk günden son güne kadar yarış, bitmiş/gelecek değil", () => { const o = [{ id: "a", name: "Kış Kupası", startDate: "2026-10-25", endDate: "2026-10-27" }, { id: "b", name: "Gelecek", startDate: "2026-11-02" }, { id: "c", name: "Bitti", startDate: "2026-10-20", endDate: "2026-10-22" }]; return HT.liveRace(o, "2026-10-26")?.id === "a" && HT.liveRace(o, "2026-10-27")?.title === "Kış Kupası" && HT.liveRace(o, "2026-10-28") === null && HT.liveRace(o, "2026-11-02")?.id === "b" && HT.liveRace([], "2026-10-26") === null; })],
    ["yarış günü havası", F("awayRace: seçilen günü kapsayan yarış; ana sayfada yarış yeri ve ev yeri alt alta iki ince şerit, 10 km'den yakınsa eski düzen", () => { const o = [{ id: "a", startDate: "2026-10-27", endDate: "2026-10-29", place: "Foça" }, { id: "b", startDate: "2026-11-02" }]; const ck = src("features/home/Cockpit.jsx"); const rh = src("features/athletes/raceHome.js"); return HT.awayRace(o, "2026-10-28")?.id === "a" && HT.awayRace(o, "2026-10-30") === null && HT.awayRace(o, "2026-11-02")?.id === "b" && HT.awayRace([], "2026-10-28") === null && /loadRaceDay\(r, day\)/.test(ck) && /km\(ar\.at, home\) < 10/.test(ck) && /<WindStrip/.test(ck) && /label=\{`\$\{home\.name\} havası`\}/.test(ck) && /spot: r\.spot/.test(rh) && /awayRace\(race\.open, sel\)/.test(src("features/home/OwnerHome.jsx")); })],
    ["yarış şeridinde Süre ve Kayıt", F("tek sayaç multimedya sayfası adına (own), Başlat günün yarışını açar, Kayıt çekimi Medya sayfasına geçirir", async () => { const rl = src("features/home/RaceLive.jsx"); const cd = src("features/training/Countdown.jsx"); const H = await import("@/features/raceMedia/handoff"); const f = { name: "v.mov" }; H.handShot("r1", f); const wrong = H.takeShot("r2"); const got = H.takeShot("r1"); const again = H.takeShot("r1"); return wrong === null && got === f && again === null && /raceStart\(rf\.flow, "start", race\.name \|\| "Yarış", own\)/.test(rl) && /raceFinish\(rf\.flow, own\)/.test(rl) && /<RecPick onFile=\{\(f\) => \(handShot\(id, f\)/.test(rl) && /export function raceStart\(race, mode = "start", where = "", own = ownHere\(\)\)/.test(cd) && /useState\(\(\) => takeShot\(id\)\)/.test(src("features/raceMedia/RaceMedia.jsx")); })],
    ["ana sayfa özellik kartları", F("Özet (Mesajlar) yok; İngilizce, Görevler, Medya kartları; medya kartı en yeni bölümün son 4 karesi, 30 dk önbellek", async () => { const { latestMedia, mediaFresh, MEDIA_KEEP } = await import("@/lib/homeMedia"); const it = (n, at) => ({ id: "m" + n, kind: "photo", url: "https://x/" + n, at }); const secs = { ant: [{ title: "Antrenman", sub: "Dün · 5 kayıt", href: "/training/day?id=a&tab=media", items: [1, 2, 3, 4, 5].map((n) => it(n, "2026-10-27T10:0" + n)), last: "2026-10-27T10:05" }], race: [{ title: "Kupa", sub: "Foça", href: "/athletes/races/r/media?tab=media", items: [it(9, "2026-10-20T09:00")], last: "2026-10-20T09:00" }] }; const c = latestMedia(secs); const h = src("features/home/OwnerHome.jsx"); return c.title === "Antrenman" && c.items.length === 4 && c.items[0].id === "m5" && latestMedia({ ant: [], race: [] }) === null && mediaFresh({ at: 1000 }, 1000 + MEDIA_KEEP - 1) && !mediaFresh({ at: 1000 }, 1000 + MEDIA_KEEP) && /<HomeSummary posts=\{!staff\} tail=\{false\} \/>/.test(h) && /<EnglishCard \/>/.test(h) && /<TasksCard \/>/.test(h) && /<MediaCard \/>/.test(h); })],
    ["yağmur özeti", F("grafiğin altındaki tek satır: \"8 mm yağdı · 16–20 arası kuvvetli, 12 mm bekleniyor\", başka gün bütün gün tahmin, yağmur yoksa \"sonra beklenmiyor\"", async () => { const { rainLine } = await import("@/features/weather/rainLine"); const rows = [...Array(24)].map((_, i) => ({ hh: String(i).padStart(2, "0") })); const fc = rows.map((_, i) => [0.6, 2, 5.5, 3.5][i - 16] ?? 0); const a = rainLine(rows, fc, 10.5, 8, {}); const b = rainLine(rows, fc, -1, 0, {}); const c = rainLine(rows, rows.map(() => 0), 10.5, 0, { 10: 2 }); return a.text === "8 mm yağdı · 16–20 arası kuvvetli, 12 mm bekleniyor" && a.hot && b.text === "16–20 arası kuvvetli, 12 mm bekleniyor" && c.text === "Şimdi yağıyor · sonra beklenmiyor" && !c.hot; })],
    ["radar ve bölge haritası", F("grafikte son 2 saat radar kutuları (yalnız bugün); hava sayfasında bölge haritası: rüzgâr saatlik, yağışta geçmiş radar + sonrası tahmin, dokunulan yer seçilen yer olur, profile yazılır, Geri al", async () => { const cw = src("features/home/CockpitWind.jsx"); const wt = src("features/weather/WeatherTop.jsx"); const rm = src("features/weather/RegionMap.jsx"); const R = await import("@/lib/regionMap"); const t0 = Date.parse("2026-10-28T09:00:00Z"); const grid = { times: [0, 1, 2, 3, 4].map((k) => `2026-10-28T${12 + k}:00`), at: [0, 1, 2, 3, 4].map((k) => t0 + k * 3600e3), spots: [] }; const now = t0 + 2.5 * 3600e3; const w = R.regionSteps(grid, [], "wind", now); const radar = [0, 1, 2].map((k) => ({ at: now - (2 - k) * 600e3, url: "" })); const r = R.regionSteps(grid, radar, "rain", now); const u = R.regionUrl({ lat: 38.67, lon: 26.75 }); return w.length === 5 && w.findIndex((x) => x.now) === 2 && w[3].kind === "fc" && r.length === 5 && r[2].now && r[2].kind === "radar" && r[3].kind === "fc" && r[3].i === 3 && u.pts.length === 49 && /past_hours=2/.test(u.url) && /precipitation/.test(u.url) && R.mmColor(5) === "#f43f5e" && /useRainRadar\(day === today \? place \|\| getPlace\(\) : null\)/.test(cw) && /RADAR_MM\[radH\[i\]\]/.test(cw) && /<RegionMap place=\{place\}/.test(wt) && /<RegionMap place=\{d\.at\}/.test(src("features/athletes/RaceWx.jsx")) && /weatherPlace: saved/.test(wt) && /label: "Geri al", onClick: \(\) => save\(prev\)/.test(wt) && /m\.on\("click"/.test(rm) && /raster-opacity/.test(rm) && /type="range"/.test(rm); })],
    ["yarış şeridi büyük sayaç", F("YARIŞ SÜRÜYOR yok; beklerken Başlat · Kayıt · ⋯ (süre \"5 dk\" penceresinden 1 · 2 · 5 · 10, Multimedya yarış adında, ⋯ içinde değil), sayarken start dizisi ve −1 dk · Eşitle · +1 dk, Sıfırla durunca yarışı iptal eder", () => { const rl = src("features/home/RaceLive.jsx"); return !/^\s*YARIŞ SÜRÜYOR$/m.test(rl) && /const PRESETS = \[60, 120, 300, 600\]/.test(rl) && /ours && idle && \(/.test(rl) && /<Seq steps=\{steps\}/.test(rl) && /Eşitle/.test(rl) && /ours && paused && \(/.test(rl) && /onClick=\{\(\) => raceCancel\(rf\.flow, own\)\}/.test(rl) && /aria-label="Süre seç"/.test(rl) && !/<Row title="Multimedya"/.test(rl) && /<VoidSheet ask=\{rf\.ask\} onChoose=\{rf\.choose\} \/>/.test(rl); })],
    ["yarış kısayolu", F("ana sayfada süren yarışın şeridi: Multimedya /media, ⋯ ile bu yarışta / hiç gösterme, Ayarlar'da geri açılır", () => { const rl = src("features/home/RaceLive.jsx"); const st = src("app/(app)/settings/page.jsx"); return /\/media`/.test(rl) && /Bu yarışta gösterme/.test(rl) && /Hiç gösterme/.test(rl) && /raceLive: "off"/.test(rl) && /<RaceLiveRow \/>/.test(st) && /<RaceLive open=/.test(src("features/home/OwnerHome.jsx")); })],
    ["Giyim bir yere gitmez", F("Giyim kartı off, bağlantı yok", () => /title="Giyim"[^\n]*off \/>/.test(shop) && !/title="Giyim"[^\n]*(href|onClick)/.test(shop))],
    ["açık market siparişi", F("teslim / iptal açık sayılmaz", () => C.isOpenOrder({ status: "preparing" }) && !C.isOpenOrder({ status: "delivered" }) && !C.isOpenOrder({ status: "cancelled" }) && /find\(isOpenOrder\)/.test(shop))],
    ["eski Market düğmesi yok", F("MarketButton silindi, ana sayfa ShopCards kullanır", () => !existsSync(new URL("../../../src/features/home/MarketButton.jsx", import.meta.url)) && src("features/home/OwnerHome.jsx").includes("<ShopCards />"))],
  ]);
}

// Bas-konuş (Seyhun 2026-10-25 "A · Çubuğun sağ ucunda"): küre sekme çubuğunun sağ ucunda ve büyük; basılı tut konuş, bırak
// gönder; kısa dokunuş ve uzağa kaydırıp bırakma göndermez
{
  const { readFileSync } = await import("node:fs");
  const s = readFileSync(new URL("../../../src/features/home/TabBar.jsx", import.meta.url), "utf8");
  group("Asistan: bas-konuş küre")([
    ["sağ uçta büyük", F("dört sekme solda, küre sağda 4.75rem", () => /grid min-w-0 flex-1 grid-cols-4/.test(s) && /onPress=\{press\} onRelease=\{release\} size="size-\[4\.75rem\]"/.test(s))],
    ["bırakınca gönderir", F("release gönderir; kısa basışı motor yutar, uzağa kaydırma iptal", () => /if \(short\) return \(act\.current\.release \|\| act\.current\.cancel\)\?\.\(\);/.test(s) && /if \(away\) return act\.current\.cancel\?\.\(\);\n    \(act\.current\.release \|\| act\.current\.stop\)\?\.\(\);/.test(s))],
    ["kısa dokunuş sınırı", F("SHORT_MS 300, AWAY_PX 90", () => /const SHORT_MS = 300;/.test(s) && /const AWAY_PX = 90;/.test(s))],
    ["kapalıyken basınca açılır", F("press: kapalıysa openAssistant listen", () => /if \(!active\) return openAssistant\(\{ listen: true/.test(s))],
  ]);
}

// Asistan (Seyhun 2026-10-25): küre çubuğun üstünde kesilmez; söylenen söz tek yerde (gönderilince kutudan sohbete geçer,
// balon yükselerek belirir); yeni yanıt harf harf yazılır (akışla geldiyse yazılmaz)
{
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../../../src/${p}`, import.meta.url), "utf8");
  const tb = src("features/home/TabBar.jsx");
  const th = src("features/add/Thread.jsx");
  const sh = src("features/assistant/AssistantSheet.jsx");
  group("Asistan: tek yerde söz, yazılan yanıt")([
    ["küre kesilmez", F("sekme çubuğunun üst payı küre taşmasından büyük", () => /atabbar-wrap \$\{noAi \? "" : "pt-9"\}/.test(tb) && /acenter absolute -top-7/.test(tb))],
    ["iş sürerken kutu boş", F("gönderilen söz kutuda kalmaz", () => /: mode === "busy" \? "" \/\//.test(tb))],
    ["balon yükselir", F("kullanıcı balonu auser-in", () => /className="auser-in flex flex-col items-end"/.test(th) && /\.auser-in \{ animation: auserin/.test(src("app/globals.css")))],
    ["harf harf", F("son yanıt Typed, akıştan sonra değil", () => /<Typed turn=\{t\} on=\{typeLast\} \/>/.test(th) && /typeLast=\{!streamed\}/.test(sh))],
  ]);
}
