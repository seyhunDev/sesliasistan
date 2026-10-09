// Genel tarama (2026-10-09): ana asistanın gerçekçi, sesle söylenmiş Türkçe cümleleri yapay zekasız nereye gönderdiği.
// Çalıştırma (proje klasöründen):
//   node --no-warnings --import ./scripts/asistan-test/tarama/kayit.mjs scripts/asistan-test/tarama/tara.mjs [--hepsi] [--json dosya]
// Uygulamanın kendi saf işlevleri sınanır: routeOf/routesOf (lib/assistRoute.js), looksMulti/localPlan/clausesOf/orderPlan
// (lib/taskPlan.js), AssistantSheet'teki flowOf'un taklidi, splitChain (lib/chain.js), bekleme yazıları (lib/assistTasks.js).
// Veritabanına dokunmaz, yapay zekaya gitmez. Çıktı: ekrana özet + yanlışlar (--hepsi ile her cümle).
import { writeFileSync } from "node:fs";
import { routeOf } from "@/lib/assistRoute";
import { messageFirst } from "@/lib/steps";
import { actCount, looksMulti, localPlan, orderPlan, clausesOf } from "@/lib/taskPlan";
import { splitChain } from "@/lib/chain";
import { TASKS, waitLines, waitStages, aboutLine } from "@/lib/assistTasks";
import { wantsPost } from "@/features/posts/postModel";
// assistRace.js tarayıcı modülleri (AuthProvider) yükler; wantsRace = wantsRaceText(text, known) ile aynı
import { wantsRaceText as wantsRace } from "@/features/athletes/raceNav";
import { wantsAttendance } from "@/features/athletes/access";
import { absentNotifyCommand, incomeCommand, athleteCommand, duesCommand, receiptPayCommand, callCommand } from "@/lib/assistMore";
import { invoiceCommand } from "@/lib/invoices";
import { wantsInventory } from "@/features/inventory/invWords";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsLog } from "@/lib/trainingLog";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { shopCommand } from "@/features/shop/shopWords";
import { localNavigate } from "@/lib/nav";

const TODAY = "2026-10-09";
const names = ["Ali Kaya", "Ayşe Demir", "Mustafa Yılmaz", "Enes Çelik", "Mehmet Şahin", "Gökhan Arslan", "Zeynep Ak", "Emre Koç"];
const races = [
  { id: "r1", name: "Foça TYF Ligi 1. Ayak", district: "Foça", startDate: "2026-10-26", endDate: "2026-10-31" },
  { id: "r2", name: "Cumhuriyet Kupası", district: "Dikili", startDate: "2026-10-29", endDate: "2026-10-30" },
  { id: "r3", name: "Çeşme Optimist Kupası", district: "Çeşme", startDate: "2026-11-07", endDate: "2026-11-11" },
];
const raceNames = races.map((r) => r.name);

// Bağlam: ana hesap, sporcu ve yoklama yetkisi; sayfa değişebilir
function ctxOf(o = {}) {
  const path = o.path || "/";
  const cur = /^\/athletes\/races\/([\w-]+)$/.exec(path)?.[1];
  return {
    owner: true, isStaff: false, racer: true, att: true, athleteSide: false, path, today: TODAY, races, raceNames, names,
    logHere: path === "/training", invPage: path.startsWith("/inventory"), attHere: path === "/athletes/attendance",
    curRace: cur && cur !== "new" ? cur : "", onPost: path.startsWith("/posts/"), shop: true, askedMore: !!o.askedMore,
    plans: [], tasks: [], notes: [],
  };
}
const route = (s, o) => routeOf(s, ctxOf(o));

// AssistantSheet `flowOf` taklidi (racer = true; öğrenme kaydı boş, learnedKind null)
function flowOf(x) {
  if (wantsPost(x)) return "post";
  if (wantsRace(x, raceNames)) return "race";
  if (wantsAttendance(x, false)) return "attendance";
  if (absentNotifyCommand(x)) return "absent";
  if (incomeCommand(x, TODAY) || /(aidat\p{L}*|ödemesini) (yaptı|verdi|ödedi)|nakit (verdi|ödedi|getirdi)/iu.test(x)) return "income";
  if (athleteCommand(x) || duesCommand(x)) return "athlete";
  if (invoiceCommand(x)) return "invoice";
  if (wantsInventory(x, false)) return "inventory";
  if (wantsEvent(x)) return "event";
  if (wantsLog(x)) return "log";
  if (wantsSchedule(x, false)) return "schedule";
  if (shopCommand(x)) return "shopping";
  if (receiptPayCommand(x)) return "receipt";
  if (callCommand(x)) return "call";
  if (localNavigate(x, { names })) return "nav";
  return null;
}
// Uygulamada run(): bekleyen soru yokken önce görev listesi denetimi
function multiOf(s) {
  if (messageFirst(s)) return { multi: false }; // uygulamada da: mesajla başlayan cümle görev listesine bölünmez
  const parts = splitChain(s);
  const viaSplit = parts.length > 1 && parts.some(flowOf);
  const multi = viaSplit || looksMulti(s, flowOf) || (actCount(s) > 1 && (flowOf(s) || clausesOf(s).some(flowOf)));
  if (!multi) return { multi: false };
  // Yapay zekasız: splitChain parçaları (sıra korunur, her parça run() ile kendi yoluna) ya da localPlan + orderPlan
  if (parts.length > 1) return { multi: true, how: "splitChain", steps: parts.map((p) => ({ say: p, kind: kindOfRoute(route(p)), route: route(p) })) };
  const lp = localPlan(s, flowOf);
  if (!lp) return { multi: true, how: "yok", steps: [] };
  return { multi: true, how: "localPlan", steps: orderPlan(lp).map((t) => ({ say: t.say, kind: t.kind, route: route(t.say) })) };
}
// Yolun görev listesi türü
function kindOfRoute(r) {
  if (["race", "raceOpen", "raceHere", "hotel"].includes(r)) return "race";
  if (r === "navigate") return "nav";
  if (r === "dues" || r === "athlete" || r === "athleteOpen") return "athlete";
  if (r === "shopping" || r === "shopping(mark)") return "shopping";
  if (r === "receiptPay") return "receipt";
  if (["attendance", "income", "post", "invoice", "inventory", "event", "log", "schedule", "call"].includes(r)) return r;
  if (r === "postEdit") return "post";
  return "other";
}
// Görev türü → o işin cümlesi tek başına söylenince kabul edilen yollar
const KIND_ROUTES = {
  race: ["race", "raceOpen", "raceHere", "hotel"], attendance: ["attendance"], income: ["income"], athlete: ["athlete", "dues", "athleteOpen"],
  post: ["post", "postEdit"], invoice: ["invoice", "invoiceTask"], inventory: ["inventory"], event: ["event"], log: ["log"], schedule: ["schedule"],
  shopping: ["shopping", "shopping(mark)"], receipt: ["receiptPay"], call: ["call"], nav: ["navigate"], other: ["ai", "local:navigate", "navigate"],
};

// ---------------------------------------------------------------- Tek işli cümleler
// [kategori, cümle, beklenen yol(lar), bağlam?]  "ai" = ana yapay zeka (tasarım gereği doğru)
const AI = "ai";
const S = [];
const add = (cat, want, list, o) => list.forEach((s) => S.push({ cat, s, want: [].concat(want), o: o || {} }));

add("Plan / takvim", AI, [
  "yarın saat 10'da antrenman ekle", "cumartesi sabah 9 da iskelede buluşma takvime koy", "haftaya salı 18:00 veli toplantısı ekle",
  "pazartesi öğleden sonra 3'te tekne bakımı planla", "15 Ekim'de saat 11'de federasyon toplantısı var takvime yaz", "bugün akşam altıda antreman var ekler misin",
  "her salı ve perşembe 17'de optimist antrenmanı", "her cumartesi 10'da ILCA antrenmanı ekle", "yarınki antrenmanı 11'e al", "cuma günkü toplantıyı pazartesiye ertele",
  "yarınki antrenmanı iptal et rüzgar çok sert", "pazar günü Foça'ya gidiyoruz takvime ekle", "perşembe 14:30 belediyede görüşme",
]);
add("Görev", AI, [
  "Ali'ye motoru kontrol etmesini hatırlat", "görev ekle römork lastiklerini kontrol et", "Gökhan'a görev ver şamandıraları saysın cumaya kadar",
  "bana hatırlat cuma günü sigortayı yenile", "yapılacaklara ekle can yeleklerini yıka", "motor yağı görevini tamamla", "tekneleri hazırla görevi bitti",
  "Mehmet'e görev ver yelkenleri katlasın", "yarına kadar kulüp kapısının kilidini değiştir görevi oluştur",
]);
add("Not", AI, [
  "not al malzeme odası dolu", "not düş iskele lambası yanmıyor", "notlara ekle yeni telsiz şifresi 4455", "not olarak kaydet botun pervanesi çizik",
  "not al dünkü antrenmanda rüzgar çok sertti", "malzeme odası notu yapıldı",
]);
add("Mesaj (kişi)", AI, [
  "Ali'ye yaz yarın 9'da iskelede olsun", "Ayşe'ye söyle toplantı ertelendi", "Mustafa'ya mesaj at antrenmana gelmedi diye merak ettim",
  "Enes'e yaz aidatını unutmasın", "Gökhan'a mesaj gönder botu yıkasın", "Mehmet'e haber ver yarın gelmesin", "Ali'ye yaz faturayı ödedim",
  "Ayşe'ye söyle Instagram gönderisini beğensin", "Zeynep'e yaz yoklamada gelmedi görünüyor", "Emre'ye mesaj at kamp planı yapıyoruz",
]);
add("Mesaj (grup)", AI, [
  "sporculara söyle bugün antrenman iptal", "ekibe yaz yarın sekizde iskelede toplanıyoruz", "velilere mesaj at cumartesi antrenman var",
  "herkese haber ver bugün kulüp kapalı", "velilere yaz aidat son günü 10 Ekim", "sporculara yaz dünkü antrenmanda 14 knot vardı iyi iş çıkardınız",
  "Foça yarışına katılanlara mesaj at otel değişti", "velilere yaz gelmeyenler cumartesi telafi yapacak",
]);
add("Mesaj (WhatsApp)", AI, [
  "Ali'ye WhatsApp'tan yaz yarın gelsin", "Gökhan'a vatsaptan mesaj at motoru getirsin", "velilere WhatsApp'tan yaz kayıtlar başladı", "Mustafa'nın babasına WhatsApp'tan yaz antrenman 5'te",
]);
add("Soru", AI, [
  "yarın ne var", "bu hafta neler var", "bugün hangi görevler var", "kaç görevim var", "geciken görev var mı", "yarın rüzgar kaç knot",
  "cumartesi hava nasıl olacak", "dün antrenmana kimler geldi", "antrenmana Ali geldi mi", "kaç sporcumuz var", "bu ay ne kadar fiş harcadım",
  "en son eklediğim not neydi", "yarın toplantı var mı", "Foça yarışına kaç gün kaldı",
]);
add("Soru (aidat / ödeme)", "dues", ["bu ay kim aidat ödemedi", "aidatını ödemeyenler kim", "Ekim aidatını kimler ödemedi"]);
add("Soru (aidat / ödeme)", "payee", ["bu ay ne kadar ödeme aldım", "geçen ay kaç ödeme geldi", "eylülde ne kadar para geldi"]);
add("Aidat hatırlatma", "dues", ["aidat hatırlatması gönder", "aidatını ödemeyenlere hatırlat", "velilere aidat hatırlatması yap"]);
add("Nakit ödeme / bağış", "income", [
  "Ali Kaya'nın Ekim aidatı nakit 1500 alındı", "Enes aidatını nakit verdi", "Mustafa Yılmaz'dan Ekim aidatı 1500 lira nakit aldım",
  "Ahmet beyden 2000 lira bağış geldi", "kano eğitimi için 3 bin lira nakit aldım", "Mehmet Şahin aidatını elden ödedi", "Enes Çelik Ekim aidatını nakit getirdi",
]);
add("Yoklama (başka sayfada)", "attendance", [
  "yoklama al Ali ve Ayşe geldi", "bugün antrenmana Emre gelmedi", "yoklama Zeynep izinli kalanlar geldi", "bugün antrenmana Mustafa katıldı",
  "yoklamaya ekle Mehmet geldi", "dünkü antrenmana Enes gelmedi yoklamaya yaz", "yoklama Ali raporlu", "bugün antrenmana Ali Ayşe ve Mustafa geldi",
  "Mustafa geldi yoklamaya ekle",
]);
add("Yoklama (yoklama sayfasında)", "attendance", [
  "Ali ve Zeynep geldi Emre izinli", "Mehmet raporlu", "kalanlar gelmedi", "Mustafa geldi", "Enes de geldi", "Ayşe gelmedi Ali geldi",
], { path: "/athletes/attendance" });
add("Gelmeyenlere haber", "absent", ["gelmeyenlerin velilerine haber ver", "dün gelmeyenlerin velilerine bildir"]);
add("Antrenman günlüğü", "log", [
  "dün 14 knot poyrazda start çalıştık 2 saat sürdü", "antrenman günlüğüne yaz bugün tramola çalıştık", "dünkü antrenmanda 12 not poyraz vardı",
  "antrenman günlüğü oluştur", "bugünkü antrenman çok iyi geçti 18 knot lodos vardı rüzgar üstü çalıştık", "antremanı kaydet bugün 10 knot imbat start ve işaret dönüşü",
]);
add("Antrenman günlüğü (günlük sayfasında)", "log", ["14 knot poyraz start çalıştık", "90 dakika sürdü", "çok iyi geçti"], { path: "/training" });
add("Yarış oluştur / ekle", "race", [
  "29 Ekim Cumhuriyet Kupası adında yarış oluştur", "Çeşme'de 7 11 Kasım yarış ekle Ali ve Ayşe katılacak", "yeni yarış ekle Bodrum regatta 5 Kasım",
  "Foça yarışına Mehmet'i de ekle", "Cumhuriyet Kupası'na Mustafa ve Enes'i ekle", "Foça yarışı için not al otelde kalınacak",
  "Foça yarışının bütçesine otel kişi başı 3500 ekle", "Cumhuriyet Kupası yarışı oluştur 29 Ekim dikili",
]);
add("Yarış aç", "raceOpen", ["Foça yarışını aç", "Cumhuriyet Kupası'nı aç", "sıradaki yarışı göster", "Çeşme yarışına git"]);
add("Yarış (yarış sayfasında)", ["race", "raceHere", "hotel"], [
  "Mehmet'i de ekle", "Ali üçüncü oldu", "Ali'yi yarıştan çıkar", "otel ekle Foça palas 0232 812 34 56", "yarışı planlara ekle", "bütçeye otel kişi başı 3500 ekle",
  "24 tekne yarıştı", "Ayşe ücretini ödedi",
], { path: "/athletes/races/r1" });
add("Yarış (yarış sayfasında)", "call", ["oteli ara"], { path: "/athletes/races/r1" });
add("Instagram hazırla", "post", [
  "Foça yarışı için Instagram gönderisi hazırla", "29 Ekim gönderisi hazırla", "10 Kasım Atatürk'ü anma postu yap", "Instagram postu yap antrenman fotoğrafı",
  "Cumhuriyet Kupası için görsel hazırla", "yarış için görsel oluştur", "Instagram'a yarış duyurusu hazırla", "kayıtlar başladı diye Instagram paylaşımı hazırla",
]);
add("Instagram değiştir (gönderi ekranında)", "postEdit", [
  "daha kısa yaz", "mete ikinci oldu diye ekle", "rengi mavi yap", "hikaye boyutuna çevir", "gün batımında teknelerle görsel üret", "başlığı değiştir Cumhuriyet Kupası başlıyor olsun",
], { path: "/posts/new" });
add("Fatura", "invoice", ["Turkcell faturası ödendi", "elektrik faturasını ödedim", "faturayı ödendi işaretle", "su faturası ödenmedi olarak işaretle"]);
add("Fatura", "invoiceTask", ["Turkcell faturasını Ali'ye ver"]);
add("Fiş", "receiptCam", ["fiş yükle", "fiş fotoğrafı çek", "yeni fiş ekle"]);
add("Fiş", "receiptPay", ["F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim", "Gökhan'ın fişini ödendi işaretle"]);
add("Sporcu", "athlete", [
  "yeni sporcu ekle Can Tekin 2014 doğumlu", "Can Tekin'i sporcu olarak ekle", "Ali Kaya'yı arşive al", "Zeynep'i arşivden çıkar", "Emre Koç sporcusunu sil",
  "Mustafa Yılmaz'ı arşive kaldır",
]);
add("Sporcu", "athleteOpen", ["Ali Kaya'nın sporcu kartını aç"]);
add("Kişi", "person", ["kişi ekle Ayşe Yılmaz eşim 0532 111 22 33", "annem Fatma Yıldız'ı aileye ekle doğum günü 12 Mart", "Hasan Öz'ü çalışan olarak ekle antrenör"]);
add("Kişi", "personDelete", ["Ayşe Yılmaz'ı kişilerden sil", "Mehmet Öz'ü rehberden çıkar"]);
add("Doğum günü", "birthday", ["annemin doğum günü 12 Mart", "Ali Kaya'nın doğum günü 5 Haziran", "eşimin doğum günü 3 Eylül ekle"]);
add("Doğum günü", "bdayDelete", ["Ayşe'nin doğum gününü sil"]);
add("Alışveriş", ["shopping", "shopping(mark)"], ["listeye süt ekle", "alışveriş listesine ekmek ve yumurta ekle", "alışveriş listesini oku", "listeden sütü sil", "ekmek alındı"]);
add("Alışveriş", "shopClear", ["alınanları temizle"]);
add("Envanter", "inventory", [
  "envantere 3 optimist teknesi ekle", "envanterden 2 şamandıra çıkar", "demirbaşa yeni telsiz ekle", "envanterde kaç telsizimiz var",
  "tam donanımlı optimist teknesi envantere ekle yelken no tur 1204", "botun motoruna yaz bakımı yapıldı envantere yaz",
]);
add("Envanter (envanter sayfasında)", "inventory", ["2 telsiz kayboldu", "optimist 4 bakımda", "telsizi Ali'ye verdim", "lazer yazıcıyı sil"], { path: "/inventory/x1" });
add("Etkinlik", "event", ["kamp planı yapmak istiyorum tavsiye ver", "İç Anadolu gezisi planla", "balığa gideceğiz ne lazım", "kulüp pikniği organize edelim"]);
add("Ders programı", "schedule", ["ders programıma çarşamba 10'da kimya ekle", "ders programına pazartesi 9'da matematik ekle"]);
add("Ders programı (sayfada)", "schedule", ["salı 13:00 fizik b 204"], { path: "/schedule" });
add("Arama", "call", ["Ali'yi ara", "Gökhan Arslan'ı arar mısın", "Zeynep'e arama yap", "Mustafa'yı ara"]);
add("Grup kurma", "groupCreate", ["Ali ve Ayşe ile yelken ekibi adında grup kur"]);
add("Sayfa açma", "navigate", [
  "ders programını aç", "yoklamayı aç", "ekip grubunu aç", "geri dön", "ayarlara git", "fişlerimi göster", "aidatlar sayfasını aç", "envanter sayfasını aç",
  "faturaları aç", "hesaplarımı aç", "planları aç", "notlarımı aç", "görevleri göster", "sporcular sayfasını aç", "yarışlar sayfasına git", "Instagram'ı aç",
  "etkinlikleri aç", "kişileri aç", "doğum günlerini aç", "alışveriş listesini aç", "mailleri aç", "arşivi aç", "antrenman günlüğünü aç", "ödemelerimi aç",
  "ana sayfaya dön", "mesajları aç", "aliyle mesajlaşmayı aç", "yok lamayı aç", "sporcular grubunu aç", "gelen ödemeleri göster",
]);
add("Toplantı modu", "meeting", ["toplantı modunu aç", "toplantıyı kaydet", "toplantı kaydını başlat"]);
add("Kapatma", "close", ["tamam kapat", "teşekkürler", "kapat", "bitir", "asistanı kapat", "kapat lütfen"]);
add("Kapatma (soru sonrası)", "close", ["yok", "hayır başka yok", "yok teşekkürler", "gerek yok"], { askedMore: true });
add("Geri al", "undo", ["son kaydı geri al", "az önce eklediğim görevi sil", "en son eklediğimi sil"]);
add("Sürüm", "version", ["son güncelleme ne", "uygulama güncellendi mi"]);
// Karışma riski: başka bir akış yutmamalı
// Ses tanıma kesme işaretini (') ve büyük harfi yazmazsa (Chrome'un canlı yazısı, bazen Whisper): aynı cümleler
add("Kesmesiz yazım (mesaj)", AI, [
  "aliye yaz yarın 9da iskelede olsun", "mustafaya mesaj at antrenmana gelmedi diye merak ettim", "enese yaz aidatını unutmasın", "aliye yaz faturayı ödedim",
  "zeynebe yaz yoklamada gelmedi görünüyor", "emreye mesaj at kamp planı yapıyoruz", "aliye söyle teşekkürler", "ayşeye söyle ders programını göndersin",
  "aliye yaz instagram postunu paylaşsın", "gökhana mesaj at marketten süt alsın",
]);
add("Kesmesiz yazım (yerel akış)", "attendance", ["bugün antrenmana mustafa katıldı", "yoklama ali ve ayşe geldi"]);
add("Kesmesiz yazım (yerel akış)", "income", ["ali kayanın ekim aidatı nakit 1500 alındı", "enes aidatını nakit verdi"]);
add("Kesmesiz yazım (yerel akış)", "call", ["aliyi ara", "mustafayı ara"]);
add("Kesmesiz yazım (yerel akış)", "athlete", ["ali kayayı arşive al"]);
add("Kesmesiz yazım (yerel akış)", "race", ["foça yarışına mehmeti de ekle", "cumhuriyet kupasına mustafa ve enesi ekle"]);
// Ses tanıma yazım hataları ("antreman", "yoklamya", "insta")
add("Ses tanıma yazım hatası", "attendance", ["bugün antremana Mustafa geldi", "dün antremana Enes gelmedi"]);
add("Ses tanıma yazım hatası", "log", ["dünkü antremanda 12 knot poyraz vardı start çalıştık"]);
add("Ses tanıma yazım hatası", "post", ["insta için Cumhuriyet Kupası gönderisi hazırla"]);
add("Ses tanıma yazım hatası", "raceOpen", ["foca yarışını aç"]);
add("Karışma (yapay zekaya gitmeli)", AI, [
  "Ali'ye yaz yoklamada gelmedi görünüyor", "yarın 17'de antrenman var takvime ekle", "cumartesi 10'da envanter sayımı planla", "Ali'ye envanter sayımı görevi ver cumaya kadar",
  "yarın 9'da kamp alanına gidiyoruz takvime ekle", "Ayşe'ye söyle ders programını göndersin", "Ali'ye yaz Instagram postunu paylaşsın", "yarın 10'da Foça yarışı için toplantı ekle",
  "Gökhan'a mesaj at marketten süt alsın", "Ali'ye yaz Ahmet'ten 2000 lira bağış geldi", "yarın Ali'yi ara diye görev ekle", "Ali'ye söyle teşekkürler",
  "Mustafa'nın velisine yaz bugün antrenmana gelmedi", "Enes aidatını ödemedi ona hatırlat", "ekibe yaz yarışa kimler katılacak bildirsin",
  "Ali'ye yaz yarış görselini beğendim", "bugün antrenmana Mustafa geldi mi",
]);

// ---------------------------------------------------------------- Çok işli cümleler
// [cümle, beklenen türler (sırasız küme)]
const M = [
  ["29 Ekim Cumhuriyet yarışı oluştur yarış için görsel hazırla bugün antrenmana Mustafa katıldı", ["race", "post", "attendance"]],
  ["29 Ekim Cumhuriyet yarışı oluştur. Yarış için görsel oluştur ve bugün antrenmana Mustafa katıldı, yoklamaya onu ekle.", ["race", "post", "attendance"]],
  ["Ali'ye yarın 10'da toplantı var diye yaz ve takvime ekle", ["other"]], // tek tür: ana yapay zeka hepsini birlikte yapar (çok iş sayılmaması doğru)
  ["Enes aidatını nakit verdi, Mehmet de geldi yoklamaya ekle", ["income", "attendance"]],
  ["Enes aidatını nakit verdi Mehmet de geldi yoklamaya ekle", ["income", "attendance"]],
  ["bugün antrenmana ali ve ayşe geldi ali kayanın ekim aidatı nakit 1500 alındı", ["attendance", "income"]],
  ["Bugün antrenmana Ali ve Ayşe geldi. Ali Kaya'nın ekim aidatı nakit 1500 alındı.", ["attendance", "income"]],
  ["Yoklama al, Mustafa geldi. Yarın 10'da toplantı ekle.", ["attendance", "other"]],
  ["yoklama al mustafa geldi ve yarın 10da toplantı ekle", ["attendance", "other"]],
  ["Cumhuriyet Kupası adında yarış oluştur, Ali ve Ayşe katılacak. Instagram gönderisi hazırla.", ["race", "post"]],
  ["foça yarışına mehmeti ekle sonra aliye yaz otel ayarlandı", ["race", "other"]],
  ["foça yarışını aç ardından aliyi ara", ["race", "call"]],
  ["turkcell faturası ödendi ve aliye yaz faturayı ödedim", ["invoice", "other"]],
  ["Turkcell faturası ödendi. Yarın 10'da antrenman ekle.", ["invoice", "other"]],
  ["envantere 2 telsiz ekle ve gökhana haber ver", ["inventory", "other"]],
  ["Envantere 2 telsiz ekle. Listeye süt ekle.", ["inventory", "shopping"]],
  ["listeye süt ve ekmek ekle sonra yarın 9da market alışverişi planla", ["shopping", "other"]],
  ["dün 14 knot poyrazda start çalıştık antrenman günlüğüne yaz ve sporculara yaz iyi iş çıkardınız", ["log", "other"]],
  ["Dün 14 knot poyrazda start çalıştık, antrenman günlüğüne yaz. Ali ve Ayşe geldi, yoklamaya ekle.", ["log", "attendance"]],
  ["kamp planı yap ve velilere mesaj at kamp için fikir versinler", ["event", "other"]],
  ["Yeni sporcu ekle Can Tekin 2014 doğumlu. Cumhuriyet Kupasına Can'ı da ekle.", ["athlete", "race"]],
  ["yeni sporcu ekle can tekin 2014 doğumlu ve bugün antrenmana geldi yoklamaya ekle", ["athlete", "attendance"]],
  ["ali kayayı arşive al ve velisine yaz kaydı dondurduk", ["athlete", "other"]],
  ["aidat hatırlatması gönder sonra aidatlar sayfasını aç", ["athlete", "nav"]],
  ["Enes aidatını nakit verdi. Mustafa 2000 lira bağış yaptı. Yoklamaya ikisini de ekle.", ["income", "attendance"]],
  ["Atatürk Kupası adında bir yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit verdi. Atatürk Kupası için Instagram görseli hazırla.", ["race", "attendance", "income", "post"]],
  ["atatürk kupası adında yarış oluştur bugün antrenmana mustafa geldi enes aidatını nakit verdi atatürk kupası için instagram görseli hazırla", ["race", "attendance", "income", "post"]],
  ["Cumhuriyet Kupası için Instagram gönderisi hazırla. Yarın 10'da antrenman ekle. Ali'ye yaz yarışa kaydını yaptırdık.", ["post", "other"]],
  ["yarın 10da antrenman ekle sonra planları aç", ["other", "nav"]],
  ["aliyi ara ve takvime yarın 3te görüşme ekle", ["call", "other"]],
  ["Mustafa geldi. Enes gelmedi. Gelmeyenlerin velilerine haber ver.", ["attendance", "other"]],
  ["bugün antrenmana mustafa katıldı enes katılmadı ve günlüğe yaz 12 knot imbat vardı", ["attendance", "log"]],
  ["ders programıma çarşamba 10da kimya ekle ve yarın 9da ders çalışma planla", ["schedule", "other"]],
  ["Çeşme'de 7-11 Kasım yarış ekle. Bütçesine otel kişi başı 3500 ekle. Velilere yaz kayıtlar açıldı.", ["race", "other"]],
  ["elektrik faturasını ödedim, enes aidatını nakit verdi", ["invoice", "income"]],
  ["Ali Kaya'nın ekim aidatı nakit 1500 alındı ve Ali'ye yaz teşekkür ederiz", ["income", "other"]],
  ["Foça yarışını aç. Mehmet'i de ekle.", ["race"]], // aynı yarış: tek akış yeterli
  ["bugün antrenmana ali geldi yarın da 10da antrenman ekle aliye haber ver", ["attendance", "other"]],
  ["yoklamaya mustafa ve enesi ekle sonra instagramda yarış duyurusu hazırla", ["attendance", "post"]],
  ["10 kasım gönderisi hazırla ve ekibe yaz paylaşalım", ["post", "other"]],
  ["Enes ödemesini yaptı. Nakit verdi. Cumhuriyet Kupasına Enes'i ekle.", ["income", "race"]],
  ["listeye çay şeker ekle envanterden 1 şamandıra çıkar", ["shopping", "inventory"]],
];

// ---------------------------------------------------------------- Çalıştır
const TECH = /(^|\s)(ses|analiz\p{L}*|anlaşıl\p{L}*|işleni\p{L}*|yükleni\p{L}*|api|whisper|gemini|sunucu\p{L}*|istem)(\s|$)/iu;
// Bekleme yazısında dil bozukluğu: belirtme hâlindeki nesne + edilgen fiil ("Yarınki toplantıyı siliniyor", "görevini tamamlanıyor")
const ACC = /(['’][yn]?[ıiuü]|y[ıiuü]|[ıiuü]n[ıiuü]|s[ıiuü]n[ıiuü])$/u;
const accBad = (l) => {
  const w = String(l || "").split(/\s+/);
  return w.length >= 2 && /(ıyor|iyor|uyor|üyor)$/u.test(w.at(-1)) && ACC.test(w.at(-2).toLocaleLowerCase("tr-TR"));
};
const rows = [];
for (const x of S) {
  const got = route(x.s, x.o);
  const ok = x.want.includes(got) || (x.want.includes(AI) && got === "local:navigate");
  // Tek işli cümle görev listesine (çok iş) yanlışlıkla gidiyor mu? (uygulamada routeOf'tan ÖNCE denetlenir)
  const m = x.o.askedMore ? { multi: false } : multiOf(x.s);
  const about = aboutLine(x.s);
  let verdict = ok ? (x.want.includes(AI) ? "ai-ok" : "ok") : "wrong";
  let why = "";
  if (ok && m.multi) {
    // Çok iş sanıldı: parçalar doğru yere gidiyorsa sorun küçük, değilse yanlış
    const allRight = m.steps.length && m.steps.every((st) => (KIND_ROUTES[st.kind] || ["ai"]).includes(st.route));
    verdict = "wrong";
    why = `tek iş ama görev listesine bölünüyor (${m.how}: ${m.steps.map((st) => `"${st.say}"→${st.route}`).join(" | ")})${allRight ? " [parçalar yine doğru yere gidiyor]" : ""}`;
  }
  rows.push({ ...x, got, multi: m, about, verdict, why, tech: TECH.test(about), acc: accBad(about) });
}

const mrows = [];
for (const [s, want] of M) {
  const m = multiOf(s);
  const single = want.length < 2;
  const kinds = m.multi ? m.steps.map((st) => st.kind) : [];
  const kset = [...new Set(kinds)].sort().join(",");
  const wset = [...new Set(want)].sort().join(",");
  const stepBad = m.multi ? m.steps.filter((st) => !(KIND_ROUTES[st.kind] || ["ai"]).includes(st.route)) : [];
  let verdict;
  if (single) verdict = m.multi ? "wrong" : "ok";
  else {
    // Uygulamada her iş run(say) ile kendi yoluna gider: doğruluk işlerin gerçek yoluna göre
    const rset = m.multi ? [...new Set(m.steps.map((st) => kindOfRoute(st.route)))].sort().join(",") : "";
    verdict = m.multi && rset === wset ? "ok" : "wrong";
  }
  const first = !m.multi ? route(s) : "";
  mrows.push({ s, want, multi: m, kinds, verdict, stepBad, first, about: aboutLine(s) });
}

// Bekleme yazıları: her iş için
const waits = [];
for (const t of TASKS) {
  const lines = [0, 2000, 4000, 7000, 11000].map((ms) => waitLines(t.work, ms, { text: t.say }));
  const all = [...new Set(lines.flatMap((l) => (l ? [...l.done, l.now] : [])))];
  const empty = lines.some((l) => !l || !l.now);
  const tech = all.filter((l) => TECH.test(l));
  const bad = all.filter(accBad);
  waits.push({ bad, id: t.id, work: t.work || "", stages: waitStages(t.work, { text: t.say }), all, empty, tech });
}
const transcribing = waitStages("", { transcribing: true });

// ---------------------------------------------------------------- Yaz
const sum = (arr, v) => arr.filter((r) => r.verdict === v).length;
const out = { rows, mrows, waits, transcribing };
const args = process.argv.slice(2);
const ji = args.indexOf("--json");
if (ji >= 0) writeFileSync(args[ji + 1], JSON.stringify(out, null, 1));
console.log(`Tek işli cümle: ${rows.length} · doğru (yerel akış): ${sum(rows, "ok")} · yapay zekaya (tasarım gereği): ${sum(rows, "ai-ok")} · yanlış: ${sum(rows, "wrong")}`);
console.log(`Çok işli cümle: ${mrows.length} · doğru: ${sum(mrows, "ok")} · yanlış: ${sum(mrows, "wrong")}`);
console.log(`Bekleme yazısında dil bozukluğu (ör. "toplantıyı siliniyor"): görev listesi örneklerinde ${waits.filter((w) => w.bad.length).length}, taranan cümlelerde ${rows.filter((r) => r.acc).length}`);
console.log(`Bekleme yazısı: ${waits.length} iş · boş: ${waits.filter((w) => w.empty).length} · teknik söz: ${waits.filter((w) => w.tech.length).length} · istekten yazıda teknik: ${rows.filter((r) => r.tech).length}`);
const cats = [...new Set(rows.map((r) => r.cat))];
console.log("\nKategori: toplam / doğru / yz / yanlış");
for (const c of cats) {
  const rs = rows.filter((r) => r.cat === c);
  console.log(`  ${c}: ${rs.length} / ${sum(rs, "ok")} / ${sum(rs, "ai-ok")} / ${sum(rs, "wrong")}`);
}
console.log("\nYANLIŞ (tek iş):");
for (const r of rows.filter((x) => x.verdict === "wrong")) console.log(`  [${r.cat}] “${r.s}”${r.o.path ? ` (${r.o.path})` : ""} → ${r.got} (beklenen ${r.want.join("/")})${r.why ? ` · ${r.why}` : ""}`);
console.log("\nYANLIŞ (çok iş):");
for (const r of mrows.filter((x) => x.verdict === "wrong")) {
  const d = r.multi.multi ? `${r.multi.how}: ${r.multi.steps.map((st) => `[${st.kind}] "${st.say}"→${st.route}`).join(" | ")}` : `çok iş sayılmadı, tamamı → ${r.first}`;
  console.log(`  “${r.s}” beklenen {${r.want.join(",")}} · ${d}`);
}
const fi = args.indexOf("--akis");
if (fi >= 0) for (const x of args.slice(fi + 1)) console.log(`flowOf “${x}” → ${flowOf(x)} · routeOf → ${route(x)}`);
if (args.includes("--neden")) {
  console.log("\nNEDEN (yanlış çok işler: cümlecikler ve flowOf):");
  for (const r of mrows.filter((x) => x.verdict === "wrong")) {
    console.log(`  “${r.s}”\n     splitChain: ${JSON.stringify(splitChain(r.s))}\n     clausesOf: ${clausesOf(r.s).map((c) => `[${flowOf(c) || "-"}] ${c}`).join(" | ")}`);
  }
}
if (args.includes("--bekleme")) {
  console.log("\nBEKLEME DİL BOZUKLUĞU:");
  for (const w of waits.filter((x) => x.bad.length)) console.log(`  ${w.id}: ${w.bad.join(" | ")}`);
  for (const r of rows.filter((x) => x.acc)) console.log(`  “${r.s}” → ${r.about}`);
}
if (args.includes("--hepsi")) {
  console.log("\nHEPSİ (tek iş):");
  for (const r of rows) console.log(`  ${r.verdict.padEnd(5)} [${r.cat}] “${r.s}” → ${r.got} · bekleme: ${r.about || "-"}`);
  console.log("\nHEPSİ (çok iş):");
  for (const r of mrows) console.log(`  ${r.verdict.padEnd(5)} “${r.s}” → ${r.multi.multi ? r.multi.steps.map((st) => `${st.kind}:${st.route}`).join(" › ") : "tek: " + r.first}`);
  console.log("\nBEKLEME:");
  for (const w of waits) console.log(`  ${w.id}: ${w.all.join(" › ")}`);
}
