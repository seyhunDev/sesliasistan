// Yerel (yapay zekasız) asistan kuralları: insanların söyleyebileceği farklı cümlelerle.
// Yalnızca hesaplama yapar; veritabanına ve yapay zekaya dokunmaz.
import { localCommand, isMeeting, localCreate } from "@/lib/commands";
import { localReceipt, isYes, isNo, localQuery, looksLikeCreate, isEnd } from "@/lib/assistantLocal";
import { parseBirthday } from "@/lib/birthdayParse";
import { messageIntent, confirmWord } from "@/lib/ai/messageRules";
import { localNavigate } from "@/lib/nav";
import { todayStr } from "@/lib/utils/format";
import { addDate } from "@/lib/ai/digest";
import { bestVoice, speechChunks, speechText } from "@/lib/speech/speakText";

const today = todayStr(), tom = addDate(today, 1), y1 = addDate(today, -2);
const data = {
  plans: [
    { id: "p1", title: "Optimist antrenmanı", date: today, time: "17:00", place: "Kulüp iskelesi", cat: "Antrenman" },
    { id: "p2", title: "Yönetim kurulu toplantısı", date: tom, time: "10:00", cat: "Toplantı" },
    { id: "p3", title: "Bölge yarışı", date: addDate(today, 3), time: "", cat: "Yarış" },
  ],
  tasks: [
    { id: "t1", title: "Tekneleri hazırla", due: today, done: false },
    { id: "t2", title: "Römork lastiklerini kontrol et", due: tom, done: false },
    { id: "t3", title: "Motor yağını değiştir", due: y1, done: false },
    { id: "t4", title: "Yelken onarımı için teklif al", due: tom, done: false },
    { id: "t5", title: "Yelken kılıfını yıka", due: tom, done: false },
  ],
  notes: [],
};
const results = [];
const group = (name) => (cases) => {
  for (const [say, check, note] of cases) {
    let got, ok;
    try { got = check.fn(say); ok = check.ok(got); } catch (e) { got = "HATA: " + e.message; ok = false; }
    results.push({ group: name, say, ok, expect: check.desc, got: typeof got === "string" ? got : JSON.stringify(got)?.slice(0, 160), note: note || "" });
  }
};
const cmd = (s) => localCommand(s, data, today);
const T = (desc, ok) => ({ desc, fn: cmd, ok });
const isType = (type, more = () => true) => T(type, (r) => r?.type === type && more(r));
const toAI = T("yapay zekaya gider (yerelde çözülmez)", (r) => r === null);

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
group("Sayfa açma (localCommand)")([["planları aç", isType("navigate", (r) => r.page === "plans")], ["şey ya bi yoklamayı açar mısın", isType("navigate", (r) => r.page === "attendance")], ["ayarlar", isType("navigate", (r) => r.page === "settings")], ["takvime geç lütfen", isType("navigate", (r) => r.page === "calendar")]]);

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
const Y = (desc, fn, exp) => ({ desc, fn, ok: (r) => r === exp });
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
  ["planları aç", P("plans")], ["planlara git", P("plans")], ["planlar sayfası", P("plans")], ["planlarımı göster", P("plans")], ["etkinlikleri aç", P("plans")],
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
  ["ekibe yaz yarın antrenman yok", null], ["Ali'ye mesaj gönder", null], ["plan ekle yarın 10'da toplantı", null], ["not al malzeme odası dolu", null],
  ["kaç görevim var", null], ["açık görevler neler", null], ["fiş yükle", null], ["tekneleri hazırla görevini tamamla", null], ["aileye haber ver akşam geç geleceğim", null],
  ["planlar kaç tane", null], ["sporcular bugün geldi mi", null], ["ayarlar nerede", null],
];
for (const [s, exp] of cases) {
  const got = localNavigate(s, { names: names2 });
  results.push({ group: "Sayfa/sohbet açma (söyleyişler)", say: s, ok: JSON.stringify(got) === JSON.stringify(exp), expect: JSON.stringify(exp), got: JSON.stringify(got), note: "" });
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

// Whisper'ın sessizlikte uydurduğu cümleler atılır; gerçek komut kalır
const { dropHallucination } = await import("@/lib/speech/hallucination");
const HP = "Spor kulübü, yelken, antrenman, yarış, regat, ayak, Optimist, ILCA, Laser.";
const HL = (want) => ({ desc: want ? `kalır: ${want}` : "boş", fn: (s) => dropHallucination(s, HP), ok: (r) => r === want });
group("Uydurma metin ayıklama")([
  ["Altyazı M.K.", HL("")], ["İzlediğiniz için teşekkür ederim.", HL("")], ["Abone olmayı unutmayın!", HL("")], ["[Müzik]", HL("")],
  ["Bir sonraki videoda görüşmek üzere.", HL("")], ["Spor kulübü, yelken, antrenman, yarış, regat", HL("")],
  ["Yoklamayı aç. İzlediğiniz için teşekkür ederim.", HL("Yoklamayı aç.")], ["Teşekkürler.", HL("Teşekkürler.")],
  ["Optimist yarışına git", HL("Optimist yarışına git")], ["yarın antrenman ekle", HL("yarın antrenman ekle")],
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

// Ek bildirimler (notifyExtra.js): doğum günü, rüzgâr, haftalık özet
const NX = await import("@/lib/notifyExtra");
const F = (desc, fn) => ({ desc, fn, ok: (r) => r === true });
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
// Sesli okunuş (cihaz sesi): metin Türkçe okunuşa çevrilir, en doğal ses seçilir
const SP = (want) => ({ desc: want, fn: speechText, ok: (r) => r === want });
group("Sesli okunuş")([
  ["Yarın saat 14:30'da antrenman var 🚤", SP("Yarın saat on dört otuzda antrenman var")],
  ["Rüzgar 12 kt, 18°C.", SP("Rüzgar 12 knot, 18 derece.")],
  ["Foça yarışı 7-11 Ekim'de.", SP("Foça yarışı 7 ile 11 Ekim'de.")],
  ["Otel kişi başı 3.500 TL (4 gece).", SP("Otel kişi başı 3.500 lira, 4 gece.")],
  ["**Toplam:** ₺12.400", SP("Toplam: 12.400 lira")],
  ["Toplantı 2026-10-07 saat 09:05", SP("Toplantı 7 Ekim 2026 saat dokuz sıfır beş")],
  ["%20 indirim", SP("yüzde 20 indirim")],
  ["rüzgar 25 km/s", SP("rüzgar saatte 25 kilometre")],
  ["Optimist/ILCA", SP("Optimist ya da ILCA")],
  ["uzun cümle bölünür", { desc: "160 harften kısa parçalar", fn: () => speechChunks("Yarın ".repeat(20) + "toplantı var, " + "tekneler hazırlanacak ".repeat(8) + "ve bitti."), ok: (r) => r.length > 1 && r.every((x) => x.length <= 160) }],
]);
const VOICES = [
  { name: "Eddy", lang: "tr-TR", voiceURI: "com.apple.eloquence.tr-TR.Eddy" },
  { name: "Yelda", lang: "tr-TR", voiceURI: "com.apple.voice.compact.tr-TR.Yelda", localService: true },
  { name: "Yelda", lang: "tr-TR", voiceURI: "com.apple.voice.premium.tr-TR.Yelda", localService: true },
  { name: "Samantha", lang: "en-US", voiceURI: "com.apple.voice.compact.en-US.Samantha" },
];
const BV = (list, uri, want) => ({ desc: want || "ses yok", fn: () => bestVoice(list, uri)?.voiceURI || null, ok: (r) => r === want });
group("Ses seçimi")([
  ["Premium varsa o", BV(VOICES, "", "com.apple.voice.premium.tr-TR.Yelda")],
  ["yalnız eğlence + kompakt: kompakt", BV(VOICES.slice(0, 2), "", "com.apple.voice.compact.tr-TR.Yelda")],
  ["kullanıcının seçtiği", BV(VOICES, "com.apple.voice.compact.tr-TR.Yelda", "com.apple.voice.compact.tr-TR.Yelda")],
  ["Türkçe ses yok", BV(VOICES.slice(3), "", null)],
  ["Chrome: Google (internet) yerine cihazdaki Yelda", BV([{ name: "Google Türkçe", lang: "tr-TR", voiceURI: "Google Türkçe", localService: false }, { name: "Yelda", lang: "tr-TR", voiceURI: "Yelda", localService: true }], "", "Yelda")],
  ["Mac Chrome: Gelişmiş ad ile", BV([{ name: "Yelda", lang: "tr-TR", voiceURI: "Yelda", localService: true }, { name: "Yelda (Gelişmiş)", lang: "tr-TR", voiceURI: "Yelda (Gelişmiş)", localService: true }], "", "Yelda (Gelişmiş)")],
]);

export default results;
