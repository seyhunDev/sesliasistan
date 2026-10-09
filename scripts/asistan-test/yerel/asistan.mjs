// Asistan testleri: insanların söyleyebileceği farklı cümlelerle yerel (yapay zekasız) kurallar.
// Sayfa/sohbet açma, kayıt ekleme, özet, tamamlama, onaylar, ön cevap, yarış açma, alışveriş, geri al.
// Yalnızca hesaplama yapar; veritabanına ve yapay zekaya dokunmaz.
import { localCommand } from "@/lib/commands";
import { isYes, isNo, localQuery, looksLikeCreate, isEnd, isNoMore, isCloseNow } from "@/lib/assistantLocal";
import { parseBirthday } from "@/lib/birthdayParse";
import { messageIntent, confirmWord } from "@/lib/ai/messageRules";
import { localNavigate } from "@/lib/nav";
import { suite, today, tom, data } from "./ortak.mjs";
import { shareText } from "@/lib/cancelPlan";
import { waMode } from "@/lib/steps";
import { cleanWaLink, waGroupFor, cleanWaGroups } from "@/lib/waGroups";
import * as CX from "@/lib/convoContext";

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
  ["planları aç", P("plans")], ["planlara git", P("plans")], ["planlar sayfası", P("plans")], ["planlarımı göster", P("plans")], ["etkinlikleri aç", P("events")], ["etkinlikler sayfasına git", P("events")], ["etkinliklerim", P("events")], ["instagram sayfasını aç", P("posts")], ["gönderileri aç", P("posts")], ["instagram", P("posts")], ["gönderilerim", P("posts")], ["rüzgâr haritasını aç", P("wind")], ["rüzgar haritası", P("wind")], ["rüzgâr haritasına bakalım", P("wind")], ["windy'yi aç", P("wind")],
  ["ana sayfaya git", P("home")], ["anasayfaya dön", P("home")], ["ana sayfa", P("home")], ["başa dön", P("home")], ["ana ekrana geç", P("home")],
  ["görevleri aç", P("tasks")], ["görevlerime bakalım", P("tasks")], ["yapılacakları göster", P("tasks")], ["işlerimi aç", P("tasks")],
  ["notları aç", P("notes")], ["notlarıma git", P("notes")], ["notlar", P("notes")],
  ["takvimi aç", P("calendar")], ["takvime geç", P("calendar")],
  ["mesajları aç", P("messages")], ["mesajlarıma git", P("messages")], ["sohbetleri göster", P("messages")],
  ["fişleri aç", P("receipts")], ["harcamaları göster", P("receipts")], ["faturalara bakalım", P("invoices")], ["faturaları aç", P("invoices")], ["ödemelerimi aç", P("payments")], ["gelen ödemeleri göster", P("payments")], ["hesaplarımı aç", P("accounts")], ["mailleri aç", P("accounts")], ["aidat ödemelerini aç", P("dues")],
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
  ["yarın saat 10'da antrenman ekle", PC("plan, yarın 10:00, kısa ve çakışan plan", (r) => r?.kind === "plan" && r.slots.time === "10:00" && r.slots.date === tom && /^Tamam, planı hazırlıyorum\. /.test(r.line) && /Yönetim kurulu toplantısı” planı da var/.test(r.line))],
  ["yarın 16'da yarış antrenmanı var", PC("plan, o saatte rüzgâr", (r) => r?.kind === "plan" && /rüzgâr 14 knot/.test(r.line))],
  ["cumartesi yarış planla", PC("plan, ne yaptığını söyler", (r) => r?.kind === "plan" && /^Tamam, planı hazırlıyorum\./.test(r.line) && r.work === "Plan hazırlanıyor")],
  ["Ali'ye motoru kontrol etmesini hatırlat", PC("görev", (r) => r?.kind === "task")],
  ["not al malzeme odası dolu", PC("not", (r) => r?.kind === "note" && r.line === "Tamam, notu alıyorum." && r.work === "Not alınıyor")],
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
  ["tamam kapat", END_T(true)], ["Kapat tamam.", END_T(true)],
]);

// Dinlerken "kapat" duyulunca hemen kapanır (konuşma bitişi beklenmez); yalnız söz bütünüyle kapatma isteğiyse
const CN = (want) => ({ desc: want ? "dinleme hemen durur" : "beklenir", fn: (s) => isCloseNow(s), ok: (r) => r === want });
group("Hemen kapat (dinlerken)")([
  ["kapat", CN(true)], ["Tamam kapat.", CN(true)], ["asistanı kapat", CN(true)], ["kapatabilirsin", CN(true)], ["kapat lütfen", CN(true)],
  ["tamam", CN(false)], ["kapat şu görevi", CN(false)], ["görevi kapat", CN(false)], ["teşekkürler", CN(false)], ["kapa", CN(false)],
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
  [gokhan, PC("sırayı söyler, yapay zekaya ipucu verir", (r) => r?.kind === "multi" && r.line === "Tamam, sırayla yapıyorum: mesaj, takvim ve not." && /sırayla: mesaj, takvim ve not/.test(r.hint) && !r.slots)],
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

// ---- Notun yaşamı: "yapıldı" denen not silinmez, Arşiv'e gider, geri alınır ----
const NS = await import("@/lib/noteState");
const { buildDigest: bdNote } = await import("@/lib/ai/digest");
const nNotes = [
  { id: "n1", title: "Malzeme odası dolu", body: "", createdAt: `${today}T09:00:00` },
  { id: "n2", title: "Yelken tamiri", body: "", createdAt: `${today}T08:00:00`, ...NS.noteDonePatch(`${today}T10:00:00`) },
  { id: "n3", title: "Eski not", body: "", createdAt: `${today}T07:00:00`, archived: true, archivedAt: `${today}T07:30:00` },
];
group("Not yapıldı (arşiv)")([
  ["yapıldı yaması", { desc: "done + arşiv, sabit kalkar", fn: () => NS.noteDonePatch("2026-10-06T10:00:00Z"), ok: (r) => r.done && r.archived && r.doneAt === r.archivedAt && r.pinned === false }],
  ["geri al yaması", { desc: "Notlar'a döner", fn: () => NS.noteReopenPatch(), ok: (r) => r.done === false && r.archived === false && r.doneAt === null }],
  ["kopyalanacak metin", { desc: "başlık + farklıysa metin", fn: () => [NS.noteText({ title: "Yelken", body: "Tamir edilecek" }), NS.noteText({ title: "Yelken", body: "Yelken" }), NS.noteText({ title: "", body: "Yalnız metin" })].join("|"), ok: (r) => r === "Yelken\nTamir edilecek|Yelken|Yalnız metin" }],
  ["durum yazısı", { desc: "Yapıldı / Arşivlendi / Açık", fn: () => nNotes.map(NS.noteStateText).join(","), ok: (r) => r === "Açık,Yapıldı,Arşivlendi" }],
  ["veri özeti", { desc: "açık notlar ve arşivdekiler ayrı, durum yazılı", fn: () => bdNote({ notes: nNotes, now: new Date(`${today}T12:00:00`) }), ok: (r) => /## SON NOTLAR\nn:n1 \| [^\n]*Malzeme odası dolu \| $/m.test(r) && /n:n2 [^\n]*\| yapıldı/.test(r) && /n:n3 [^\n]*\| arşivde/.test(r) && /Notlar: 1 açık, 2 arşivde/.test(r) }],
  ["görev listesi: not yapıldı hemen", { desc: "done_note ve reopen_note onaysız", fn: () => ST.taskList(parseAssistant({ intent: "action", message: "Tamam.", actions: [{ op: "done_note", kind: "note", id: "n1" }, { op: "reopen_note", kind: "note", id: "n2" }] })), ok: (r) => r.now.length === 2 && !r.confirm.length }],
  ["malzeme odası notu yapıldı", PC("ön cevap: not arşive", (r) => r?.kind === "action" && /arşive/.test(r.line))],
  ["notu arşivle", PC("ön cevap: not arşive", (r) => r?.kind === "action" && /arşive/.test(r.line))],
  ["motor yağı görevini tamamla", PC("görev tamamlama değişmedi", (r) => r?.kind === "action" && /görevi tamamlıyorum/.test(r.line))],
  ["not al malzeme odası dolu", PC("not alma değişmedi", (r) => r?.kind === "note")],
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

// ---- Not ↔ antrenman günlüğü ayrı: günlük anlatımı not olmaz, eski günlük notları Notlar'da görünmez ----
const HT = await import("@/lib/homeTiles");
const LL = (want) => ({ desc: want ? "antrenman anlatımı" : "antrenman anlatımı değil", fn: (s) => TL.looksLikeLog(s), ok: (r) => r === want });
const LN = (desc, n, want) => ["", { desc, fn: () => TL.isLogNote(n), ok: (r) => r === want }];
group("Antrenman günlüğü not değil")([
  ["bugünkü antrenmanda 14 knot poyraz, start ve tramola", LL(true)],
  ["antrenman 90 dakika, rüzgar 12 knot", LL(true)],
  ["yarın antrenman var, rüzgar 15 knot olacak", LL(false), "gelecek"],
  ["antrenmanda rüzgar kaç knottu?", LL(false), "soru"],
  ["Ali'ye antrenman 14 knot rüzgarda iyi geçti diye mesaj at", LL(false), "mesaj"],
  ["malzeme odası dolu", LL(false)],
  KN("antrenman anlatımından tek başına not çıkmaz", "bugünkü antrenmanda 14 knot poyraz, start ve tramola", [{ type: "note", title: "Antrenman" }], 0, ""),
  KN("not istenirse kalır", "bugünkü antrenmanda 14 knot poyraz, not al", [{ type: "note", title: "Antrenman" }], 0, "note"),
  LN("Antrenman kategorili not günlüğe benzer", { title: "Antrenman", cat: "Antrenman", body: "" }, true),
  LN("antrenman + knot geçen not günlüğe benzer", { title: "Antrenman notu", body: "12 knot poyraz, start çalıştık" }, true),
  LN("'Not kalsın' denen not sayılmaz", { title: "Antrenman notu", cat: "Antrenman", keepNote: true }, false),
  LN("arşivdeki not sayılmaz", { title: "Antrenman", cat: "Antrenman", archived: true }, false),
  LN("sıradan not sayılmaz", { title: "Malzeme odası dolu", body: "" }, false),
  ["", { desc: "ana sayfa Notlar kartı günlük notlarını saymaz", fn: () => HT.homeNotes([{ id: "a", title: "Antrenman", cat: "Antrenman" }, { id: "b", title: "Halat al" }]).total, ok: (r) => r === 1 }],
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

// ---- Ön cevap kısa: sonucu uygulama söyler ("Ekledim: …"), aynı şey iki kez okunmaz ----
const NM = (want) => Y(want ? "sohbet biter" : "yeni istek (bitmez)", isNoMore, want);
group("Başka isteğin var mı (cevap)")([
  ["yok", NM(true)], ["hayır", NM(true)], ["yok teşekkürler", NM(true)], ["başka yok", NM(true)], ["gerek yok", NM(true)], ["şimdilik yok", NM(true)], ["hayır sağ ol", NM(true)],
  ["yok ama Ali'ye yaz", NM(false)], ["evet", NM(false)], ["yarın antrenman ekle", NM(false)], ["hayır yarın değil cuma ekle", NM(false)],
]);
group("Kısa ön cevap")([
  ["Ali'ye yaz yarın 9'da gelsin", PC("mesajda ne yaptığını söyler", (r) => r?.line === "Tamam, mesajı hazırlıyorum." && r.work === "Mesaj hazırlanıyor")],
  ["tekneleri hazırla görevi ekle", PC("görevde ne yaptığını söyler", (r) => r?.line === "Tamam, görevi hazırlıyorum." && r.work === "Görev hazırlanıyor")],
  ["bugün neler var", PC("soruda bakılıyor yazısı", (r) => r?.work === "Bakıyorum")],
]);

// Her işin kendi ara yazısı (Seyhun: "hepsinde plan hazırlanıyor diyor"; assistTasks.js)
const WK = (desc, work, line) => PC(desc, (r) => r?.work === work && (!line || r.line === line));
group("Göreve göre ara yazı")([
  ["Ali'ye WhatsApp'tan yarın 10'da gelsin diye yaz", WK("WhatsApp: plan değil", "WhatsApp mesajı hazırlanıyor", "Tamam, WhatsApp mesajını hazırlıyorum.")],
  ["Gökhan'a mesaj atar mısın yarın 10'da toplantı var", WK("saatli mesaj plan sanılmaz", "Mesaj hazırlanıyor")],
  ["aliye yaz yarın gelsin", WK("kesme işaretsiz alıcı", "Mesaj hazırlanıyor")],
  ["ekibe yarın 9'da iskelede olun diye gönder", WK("gruba mesaj", "Grup mesajı hazırlanıyor")],
  ["motor yağı görevini tamamla", WK("tamamlama", "Görev tamamlanıyor", "Tamam, görevi tamamlıyorum.")],
  ["antrenmanı 11'e al", WK("değiştirme", "Kayıt değiştiriliyor")],
  ["toplantıyı yarına ertele", WK("erteleme", "Kayıt değiştiriliyor")],
  ["yarınki toplantıyı sil", WK("silme", "Silinecek kayıt aranıyor")],
  ["yarınki antrenmanı iptal et", WK("iptal", "İptal hazırlanıyor")],
  ["her salı 16:00 antrenman", WK("tekrarlayan plan", "Tekrarlayan plan hazırlanıyor")],
  ["yarın rüzgar kaç knot", PC("hava sorusunda takvim sayılmaz", (r) => r?.work === "Hava durumuna bakılıyor" && r.line === "Bakıyorum.")],
  ["yoklama al Ali geldi", PC("yoklama değişiklik sanılmaz", (r) => r?.kind !== "action" && !/Plan/.test(r?.work || ""))],
  ["cumartesi tekne yıkama ekle", PC("tür belli değilse kayıt", (r) => !/Plan|Görev/.test(r?.work || "") || r?.kind === "plan")],
]);
{
  const { TASKS, inventoryWork, tasksPrompt, waitText } = await import("@/lib/assistTasks");
  group("Asistanın iş listesi")([
    ["kimlikler tekrarsız", { desc: "her iş bir kez", fn: () => TASKS.map((x) => x.id), ok: (ids) => new Set(ids).size === ids.length }],
    ["yapay zekalı işlerin yazısı var", { desc: "doing ve work dolu", fn: () => TASKS.filter((x) => x.by !== "yerel" && !(x.doing && x.work)).map((x) => x.id), ok: (xs) => !xs.length }],
    ["envantere 3 telsiz ekle", { desc: "envanter ekleme", fn: inventoryWork, ok: (w) => w === "Envantere ekleniyor" }],
    ["2 şamandıra kayboldu", { desc: "envanterden çıkarma", fn: inventoryWork, ok: (w) => w === "Envanterden çıkarılıyor" }],
    ["kaç telsiz var", { desc: "envanter sorusu", fn: inventoryWork, ok: (w) => w === "Envantere bakılıyor" }],
    ["yazıya çevirme", { desc: "beklerken ne olduğu yazar", fn: () => [waitText({ transcribing: true }), waitText({})], ok: ([a, b]) => a === "Sesin yazıya çevriliyor" && b === "Anlaşılıyor" }],
    ["istem", { desc: "yapay zeka istemi kısa", fn: () => tasksPrompt(), ok: (p) => p.length < 2600 && /envanter/i.test(p) }],
  ]);
}

// Beklerken sıralı yazılar (Seyhun: "hızlıysa hemen göster, uzun sürerse hazır yazıları sırayla göster", 2026-10-09)
{
  const { waitLines, waitStages, pastTense } = await import("@/lib/assistTasks");
  group("Bekleme yazıları")([
    ["hızlı yanıt", { desc: "ilk anda yalnız işin adı", fn: () => waitLines("Plan hazırlanıyor", 500), ok: (r) => r.now === "Plan hazırlanıyor" && !r.done.length }],
    ["gecikince", { desc: "2 sn'de ikinci yazı, ilki soluk listede", fn: () => waitLines("Plan hazırlanıyor", 2000), ok: (r) => r.now === "Takvim kontrol ediliyor" && r.done[0] === "Plan hazırlanıyor" }],
    ["çok gecikince", { desc: "10 sn'de bekliyorum yazısı", fn: () => waitLines("Mesaj hazırlanıyor", 11000), ok: (r) => /uzun sürdü/.test(r.now) && r.done.length === 3 }],
    ["sırayla, döngüsüz", { desc: "son yazıda durur", fn: () => waitLines("Görev tamamlanıyor", 8000), ok: (r) => r.now === "Görev aranıyor" }],
    ["iş belli değil", { desc: "Anlaşılıyor ile başlar", fn: () => waitStages(""), ok: (r) => r[0] === "Anlaşılıyor" && r.length >= 2 }],
    ["yazıya çevirme", { desc: "ses yazıya çevriliyor", fn: () => waitStages("", { transcribing: true }), ok: (r) => r[0] === "Sesin yazıya çevriliyor" }],
    ["envanter", { desc: "envanterin kendi yazıları", fn: () => waitStages("Envanterden çıkarılıyor"), ok: (r) => r.includes("Ürünler eşleştiriliyor") }],
    ["geçmiş zaman", { desc: "biten yazı", fn: () => ["Takvim kontrol ediliyor", "Alıcı bulunuyor", "İşler sıraya konuyor"].map(pastTense), ok: (r) => r.join("|") === "Takvim kontrol edildi|Alıcı bulundu|İşler sıraya kondu" }],
  ]);
}

// Son eklenen özellikler asistanla (lib/assistMore.js): arama, sporcu, nakit gelir, aidat, gönderi arşivi
{
  const { athleteCommand, callCommand, duesCommand, incomeCommand, postArchiveCommand, amountOf } = await import("@/lib/assistMore");
  const IN = (desc, ok) => ({ desc, fn: (x) => incomeCommand(x, "2026-10-09"), ok });
  group("Yeni görevler: arama")([
    ["Ali'yi ara", { desc: "kişi", fn: callCommand, ok: (r) => r && !r.hotel && /ali/.test(r.who) }],
    ["Zeynep'e arama yap", { desc: "arama yap", fn: callCommand, ok: (r) => r?.who === "zeynep" }],
    ["Foça otelini ara", { desc: "otel", fn: callCommand, ok: (r) => r?.hotel }],
    ["faturayı ara", { desc: "arama değil", fn: callCommand, ok: (r) => r === null }],
    ["yarın Ali'yi ara diye görev ekle", { desc: "görev, arama değil", fn: callCommand, ok: (r) => r === null }],
  ]);
  group("Yeni görevler: sporcu")([
    ["yeni sporcu ekle: Ali Kaya, 2014 doğumlu", { desc: "ad ve doğum yılı", fn: athleteCommand, ok: (r) => r?.op === "add" && r.name === "Ali Kaya" && r.birth === "2014-01-01" }],
    ["Ali Kaya'yı sporculara ekle, 12.03.2015 doğumlu", { desc: "doğum tarihi", fn: athleteCommand, ok: (r) => r?.name === "Ali Kaya" && r.birth === "2015-03-12" }],
    ["Ali Kaya'yı arşive al", { desc: "arşiv", fn: athleteCommand, ok: (r) => r?.op === "archive" && r.name === "Ali Kaya" && !r.explicit }],
    ["Ali'yi arşivden çıkar", { desc: "arşivden çıkar", fn: athleteCommand, ok: (r) => r?.op === "unarchive" }],
    ["sporculardan Zeynep Ak'ı sil", { desc: "silme", fn: athleteCommand, ok: (r) => r?.op === "delete" && r.name === "Zeynep Ak" }],
    ["malzeme notunu arşive al", { desc: "not arşivi değil", fn: athleteCommand, ok: (r) => r === null }],
    ["Ali'nin görevini sil", { desc: "sporcu sözü yoksa silme değil", fn: athleteCommand, ok: (r) => r === null }],
  ]);
  group("Yeni görevler: nakit gelir ve aidat")([
    ["Ali Kaya'nın ekim aidatı nakit 1500 alındı", IN("aidat, ay, kişi", (r) => r?.cat === "Aidat" && r.amount === 1500 && r.who === "Ali Kaya" && r.ym === "2026-10")],
    ["Ahmet Yılmaz'dan 2000 lira bağış geldi", IN("bağış", (r) => r?.cat === "Bağış" && r.who === "Ahmet Yılmaz")],
    ["kano eğitimi için 3 bin lira nakit aldım", IN("bin", (r) => r?.cat === "Kano eğitimi" && r.amount === 3000)],
    ["Deniz Şahin aidatını nakit 1.500 TL ödedi", IN("noktalı tutar", (r) => r?.amount === 1500 && r.who === "Deniz Şahin")],
    ["bu ay ne kadar ödeme aldım", IN("soru, gelir değil", (r) => r === null)],
    ["eylül aidatı nakit 1500 alındı Ali Kaya", IN("geçmiş ay", (r) => r?.ym === "2026-09")],
    ["2.500,50 TL", { desc: "tutar", fn: amountOf, ok: (n) => n === 2500.5 }],
    ["aidat hatırlatması gönder", { desc: "hatırlatma", fn: duesCommand, ok: (r) => r?.op === "remind" }],
    ["bu ay kim aidat ödemedi", { desc: "soru", fn: duesCommand, ok: (r) => r?.op === "ask" }],
    ["aidatları aç", { desc: "sayfa açma", fn: duesCommand, ok: (r) => r === null }],
    ["gönderiyi arşive kaldır", { desc: "gönderi arşivi", fn: postArchiveCommand, ok: (r) => r?.archived === true }],
    ["arşivden çıkar", { desc: "gönderi arşivden", fn: postArchiveCommand, ok: (r) => r?.archived === false }],
  ]);
  const M = await import("@/lib/assistMore");
  const C = (desc, fn, ok) => ({ desc, fn, ok });
  group("Elle yapılanlar asistanla (2026-10-09)")([
    ["F-0012 fişini ödendi yap", C("fiş numarası", M.receiptPayCommand, (r) => r?.paid && r.no === 12)],
    ["Ali'nin fişlerini ödedim", C("kişinin fişleri", M.receiptPayCommand, (r) => r?.paid && r.who === "Ali")],
    ["F-3 fişi ödenmedi", C("geri al", M.receiptPayCommand, (r) => r?.paid === false && r.no === 3)],
    ["fiş yükle", C("fiş kamerası değil", M.receiptPayCommand, (r) => r === null)],
    ["gelmeyenlerin velilerine haber ver", C("bugün", M.absentNotifyCommand, (r) => r?.day === 0)],
    ["dün gelmeyenlerin velilerine bildir", C("dün", M.absentNotifyCommand, (r) => r?.day === -1)],
    ["dün gelmeyenler kimdi?", C("soru değil", M.absentNotifyCommand, (r) => r === null)],
    ["alınanları temizle", C("temizle", M.shopClearCommand, (r) => r === true)],
    ["Ayşe'nin doğum gününü sil", C("doğum günü silme", M.birthdayDeleteCommand, (r) => /ayşe/i.test(r?.name || ""))],
    ["gönderiyi sil", C("gönderi silme", M.postDeleteCommand, (r) => r === true)],
    ["yarışı sil", C("yarış silme", M.raceHereCommand, (r) => r?.op === "delete")],
    ["yarışı planlara ekle", C("planlara", M.raceHereCommand, (r) => r?.op === "plan")],
    ["24 tekne yarıştı", C("tekne sayısı", M.raceHereCommand, (r) => r?.op === "fleet" && r.n === 24)],
    ["Ali 3. oldu", C("sonuç", M.raceHereCommand, (r) => r?.op === "result" && r.place === 3)],
    ["Zeynep ikinci oldu", C("sonuç yazıyla", M.raceHereCommand, (r) => r?.op === "result" && r.place === 2)],
    ["Ali'yi yarıştan çıkar", C("sporcu çıkar", M.raceHereCommand, (r) => r?.op === "remove")],
    ["Ayşe ödedi", C("ücret ödendi", M.raceHereCommand, (r) => r?.op === "paid" && r.paid)],
    ["Mehmet'i de ekle", C("ekleme yarış akışında", M.raceHereCommand, (r) => r === null)],
    ["Ali ve Ayşe ile Yelken Ekibi adında grup kur", C("grup adı", M.groupCreateCommand, (r) => r?.name === "Yelken Ekibi")],
    ["Ayşe Yılmaz'ı kişilerden sil", C("kişi silme", M.personDeleteCommand, (r) => /ayşe/i.test(r?.name || ""))],
  ]);
  const PM = await import("@/features/posts/postModel");
  const { followAsk } = await import("@/features/athletes/raceNav");
  group("Gönderi tasarımı sesle ve yarışın eksikleri")([
    ["gönderi hazırla, mavi olsun, hikâye boyutunda, modern", C("renk, boyut, tasarım", PM.designFrom, (r) => r.theme === "gece" && r.format === "story" && r.style === "modern")],
    ["kırmızı renkli kare gönderi", C("kırmızı, kare", PM.designFrom, (r) => r.theme === "al" && r.format === "square")],
    ["yarış sonucu gönderisi, bordo olsun", C("tür ve renk", PM.designFrom, (r) => r.kind === "sonuc" && r.theme === "bordo")],
    ["moral verici bir yazı", C("moral mor değil", PM.designFrom, (r) => !r.theme)],
    ["rengi yeşil yap", C("yalnız tasarım", PM.askBeyondLook, (r) => r === false)],
    ["daha kısa yaz, rengi yeşil yap", C("yazı da değişir", PM.askBeyondLook, (r) => r === true)],
    ["yarış", C("tarih ve sporcu yok", () => followAsk({ startDate: "", athleteIds: [] }), (r) => /tarih/i.test(r) && /sporcu/i.test(r))],
    ["yarış", C("yalnız sporcu yok", () => followAsk({ startDate: "2026-10-26", athleteIds: [] }), (r) => r === "Hangi sporcular katılacak?")],
    ["yarış", C("eksik yok", () => followAsk({ startDate: "2026-10-26", athleteIds: ["a"] }), (r) => r === "")],
  ]);
}

// ---- Asistan akışı: cümlenin hangi yoldan gittiği, yapay zeka yanıtının telefona dönüşü (NDJSON akışı) ----
// Kural: sayfa açma (ve fiş kamerası, toplantı, yardım) yerelde; kayıt, tamamlama, özet, mesaj yapay zekaya (aiFirst).
const AF = (desc, ok) => ({ desc, fn: (s) => localCommand(s, data, today, { aiFirst: true }), ok });
const AF_AI = AF("yapay zekaya gider", (r) => r === null);
group("Akış: yerel mi yapay zeka mı")([
  ["planları aç", AF("yerelde sayfa açılır", (r) => r?.type === "navigate" && r.page === "plans")],
  ["yoklamayı aç", AF("yerelde sayfa açılır", (r) => r?.type === "navigate" && r.page === "attendance")],
  ["fiş yükle", AF("yerelde fiş kamerası", (r) => r?.type === "receipt")],
  ["yardım", AF("yerelde yardım", (r) => r?.type === "reply")],
  ["yarın saat 10'da antrenman ekle", AF_AI, "kayıt yerelde hazır olsa da yapay zeka (başlık/tür doğru)"],
  ["tekneleri hazırla görevini tamamla", AF_AI],
  ["bugün neler var", AF_AI],
  ["geciken görevler", AF_AI],
  ["Ali'ye yaz yarın 9'da gelsin", AF_AI],
  ["görevler", AF("tek kelime sayfa adı: sayfa", (r) => r?.type === "navigate" && r.page === "tasks")],
]);

const { isJobJson } = await import("@/lib/ai/assistant");
const { partialMessage } = await import("@/lib/ai/gemini");
const JJ = (desc, exp) => ({ desc, fn: isJobJson, ok: (r) => r === exp });
group("Akış: iş yanıtında cümle akışta okunmaz")([
  ['{"intent":"create","message":"Tamam', JJ("kayıt: okunmaz (sonucu uygulama söyler)", true)],
  ['{"intent": "action", "message": "', JJ("işlem: okunmaz", true)],
  ['{"intent":"message","message":"Ali', JJ("mesaj: okunmaz", true)],
  ['{"intent":"query","message":"Yarın iki plan', JJ("soru: geldikçe okunur", false)],
  ['{"intent":"chat","message":"Saat kaçta', JJ("soru-cevap: okunur", false)],
  ['{"inte', JJ("niyet henüz gelmedi: okunur sayılır", false)],
]);
const PM = (desc, exp) => ({ desc, fn: partialMessage, ok: (r) => r === exp });
group("Akış: yarım yanıttan okunacak cümle")([
  ['{"intent":"query","message":"Yarın iki plan var. Saat', PM("yarım cümle de gelir", "Yarın iki plan var. Saat")],
  ['{"intent":"query","message":"“Antrenman” saat 10\\u0027da', PM("kaçışlı harf çözülür", "“Antrenman” saat 10'da")],
  ['{"intent":"query","message":"Rüzgâr 12 knot \\u00', PM("yarım kaçış atılır", "Rüzgâr 12 knot ")],
  ['{"intent":"query","message":"Ali \\"geliyorum\\" dedi', PM("tırnak", 'Ali "geliyorum" dedi')],
  ['{"intent":"query"', PM("cümle henüz yok", "")],
]);

// Sunucunun akışı satır satır (NDJSON) gelir; satırlar ağ parçalarına bölünebilir
const { readStream } = await import("@/services/assistantService");
const enc = new TextEncoder();
const fakeRes = (chunks) => new Response(new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } }));
const RS = (desc, chunks, ok) => [desc, { desc, fn: async () => {
  const seen = [];
  try { return { r: await readStream(fakeRes(chunks), (m) => seen.push(m)), seen }; } catch (e) { return { err: e.message, seen }; }
}, ok }];
const doneLine = JSON.stringify({ t: "done", intent: "query", message: "Yarın iki plan var.", items: [], source: "ai", ms: 1400 });
group("Akış: yanıtın telefona dönüşü (NDJSON)")([
  RS("cümle parçaları sırayla, sonunda tüm yanıt", [`{"t":"m","m":"Yarın"}\n`, `{"t":"m","m":"Yarın iki plan var."}\n`, `${doneLine}\n`],
    (x) => x.seen.join("|") === "Yarın|Yarın iki plan var." && x.r?.message === "Yarın iki plan var." && x.r.ms === 1400 && !("t" in x.r)),
  RS("satır ağda ikiye bölünse de okunur", [`{"t":"m","m":"Yar`, `ın"}\n${doneLine.slice(0, 20)}`, `${doneLine.slice(20)}\n`], (x) => x.seen[0] === "Yarın" && x.r?.intent === "query"),
  RS("bozuk satır atlanır", [`çöp satır\n`, `${doneLine}\n`], (x) => x.r?.intent === "query"),
  RS("sunucu hatası: neden ile birlikte hata", [`{"t":"err","error":"Kota doldu","reason":"quota"}\n`], (x) => x.err === "Kota doldu"),
  RS("akış yarıda kesildi: hata", [`{"t":"m","m":"Yarın"}\n`], (x) => /yarıda kesildi/.test(x.err || "")),
]);

// Ders programı ana asistanla (sayfanın kendi dinleyicisi kaldırıldı)
const { wantsSchedule } = await import("@/features/schedule/scheduleWords");
const WS = (here, want) => ({ desc: `${here ? "ders sayfasında" : "başka sayfada"}: ${want ? "ders programı" : "değil"}`, fn: (s) => wantsSchedule(s, here), ok: (r) => r === want });
group("Ders programı (ana asistan)")([
  ["salı 13:00 fizik B-204", WS(true, true)],
  ["salı fiziği 14'e al", WS(true, true)],
  ["pazartesi 9'da matematik, 10:30'da kimya", WS(true, true)],
  ["ders programıma çarşamba 10'da kimya ekle", WS(false, true)],
  ["salı 13:00 fizik", WS(false, false)],
  ["yarın 10'da antrenman ekle", WS(false, false)],
  ["salı kaç dersim var?", WS(true, false)],
  ["Ali'ye yaz yarın gelmesin", WS(true, false)],
  ["yarın 10'da görev ekle", WS(true, false)],
]);

// Yerel adımların süresi (telefonda değil bu bilgisayarda; kalabalık veriyle): ön cevap, yerel komut, veri özeti, yanıt ayrıştırma.
// Kullanıcı susunca yapay zekaya gitmeden önce bunlar çalışır; her biri birkaç ms'nin altında kalmalı.
const { buildDigest } = await import("@/lib/ai/digest");
const big = {
  plans: Array.from({ length: 150 }, (_, i) => ({ id: `p${i}`, title: `Antrenman ${i}`, date: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}`, time: "10:00", place: "İskele", cat: "Antrenman" })),
  tasks: Array.from({ length: 80 }, (_, i) => ({ id: `t${i}`, title: `Görev ${i}`, due: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}`, done: i % 3 === 0 })),
  notes: Array.from({ length: 80 }, (_, i) => ({ id: `n${i}`, title: `Not ${i}`, body: "Malzeme odası dolu, yelkenler kontrol edilecek. ".repeat(3) })),
};
const per = (fn, n = 200) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - t0) / n; };
const SURE = (desc, max, fn) => [desc, { desc: `${max} ms altında`, fn: () => +per(fn).toFixed(3), ok: (r) => r < max }];
group("Yerel adımların süresi")([
  SURE("ön cevap (precue)", 5, () => precue("yarın saat 10'da antrenman ekle, Ali de gelsin", { plans: big.plans, today })),
  SURE("yerel komut (sayfa açma denetimi)", 5, () => localCommand("Gökhan'a yarın 10'da tekne bakımı olduğunu yaz", big, today, { aiFirst: true })),
  SURE("veri özeti (yapay zekaya giden)", 30, () => buildDigest({ ...big, receipts: [], name: "Seyhun", members: [] })),
  SURE("yanıt ayrıştırma + görev listesi", 5, () => ST.taskList(parseAssistant(aiMulti, [], ["Gökhan Demir"]))),
  ["veri özeti boyu sınırlı", { desc: "en çok 26.000 karakter (sunucu sınırı)", fn: () => buildDigest({ ...big, receipts: [], name: "Seyhun", members: [] }).length, ok: (r) => r > 0 && r <= 26000 }],
]);

// Asistan süre kaydı (Ayarlar › Asistan süre kaydı): uydurma saatle bir komutun anları yazılır, adımlar ve toplam denetlenir.
const TM = await import("@/lib/assistTiming");
const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
// at: [an, ms] sırası; sesli komutta dinleme anları önce speechMark ile
function scene(steps) {
  let t = 0;
  TM.timingTest({ now: () => t, storage: memStore() });
  for (const [what, ms, arg] of steps) {
    t = ms;
    if (what === "speech") TM.speechMark(arg[0], arg[1]);
    else if (what === "start") TM.timingStart(arg, true);
    else if (what === "startText") TM.timingStart(arg, false);
    else if (what === "reply") TM.timingReply(arg);
    else if (what === "speak") TM.timingSpeak();
    else TM.timingMark(what);
  }
  TM.timingFlush();
  return TM.timingList();
}
// iPhone'da tipik sesli ekleme: dinleme 0, son ses 2000, durdurma 3600, yükleme 3800, yazı 4800, komut 4810,
// ön cevap 4815, gönderme 4820, "Tamam." okunuyor 4900, yapay zeka 7300, kayıt 7600, cevap 7610, okuma 7700
const voiceAdd = [
  ["speech", 0, ["listen"]], ["speech", 3600, ["voiceEnd", 2000]], ["speech", 3600, ["stop"]], ["speech", 3800, ["upload"]], ["speech", 4800, ["text"]],
  ["start", 4810, "yarın 10'da antrenman ekle"], ["pre", 4815], ["ai", 4820], ["speak", 4900], ["aiDone", 7300], ["saved", 7600], ["reply", 7610, "local"], ["speak", 7700],
];
const stepMs = (l, name) => TM.timingSteps(l[0]).steps.find((s) => s.name === name)?.ms;
group("Süre kaydı")([
  ["sesli ekleme kaydedilir", { desc: "1 kayıt, sesli, metin", fn: () => scene(voiceAdd), ok: (l) => l.length === 1 && l[0].voice && l[0].text === "yarın 10'da antrenman ekle" }],
  ["toplam sustuğun andan okumaya", { desc: "7700 − 2000 = 5700 ms", fn: () => TM.timingSteps(scene(voiceAdd)[0]).total, ok: (r) => r === 5700 }],
  ["susmanın beklenmesi", { desc: "1600 ms", fn: () => stepMs(scene(voiceAdd), "stop"), ok: (r) => r === 1600 }],
  ["yükleme ve yazıya çevirme", { desc: "1000 ms", fn: () => stepMs(scene(voiceAdd), "text"), ok: (r) => r === 1000 }],
  ["yapay zeka cevabı", { desc: "ön cevap okunmasından yapay zekanın bitişine 2400 ms; yapay zeka toplam 2480", fn: () => { const l = scene(voiceAdd); return [stepMs(l, "aiDone"), TM.timingSteps(l[0]).ai]; }, ok: (r) => r[0] === 2400 && r[1] === 2480 }],
  ["ön cevap ve cevap okuması ayrı", { desc: "preSay 4900, speak 7700", fn: () => scene(voiceAdd)[0].marks, ok: (m) => m.preSay === 4900 && m.speak === 7700 }],
  ["yapay zeka cevapladı", { desc: "sonucu uygulama söylese de 'ai'", fn: () => scene(voiceAdd)[0].engine, ok: (r) => r === "ai" }],
  ["konuşma toplama girmez", { desc: "Konuşman adımı user", fn: () => TM.timingSteps(scene(voiceAdd)[0]).steps.find((s) => s.name === "voiceEnd"), ok: (s) => s?.user && s.ms === 2000 }],
  ["yerel sayfa açma", { desc: "yazılı, Yerel, toplam 200 ms", fn: () => { const l = scene([["startText", 1000, "planları aç"], ["reply", 1001, "local"], ["speak", 1200]]); return [l[0].voice, l[0].engine, TM.timingSteps(l[0]).total]; }, ok: (r) => !r[0] && r[1] === "local" && r[2] === 200 }],
  ["sesli yanıt kapalı", { desc: "okuma olmadan da kayıt; toplam cevaba kadar", fn: () => TM.timingSteps(scene([["startText", 0, "x"], ["ai", 10], ["aiDone", 2010], ["reply", 2020]])[0]).total, ok: (r) => r === 2020 }],
  ["cevapsız komut kaydedilmez", { desc: "kullanıcı devam etti, yeniden soruldu", fn: () => scene([["start", 0, "yarın 10'da"], ["ai", 5], ["start", 900, "yarın 10'da antrenman, Ali de gelsin"], ["reply", 3000], ["speak", 3100]]), ok: (l) => l.length === 1 && /Ali/.test(l[0].text) }],
  ["eski dinleme yazılı komuta karışmaz", { desc: "yazılı komutta dinleme anı yok", fn: () => scene([["speech", 0, ["listen"]], ["speech", 500, ["text"]], ["startText", 800, "planları aç"], ["reply", 801], ["speak", 900]])[0].marks, ok: (m) => m.listen == null && m.text == null }],
  ["en çok 20 komut", { desc: "25 komuttan son 20 kalır, en yenisi önce", fn: () => scene(Array.from({ length: 25 }, (_, i) => [["startText", i * 100, `k${i}`], ["reply", i * 100 + 50]]).flat()), ok: (l) => l.length === 20 && l[0].text === "k24" }],
  ["kopyalanan metin", { desc: "toplam ve adımlar yazılı", fn: () => TM.timingText(scene(voiceAdd)), ok: (s) => /toplam 5,7 sn/.test(s) && /Susmanın beklenmesi: 1,6 sn/.test(s) && /Kaydetme: 300 ms/.test(s) }],
]);
TM.timingTest({});

// Envanter cümleleri (invWords.js): her yerde "envanter/demirbaş/stok" geçince, envanter sayfasında başka işe benzemeyen her cümle
const IW = await import("@/features/inventory/invWords");
const WI = (want, here = false) => ({ desc: `${want ? "envanter" : "envanter değil"}${here ? " (sayfada)" : ""}`, fn: (s) => IW.wantsInventory(s, here) && !localNavigate(s, { names: navNames }), ok: (r) => r === want });
const NI = { desc: "Envanter sayfası açılır", fn: (s) => localNavigate(s, { names: navNames }), ok: (r) => r?.page === "inventory" };
group("Envanter (tanıma)")([
  ["envantere 3 optimist teknesi ekle", WI(true)], ["yelken kulübü envanterinden 2 şamandıra çıkar", WI(true)], ["kulüp envanterinde kaç telsiz var", WI(true)],
  ["demirbaşlara lazer yazıcı ekle", WI(true)], ["stokta kaç can yeleği var", WI(true)], ["envanterdeki optimist 4'ü sil", WI(true)],
  ["2 can yeleği kayboldu", WI(true, true)], ["optimist 4 bakımda", WI(true, true)], ["yazıcı ekle", WI(true, true)],
  ["yarın 10'da antrenman ekle", WI(false, true)], ["Ali'ye mesaj at", WI(false, true)], ["planlara git", WI(false, true)],
  ["yarın 10'da antrenman ekle", WI(false)], ["2 can yeleği kayboldu", WI(false)], ["envanteri aç", WI(false)], ["envanter sayfasına git", WI(false)],
  ["envanteri aç", NI], ["envanter", NI], ["demirbaşları göster", NI],
  // "plan yap / hatırlat / not al" denince envanter sözcüğü geçse de kayıt (Seyhun'un cümlesi, 2026-10-06)
  ["yarın akşam 5'e plan yap envanter listesi çıkarılacak", WI(false)], ["envanter sayımını hatırlat", WI(false)], ["not al envanter eksik", WI(false)],
  ["Ali'ye yaz envanter listesini çıkarsın", WI(false)], ["envantere 3 telsiz ekle", WI(true)], ["envanterden 2 şamandıra çıkar, Ali'ye de hatırlat", WI(true)],
]);

// ---- Mesaj + WhatsApp: yalnız mesaj istenince kayıt açılmaz; WhatsApp isteği tanınır ----
group("Mesaj ve WhatsApp")([
  ["Perşembe, Cuma günü antrenman olacak. Saat antrenman başlangıç 9.30. Sporculara gönder.", Fa("yalnız mesaj: kayıt istenmiyor", () => !ST.wantsRecord("Perşembe, Cuma günü antrenman olacak. Saat antrenman başlangıç 9.30. Sporculara gönder."))],
  ["Ali'ye yaz ve yarın 10'a toplantı ekle", Fa("ekle: kayıt da isteniyor", () => ST.wantsRecord("Ali'ye yaz ve yarın 10'a toplantı ekle"))],
  ["Gökhan'a yaz, takvime de ekle", Fa("takvim: kayıt da isteniyor", () => ST.wantsRecord("Gökhan'a yaz, takvime de ekle"))],
  ["sporculara ve WhatsApp grubuna da gönder", Fa("WhatsApp istendi", () => ST.wantsWhatsApp("sporculara ve WhatsApp grubuna da gönder"))],
  ["vatsap grubuna da at", Fa("ses tanıma yazışı da WhatsApp", () => ST.wantsWhatsApp("vatsap grubuna da at"))],
  ["sporculara gönder", Fa("WhatsApp istenmedi", () => !ST.wantsWhatsApp("sporculara gönder"))],
  ["paylaşım menüsü açılmaz", Fa("WhatsApp doğrudan açılır, metin panoya", () => { const got = {}; const r = shareText("9.30 antrenman", { share: () => { got.s = 1; return Promise.resolve(); }, clipboard: { writeText: (t) => { got.c = t; return Promise.resolve(); } } }, (u) => { got.u = u; }); return r === "link" && !got.s && got.c === "9.30 antrenman" && got.u === "https://wa.me/?text=9.30%20antrenman"; })],
  ["WhatsApp sporcular grubuna gönder", Fa("yalnız WhatsApp", () => waMode("WhatsApp sporcular grubuna gönder") === "only")],
  ["vatsap grubuna at", Fa("yalnız WhatsApp (ses tanıma yazışı)", () => waMode("vatsap grubuna at") === "only")],
  ["sporculara ve WhatsApp grubuna da gönder", Fa("uygulama + WhatsApp", () => waMode("sporculara ve WhatsApp grubuna da gönder") === "also")],
  ["sporculara gönder, WhatsApp grubuna da at", Fa("uygulama + WhatsApp", () => waMode("sporculara gönder, WhatsApp grubuna da at") === "also")],
  ["hem uygulamada hem WhatsApp'ta paylaş", Fa("uygulama + WhatsApp", () => waMode("hem uygulamada hem WhatsApp'ta paylaş") === "also")],
  ["sporculara gönder (WhatsApp yok)", Fa("WhatsApp istenmedi", () => waMode("sporculara gönder") === "")],
  ["grup bağlantısı", Fa("davet bağlantısı temizlenir", () => cleanWaLink("https://chat.whatsapp.com/AbCdEf1234567890xyz?mode=gi_t") === "https://chat.whatsapp.com/AbCdEf1234567890xyz" && !cleanWaLink("https://wa.me/905321112233"))],
  ["Sporcular ↔ Sporcular, Aile ↔ Aileler", Fa("uygulama grubu WhatsApp grubuyla eşleşir", () => { const g = [{ name: "Sporcular", link: "https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAA" }, { name: "Aileler", link: "https://chat.whatsapp.com/BBBBBBBBBBBBBBBBBBBB" }]; return waGroupFor("Sporcular", g).endsWith("AAAA") && waGroupFor("Aile", g).endsWith("BBBB") && !waGroupFor("Ekip", g); })],
  ["aynı ad iki kez", Fa("tekrar eden grup ve bozuk bağlantı atılır", () => cleanWaGroups([{ name: "Sporcular", link: "chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAA" }, { name: "sporcu grubu", link: "https://chat.whatsapp.com/CCCCCCCCCCCCCCCCCCCC" }, { name: "Ekip", link: "x" }]).length === 1)],
  ["grup bağlantısı kayıtlıysa", Fa("grup açılır, metin panoya", () => { const got = {}; const r = shareText("9.30", { share: () => { got.s = 1; return Promise.resolve(); }, clipboard: { writeText: (t) => { got.c = t; return Promise.resolve(); } } }, (u) => { got.u = u; }, "https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAA"); return r === "group" && got.c === "9.30" && !got.s && got.u.includes("chat.whatsapp.com"); })],
  ["paylaşım yoksa", Fa("WhatsApp sohbet seçimi açılır", () => { let u = ""; const r = shareText("a b", {}, (x) => { u = x; }); return r === "link" && u === "https://wa.me/?text=a%20b"; })],
  ["sporculara gönder (yapay zeka)", Fa("Sporcular grubuna gider", () => AIA.parseAssistant({ intent: "message", message: "Tamam.", send: { to: "sporculara", text: "Perşembe ve cuma antrenman var, başlangıç 9.30." } }, [], ["Sporcular", "Ali Kök"]).send?.to === "Sporcular")],
]);

// Açık sohbetin bağlamı: hazırlanan mesaj taslağına "şunu da ekle" gibi değişiklikler (lib/convoContext.js)
const ED = (desc) => ({ desc, fn: CX.isDraftEdit, ok: (r) => r === true });
const NE = (desc) => ({ desc, fn: CX.isDraftEdit, ok: (r) => r === false });
group("Sohbet bağlamı (mesaj taslağı)")([
  ["şunu da ekle, saat 9.30'da iskelede olsunlar", ED("taslağa ekleme")],
  ["can yeleklerini de getirsinler diye ekle", ED("taslağa ekleme")],
  ["mesaja ekle: öğle yemeği getirsinler", ED("mesaj kelimesi")],
  ["saati 10 yap", ED("değişiklik")],
  ["yarın yerine cuma olsun", ED("değişiklik")],
  ["sonuna teşekkürler ekle", ED("sonuna")],
  ["daha kısa yaz", ED("kısalt")],
  ["ayrıca öğle yemeği de getirsinler", ED("ayrıca")],
  ["mesajı daha kibar yap", ED("kibar")],
  ["yarın 10'da antrenman planı ekle", NE("yeni plan: taslak değil")],
  ["listeye su ekle", NE("alışveriş listesi")],
  ["görevlere tekne bakımı ekle", NE("görev")],
  ["takvime de ekle", NE("takvim")],
  ["yoklamayı aç", NE("sayfa")],
  ["tamam", NE("onay sözü")],
  ["teşekkürler", NE("teşekkür")],
  ["geçmiş", Fa("ön cevaplar gitmez, toplam 1500 karakteri geçmez, en yeni kalır", () => {
    const turns = [...Array(8)].map((_, i) => ({ role: i % 2 ? "assistant" : "user", text: `${i} ${"x".repeat(500)}` }));
    turns.push({ role: "assistant", text: "Tamam.", pre: true });
    const h = CX.historyFor(turns);
    return h.length <= 6 && h.every((t) => t.text !== "Tamam.") && h.map((t) => t.text).join("").length <= 1500 && h.at(-1).text.startsWith("7");
  })],
  ["taslak bölümü", Fa("alıcı, durum ve metin yapay zekaya gider", () => {
    const b = CX.draftBlock(CX.draftFor({ to: "sporculara", label: "Sporcular", text: "Perşembe 9.30 antrenman var.", wa: "only", state: "pending" }));
    return /AÇIK MESAJ TASLAĞI/.test(b) && /Alıcı: Sporcular \(yalnız WhatsApp grubu\)/.test(b) && /onay bekliyor/.test(b) && /Perşembe 9\.30/.test(b);
  })],
  ["gönderilmiş taslak", Fa("durum gönderildi", () => /Durum: gönderildi/.test(CX.draftBlock(CX.draftFor({ label: "Ali Kök", text: "Yarın gel.", state: "sent" }))))],
  ["boş taslak", Fa("bölüm yazılmaz", () => CX.draftBlock(CX.draftFor({ label: "Ali", text: " " })) === "" && CX.draftBlock(null) === "")],
  ["uzun taslak", Fa("metin 1000 karakterde kesilir", () => CX.draftFor({ label: "Ali", text: "a".repeat(3000) }).text.length <= 1000)],
  ["eski sürümün uzun geçmişi", Fa("sunucuda da kısaltılır", () => CX.historyBlock([...Array(6)].map(() => ({ role: "user", text: "y".repeat(400) }))).length <= 1800)],
  ["aynı alıcı", Fa("Sporcular grubuna = sporcular", () => CX.sameTo("Sporcular grubuna", "sporcular") && !CX.sameTo("Ali", "Ayşe") && !CX.sameTo("", ""))],
  ["ön cevap", Fa("yalnız Tamam, plan ipucu yok", () => { const p = CX.editPrecue(); return p.line === "Tamam." && !/tür=plan/.test(p.hint) && /TASLA/.test(p.hint); })],
  ["değişen taslak (yapay zeka)", Fa("yeni metin aynı alıcıya, kayıt yok", () => { const r = AIA.parseAssistant({ intent: "message", message: "Tamam.", send: { to: "Sporcular", text: "Perşembe 9.30 antrenman var, can yeleklerinizi getirin." }, items: [] }, [], ["Sporcular"]); return r.send?.to === "Sporcular" && /can yelek/.test(r.send.text) && !r.items.length; })],
]);

const { extraNote } = await import("@/lib/steps");
const { cleanTitle } = await import("@/lib/titleClean");
const titleOf = (s) => cmd(s)?.items?.[0]?.title;
group("Temiz başlık ve sorusuz ekleme")([
  ["bana yarın akşam için bir akşam yemeği planla", Y("başlık 'Akşam yemeği' (bana yok)", titleOf, "Akşam yemeği")],
  ["bana yarın akşam 8'de akşam yemeği planla", T("saat 20:00, başlık 'Akşam yemeği'", (r) => r?.items?.[0]?.time === "20:00" && r.items[0].title === "Akşam yemeği")],
  ["benim için yarın 10'da antrenman ekle", Y("başlık 'Antrenman'", titleOf, "Antrenman")],
  ["yarın sabah kahvaltısı planla, 9'da", T("'sabah kahvaltısı' saat sözü sayılmaz", (r) => /kahvaltı/i.test(r?.items?.[0]?.title || ""))],
  ["Bana için akşam yemeği", Y("yapay zekanın başlığı da temizlenir", cleanTitle, "Akşam yemeği")],
  ["Lütfen veli toplantısı planla", Y("lütfen ve planla atılır", cleanTitle, "Veli toplantısı")],
  ["Bir haftalık kamp", Y("baştaki 'bir' atılır", cleanTitle, "Haftalık kamp")],
  ["bana", Y("hepsi dolgu ise başlık boş kalmaz", cleanTitle, "bana")],
  ["yapay zeka başlığı", Fa("toDrafts 'bana' ile başlamaz", () => AIA.parseAssistant({ intent: "create", message: "", items: [{ type: "plan", title: "Bana akşam yemeği", date: "2026-10-07", time: "20:00" }] }).items[0]?.title === "Akşam yemeği")],
  ["Akşam 8 için planı oluşturuyorum, onaylıyor musun?", Y("onay sorusu 'Ekledim'in önüne gelmez", extraNote, "")],
  ["Tamam. Kaydedeyim mi?", Y("tamam ve soru atılır", extraNote, "")],
  ["O saatte Antrenman planı da var. Kaydedeyim mi?", Y("ek bilgi kalır", extraNote, "O saatte Antrenman planı da var. ")],
  ["Rüzgâr 22 knot olacak.", Y("rüzgâr bilgisi kalır", extraNote, "Rüzgâr 22 knot olacak. ")],
]);
