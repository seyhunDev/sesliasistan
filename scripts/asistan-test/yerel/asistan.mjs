// Asistan testleri: insanların söyleyebileceği farklı cümlelerle yerel (yapay zekasız) kurallar.
// Sayfa/sohbet açma, kayıt ekleme, özet, tamamlama, onaylar, ön cevap, yarış açma, alışveriş, geri al.
// Yalnızca hesaplama yapar; veritabanına ve yapay zekaya dokunmaz.
import { localCommand } from "@/lib/commands";
import { isYes, isNo, localQuery, looksLikeCreate, isEnd } from "@/lib/assistantLocal";
import { parseBirthday } from "@/lib/birthdayParse";
import { messageIntent, confirmWord } from "@/lib/ai/messageRules";
import { localNavigate } from "@/lib/nav";
import { suite, today, tom, data } from "./ortak.mjs";

const { group, results } = suite("asistan");
const cmd = (s) => localCommand(s, data, today);
const T = (desc, ok) => ({ desc, fn: cmd, ok });
const isType = (type, more = () => true) => T(type, (r) => r?.type === type && more(r));
const toAI = T("yapay zekaya gider (yerelde çözülmez)", (r) => r === null);
const Y = (desc, fn, exp) => ({ desc, fn, ok: (r) => r === exp });

group("Yardım")([["yardım", isType("reply", (r) => /hemen yaparım/.test(r.message))], ["neler yapabilirsin", isType("reply")], ["komutlar", isType("reply")], ["ne yapabilirsin bana anlatır mısın", isType("reply"), "uzun söyleyiş de yardım"]]);
group("Fiş kamerası")([["fiş yükle", isType("receipt")], ["fatura çek", isType("receipt")], ["kamerayı aç", isType("receipt")], ["şu fişi okut", isType("receipt")], ["yeni fiş", isType("receipt")],
  ["fişleri aç", isType("navigate", (r) => r.page === "receipts")], ["bu ay fişlere ne kadar harcadık", toAI]]);
group("Toplantı kaydı")([["toplantıyı kaydet", isType("meeting")], ["toplantı modunu aç", isType("meeting")], ["kayda başla", isType("meeting")], ["yarın toplantı kaydet", T("toplantı modu değil (plan)", (r) => r?.type !== "meeting")]]);
group("Görev tamamlama")([["tekneleri hazırla görevini tamamla", isType("complete", (r) => r.id === "t1")], ["römork lastikleri tamamdır", isType("complete", (r) => r.id === "t2")],
  ["motor yağını değiştirdim bitti", isType("complete", (r) => r.id === "t3")], ["yelken işini bitirdim", T("iki 'yelken' görevi var → sormak için yapay zekaya", (r) => r === null)], ["hallettim", toAI, "hangi görev belli değil"]]);
group("Yeni kayıt (yerel)")([
  ["yarın saat 10'da antrenman ekle", isType("create", (r) => r.items[0].type === "plan" && r.items[0].time === "10:00" && r.items[0].date === tom)],
  ["cuma 18:30 veli toplantısı planla", isType("create", (r) => r.items[0].type === "plan" && r.items[0].time === "18:30")],
  ["tekneleri hazırla görevi ekle", isType("create", (r) => r.items[0].type === "task")],
  ["not al malzeme odası dolu", isType("create", (r) => r.items[0].type === "note")],
  ["yarın sabah 9'da tekne yükleyeceğimizi not al", isType("create", (r) => r.items.length === 2 && r.items[0].type === "plan" && r.items[1].type === "note")],
  ["haftaya salı kamp planla", isType("create", (r) => /Saat kaçta/.test(r.message))],
  ["görev: yelkenleri kontrol et", isType("create", (r) => r.items[0].type === "task")],
  ["yarın saat 10 antrenman var", isType("create", (r) => r.items[0].time === "10:00")],
  ["yarın 9'da antrenman ve sonra tekneleri yıkayın", toAI, "iki iş → yapay zeka"],
]);
group("Görev listesi")([["geciken görevler", isType("reply", (r) => /geciken/.test(r.message) && /Motor/.test(r.message))], ["açık görevlerim neler", isType("reply", (r) => /açık görev/.test(r.message))], ["yapılacaklar ne", isType("reply")], ["görevler", T("tek kelime → görevler sayfası", (r) => r?.type === "navigate" && r.page === "tasks")]]);
group("Özet")([["bugün neler var", isType("reply", (r) => /Bugün/.test(r.message) && /antrenman/i.test(r.message))], ["yarın ne var", isType("reply", (r) => /Yönetim/.test(r.message))],
  ["bu hafta programım", isType("reply")], ["haftaya neler var", isType("reply")], ["bu ay özet", isType("reply")], ["bugün kaç antrenman var", toAI, "sayma sorusu → yapay zeka"]]);
group("Sayfa açma (localCommand)")([["planları aç", isType("navigate", (r) => r.page === "plans")], ["şey ya bi yoklamayı açar mısın", isType("navigate", (r) => r.page === "attendance")], ["ayarlar", isType("navigate", (r) => r.page === "settings")], ["takvime geç lütfen", isType("navigate", (r) => r.page === "calendar")], ["antrenman günlüğünü aç", isType("navigate", (r) => r.page === "training")], ["aidatları göster", isType("navigate", (r) => r.page === "dues")]]);

const navNames = ["Ali Kök", "Ali Yılmaz", "Sanver İmamoğulları"];
const N = (desc, ok) => ({ desc, fn: (s) => localNavigate(s, { names: navNames }), ok });
group("Sohbet açma")([["ekip ile mesaj sayfamı aç", N("ekip grubu", (r) => r?.chat === "team")], ["Sanver'le yazışmamı aç", N("Sanver ile sohbet", (r) => r?.chatWith === "Sanver İmamoğulları")],
  ["Ali ile mesajlaşmayı aç", N("iki Ali var → yapay zeka sorar", (r) => r === null)], ["Ali Kök ile sohbeti aç", N("Ali Kök", (r) => r?.chatWith === "Ali Kök")], ["aile grubu", N("aile grubu", (r) => r?.chat === "family")]]);

const B = (desc, ok) => ({ desc, fn: parseBirthday, ok });
group("Doğum günü")([["Annemin doğum günü 12 Mart", B("Annem · 12 Mart", (r) => r?.name === "Annem" && r.month === 3 && r.day === 12)], ["Ali'nin doğum günü 3 Nisan 1990", B("Ali · 3 Nisan 1990", (r) => r?.month === 4 && r.day === 3 && r.year === 1990)],
  ["Pınar'ın doğumgünü 7 ekim", B("Pınar · 7 Ekim", (r) => r?.month === 10 && r.day === 7)], ["doğum günü ekle", B("eksik bilgi → form açılır", (r) => !r || !r.month)]]);

const M = (desc, ok) => ({ desc, fn: (s) => messageIntent(s, ["Ali Kök", "Sanver İmamoğulları"]), ok });
group("Mesaj kuralları (yapay zeka yokken)")([["Ali'ye yaz yarın 9'da gelsin", M("Ali'ye, metin var", (r) => r?.to === "Ali Kök" && !!r.send)], ["Sanver'e söyle anahtarı getirsin", M("Sanver'e", (r) => r?.to === "Sanver İmamoğulları" && !!r.send)],
  ["Ali'ye haber ver", M("metinsiz → ne yazayım sorulur", (r) => r?.to === "Ali Kök" && !r.send)], ["Mehmet'e yaz geliyorum", M("tanınmayan kişi işaretlenir", (r) => r?.unknown === "Mehmet")]]);
const CW = (desc, exp) => ({ desc, fn: confirmWord, ok: (r) => r === exp });
group("Onay sözcükleri")([["gönder", CW("evet", "yes")], ["evet gönder", CW("evet", "yes")], ["tamam yolla", CW("evet", "yes")], ["vazgeç", CW("hayır", "no")], ["gönderme", CW("hayır", "no")], ["daha kibar yaz", CW("değişiklik (onay değil)", "")]]);
group("Evet/hayır (işlem onayı)")([["evet", Y("evet", isYes, true)], ["tabii ki", Y("evet", isYes, true)], ["hayır", Y("hayır", isNo, true)], ["iptal et", Y("hayır", isNo, true)], ["bilmiyorum", Y("ne evet ne hayır", (s) => isYes(s) || isNo(s), false)]]);
const Q = (desc, ok) => ({ desc, fn: (s) => localQuery(s, data, today), ok });
group("Yapay zeka yokken soru")([["bugün neler var acaba", Q("bugünün listesi", (r) => r?.show?.length >= 2)], ["yarın ne yapıyoruz", Q("yarının listesi", (r) => r?.show?.length >= 1)], ["Ali nerede", Q("cevap yok (bilinmiyor)", (r) => r === null)]]);
group("Kayda benziyor mu (yedek)")([["tekne yıkamayı hatırlat", Y("kayıt", looksLikeCreate, true)], ["neler var", Y("soru", looksLikeCreate, false)]]);

// ---- Sayfa ve sohbet açma: çok sayıda söyleyiş ----
const names2 = ["Ali Kök", "Sanver İmamoğulları", "Pınar Ezgi Yıldız", "Elif Şahin", "Deniz Aydın", "Murat Çelik"];
const P = (page) => ({ page }), C = (chat) => ({ chat }), W = (chatWith) => ({ chatWith });
const cases = [
  // sayfalar — farklı söyleyişler
  ["yoklamayı aç", P("attendance")], ["yoklama sayfasını açar mısın", P("attendance")], ["yoklamaya git", P("attendance")], ["Yoklama ekranını göster", P("attendance")],
  ["planları aç", P("plans")], ["planlara git", P("plans")], ["planlar sayfası", P("plans")], ["planlarımı göster", P("plans")], ["etkinlikleri aç", P("events")], ["etkinlikler sayfasına git", P("events")], ["etkinliklerim", P("events")], ["instagram sayfasını aç", P("posts")], ["gönderileri aç", P("posts")], ["instagram", P("posts")], ["gönderilerim", P("posts")],
  ["ana sayfaya git", P("home")], ["anasayfaya dön", P("home")], ["ana sayfa", P("home")], ["başa dön", P("home")], ["ana ekrana geç", P("home")],
  ["görevleri aç", P("tasks")], ["görevlerime bakalım", P("tasks")], ["yapılacakları göster", P("tasks")], ["işlerimi aç", P("tasks")],
  ["notları aç", P("notes")], ["notlarıma git", P("notes")], ["notlar", P("notes")],
  ["takvimi aç", P("calendar")], ["takvime geç", P("calendar")],
  ["mesajları aç", P("messages")], ["mesajlarıma git", P("messages")], ["sohbetleri göster", P("messages")],
  ["fişleri aç", P("receipts")], ["harcamaları göster", P("receipts")], ["faturalara bakalım", P("receipts")],
  ["alışveriş listesini aç", P("shopping")], ["market listesine git", P("shopping")],
  ["doğum günlerini aç", P("birthdays")], ["doğumgünleri sayfası", P("birthdays")],
  ["ders programını aç", P("schedule")], ["dersleri göster", P("schedule")],
  ["arşivi aç", P("archive")], ["ayarları aç", P("settings")], ["ayarlar", P("settings")], ["ayarlara gidebilir misin", P("settings")],
  ["kişileri aç", P("people")], ["rehberi göster", P("people")], ["çalışanları aç", P("peopleStaff")], ["aile kişilerini aç", P("peopleFamily")],
  ["sporcuları aç", P("athletes")], ["sporcu listesini göster", P("athletes")],
  ["yoklamamı aç", P("myAttendance")], ["yoklama geçmişimi göster", P("myAttendance")],
  // sohbetler
  ["ekip ile mesaj sayfamı aç", C("team")], ["ekip grubunu aç", C("team")], ["ekibin mesajlarını göster", C("team")], ["ekip sohbetine git", C("team")], ["takım grubunu aç", C("team")],
  ["aile grubunu aç", C("family")], ["aileyle mesajlaşmayı aç", C("family")], ["aile sohbeti", C("family")],
  ["sporcular grubunu aç", C("athletes")], ["sporcularla mesajları aç", C("athletes")],
  ["Ali ile mesajlaşmayı aç", W("Ali Kök")], ["Sanver'in sohbetini aç", W("Sanver İmamoğulları")], ["Pınar ile konuşmamı göster", W("Pınar Ezgi Yıldız")], ["Ali'yle mesajlarımı aç", W("Ali Kök")], ["Elif Şahin ile sohbeti aç", W("Elif Şahin")],
  // sayfa açma DEĞİL (yapay zekaya ya da başka kurala kalmalı)
  ["bugün neler var", null], ["bu haftanın planlarını göster", null], ["yarın planlarım ne", null], ["yoklama al Ali geldi", null], ["Ali ve Zeynep geldi", null],
  ["ekibe yaz yarın antrenman yok", null], ["Ali'ye mesaj gönder", null], ["instagram gönderisi hazırla", null], ["ekibe gönderir misin", null], ["plan ekle yarın 10'da toplantı", null], ["not al malzeme odası dolu", null],
  ["kaç görevim var", null], ["açık görevler neler", null], ["fiş yükle", null], ["tekneleri hazırla görevini tamamla", null], ["aileye haber ver akşam geç geleceğim", null],
  ["planlar kaç tane", null], ["sporcular bugün geldi mi", null], ["ayarlar nerede", null],
];
for (const [s, exp] of cases) {
  const got = localNavigate(s, { names: names2 });
  results.push({ area: "asistan", group: "Sayfa/sohbet açma (söyleyişler)", say: s, ok: JSON.stringify(got) === JSON.stringify(exp), expect: JSON.stringify(exp), got: JSON.stringify(got), note: "" });
}

// Ses tanımanın bozduğu söyleyişler: bölünen/eksik harfli sayfa adları, iyelikli tek kelime, geri dönüş
const NV = (exp) => ({ desc: JSON.stringify(exp), fn: (s) => localNavigate(s), ok: (r) => JSON.stringify(r) === JSON.stringify(exp) });
group("Sayfa açma (bozuk ses)")([
  ["yok lamayı aç", NV({ page: "attendance" })], ["takvi mi aç", NV({ page: "calendar" })], ["Yoklamyı aç.", NV({ page: "attendance" })],
  ["alışverş listesini aç", NV({ page: "shopping" })], ["spor cuları aç", NV({ page: "athletes" })], ["Planlarım.", NV({ page: "plans" })],
  ["Fişlerim.", NV({ page: "receipts" })], ["Görevlerim", NV({ page: "tasks" })], ["Takvimim", NV({ page: "calendar" })],
  ["Geri dön.", NV({ back: true })], ["geri git", NV({ back: true })], ["Bir önceki sayfaya dön.", NV({ back: true })], ["tamam geri dön lütfen", NV({ back: true })],
  ["Ali'ye geri dönüş yap", NV(null)], ["yarın kamp planla", NV(null)], ["toplantıyı ayarla", NV(null)], ["yarış evrakını aç", NV({ page: "races" })],
]);


// Ön cevap (yapay zeka düşünürken hemen söylenen giriş): tür doğru, çelişmeyen, kısa; veriden bilgi
const { precue } = await import("@/lib/precue");
const pcWx = (d) => (d === tom ? [{ hh: "16", wind: 13.6 }] : []);
const PC = (desc, ok) => ({ desc, fn: (s) => precue(s, { plans: data.plans, today, weatherRows: pcWx }), ok });
group("Ön cevap")([
  ["yarın saat 10'da antrenman ekle", PC("plan, yarın 10:00, çakışan plan", (r) => r?.kind === "plan" && r.slots.time === "10:00" && /yarın saat 10:00/.test(r.line) && /Yönetim kurulu toplantısı” planı da var/.test(r.line))],
  ["yarın 16'da yarış antrenmanı var", PC("plan, o saatte rüzgâr", (r) => r?.kind === "plan" && /rüzgâr 14 knot/.test(r.line))],
  ["cumartesi yarış planla", PC("plan, gün adıyla", (r) => r?.kind === "plan" && /için bir plan hazırlıyorum/.test(r.line))],
  ["Ali'ye motoru kontrol etmesini hatırlat", PC("görev", (r) => r?.kind === "task")],
  ["not al malzeme odası dolu", PC("not", (r) => r?.kind === "note" && r.line === "Tamam, not alıyorum.")],
  ["bugün neler var", PC("soru, bugünkü plan sayısı", (r) => r?.kind === "query" && /bugün 1 plan/.test(r.line))],
  ["ekibe yaz yarın 9'da iskelede olun", PC("mesaj", (r) => r?.kind === "send")],
  ["teşekkürler", PC("kısa söz: ön cevap yok", (r) => r === null)],
  ["bu konuda ne düşünüyorsun acaba söyle", PC("emin değil: genel giriş", (r) => r && !/plan|görev|not/.test(r.line))],
]);

// Sesle kapatma: konuşmayı bitiren sözler kapatır, bir şeyi kapatma isteği kapatmaz
const END_T = (want) => ({ desc: want ? "konuşma kapanır" : "kapanmaz", fn: (s) => isEnd(s), ok: (r) => r === want });
group("Sesle kapatma")([
  ["kapat", END_T(true)], ["Teşekkürler.", END_T(true)], ["tamam teşekkür ederim", END_T(true)], ["tamamdır sağ ol", END_T(true)],
  ["asistanı kapat", END_T(true)], ["kapatabilirsin", END_T(true)], ["kapatır mısın", END_T(true)], ["çok teşekkürler", END_T(true)],
  ["eyvallah", END_T(true)], ["görüşürüz", END_T(true)], ["şimdilik bu kadar", END_T(true)], ["iyi akşamlar", END_T(true)], ["bitir", END_T(true)],
  ["görevi kapat", END_T(false)], ["bildirimleri kapat", END_T(false)], ["yarın 10'da antrenman ekle", END_T(false)],
  ["Ali'ye teşekkür mesajı gönder ve yarın gelmesini söyle", END_T(false)], ["sohbeti kapat", END_T(false)],
]);

// Yarış açma ve yarış sayfasında iş: söylenen ad doğru yarışa gider
const { findRace, wantsRaceOpen, raceJobHere } = await import("@/features/athletes/raceNav");
const RACES = [
  { id: "azur", name: "D'Azur Optimist Regatta", district: "Çeşme", startDate: "2026-10-07", endDate: "2026-10-11" },
  { id: "foca", name: "TYF Yelken Ligi ILCA 1. Ayak", district: "Foça", startDate: "2026-11-01", endDate: "2026-11-02" },
  { id: "ege25", name: "Ege Kupası", district: "Urla", startDate: "2025-05-01", endDate: "2025-05-03" },
  { id: "ege26", name: "Ege Kupası", district: "Urla", startDate: "2026-05-01", endDate: "2026-05-03" },
];
const RO = (want) => ({ desc: want ? `yarış: ${want}` : "yarış açılmaz", fn: (s) => (wantsRaceOpen(s) ? findRace(s, RACES, "2026-10-02")?.id || null : null), ok: (r) => r === want });
group("Yarış açma")([
  ["dazur yarışına git", RO("azur")], ["D'Azur regattasını aç", RO("azur")], ["Foça yarışını aç", RO("foca")],
  ["yelken ligi yarışına git", RO("foca")], ["Çeşmedeki yarışı göster", RO("azur")], ["ege kupasını aç", RO("ege26")],
  ["sıradaki yarışı göster", RO("azur")], ["yarışlar sayfasına git", RO(null)], ["D'Azur yarışına Mehmet'i ekle", RO(null)],
  ["Dikili hava durumunu göster", RO(null)], ["planları aç", RO(null)],
]);
// Bozuk/yabancı adlar: puanlama doğru yarışı bulur; emin değilse seçenek sorulur
const { rankRaces, sure, raceAsk, pickChoice, nearest } = await import("@/features/athletes/raceNav");
const MORE = [...RACES, { id: "hal", name: "Halkidiki Trophy", district: "Bodrum", startDate: "2026-08-20", endDate: "2026-08-23" }];
const RK = (want) => ({ desc: want ? `bulanık: ${want}` : "emin değil", fn: (s) => { const r = rankRaces(s, MORE, "2026-10-02"); return raceAsk(s) && sure(r) ? r[0].race.id : null; }, ok: (r) => r === want });
group("Yarış açma (bozuk ad)")([
  ["daz ur yarışına git", RK("azur")], ["dö azur regatasını aç", RK("azur")], ["halkidi yarışına git", RK("hal")],
  ["alkidiki kupasını aç", RK("hal")], ["bodrum yarışını aç", RK("hal")], ["bilmem ne yarışını aç", RK(null)],
  ["ege yarışını aç", RK(null)],
]);
// Tekne sınıfı ve ayak numarası yarışları ayırır; ses tanıma "optimist"i "optimus" yazabilir
const LIG = [
  { id: "opt", name: "TYF Yelken Ligi 1. Ayak OPTIMIST - MW Phokaia Beach Resort Kupası", district: "Foça", startDate: "2026-10-20" },
  { id: "ilca", name: "TYF Yelken Ligi 1. Ayak ILCA - MW Phokaia Beach Resort Kupası", district: "Foça", startDate: "2026-10-20" },
  { id: "opt2", name: "TYF Yelken Ligi 2. Ayak OPTIMIST", district: "Urla", startDate: "2026-12-01" },
  RACES[0],
];
const RL = (want) => ({ desc: want ? `sınıf: ${want}` : "emin değil", fn: (s) => { const r = rankRaces(s, LIG, "2026-10-02"); return raceAsk(s) && sure(r) ? r[0].race.id : null; }, ok: (r) => r === want });
group("Yarış açma (sınıf ve ayak)")([
  ["Optimus 1 ayak yarışına gidelim", RL("opt")], ["optimist 1. ayak yarışını aç", RL("opt")], ["ilka 1 ayak yarışına git", RL("ilca")],
  ["optimist 2 ayak yarışına git", RL("opt2")], ["foça yarışını aç", RL(null)],
]);
const PK = (want) => ({ desc: want ? `seçim: ${want}` : "seçim yok", fn: (s) => pickChoice(s, MORE.slice(0, 3), "2026-10-02")?.id || null, ok: (r) => r === want });
group("Yarış seçeneğinden seçim")([
  ["ikincisi", PK("foca")], ["ilki", PK("azur")], ["sonuncu", PK("ege25")], ["Foça olan", PK("foca")], ["ekibe mesaj gönder", PK(null)], ["git", PK("azur")], ["evet onu aç", PK("azur")], ["tamam", PK("azur")],
  ["en yakın 3", { desc: "tarihi en yakın 3 yarış", fn: () => nearest(MORE, "2026-10-02").map((r) => r.id).join(","), ok: (r) => r === "azur,foca,hal" }],
]);
const RH = (want) => ({ desc: want ? "yarışa iş" : "yarış işi değil", fn: (s) => raceJobHere(s), ok: (r) => r === want });
group("Yarış sayfasında iş")([
  ["Mehmet'i de ekle", RH(true)], ["Ali ve Ayşe katılacak", RH(true)], ["not al otelde kalınacak", RH(true)],
  ["bütçeye otel kişi başı 3500 4 gece ekle", RH(true)], ["Zeynep'i çıkar", RH(true)],
  ["yarın saat 10'da antrenman ekle", RH(false)], ["görev ekle tekneleri yıka", RH(false)], ["ekibe mesaj gönder", RH(false)],
  ["kimler katılıyor?", RH(false)], ["teşekkürler", RH(false)],
]);


// Alışveriş listesi sesli komutları (shopWords.js)
const { shopCommand, matchShop } = await import("@/features/shop/shopWords");
const SC = (op, what) => ({ desc: op ? `${op}${what ? `: ${what}` : ""}` : "alışveriş değil", fn: (s) => shopCommand(s), ok: (r) => (op ? r?.op === op && (!what || r.what === what) : r === null) });
group("Alışveriş (komut)")([
  ["listeye süt ekle", SC("add", "süt")], ["süt ve ekmek alışveriş listesine ekle", SC("add", "süt ve ekmek")], ["marketten domates al", SC("add", "domates")],
  ["ekmek alındı", SC("done", "ekmek")], ["sütü ve ekmeği aldım", SC("done", "sütü ve ekmeği")], ["listeden sütü sil", SC("remove", "sütü")],
  ["ekmeği listeden çıkar", SC("remove", "ekmeği")], ["listede ne var", SC("read")], ["ne alacağız?", SC("read")],
  ["yarın saat 10'da antrenman ekle", SC(null)], ["tekneleri hazırla görevini tamamla", SC(null)],
]);
const SHOP = [{ id: "a", text: "Süt" }, { id: "b", text: "Ekmek" }, { id: "c", text: "2 kg domates" }, { id: "d", text: "Su" }, { id: "e", text: "İlaç" }];
const MS = (ids, missed = 0) => ({ desc: `eşleşen: ${ids.join(",") || "yok"}`, fn: (s) => matchShop(s, SHOP), ok: (r) => r.hits.map((x) => x.id).join(",") === ids.join(",") && r.missed.length === missed });
group("Alışveriş (eşleştirme)")([
  ["sütü", MS(["a"])], ["ekmeği ve domatesleri", MS(["b", "c"])], ["suyu", MS(["d"])], ["ilacı", MS(["e"])], ["fişi", MS([], 1)], ["süt ve peynir", MS(["a"], 1)],
]);

// Son kaydı geri al (assistantLocal.js)
const { undoLast, lastCreated } = await import("@/lib/assistantLocal");
const UL = (kind) => ({ desc: kind === null ? "geri alma değil" : `geri al${kind ? ` (${kind})` : ""}`, fn: (s) => undoLast(s), ok: (r) => (kind === null ? r === null : r?.kind === kind) });
group("Son kaydı geri al")([
  ["son kaydı geri al", UL("")], ["geri al", UL("")], ["az önce eklediğim görevi sil", UL("task")], ["son planı sil", UL("plan")], ["sonuncu notu kaldır", UL("note")],
  ["kaydı geri al", UL("")], ["yarınki antrenmanı sil", UL(null)], ["tekneleri hazırla görevini tamamla", UL(null)],
]);
const REC = { plans: [{ id: "p", title: "Antrenman", createdByUid: "u1", createdAt: "2026-10-02T09:00:00Z" }], tasks: [{ id: "t", title: "Tekne", createdByUid: "u1", createdAt: "2026-10-02T10:00:00Z" }, { id: "x", title: "Başkası", createdByUid: "u2", createdAt: "2026-10-02T11:00:00Z" }], notes: [] };
const LC = (kind, want) => ({ desc: `son: ${want}`, fn: () => lastCreated(REC, "u1", kind)?.rec.id || null, ok: (r) => r === want });
group("Son eklenen kayıt")([["herhangi", LC("", "t")], ["plan", LC("plan", "p")], ["not", LC("note", null)]]);


// Etkinlik planı isteği (eventWords.js): kamp, balık, gezi, konser…
const EW = await import("@/features/events/eventWords");
const WE = (want) => ({ desc: want ? "etkinlik planı" : "etkinlik planı değil", fn: (s) => EW.wantsEvent(s), ok: (r) => r === want });
group("Etkinlik planı (tanıma)")([
  ["kamp planı yapmak istiyorum bana uygun tavsiyeler ver", WE(true)], ["İç Anadolu gezisi planla", WE(true)], ["hafta sonu balık tutmaya gideceğiz ne lazım", WE(true)],
  ["konsere gitmek istiyorum bütçe çıkar", WE(true)], ["etkinlik planla", WE(true)], ["yaz tatili için plan hazırla", WE(true)], ["piknik organize et", WE(true)],
  ["Kapadokya'ya gitmeyi düşünüyoruz, gezi planı yapar mısın", WE(true)],
  ["haftaya salı kamp planla", WE(false)], ["yarın kamp planla", WE(false)], ["cumartesi saat 10'da piknik planla", WE(false)],
  ["yarın 9'da kamp toplantısı", WE(false)], ["yarış ekle Foça 7-11 Ekim", WE(false)], ["etkinlikleri aç", WE(false)], ["antrenman kampı planla", WE(false)],
]);
group("Etkinlik planı (cevap)")([
  ["vazgeç", { desc: "vazgeç", fn: (s) => EW.isDrop(s), ok: (r) => r === true }],
  ["Ayvalık'ta, gelecek ay", { desc: "cevap (vazgeç değil)", fn: (s) => EW.isDrop(s), ok: (r) => r === false }],
  ["Ege'de balık tutacağız", { desc: "tür balık", fn: (s) => EW.kindFromText(s), ok: (r) => r === "balik" }],
]);

// Velilere duyuru ve iptal (yapay zeka çıktısının doğrulanması)
const AIA = await import("@/lib/ai/assistant");
const Fa = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
group("Velilere duyuru ve iptal")([
  ["velilere yaz", Fa("Sporcular grubuna gider", () => AIA.parseAssistant({ intent: "message", message: "Göndereyim mi?", send: { to: "velilere", text: "Cumartesi kamp 9'da." } }).send?.to === "Sporcular")],
  ["iptal işlemi", Fa("op cancel geçerli", () => AIA.parseAssistant({ intent: "action", message: "Açtım", actions: [{ op: "cancel", kind: "plan", id: "p1" }] }).actions[0]?.op === "cancel")],
  ["haftalık plan", Fa("weekly → repeat week", () => AIA.parseAssistant({ intent: "create", message: "", items: [{ type: "plan", title: "Antrenman", date: "2026-10-06", time: "16:00", weekly: true }] }).items[0]?.repeat === "week")],
]);
// ---- Tek mesajda sıralı işler (mesaj + takvim + not): hiçbiri atlanmaz, söylenen sırayla ----
const ST = await import("@/lib/steps");
const { parseAssistant } = await import("@/lib/ai/assistant");
const SJ = (desc, exp) => ({ desc, fn: (s) => ST.jobsIn(s).join(","), ok: (r) => r === exp });
const SM = (desc, exp) => ({ desc, fn: (s) => ST.isMulti(s), ok: (r) => r === exp });
const gokhan = "Gökhan'a mesaj at, aynı konuyu takvime ekle ve notlara Gökhan için malzeme listesi hazırla";
group("Sıralı işler (tanıma)")([
  [gokhan, SJ("mesaj, takvim, not sırasıyla", "send,plan,note")],
  [gokhan, SM("birden çok iş", true)],
  ["mesaja mesaj at ve ayni konyu takvime ekle ve notlara malzeme listesi hazirla gokhan icin", SM("ses tanıma bozuk yazımı da", true)],
  ["takvime yarın 10'da bakım ekle, sonra Ali'ye yaz", SJ("önce takvim sonra mesaj", "plan,send")],
  ["Ali'ye yaz yarın 9'da gelsin", SM("tek iş (yalnız mesaj)", false)],
  ["yarın saat 10'da antrenman ekle", SM("tek iş (yalnız plan)", false)],
  ["not al malzeme odası dolu", SM("tek iş (yalnız not)", false)],
]);
group("Sıralı işler (ön cevap)")([
  [gokhan, PC("tek tür demez, sırayı söyler", (r) => r?.kind === "multi" && /sırayla/.test(r.line) && /mesaj, takvim ve not/.test(r.line) && !r.slots)],
  ["Ali'ye yaz yarın 9'da gelsin", PC("yalnız mesaj: eskisi gibi", (r) => r?.kind === "send")],
]);
const aiMulti = {
  intent: "message",
  message: "Gökhan'a şunu göndereyim mi: Gökhan, yarın saat 10'da tekne bakımı var. Ardından takvime ve notlara ekleyeceğim.",
  send: { to: "Gökhan Demir", text: "Gökhan, yarın saat 10'da tekne bakımı var." },
  items: [
    { type: "plan", title: "Tekne bakımı", date: tom, time: "10:00" },
    { type: "note", title: "Gökhan için malzeme listesi", body: "- Zımpara\n- Vernik" },
  ],
};
const PA = (desc, raw, ok) => [desc, { desc, fn: () => parseAssistant(raw, [], ["Gökhan Demir", "Ali Kök"]), ok }];
group("Sıralı işler (yapay zeka yanıtı)")([
  PA("mesaj + kayıtlar birlikte korunur", aiMulti, (r) => r.send?.to === "Gökhan Demir" && r.items.length === 2 && r.items[1].body.includes("Vernik")),
  PA("intent create olsa da mesaj atılmaz", { ...aiMulti, intent: "create" }, (r) => !!r.send?.text && r.items.length === 2),
  PA("alıcısız send (create) mesaj sayılmaz", { ...aiMulti, intent: "create", send: { to: "", text: "x" } }, (r) => r.send === null && r.items.length === 2),
  ["görev listesi: kayıt hemen, mesaj onaya", { desc: "kayıtlar hemen, mesaj onay adımı", fn: () => ST.taskList(parseAssistant(aiMulti, [], ["Gökhan Demir"])), ok: (r) => r.items.length === 2 && r.confirm.length === 1 && !!r.confirm[0].send && !r.now.length }],
  ["görev listesi: tamamla + güncelle + sil + iki mesaj", { desc: "tamamla/güncelle hemen; silme tek kart, sonra her mesaj", fn: () => ST.taskList(parseAssistant({
    intent: "action", message: "Tamam.",
    actions: [{ op: "update", kind: "plan", id: "p1", patch: { time: "11:00" } }, { op: "complete_task", kind: "task", id: "t3" }, { op: "delete", kind: "note", id: "n1" }],
    sends: [{ to: "Ali", text: "Antrenman 11'e alındı." }, { to: "Gökhan", text: "Antrenman 11'e alındı." }],
  }, [], ["Gökhan Demir", "Ali Kök"])), ok: (r) => r.now.length === 2 && r.confirm.length === 3 && r.confirm[0].actions?.[0].op === "delete" && r.confirm[1].send.to === "Ali Kök" && r.confirm[2].send.to === "Gökhan Demir" }],
  PA("sends: aynı mesaj bir kez", { intent: "message", message: "Tamam.", send: { to: "Ali", text: "Geliyorum." }, sends: [{ to: "Ali Kök", text: "Geliyorum." }] }, (r) => r.sends.length === 1 && r.send.to === "Ali Kök"),
  PA("sends: send olmadan da mesajlar", { intent: "message", message: "Tamam.", sends: [{ to: "Ali", text: "A" }, { to: "Ekip", text: "B" }] }, (r) => r.sends.length === 2 && r.send?.to === "Ali Kök" && r.sends[1].to === "Ekip"),
  ["görev listesi: soru (chat) iş değil", { desc: "boş liste", fn: () => ST.taskList(parseAssistant({ intent: "chat", message: "Saat kaçta olsun?" })), ok: (r) => !r.items.length && !r.confirm.length && !r.now.length }],
  ["görev listesi: aç", { desc: "open ayrı", fn: () => ST.taskList(parseAssistant({ intent: "action", message: "", actions: [{ op: "open", kind: "plan", id: "p1" }] })), ok: (r) => r.open?.id === "p1" && !r.now.length }],
]);

// ---- Not yalnız açıkça istenince: ana işin (plan, görev, yoklama, günlük) yanına kendiliğinden not eklenmez ----
const { interpretRules } = await import("@/lib/ai/rules");
const WN = (want) => ({ desc: want ? "not isteği" : "not isteği değil", fn: (s) => ST.wantsNote(s), ok: (r) => r === want });
const KN = (desc, said, items, keep, exp) => [said, { desc, fn: (s) => ST.keepNotes(items, s, keep).map((d) => d.type).join(","), ok: (r) => r === exp }];
const RT = (desc, exp) => ({ desc, fn: (s) => interpretRules(s, today).map((d) => d.type).join(","), ok: (r) => r === exp });
const pn = [{ type: "plan", title: "Antrenman" }, { type: "note", title: "Ali gelecek" }];
group("Not yalnız istenince")([
  ["not al malzeme odası dolu", WN(true)],
  ["notlara Gökhan için malzeme listesi hazırla", WN(true)],
  ["bunu not olarak kaydet", WN(true)],
  ["Not: dümen gevşek", WN(true)],
  ["yoklama oluştur", WN(false)],
  ["dün 14 not poyrazda start çalıştık", WN(false), "ses tanımanın 'knot' yazışı not değil"],
  ["yarın 10'da antrenman, Ali gelecek", { desc: "plan + tahmini not → yalnız plan", fn: (s) => ST.keepNotes(pn, s).map((d) => d.type).join(","), ok: (r) => r === "plan" }],
  ["yarın 10'da antrenman, Ali gelecek, not al", { desc: "not istendi → plan ve not", fn: (s) => ST.keepNotes(pn, s).map((d) => d.type).join(","), ok: (r) => r === "plan,note" }],
  KN("yoklama cümlesinden tek başına not çıkmaz", "yoklama oluştur", [{ type: "note", title: "Yoklama oluştur" }], 0, ""),
  KN("tek başına bilgi notu kalır", "malzeme odası dolu", [{ type: "note", title: "Malzeme odası dolu" }], 0, "note"),
  KN("taslakta önceden olan not korunur", "saat 10 olsun", [{ type: "plan" }, { type: "note" }, { type: "note" }], 1, "plan,note"),
  ["yoklama oluştur", RT("kurallar yoklamadan not çıkarmaz", "")],
  ["yarın 16:00 antrenman planla, Ali ve Ayşe gelecek", RT("kurallar planın yanına not eklemez", "task")],
  ["malzeme odası dolu", RT("yalnız bilgi: not", "note")],
  ["yoklama oluştur", PC("ön cevap 'not alıyorum' demez", (r) => !/not/.test(r?.line || "") && r?.kind !== "note")],
  ["yarın 10'da antrenman planla, Ali gelecek", PC("öğrenilmiş plan+not tahmini notu seçtirmez", (r) => r?.kind !== "note")],
]);

// ---- Antrenman günlüğü yapay zekayla (trainingLog.js): tanıma, eksik bilgi, birleştirme, plan seçimi ----
const TL = await import("@/lib/trainingLog");
const WL = (want) => ({ desc: want ? "günlük isteği" : "günlük isteği değil", fn: (s) => TL.wantsLog(s), ok: (r) => r === want });
group("Antrenman günlüğü (tanıma)")([
  ["dünkü antrenmanda 12 knot poyraz vardı, start ve tramola çalıştık", WL(true)],
  ["bugünkü antrenman çok iyi geçti", WL(true)],
  ["antrenman günlüğüne yaz: 2 saat sürdü, Ali ve Ayşe geldi", WL(true)],
  ["günlüğe ekle hafif rüzgârda rota çalıştık", WL(true)],
  ["salı günkü idmanda deniz dalgalıydı, şamandıra dönüşü yaptık", WL(true)],
  ["antrenman günlüğünü aç", WL(false)], ["günlüğü göster", WL(false)], ["yarın 10'da antrenman ekle", WL(false)],
  ["haftaya salı antrenman planla", WL(false)], ["antrenman ne zaman", WL(false)], ["yarın antrenman var mı", WL(false)],
  ["Antreman günlüğüne yaz bugün 15 not rüzgar vardı", WL(true), "ses tanıma yazımı"], ["Bugünkü antrenmanı kaydet 12 knot poyraz start", WL(true)],
  ["Bugünkü antrenman notu: start ve tramola, 2 saat", WL(true)], ["antrenman günlüğü oluştur", WL(true)], ["yarın antrenmanı kaydet", WL(false)],
  ["antrenman günlüğü oluştur", { desc: "anlatımsız: önce anlatması istenir", fn: (s) => TL.bareLog(s), ok: (r) => r === true }],
  ["antrenman günlüğü: 12 knot poyraz, start çalıştık", { desc: "anlatımlı: doğrudan yazılır", fn: (s) => TL.bareLog(s), ok: (r) => r === false }],
  ["başlığı antrenman olan Genel plan", { desc: "antrenman sayılır", fn: () => TL.isTraining({ title: "Optimist antrenmanı", cat: "Genel" }), ok: (r) => r === true }],
  ["Ali dünkü antrenmana geldi mi", WL(false)], ["Ali bugünkü antrenmana gelmedi", WL(false), "yoklama"], ["bugünkü antrenman nasıl geçti?", WL(false)],
  ["antrenman günlüğünü aç", { desc: "localCommand yine sayfa açar", fn: cmd, ok: (r) => r?.type === "navigate" && r.page === "training" }],
]);
const AI_LOG = { wind: "14", dir: "poyraz", topics: ["start", "tramola çalışması", "Kürek"], min: 120, rating: 0, note: "Ali starta geç kaldı", athletes: "Ali, Ayşe", sea: "Hafif dalgalı", details: [{ k: "Antrenör", v: "Gökhan" }], src: "ai" };
const F = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
group("Antrenman günlüğü (alanlar)")([
  ["temizle", F("yön, konular, kişiler düzgün", () => {
    const l = TL.cleanLog(AI_LOG);
    return l.wind === 14 && l.dir === "Poyraz" && l.topics.join() === "Start,Tramola,Kürek" && l.athletes.join() === "Ali,Ayşe" && l.sea === "Hafif dalgalı" && l.details[0].v === "Gökhan" && l.rating === null;
  })],
  ["eksik", F("yalnız 'nasıl geçti' eksik", () => TL.missingOf(TL.cleanLog(AI_LOG)).join() === "nasıl geçti")],
  ["eksik (yalnız not)", F("beş alan eksik", () => TL.missingOf(TL.cleanLog({ note: "x" })).length === 5)],
  ["yalnız ayrıntı", F("katılanlar tek başına da günlük", () => TL.cleanLog({ athletes: ["Ali"] })?.athletes?.[0] === "Ali")],
  ["boş", F("boş anlatım günlük değil", () => TL.cleanLog({ topics: [], athletes: "", details: [] }) === null)],
  ["birleştir", F("eskiler kalır, yeni eklenir", () => {
    const m = TL.mergeLog(TL.cleanLog(AI_LOG), TL.cleanLog({ rating: 3, topics: ["Rota"], athletes: ["Ali", "Mehmet"], note: "Sonda yarış provası" }));
    return m.rating === 3 && m.wind === 14 && m.topics.length === 4 && m.athletes.join() === "Ali,Ayşe,Mehmet" && /geç kaldı\nSonda/.test(m.note) && TL.missingOf(m).length === 0;
  })],
  ["ayrıntı güncelle", F("aynı başlık yenilenir", () => TL.mergeLog({ details: [{ k: "Antrenör", v: "Gökhan" }] }, { details: [{ k: "antrenör", v: "Ali" }] }).details.length === 1)],
  ["plan seç", F("saate en yakın antrenman", () => {
    const P = [{ id: "a", cat: "Antrenman", date: today, time: "10:00" }, { id: "b", cat: "Antrenman", date: today, time: "17:00" }, { id: "c", cat: "Antrenman", date: today, time: "16:00", status: "cancelled" }, { id: "d", cat: "Genel", date: today }];
    return TL.pickPlan(P, today, "16:30")?.id === "b" && TL.pickPlan(P, today)?.id === "a" && TL.pickPlan(P, tom) === null;
  })],
  ["cevap", F("eksik söylenince", () => TL.logReply(TL.cleanLog(AI_LOG), today, today).startsWith("Bugünkü antrenmanın günlüğünü yazdım: 14 kn Poyraz") && /Eksik: nasıl geçti/.test(TL.logReply(TL.cleanLog(AI_LOG), today, today)))],
  ["cevap (yeni plan)", F("plan açıldığını söyler", () => /takvimde antrenman yoktu/.test(TL.logReply({ wind: 10 }, today, today, true)))],
]);
const LA = (want) => ({ desc: want ? "günlüğe ek bilgi" : "ek bilgi değil", fn: (s) => TL.isLogAnswer(s), ok: (r) => r === want });
group("Antrenman günlüğü (eksik tamamlama)")([
  ["çok iyi geçti", LA(true)], ["90 dakika sürdü", LA(true)], ["rüzgâr lodostu", LA(true)], ["Mehmet de geldi", LA(true)],
  ["yarın 10'da antrenman ekle", LA(false)], ["Ali'ye mesaj at", LA(false)], ["planları aç", LA(false)],
  ["14 knot poyrazda start ve tramola çalıştık, 2 saat sürdü", LA(true), "günlük sayfasında / açık antrenman planında anlatım"],
  ["saatini 10 yap", LA(false), "açık planda kayıt değişikliği"], ["yarına ertele", LA(false)],
]);

// ---- Günlük ↔ yoklama: söylenen katılanlar "geldi" olur, yoklamada gelenler günlüğe girer ----
const ATH = [
  { id: "a1", studentName: "Ali Kaya", status: "active", att: { [today.slice(0, 4)]: { [today.slice(5)]: "present" } } },
  { id: "a2", studentName: "Ayşe Şahin", status: "active", att: {} },
  { id: "a3", studentName: "Ali Yılmaz", status: "active", att: {} },
  { id: "a4", studentName: "Mehmet Demir", status: "active", att: { [today.slice(0, 4)]: { [today.slice(5)]: "absent" } } },
  { id: "a5", studentName: "Deniz Eski", status: "passive", att: {} },
];
group("Antrenman günlüğü (yoklama)")([
  ["eşleştir", F("tam ad, tek ad, Türkçe harfsiz; iki Ali belirsiz", () => {
    const m = TL.matchNames(["Ayse", "Mehmet", "Ali", "Ali Kaya", "Deniz"], ATH);
    return m.ids.join() === "a2,a4,a1" && m.unknown.join() === "Ali,Deniz";
  })],
  ["yoklamadaki gelenler", F("günlükte katılan yoksa yoklamadan", () => {
    const j = TL.joinAttendance({ wind: 12 }, today, ATH);
    return j.log.athletes.join() === "Ali Kaya" && j.fromAtt.join() === "Ali Kaya" && !Object.keys(j.changes).length;
  })],
  ["söylenenler geldi", F("yoklamada geldi olur (gelmedi olan da), gelen zaten işaretli kalır", () => {
    const j = TL.joinAttendance({ athletes: ["Ayşe", "Mehmet", "Ali Kaya", "Zeynep"] }, today, ATH);
    return j.changes.a2 === "present" && j.changes.a4 === "present" && !("a1" in j.changes) && j.marked.join() === "Ayşe Şahin,Mehmet Demir" && j.unknown.join() === "Zeynep" && j.log.athletes.length === 4;
  })],
  ["cevap", F("işaretlenenler ve bulunamayanlar söylenir", () => TL.attLine({ marked: ["Ayşe Şahin"], unknown: ["Zeynep"] }) === "Yoklamada geldi olarak işaretledim: Ayşe Şahin. Sporcularda bulamadım: Zeynep.")],
]);

// ---- Asistanla mesaj: onay sözcükleri, kurulan gruplar, alıcı listesi ----
const { matchGroup } = await import("@/lib/ai/messageRules");
const GR = [{ id: "g1", name: "Yelken Ekibi" }, { id: "g2", name: "Antrenörler" }, { id: "g3", name: "Veliler 2026" }];
const MG = (desc, exp) => ({ desc, fn: (s) => matchGroup(s, GR)?.id || "", ok: (r) => r === exp });
group("Mesaj gönderme (onay ve gruplar)")([
  ["onayladım", CW("onay", "yes"), "kullanıcının söylediği; önceden tanınmıyordu"],
  ["onay", CW("onay", "yes")],
  ["tamam onayladım", CW("onay", "yes")],
  ["onay veriyorum", CW("onay", "yes")],
  ["gönderelim", CW("onay", "yes")],
  ["evet yolla", CW("onay", "yes")],
  ["onaylamıyorum", CW("ret", "no")],
  ["yollama", CW("ret", "no")],
  ["onayladım", Y("işlem onayı da evet", isYes, true)],
  ["Yelken Ekibi grubuna", MG("kurulan grup", "g1")],
  ["yelken ekibine", MG("ekli söyleyiş", "g1")],
  ["Antrenörler'e", MG("kesmeli ek", "g2")],
  ["Veliler 2026 grubu", MG("rakamlı ad", "g3")],
  ["Ali", MG("kişi grup sayılmaz", "")],
  ["ekip", MG("sabit grup kelimesi kurulan gruba gitmez", "")],
  ["kurulan grup adı", Fa("yapay zekanın yazdığı grup adı korunur", () => AIA.parseAssistant({ intent: "message", message: "Göndereyim mi?", send: { to: "Yelken Ekibi", text: "Yarın 9'da iskeledeyiz." } }, [], ["Ekip", "Yelken Ekibi", "Ali Kök"]).send?.to === "Yelken Ekibi")],
  ["grup kelimesiyle başlayan ad", Fa("'Grup Antrenörler' Ekip'e çevrilmez", () => AIA.parseAssistant({ intent: "message", message: "", send: { to: "Grup Antrenörler", text: "Toplantı 5'te." } }, [], ["Ekip", "Grup Antrenörler"]).send?.to === "Grup Antrenörler")],
  ["ekibe", Fa("sabit grup yine Ekip", () => AIA.parseAssistant({ intent: "message", message: "", send: { to: "ekibe", text: "Toplantı 5'te." } }, [], ["Ekip", "Yelken Ekibi"]).send?.to === "Ekip")],
  ["WhatsApp'lı kişi", Fa("uygulamada olmayan kişi de alıcı", () => AIA.parseAssistant({ intent: "message", message: "", send: { to: "Fatma Yıldız (WhatsApp)", text: "Akşam geliyorum." } }, [], ["Fatma Yıldız"]).send?.to === "Fatma Yıldız")],
]);

// Yoklama sayfasında ana asistan: "yoklama" denmeden de ad + geldi/gelmedi yoklamadır; soru ve başka işler değil
const { wantsAttendance } = await import("@/features/athletes/access");
const AH = (desc, here, want) => ({ desc, fn: (s) => wantsAttendance(s, here), ok: (r) => r === want });
const JB = (desc, want) => ({ desc, fn: (s) => ST.jobsIn(s).length > 0, ok: (r) => r === want });
group("Yoklama sayfasında asistan")([
  ["Ali ve Zeynep geldi", AH("sayfada yoklama", true, true)],
  ["Emre izinli, kalanlar gelmedi", AH("izinli + kalanlar", true, true)],
  ["Mehmet raporlu", AH("raporlu", true, true)],
  ["Ali ve Zeynep geldi", AH("başka sayfada yoklama değil", false, false)],
  ["yoklama: Ali geldi", AH("her yerde yoklama", false, true)],
  ["Ali geldi mi", AH("soru yoklama değil", true, false)],
  ["Ali geldiğinde ona yaz", AH("geldiğinde yoklama değil", true, false)],
  ["Ali'ye mesaj at, yarın 10'da iskelede olsun", AH("mesaj yoklama değil", true, false)],
  ["Yarın 10'da antrenman ekle", AH("plan yoklama değil", true, false)],
  ["Ali ve Zeynep geldi, Emre'nin velisine haber ver", JB("yoklamadan sonra mesaj da yapılır", true)],
  ["Ali ve Zeynep geldi, kalanlar gelmedi", JB("yalnız yoklama", false)],
]);

// ---- Hızlı cevap: "Saat kaçta olsun?" sorusuna kısa cevap yapay zekaya gitmeden taslağa yazılır ----
const { quickAnswer } = await import("@/lib/ai/rules");
const qPlan = [{ type: "plan", title: "Antrenman", date: tom, time: "", endDate: "", allDay: false, place: "" }];
const qNoDate = [{ ...qPlan[0], date: "" }];
const QA = (desc, list, kind, ok) => ({ desc, fn: (s) => quickAnswer(s, list, today, { idx: 0, kind })?.[0] || null, ok });
const QT = (time) => QA(`saat ${time}`, qPlan, "time", (r) => r?.time === time);
const QN = (desc, list = qPlan, kind = "time") => QA(`${desc} → yapay zekaya`, list, kind, (r) => r === null);
group("Hızlı cevap (saat/gün)")([
  ["10'da", QT("10:00")], ["saat 10", QT("10:00")], ["akşam 6", QT("18:00")], ["10.30", QT("10:30")], ["on buçukta", QT("10:30")],
  ["tüm gün", QA("tüm gün", qPlan, "time", (r) => r?.allDay === true && !r.time)],
  ["yarın", QA("gün yarın", qNoDate, "date", (r) => r?.date === tom)],
  ["Ali de gelsin", QN("saat değil")], ["10'da değil 11'de", QN("düzeltme")], ["saat 10 ve Ali'ye yaz", QN("başka iş de var")],
  ["yarın", QN("gün söylendi ama saat soruldu")], ["bilmiyorum", QN("anlaşılmadı", qNoDate, "date")],
]);
