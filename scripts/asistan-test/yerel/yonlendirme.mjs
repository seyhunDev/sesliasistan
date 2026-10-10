// Asistan yönlendirmesi: söylenen cümle hangi işe gidiyor? (boş sohbet, taslak/kart yok). Uygulamanın kendi yönlendirme
// tablosu sınanır (lib/assistRoute.js `routesOf`; önceden run() burada elle taklit ediliyordu). Sıra: kapatma → günlük → etkinlik → envanter → gönderi → yarış açma → kişi → sayfa → ders programı →
// doğum günü → geri al → fatura → ödeme sorusu → son eklenenler (arama, aidat, nakit gelir, sporcu) → alışveriş → yoklama → yarış → yerel komut → ana yapay zeka.
// Yapay zekaya gidenlerde ön cevabın (precue) doğru işi söylemesi de sınanır.
// Tek tek parçaların testleri asistan.mjs'te; burası parçaların birbirini yutmadığını (karışma) sınar. 2026-10-06 denetimi.
import { wantsPost } from "@/features/posts/postModel";
import { precue } from "@/lib/precue";
import { TASKS } from "@/lib/assistTasks";
import { todayStr } from "@/lib/utils/format";
import { routeOf } from "@/lib/assistRoute";
import { suite } from "./ortak.mjs";

const today = todayStr();
const races = [
  { id: "r1", name: "TYF Yelken Ligi ILCA 1. Ayak MW Phokaia Beach Resort Kupası", district: "Foça", startDate: "2026-10-26", endDate: "2026-10-31" },
  { id: "r2", name: "Coupe D'Azur Optimist", district: "Cannes", startDate: "2027-02-12", endDate: "2027-02-16" },
  { id: "r3", name: "Çeşme Optimist Kupası", district: "Çeşme", startDate: "2026-11-07", endDate: "2026-11-11" },
];
const names = ["Ali Kaya", "Ayşe Yılmaz", "Gökhan Demir", "Zeynep Ak", "Emre Şahin", "Mehmet Öz"];

// ctx: { owner: true (ana hesap) | false (çalışan), athlete: sporcu/veli/öğrenci, path }
// Uygulamanın kendi yönlendirmesi (lib/assistRoute.js `routeOf`; AssistantSheet run() aynı adayları sırayla dener)
function route(s, ctx = {}) {
  const owner = ctx.owner !== false && !ctx.athlete;
  const path = ctx.path || "/";
  const curRace = /^\/athletes\/races\/([\w-]+)$/.exec(path)?.[1];
  const got = routeOf(s, {
    owner, isStaff: !owner, racer: owner, att: owner, athleteSide: !!ctx.athlete, path, today, races, raceNames: races.map((r) => r.name), names,
    logHere: path === "/training", fitHere: path === "/fitness", invPage: path.startsWith("/inventory"), attHere: path === "/athletes/attendance",
    curRace: curRace && curRace !== "new" ? curRace : "", askedMore: !!ctx.askedMore, shop: true,
  });
  return got === "person" && !owner ? "person(yetkisiz)" : got;
}

// Ön cevabın hangi işe ait olduğu (söylenen cümleden)
const byLine = new Map(TASKS.filter((t) => t.doing).map((t) => [t.doing, t.id]));
function cue(s) {
  const pc = precue(s, { plans: [], today });
  if (!pc) return { id: "-", line: "(ön cevap yok)" };
  const base = [...byLine.keys()].find((l) => pc.line.startsWith(l));
  let id = base ? byLine.get(base) : pc.kind;
  if (pc.kind === "query") id = /hava/i.test(pc.work) ? "weather" : "query";
  if (pc.kind === "multi") id = "multi";
  if (pc.kind === "other") id = "other";
  return { id, line: pc.line };
}

// Beklenen yol (görev id → yol)
const PATH = { undo: "undo", birthday: "birthday", payee: "payee", version: "version", appUpdate: "appUpdate", navigate: "navigate", receiptCam: "receiptCam", meeting: "meeting", close: "close", attendance: "attendance", log: "log", raceOpen: "raceOpen", race: "race", inventory: "inventory", invoice: "invoice", post: "post", event: "event", schedule: "schedule", person: "person", shopping: "shopping", call: "call", dues: "dues", income: "income", athlete: "athlete", raceHere: "raceHere", receiptPay: "receiptPay", absent: "absent", shopClear: "shopClear", bdayDelete: "bdayDelete", personDelete: "personDelete", groupCreate: "groupCreate", hotel: "hotel", athleteOpen: "athleteOpen", invoiceTask: "invoiceTask", fitProgram: "fitness", fitLog: "fitness", fitPlans: "fitness", fitDone: "fitness" };
// Yapay zekaya giden işlerde ön cevabın kabul edilebilir türleri
const CUE_OK = {
  plan: ["plan", "repeat"], repeat: ["repeat"], task: ["task"], note: ["note"], record: ["record", "plan", "task", "-"], complete: ["complete"], reopen: ["reopen"], noteDone: ["noteDone"],
  update: ["update"], delete: ["delete"], cancel: ["cancel"], multi: ["multi"], send: ["send", "group", "whatsapp"], group: ["group"], whatsapp: ["whatsapp"], query: ["query", "-"], weather: ["weather"],
};

function check(task, s, ctx = {}) {
  const got = route(s, ctx);
  const want = PATH[task] || "ai";
  const c = got === "ai" ? cue(s) : null;
  let ok = got === want || (want === "shopping" && got === "shopping(mark)");
  let cueOk = true;
  if (ok && want === "ai") cueOk = (CUE_OK[task] || []).includes(c.id);
  return { task, s, ctx, want, got, cue: c, ok, cueOk };
}

const CASES = {
  fitProgram: ["pazartesi çarşamba cuma sabah 7'de 4 haftalık fitness programı hazırla", "spor salonu için haftada 3 gün program hazırla", ["çarşambayı bacak günü yap", { path: "/fitness" }], ["programa plank ekle", { path: "/fitness" }], ["45 dakikaya indir", { path: "/fitness" }]],
  fitLog: ["squat 3 set 10 tekrar 60 kilo yaptım", "bugün fitness'ta 30 dakika koşu yaptım", "şınav 3 set 15 tekrar yaptım", ["bench press 4 set 8 tekrar 50 kilo", { path: "/fitness" }]],
  fitPlans: ["fitness programını planlara ekle", ["programı planlara ekle", { path: "/fitness" }], ["programı takvimden kaldır", { path: "/fitness" }]],
  fitDone: ["bugünkü fitness antrenmanını yaptım", ["bugünkü antrenmanı yaptım", { path: "/fitness" }], ["bugün antrenmanı atladım", { path: "/fitness" }], "bu hafta kaç fitness antrenmanı yaptım"],
  plan: ["yarın 10'da antrenman ekle", "Cumartesi saat 14:00'te tekne yıkama planla.", "takvime ekle perşembe 16:30 yönetim toplantısı", "yarın sabah 9'da iskelede buluşma var, takvime koy", "haftaya salı 18:00 veli toplantısı ekle", "12 Ekim'de saat 11'de bakım planla", "bugün akşam 6'da antrenman ekler misin", "pazar günü Foça'ya gidiyoruz takvime yaz"],
  repeat: ["her salı 16:00 antrenman", "her cumartesi saat 10'da Optimist antrenmanı ekle", "her salı ve perşembe 17:00 antrenman planla", "haftada bir pazartesi 9'da toplantı ekle"],
  task: ["Ali'ye motoru kontrol etmesini hatırlat", "görev ekle: römork lastiklerini kontrol et", "yarına kadar yelkenleri katla görevi oluştur", "Gökhan'a görev ver, şamandıraları say", "bana hatırlat cuma günü sigortayı yenile", "yapılacaklara ekle can yeleklerini yıka"],
  note: ["not al: malzeme odası dolu", "not düş, iskele lambası yanmıyor", "notlara ekle yeni telsiz şifresi değişti", "Not: Emre'nin velisi aradı", "bunu not olarak kaydet: botun pervanesi çizik"],
  record: ["cumartesi tekne yıkama", "yarın sigorta yenileme", "pazartesi yelken siparişi"],
  complete: ["motor yağı görevini tamamla", "tekneleri hazırla görevi bitti", "römork lastikleri görevini tamamlandı olarak işaretle", "yelken onarımı tamamlandı"],
  reopen: ["motor yağı görevini yeniden aç", "tekneleri hazırla görevini tekrar aç"],
  noteDone: ["malzeme odası notu yapıldı", "iskele lambası notunu arşivle", "telsiz notunu arşive at"],
  update: ["antrenmanı 11'e al", "yarınki toplantıyı cumaya ertele", "yönetim kurulu toplantısının saatini 15:00 yap", "Optimist antrenmanını 18'e çek", "bölge yarışı planının tarihini değiştir 14 Ekim olsun"],
  delete: ["yarınki toplantıyı sil", "motor yağı görevini sil", "malzeme odası notunu kaldır", "Optimist antrenmanını siler misin"],
  cancel: ["yarınki antrenmanı iptal et", "bugünkü antrenman iptal oldu, rüzgar çok sert", "cumartesi antrenmanını iptal edelim"],
  undo: ["son kaydı geri al", "az önce eklediğim görevi sil", "en son eklediğimi sil"],
  birthday: ["annemin doğum günü 12 Mart", "Ali Kaya'nın doğum günü 5 Haziran", "eşimin doğum günü 3 Eylül, ekle"],
  multi: ["Gökhan'a yarın 10'da tekne bakımı olduğunu yaz, aynı konuyu takvime ekle ve notlara Gökhan için malzeme listesi hazırla", "Ali'ye yarın gelmesini söyle ve takvime ekle", "antrenmanı 11'e al, motor yağı görevini tamamla, Ali'ye haber ver"],
  send: ["Ali'ye yaz, yarın 9'da iskelede olsun", "Gökhan'a mesaj at, botu yıkasın", "Ayşe'ye söyle toplantı ertelendi", "Zeynep'e mesaj gönder: forması hazır", "Mehmet'e haber ver, yarın gelmesin"],
  group: ["sporculara söyle antrenman iptal", "ekibe yaz, yarın 8'de iskelede toplanıyoruz", "velilere mesaj at: cumartesi antrenman var", "herkese haber ver, bugün kulüp kapalı"],
  whatsapp: ["Ali'ye WhatsApp'tan yaz, yarın gelsin", "Gökhan'a vatsaptan mesaj at, motoru getirsin", "velilere WhatsApp'tan yaz, kayıtlar başladı"],
  query: ["bu hafta neler var", "yarın ne var?", "bugün hangi görevler var", "kaç görevim var", "Ali'nin görevleri neler", "bu ay ne kadar fiş harcadım?", "geciken görev var mı", "haftayı özetle"],
  weather: ["yarın rüzgar kaç knot", "hava nasıl olacak cumartesi?", "bugün öğleden sonra rüzgar ne durumda", "pazar yağmur yağacak mı"],
  appUpdate: ["uygulamayı güncelle", "güncellemeyi yükle", "yeni sürüme geç", "sayfayı yenile"],
  version: ["son güncelleme ne", "en son ne değişti?", "uygulama güncellendi mi", "hangi sürümdeyim"],
  payee: ["bu ay ne kadar ödeme aldım", "geçen ay kaç ödeme geldi", "eylülde ne kadar para geldi"],
  navigate: ["ders programını aç", "yoklamayı aç", "ekip grubunu aç", "geri dön", "ayarlara git", "fişlerimi göster", "aidatlar sayfasını aç", "envanter sayfasını aç", "Ali ile mesajlaşmayı aç", "faturaları aç", "hesaplarımı aç"],
  receiptCam: ["fiş yükle", "fiş fotoğrafı çek", "yeni fiş ekle"],
  meeting: ["toplantı modunu aç", "toplantıyı kaydet", "toplantı kaydını başlat"],
  close: ["tamam kapat", "teşekkürler", "kapat", "bitir"],
  attendance: ["yoklama al, Ali ve Ayşe geldi", "bugün antrenmana Emre gelmedi", "yoklama: Zeynep izinli, kalanlar geldi", ["Ali ve Zeynep geldi, Emre izinli", { path: "/athletes/attendance" }], ["Mehmet raporlu", { path: "/athletes/attendance" }]],
  log: ["dün 14 knot poyrazda start çalıştık, 2 saat sürdü", "antrenman günlüğüne yaz: bugün tramola çalıştık", "dünkü antrenmanda 12 knot poyraz vardı", "antrenman günlüğü oluştur", ["14 knot poyraz, start çalıştık", { path: "/training" }]],
  raceOpen: ["Foça yarışını aç", "D'Azur yarışına git", "sıradaki yarışı göster", "Çeşme yarışını aç"],
  race: ["Çeşme'de 7-11 Ekim yarış ekle, Ali ve Ayşe katılacak", "Foça yarışına Mehmet'i de ekle", "Foça yarışı için not al: otelde kalınacak", "Foça yarışının bütçesine otel kişi başı 3500 ekle", ["Mehmet'i de ekle", { path: "/athletes/races/r1" }]],
  inventory: ["envantere 3 Optimist teknesi ekle", "envanterden 2 şamandıra çıkar", "demirbaşa yeni telsiz ekle", "kaç telsizimiz var envanterde", ["2 telsiz kayboldu", { path: "/inventory/x1" }], ["Optimist 4 bakımda", { path: "/inventory/x1" }], "botun motoruna yaz bakımı yapıldı, envantere yaz"],
  invoice: ["Turkcell faturası ödendi", "elektrik faturasını ödedim", "faturayı ödendi işaretle"],
  post: ["Foça yarışı için Instagram gönderisi hazırla", "29 Ekim gönderisi hazırla", "instagram postu yap, antrenman fotoğrafı"],
  event: ["kamp planı yapmak istiyorum, tavsiye ver", "İç Anadolu gezisi planla", "balığa gideceğiz ne lazım"],
  schedule: ["ders programıma çarşamba 10'da kimya ekle", ["salı 13:00 fizik B-204", { path: "/schedule" }]],
  person: ["Kişi ekle: Ayşe Yılmaz, eşim, 0532 111 22 33", "Annem Fatma Yıldız'ı aileye ekle", "Ali Kaya'yı çalışan olarak ekle, antrenör"],
  call: ["Ali'yi ara", "Gökhan Demir'i arar mısın", "Zeynep'e arama yap", ["oteli ara", { path: "/athletes/races/r1" }]],
  dues: ["aidat hatırlatması gönder", "aidatını ödemeyenlere hatırlat", "bu ay kim aidat ödemedi"],
  income: ["Ali Kaya'nın ekim aidatı nakit 1500 alındı", "Ahmet Yılmaz'dan 2000 lira bağış geldi", "kano eğitimi için 3 bin lira nakit aldım", "hesaplara 500 lira gelir ekle"],
  athlete: ["yeni sporcu ekle: Can Tekin, 2014 doğumlu", "Can Tekin'i sporcu olarak ekle", "Ali Kaya'yı arşive al", "Zeynep'i arşivden çıkar", "Emre Şahin sporcusunu sil"],
  raceHere: [["Ali 3. oldu", { path: "/athletes/races/r1" }], ["Ali'yi yarıştan çıkar", { path: "/athletes/races/r1" }], ["24 tekne yarıştı", { path: "/athletes/races/r1" }], ["Ayşe ödedi", { path: "/athletes/races/r1" }], ["yarışı planlara ekle", { path: "/athletes/races/r1" }], ["yarışı sil", { path: "/athletes/races/r1" }], ["Zeynep ikinci oldu", { path: "/athletes/races/r1" }]],
  hotel: [["otel ekle: Foça Palas, 0232 812 34 56", { path: "/athletes/races/r1" }]],
  receiptPay: ["F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim", "fişi ödendi işaretle", "F-3 fişi ödenmedi"],
  absent: ["gelmeyenlerin velilerine haber ver", "dün gelmeyenlerin velilerine bildir", ["gelmeyenlerin velilerine haber ver", { path: "/athletes/attendance" }]],
  shopClear: ["alınanları temizle", "alınanları listeden sil"],
  bdayDelete: ["Ayşe'nin doğum gününü sil", "Ali Kaya'nın doğum gününü kaldır"],
  personDelete: ["Ayşe Yılmaz'ı kişilerden sil", "Mehmet Öz'ü rehberden çıkar"],
  groupCreate: ["Ali ve Ayşe ile Yelken Ekibi adında grup kur", "Gökhan ve Emre ile Bakım diye grup oluştur"],
  athleteOpen: ["Ali Kaya'nın sporcu kartını aç"],
  invoiceTask: ["Turkcell faturasını Ali'ye ver", "elektrik faturasını sil"],
  shopping: ["listeye süt ekle", "alışveriş listesine ekmek ve yumurta ekle", "alışveriş listesini oku", "listeden sütü sil"],
};

// Görevler arası karışma ihtimali olan cümleler: beklenen görev ve neden
const CROSS = [
  ["log", "dün 14 knot poyrazda start çalıştık, 2 saat sürdü", "yelken antrenmanı, fitness değil"],
  ["plan", "yarın 10'da antrenman ekle", "takvim planı, fitness değil"],
  ["navigate", "fitness sayfasını aç", "sayfa açma, fitness isteği değil"],
  ["send", "Ali'ye fitness programımı yarın göstereceğimi yaz", "mesaj, fitness değil"],
  ["send", "Ali'ye mesaj at, antrenmana gelmedi diye merak ettim", "mesaj, yoklama değil"],
  ["send", "velilere yaz, antrenmana gelmeyenler cumartesi telafi yapacak", "mesaj, yoklama değil"],
  ["plan", "yarın 17:00 antrenman var, sporcular gelmedi derse ararım", "plan, yoklama değil"],
  ["query", "dün antrenmana kimler geldi?", "soru, yoklama yazılmamalı"],
  ["query", "antrenmana Ali geldi mi", "soru, yoklama yazılmamalı"],
  ["send", "Gökhan'a envanter sayımını yarın yapacağımızı yaz", "mesaj, envanter değil"],
  ["task", "Ali'ye envanter sayımı görevi ver, cumaya kadar", "görev, envanter değil"],
  ["plan", "cumartesi 10'da envanter sayımı planla", "plan, envanter değil"],
  ["send", "ekibe yaz, kamp planı yapıyoruz fikir verin", "mesaj, etkinlik planı değil"],
  ["plan", "yarın 9'da kamp alanına gidiyoruz takvime ekle", "plan, etkinlik değil"],
  ["send", "Ayşe'ye söyle ders programını göndersin", "mesaj, ders programı değil"],
  ["note", "not al: Ali'nin doğum günü 5 Haziran'da pasta alınacak", "not, doğum günü kaydı değil"],
  ["send", "Ali'ye yaz, faturayı ödedim", "mesaj, fatura değil"],
  ["send", "Gökhan'a mesaj at, marketten süt alsın", "mesaj, alışveriş değil"],
  ["task", "Ali'ye hatırlat, listeye ekmek eklesin", "görev, alışveriş değil"],
  ["send", "Ali'ye yaz instagram gönderisini beğensin", "mesaj, gönderi değil"],
  ["plan", "yarın 10'da Foça yarışı için toplantı ekle", "plan, yarış ekleme değil"],
  ["send", "Foça yarışına katılanlara mesaj at, otel değişti", "mesaj, yarış kaydı değil"],
  ["note", "not al, dünkü antrenmanda rüzgar çok sertti", "not istendi (günlük değil)"],
  ["send", "sporculara yaz, dünkü antrenmanda 14 knot vardı, iyi iş çıkardınız", "mesaj, günlük değil"],
  ["query", "en son eklediğim not neydi", "soru, silme değil"],
  ["send", "ekibe toplantı notlarını gönder", "mesaj, toplantı modu değil"],
  ["delete", "yarınki toplantı planını sil", "silme, toplantı modu değil"],
  ["query", "yarın toplantı var mı", "soru, toplantı modu değil"],
  ["plan", "yarın 9'da fiş teslimi için muhasebeciye git, takvime ekle", "plan, fiş kamerası değil"],
  ["send", "Ali'ye yaz, ayarları değiştirsin", "mesaj, sayfa açma değil"],
  ["task", "kişileri güncelle görevi ekle", "görev, sayfa açma değil"],
  ["query", "kaç sporcumuz var", "soru, sayfa açma değil"],
  ["delete", "Ali'nin görevini kaldır", "silme"],
  ["send", "Ali'ye söyle teşekkürler", "mesaj, kapatma değil"],
  ["query", "bu ay kaç aidat ödendi", "soru (aidat), ödeme sorusu karışmamalı"],
  ["send", "Ali'ye yaz, Ahmet'ten 2000 lira bağış geldi", "mesaj, nakit gelir değil"],
  ["task", "yarın Ali'yi ara diye görev ekle", "görev, arama değil"],
  ["noteDone", "malzeme odası notunu arşive al", "not arşivi, sporcu arşivi değil"],
  ["send", "velilere yaz, aidat son günü 10 Ekim", "mesaj, aidat hatırlatması değil"],
  ["query", "kaç sporcu var", "soru, sporcu ekleme değil"],
  ["send", "Ali'ye yaz, fişini ödedim", "mesaj, fiş ödemesi değil"],
  ["query", "dün gelmeyenler kimdi?", "soru, veliye haber değil"],
  ["send", "velilere yaz, gelmeyenler cumartesi telafi yapacak", "mesaj, gelmeyen bildirimi değil"],
  ["delete", "Ali'nin doğum günü planını sil", "plan silme"],
];

const { group } = suite("asistan");
// Sonuç yazı olarak döner ("✓ ai · ön cevap: …"), başarısızsa nereye gittiği okunur
const show = (r) => `${r.got}${r.cue ? ` · ön cevap: ${r.cue.line}` : ""}`;
const wrap = (task, ctx, cueLoose = false) => ({
  desc: PATH_DESC(task),
  fn: (s) => {
    const r = check(task, s, ctx);
    // Karışma cümlelerinde mesaj için genel ön cevap ("Bir bakayım", "sırayla yapıyorum") da kabul: önemli olan doğru yere gitmesi
    const ok = r.ok && (r.cueOk || (cueLoose && ["other", "multi", "send", "group", "whatsapp"].includes(r.cue?.id)));
    return `${ok ? "✓" : "✗"} ${show(r)}`;
  },
  ok: (g) => g.startsWith("✓"),
});
const PATH_DESC = (task) => (PATH[task] ? `yol: ${PATH[task]}` : `ana yapay zeka, ön cevap: ${(CUE_OK[task] || []).join("/")}`);
const TITLE = Object.fromEntries(TASKS.map((t) => [t.id, t.name]));
for (const [task, list] of Object.entries(CASES)) {
  group(`Yönlendirme: ${TITLE[task] || task}`)(list.map((c) => { const [s, ctx] = Array.isArray(c) ? c : [c, {}]; return [s, wrap(task, ctx), ctx.path ? `sayfa ${ctx.path}` : ""]; }));
}
group("Yönlendirme: karışma (iki işe benzeyen cümle)")(CROSS.map(([task, s, why]) => [s, wrap(task, {}, true), why]));
// Çalışan hesabı: yalnız ana hesaba açık akışlar başlamaz
const STAFF = { desc: "çalışanda yalnız ana hesaba açık akış başlamaz", fn: (s) => route(s, { owner: false }), ok: (r) => !["inventory", "event", "post", "person", "invoice", "payee", "attendance", "race", "raceOpen", "dues", "income", "athlete", "receiptPay", "absent", "personDelete", "invoiceTask", "raceHere", "hotel", "athleteOpen", "fitness"].includes(r) };
group("Yönlendirme: çalışan hesabı")(["envantere 3 Optimist teknesi ekle", "kamp planı yapmak istiyorum", "Foça yarışı için Instagram gönderisi hazırla", "bu ay ne kadar ödeme aldım", "Turkcell faturası ödendi", "yoklama al, Ali geldi", "Foça yarışını aç", "aidat hatırlatması gönder", "Ahmet'ten 2000 lira bağış geldi", "Ali Kaya'yı arşive al", "Ali'nin fişlerini ödedim", "gelmeyenlerin velilerine haber ver", "Ayşe Yılmaz'ı kişilerden sil", "squat 3 set 10 tekrar 60 kilo yaptım"].map((s) => [s, STAFF]));

// Sıralı görev zinciri (lib/chain.js): "sonra" ile sıralanan işler bölünür, her parça kendi akışına gider
const { splitChain, refersBack } = await import("@/lib/chain");
const EX = "Bir yarış oluştur, yarışın adı Foça Kupası. Sonra git Instagram'da bunun için bir tane gönderi hazırla, mavi olsun. Sonra git aidatlara Ali Kaya'nın ekim aidatı nakit 1500 alındı yaz. Sonra da yoklamaya bugün Ali ve Ayşe katıldı.";
const seg = (i, want) => ({ desc: `${i + 1}. iş → ${want}`, fn: (s) => { const p = splitChain(s)[i]; return `${p} → ${p ? route(p) : "-"}`; }, ok: (r) => r.endsWith(`→ ${want}`) });
group("Sıralı görev zinciri")([
  [EX, { desc: "dört iş", fn: (s) => splitChain(s).length, ok: (n) => n === 4 }],
  [EX, seg(0, "race")],
  [EX, seg(1, "post")],
  [EX, seg(2, "income")],
  [EX, seg(3, "attendance")],
  ["Instagram'da bunun için gönderi hazırla", { desc: "önceki yarışa gönderme", fn: refersBack, ok: (r) => r === true }],
  ["yarın 10'dan sonra antrenman ekle", { desc: "saat sözü bölmez", fn: (s) => splitChain(s).length, ok: (n) => n === 1 }],
  ["antrenmandan sonra Ali'ye yaz", { desc: "zaman sözü bölmez", fn: (s) => splitChain(s).length, ok: (n) => n === 1 }],
  ["Foça yarışını aç, ardından Ali'yi ara", { desc: "virgül + ardından böler", fn: (s) => splitChain(s).join(" | "), ok: (r) => r === "Foça yarışını aç | Ali'yi ara" }],
]);

// Görev listesi (lib/taskPlan.js): tek cümlede birden çok iş yapay zekaya görev listesi için sorulur mu?
// flowOf'un taklidi: route() uygulamanın kendi akışına gidiyorsa o akış; ödeme sözü ("ödemesini yaptı", "nakit verdi") ödeme sayılır
const { looksMulti, clausesOf, cleanPlan, failed } = await import("@/lib/taskPlan");
const OWN = ["race", "attendance", "post", "income", "athlete", "dues", "invoice", "inventory", "event", "log", "schedule", "shopping", "call", "navigate", "raceOpen"];
const flowOf = (x) => { const r = route(x); return OWN.includes(r) ? r : /(aidat\p{L}*|ödemesini) (yaptı|verdi|ödedi)|nakit (verdi|ödedi|getirdi)/iu.test(x) ? "income" : null; };
const ATA = "Atatürk Kupası adında bir yarış oluştur. Bugün antrenmana Mustafa geldi. Enes ödemesini yaptı. Aidat ödemesini yaptı. Nakit verdi. Ve Atatürk Kupası için Instagram görseli hazırla. Yarış görseli olacak.";
const SEY = "10 Kasım'dan önceki hafta sonuna, cumartesi pazara, Atatürk Kupası ekle. Bunun için Instagram gönderisi hazırla ve tüm sporcular katılıyor. Yarışı biz düzenliyoruz. O yüzden bu bir kulüp duyurusu olacak. Kulüp yarış duyurusu olacak. Ve bugün Mustafa Kemal antrenmana katıldı. Yoklamayı ona ekle.";
const M = (want) => ({ desc: want ? "görev listesi sorulur" : "tek iş, sorulmaz", fn: (s) => looksMulti(s, flowOf), ok: (r) => r === want });
group("Görev listesi: birden çok iş mi")([
  [ATA, M(true)],
  [SEY, M(true)],
  ["Atatürk Kupası için Instagram görseli hazırla", { desc: "büyük I ile Instagram gönderidir", fn: wantsPost, ok: (r) => r === true }],
  ["Foça Kupası adında yarış oluştur, Ali ve Ayşe katılacak", M(false)],
  ["Bir yarış oluştur. Adı Foça Kupası, 26-31 Ekim", M(false)],
  ["yarın 10'da antrenman ekle", M(false)],
  ["Ali'ye yaz yarın gelsin. Takvime de ekle.", M(false)],
  ["Bugün antrenmana Ali ve Ayşe geldi. Ali'nin ekim aidatı nakit 1500 alındı.", M(true)],
  ["Yoklama al, Mustafa geldi. Yarın 10'da toplantı ekle.", M(true)],
  [ATA, { desc: "cümlecikler", fn: (s) => clausesOf(s).length, ok: (n) => n >= 6 }],
]);
group("Görev listesi: yapay zeka yanıtı")([
  ["iki plan", { desc: "ardışık diğer işler birleşir", fn: () => cleanPlan({ tasks: [{ kind: "race", say: "X adında yarış oluştur", label: "X yarışı" }, { kind: "other", say: "yarın 10'da toplantı ekle", label: "Toplantı" }, { kind: "other", say: "Ali'ye yaz", label: "Ali'ye mesaj" }] }).length, ok: (n) => n === 2 }],
  ["bilinmeyen tür", { desc: "diğer sayılır", fn: () => cleanPlan({ tasks: [{ kind: "zzz", say: "a b", label: "" }] })[0], ok: (x) => x.kind === "other" && x.label === "İş" }],
  ["Mustafa'yı sporcularda bulamadım.", { desc: "başarısız", fn: failed, ok: (r) => r === true }],
  ["Kaydettim: Atatürk Kupası. Tarihleri ne?", { desc: "başarılı", fn: failed, ok: (r) => r === false }],
]);

// Yerelde öğrenme: yapay zekanın görev listesi cihazda saklanır, işlerin sözü öğrenilir, yapay zekasız liste kurulur
const { cachedPlan, rememberPlan, planKey, planLessons, learnedKind, localPlan } = await import("@/lib/taskPlan");
const { knownLesson } = await import("@/lib/brain/model");
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const TWO = [{ kind: "race", say: "Atatürk Kupası adında yarış oluştur", label: "Atatürk Kupası yarışı", from: "Atatürk Kupası adında bir yarış oluştur" }, { kind: "attendance", say: "yoklama: bugün Mustafa geldi", label: "Yoklama: Mustafa", from: "Bugün antrenmana Mustafa geldi" }];
group("Görev listesi: yerelde öğrenme")([
  ["aynı cümle", { desc: "ikinci kez yapay zekasız", fn: () => { const st = mem(); rememberPlan("Atatürk Kupası oluştur. Mustafa geldi!", TWO, st); return cachedPlan("atatürk kupası oluştur mustafa geldi", st); }, ok: (t) => t?.length === 2 && t[0].kind === "race" }],
  ["aynı söz, aynı sonuç", { desc: "depoya ikinci kez eklenmez", fn: () => knownLesson([{ x: "Bugün antrenmana Mustafa geldi.", l: "plan:attendance" }], "bugün ANTRENMANA mustafa geldi", "plan:attendance"), ok: (r) => r === true }],
  ["aynı söz, farklı sonuç", { desc: "yeni örnek olarak eklenir", fn: () => knownLesson([{ x: "Bugün antrenmana Mustafa geldi.", l: "plan:attendance" }], "bugün antrenmana mustafa geldi", "plan:log"), ok: (r) => r === false }],
  ["farklı söz", { desc: "eklenir", fn: () => knownLesson([{ x: "Mustafa geldi", l: "plan:attendance" }], "Ali geldi", "plan:attendance"), ok: (r) => r === false }],
  ["başka cümle", { desc: "kopya yok", fn: () => { const st = mem(); rememberPlan("a b c", TWO, st); return cachedPlan("x y z", st); }, ok: (t) => t === null }],
  ["tek iş", { desc: "saklanmaz", fn: () => { const st = mem(); rememberPlan("a b", TWO.slice(0, 1), st); return cachedPlan("a b", st); }, ok: (t) => t === null }],
  ["Bugün, ANTRENMANA   Mustafa geldi.", { desc: "anahtar", fn: planKey, ok: (k) => k === "bugün antrenmana mustafa geldi" }],
  ["dersler", { desc: "öğrenilecek sözler", fn: () => planLessons(TWO), ok: (l) => l.length === 2 && l[1].l === "plan:attendance" && l[1].x.includes("Mustafa") }],
  ["güvenli tahmin", { desc: "tür", fn: () => learnedKind({ label: "plan:post", score: 0.9, sim: 0.7 }), ok: (k) => k === "post" }],
  ["zayıf tahmin", { desc: "yok", fn: () => learnedKind({ label: "plan:post", score: 0.5, sim: 0.7 }), ok: (k) => k === null }],
  ["başka etiket", { desc: "yok", fn: () => learnedKind({ label: "create:plan", score: 0.9, sim: 0.9 }), ok: (k) => k === null }],
  [ATA, { desc: "yapay zekasız liste: yarış, yoklama, ödeme, gönderi", fn: (s) => localPlan(s, flowOf)?.map((t) => t.kind).join(","), ok: (k) => k === "race,attendance,income,post" }],
  ["yarın 10'da antrenman ekle", { desc: "tek iş: liste yok", fn: (s) => localPlan(s, flowOf), ok: (r) => r === null }],
  [SEY, { desc: "Seyhun'un cümlesi yapay zekasız: yarış, gönderi, yoklama", fn: (s) => localPlan(s, flowOf)?.map((t) => t.kind).join(","), ok: (k) => k === "race,post,attendance" }],
]);

// Sohbetteki yarış (raceNav.raceRef): ad > "son/geçen yarış" > "sıradaki yarış" > bu sohbette oluşturulan/açılan
const { raceRef } = await import("@/features/athletes/raceNav");
const RACES = [
  { id: "foca", name: "TYF Ligi Foça Ayağı", district: "Foça", startDate: "2026-09-20", endDate: "2026-09-22" },
  { id: "cesme", name: "Çeşme Optimist Kupası", district: "Çeşme", startDate: "2026-10-01", endDate: "2026-10-03" },
  { id: "ata", name: "Atatürk Kupası", district: "", startDate: "", endDate: "" },
  { id: "bodrum", name: "Bodrum Regatta", district: "Bodrum", startDate: "2026-11-05", endDate: "2026-11-08" },
];
const R = (ctx, want) => ({ desc: want ? `→ ${want}` : "yarış yok", fn: (s) => raceRef(s, RACES, "2026-10-09", ctx)?.race.id || null, ok: (id) => id === want });
group("Sohbetteki yarış")([
  ["son yarış için Instagram gönderisi hazırla", R("", "cesme")],
  ["geçen yarışın görselini hazırla", R("", "cesme")],
  ["sıradaki yarış için gönderi hazırla", R("", "bodrum")],
  ["Foça yarışı için gönderi hazırla", R("ata", "foca")],
  ["yarış görseli hazırla", R("ata", "ata")],
  ["bunun için Instagram gönderisi hazırla", R("ata", "ata")],
  ["Instagram'da yarış gönderisi hazırla", R("", null)],
  ["29 Ekim gönderisi hazırla", R("ata", null)],
  ["Atatürk Kupası için Instagram görseli hazırla", R("", "ata")],
]);

// Konuşma testleri (inceleme adım 5): tek cümle değil, birkaç adımlık konuşma. Her adımda asistanın bekleyen sorusu ve
// sohbet hafızası bir sonraki cümlenin yolunu değiştirir (uygulamadaki gibi: lib/assistRoute.js + lib/convoContext.js).
{
  const CX = await import("@/lib/convoContext");
  const base = { owner: true, isStaff: false, racer: true, att: true, path: "/", today, races, raceNames: races.map((r) => r.name), names, shop: true };
  // adımlar: [cümle, beklenen yol, bu cümleden sonra asistanın sorduğu soru / hafızaya yazdığı { ask, memo }]
  const talk = (steps) => () => {
    let ask = {};
    let memo = {};
    const got = [];
    for (const [s, , after = {}] of steps) {
      got.push(routeOf(s, { ...base, ...ask, memo }));
      ask = {};
      if (after.askTo) ask.askTo = after.askTo;
      if (after.invAsk) ask.invAsk = after.invAsk;
      if (after.drafts) ask.drafts = true;
      if (after.askedMore) ask.askedMore = true;
      if (after.memo) memo = CX.remember(memo, ...after.memo);
    }
    return got.join(" › ");
  };
  const T = (steps) => ({ desc: steps.map((x) => x[1]).join(" › "), fn: talk(steps), ok: (r) => r === steps.map((x) => x[1]).join(" › ") });
  group("Konuşma testleri")([
    ["alıcı sorusu", T([["ekibe mesaj gönder", "ai", { askTo: "ekip" }], ["yarın 10'da iskelede olun", "askTo"], ["yarın 10'da iskelede olun", "ai"]])],
    ["hangi fatura", T([["faturayı ödendi işaretle", "invoice", { invAsk: { op: "paid" } }], ["Turkcell", "invoice"], ["Turkcell", "ai"]])],
    ["sporcu ve gönderme", T([["Ali Kaya'yı sporcu olarak ekle", "athlete", { memo: ["athlete", "Ali Kaya"] }], ["onu arşive al", "athlete"]])],
    ["gönderme hafızasız", T([["onu arşive al", "ai"]])],
    ["bitiş", T([["yarın 10'da antrenman ekle", "ai", { askedMore: true }], ["yok", "close"]])],
    ["soru kapanır", T([["yarın 10'da antrenman ekle", "ai", { askedMore: true }], ["planlara git", "navigate"], ["yok", "ai"]])],
    ["taslak varken kaydet", T([["cumartesi tekne yıkama", "ai", { drafts: true }], ["kaydet", "ai"], ["kaydet", "bareSave"]])],
    ["yarış, sonra sayfa", T([["Çeşme Optimist Kupası yarışını aç", "raceOpen", { memo: ["race", "Çeşme Optimist Kupası"] }], ["planlara git", "navigate"], ["kapat", "close"]])],
  ]);
}

// Sesle söylenen, noktalaması az sıralı cümle (Seyhun'un ekran görüntüsü, 2026-10-09): tamamı yoklamaya gidiyordu
{
  const { clausesOf, looksMulti, localPlan } = await import("@/lib/taskPlan");
  const CUM = "29 Ekim Cumhuriyet yarışı oluştur. Yarış için görsel oluştur ve bugün antrenmana Mustafa katıldı, yoklamaya onu ekle.";
  group("Sıralı iş: fiilden sonra ve/virgül")([
    [CUM, { desc: "görev listesine gider", fn: (s) => looksMulti(s, flowOf), ok: (r) => r === true }],
    [CUM, { desc: "yapay zekasız liste: yarış, gönderi, yoklama", fn: (s) => localPlan(s, flowOf)?.map((t) => t.kind).join(","), ok: (k) => k === "race,post,attendance" }],
    ["Ali ve Ayşe geldi", { desc: "adlar bölünmez", fn: clausesOf, ok: (r) => r.length === 1 }],
    ["Ali geldi, Ayşe gelmedi", { desc: "yoklama iki cümlecik ama tek iş", fn: (s) => localPlan(s, flowOf), ok: (r) => r === null }],
    ["Yarış için görsel oluştur", { desc: "gönderi", fn: wantsPost, ok: (r) => r === true }],
    ["fişin fotoğrafını çek", { desc: "gönderi değil", fn: wantsPost, ok: (r) => r === false }],
  ]);
}

// Genel taramada bulunanlar (2026-10-09): noktalamasız sıralı işler, kesmesiz mesaj, "antreman", tek kişiye aidat hatırlatma
{
  const { actCount } = await import("@/lib/taskPlan");
  const { messageFirst } = await import("@/lib/steps");
  const { duesCommand } = await import("@/lib/assistMore");
  const { wantsAttendance } = await import("@/features/athletes/access");
  const { aboutLine } = await import("@/lib/assistTasks");
  group("Genel tarama düzeltmeleri")([
    ["29 Ekim Cumhuriyet yarışı oluştur yarış için görsel hazırla bugün antrenmana Mustafa katıldı", { desc: "noktalamasız: 3 iş fiili", fn: actCount, ok: (n) => n === 3 }],
    ["Enes aidatını nakit verdi Mehmet de geldi yoklamaya ekle", { desc: "ödeme + yoklama: 2 iş", fn: actCount, ok: (n) => n === 2 }],
    ["Mustafa geldi yoklamaya ekle", { desc: "yoklama tek iş", fn: actCount, ok: (n) => n === 1 }],
    ["Foça yarışı için Instagram gönderisi hazırla", { desc: "gönderisi isim, tek iş", fn: actCount, ok: (n) => n === 1 }],
    ["aidat hatırlatması gönder", { desc: "hatırlatması isim, tek iş", fn: actCount, ok: (n) => n === 1 }],
    ["aliye yaz faturayı ödedim", { desc: "kesmesiz mesaj", fn: messageFirst, ok: (r) => r === true }],
    ["mustafaya mesaj at antrenmana gelmedi diye merak ettim", { desc: "kesmesiz mesaj", fn: messageFirst, ok: (r) => r === true }],
    ["günlüğe yaz 12 knot imbat vardı", { desc: "günlük mesaj değil", fn: messageFirst, ok: (r) => r === false }],
    ["Gönderi hazırla. Ali'ye yaz yarın gelsin", { desc: "ilk cümle mesaj değil", fn: messageFirst, ok: (r) => r === false }],
    ["Mustafa'nın velisine yaz bugün gelmedi", { desc: "veliye mesaj", fn: messageFirst, ok: (r) => r === true }],
    ["bugün antremana Mustafa geldi", { desc: "antreman yazımı yoklama", fn: (s) => wantsAttendance(s, false), ok: (r) => r === true }],
    ["Enes aidatını ödemedi ona hatırlat", { desc: "tek kişi: toplu hatırlatma değil", fn: duesCommand, ok: (r) => r === null }],
    ["aidat hatırlatması gönder", { desc: "toplu hatırlatma", fn: duesCommand, ok: (r) => r?.op === "remind" }],
    ["yarınki toplantıyı sil", { desc: "bekleme yazısı düzgün", fn: aboutLine, ok: (r) => r === "Yarınki toplantı siliniyor" }],
    ["Ayşe'ye söyle ders programını göndersin", { desc: "mesajda alıcı", fn: aboutLine, ok: (r) => r === "Ayşe'ye mesaj yazılıyor" }],
  ]);
}

// Görev listesinin sırası: en kolayı (Seyhun: "illa kullanıcının sıralamasına göre olmak zorunda değil", 2026-10-09)
{
  const { orderPlan } = await import("@/lib/taskPlan");
  const kinds = (list) => orderPlan(list.map((kind, i) => ({ kind, say: `iş ${i}` }))).map((t) => t.kind).join(",");
  const says = (list) => orderPlan(list.map((kind, i) => ({ kind, say: `iş ${i}` }))).map((t) => t.say).join(",");
  group("Görev listesi sırası")([
    ["gönderi, yarış, yoklama", { desc: "yarış önce, gönderi en son", fn: () => kinds(["post", "race", "attendance"]), ok: (r) => r === "race,attendance,post" }],
    ["mesaj, yoklama, sayfa", { desc: "yoklama mesajdan önce, sayfa sonda", fn: () => kinds(["other", "nav", "attendance"]), ok: (r) => r === "attendance,other,nav" }],
    ["iki iş aynı tür", { desc: "aynı tür söylendiği sırada", fn: () => says(["other", "race", "other"]), ok: (r) => r === "iş 1,iş 0,iş 2" }],
    ["türsüz", { desc: "türsüz iş sırası değişmez", fn: () => orderPlan([{ say: "a" }, { say: "b" }]).map((t) => t.say).join(""), ok: (r) => r === "ab" }],
  ]);
}

// Denetim düzeltmeleri (2026-10-09): ✓/✗, sıra, önbellek, aynı ad, sığmayan işler
{
  const { failed, lastPagesPlan, cachedPlan, rememberPlan, cleanPlan, planCut, PLAN_MAX } = await import("@/lib/taskPlan");
  const { sameNamed } = await import("@/lib/names");
  const { soon } = await import("@/lib/soon");
  const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
  const TWO = [{ kind: "race", say: "a" }, { kind: "post", say: "b" }];
  const DAY = 24 * 3600 * 1000;
  group("Denetim düzeltmeleri")([
    ["Kaydettim: Atatürk Kupası. Mustafa'yı sporcularda bulamadım.", { desc: "başarıyla başlayan cevap ✓", fn: failed, ok: (r) => r === false }],
    ["Tamam, yoklamaya eklemedim.", { desc: "olumsuz fiil ✗", fn: failed, ok: (r) => r === true }],
    ["Enes aidat listesinde yok, kaydetmedim.", { desc: "kaydetmedim ✗", fn: failed, ok: (r) => r === true }],
    ["gönderi, yoklama, sayfa, yarış", { desc: "yapay zeka sırası korunur, gönderi ve sayfa sonda", fn: () => lastPagesPlan(["post", "attendance", "nav", "race"].map((kind) => ({ kind }))).map((t) => t.kind).join(","), ok: (r) => r === "attendance,race,nav,post" }],
    ["ertesi gün", { desc: "kopya yalnız aynı gün", fn: () => { const st = store(); rememberPlan("yarış oluştur gönderi hazırla", TWO, st); return cachedPlan("yarış oluştur gönderi hazırla", st, Date.now() + 2 * DAY); }, ok: (r) => r === null }],
    ["bunun için gönderi hazırla", { desc: "gönderme yapan cümle saklanmaz", fn: (s) => { const st = store(); rememberPlan(`yarış oluştur ${s}`, TWO, st); return cachedPlan(`yarış oluştur ${s}`, st); }, ok: (r) => r === null }],
    ["12 iş", { desc: `en çok ${PLAN_MAX}, fazlası sayılır`, fn: () => { const raw = { tasks: Array.from({ length: 12 }, (_, i) => ({ kind: i % 2 ? "race" : "post", say: `iş ${i}` })) }; return [cleanPlan(raw).length, planCut(raw)].join("/"); }, ok: (r) => r === `${PLAN_MAX}/2` }],
    ["Mustafa", { desc: "iki Mustafa: ikisi de", fn: (s) => sameNamed(s, ["Mustafa Ak", "Mustafa Kaya", "Enes Ay"]).join(","), ok: (r) => r === "Mustafa Ak,Mustafa Kaya" }],
    ["Mustafa Ak", { desc: "tek kişi: belirsiz değil", fn: (s) => sameNamed(s, ["Mustafa Ak", "Mustafa Kaya"]).length, ok: (n) => n === 0 }],
    ["yavaş yazma", { desc: "en çok bekleme süresi", fn: () => soon(new Promise((r) => setTimeout(r, 200)), 20), ok: (r) => r === "late" }],
    ["hızlı yazma", { desc: "onay", fn: () => soon(Promise.resolve(1), 200), ok: (r) => r === "ok" }],
    ["hızlı hata", { desc: "hata fırlatılır", fn: () => soon(Promise.reject(new Error("x")), 200).then(() => "ok", () => "err"), ok: (r) => r === "err" }],
  ]);
}

// Yanlış duyulmuş fiillerle çok işli cümle (Seyhun 2026-10-09: yalnız yoklama yapıldı)
{
  const { fixVerbs } = await import("@/lib/speech/normalize");
  const { actCount } = await import("@/lib/taskPlan");
  const { wantsPost } = await import("@/features/posts/postModel");
  const ILAY = "Atatürk Kupası yarışı oluru afişini hazirla ve bugün İlay antrenmana katıldı. onu yoklamaya ekle";
  group("Yanlış duyulan fiiller")([
    [ILAY, { desc: "düzeltilir", fn: fixVerbs, ok: (r) => r.startsWith("Atatürk Kupası yarışı oluştur afişini hazırla") }],
    [ILAY, { desc: "üç iş (yarış, afiş, yoklama)", fn: (s) => actCount(fixVerbs(s)), ok: (n) => n === 3 }],
    [ILAY, { desc: "görev listesi: yarış, yoklama, gönderi", fn: (s) => localPlan(fixVerbs(s), flowOf)?.map((t) => t.kind).join(","), ok: (k) => ["race", "attendance", "post"].every((x) => k?.includes(x)) }],
    ["afişini hazırla", { desc: "afiş gönderidir", fn: wantsPost, ok: (r) => r === true }],
    ["GSİM oluru alındı", { desc: "yarış dışında 'oluru' değişmez", fn: fixVerbs, ok: (r) => r === "GSİM oluru alındı" }],
  ]);
}

// Söylenenin temizlenmesi ve yoklama parçaları (tam test 2026-10-09: dolgu söz, kekemelik, Türkçe harfsiz, noktasız)
{
  const { cleanSay } = await import("@/lib/speech/normalize");
  const { looksMulti, actCount } = await import("@/lib/taskPlan");
  const { callCommand, duesCommand } = await import("@/lib/assistMore");
  const { wantsAttendance } = await import("@/features/athletes/access");
  group("Söylenenin temizlenmesi")([
    ["şey ııı Kapat.", { desc: "dolgu söz atılır", fn: cleanSay, ok: (r) => r === "Kapat." }],
    ["Tamam, Tamam, kapat.", { desc: "kekemelik", fn: cleanSay, ok: (r) => r === "Tamam, kapat." }],
    ["foca yarisini ac", { desc: "Türkçe harfsiz", fn: cleanSay, ok: (r) => r === "foça yarışını aç" }],
    ["yok lamaya aliyi ekle geldi", { desc: "bölünmüş kelime, tek iş", fn: (s) => actCount(cleanSay(s)), ok: (n) => n === 1 }],
    ["Yoklama al, Ali ve Ayşe geldi.", { desc: "tek yoklama, liste değil", fn: (s) => looksMulti(s, flowOf), ok: (r) => r === false }],
    ["Mustafa geldi, yoklamaya ekle.", { desc: "tek yoklama, liste değil", fn: (s) => looksMulti(s, flowOf), ok: (r) => r === false }],
    ["Yoklama al Mustafa geldi Yarın 10'da toplantı ekle", { desc: "noktasız: yoklama + toplantı", fn: (s) => localPlan(s, flowOf)?.map((t) => t.kind).join(","), ok: (k) => k === "attendance,other" }],
    ["Enes aidatını nakit verdi, Mehmet de geldi, yoklamaya ekle.", { desc: "'Mehmet de geldi' yoklamaya gider", fn: (s) => localPlan(s, flowOf)?.map((t) => t.kind).join(","), ok: (k) => k === "income,attendance" }],
    ["Gökhan Arslan'ı arar mısın?", { desc: "arama", fn: callCommand, ok: (r) => r?.who === "gökhan arslan'ı" || !!r }],
    ["bu ay kimler aidat vermedi", { desc: "aidat sorusu", fn: duesCommand, ok: (r) => r?.op === "ask" }],
    ["mustafa geldi mi antrenmana", { desc: "soru yoklama değil", fn: (s) => wantsAttendance(s), ok: (r) => r === false }],
  ]);
}

// Gerçek yapay zekanın yanlış türü (tam test 2026-10-09: "Yarın 10da antrenman planla" event geldi)
{
  const { cleanPlan } = await import("@/lib/taskPlan");
  group("Görev listesi: yanlış tür düzeltmesi")([
    ["Yarın 10da antrenman planla", { desc: "etkinlik değil, plan (other)", fn: (s) => cleanPlan({ tasks: [{ kind: "invoice", say: "Turkcell faturası ödendi" }, { kind: "event", say: s }] }).map((t) => t.kind).join(","), ok: (k) => k === "invoice,other" }],
    ["Cumartesi kamp planla", { desc: "kamp etkinliktir", fn: (s) => cleanPlan({ tasks: [{ kind: "event", say: s }] })[0].kind, ok: (k) => k === "event" }],
  ]);
  // Seyhun'un cümlesi (2026-10-09): günlük değil yoklama + not silme; "Uğraz" = Uraz
  const { isLogAnswer, matchNames } = await import("@/lib/trainingLog");
  const { cleanSay: clean2 } = await import("@/lib/speech/normalize");
  const SEY2 = "Uğraz, Efes, Duru antrenmana geldi. Bugün yoklamaya ekle onları. Onlarla ilgili oluşturduğun notu sil.";
  const ROS = [{ id: "u", studentName: "Uraz Kaya", status: "active" }, { id: "e", studentName: "Efes Duran", status: "active" }, { id: "g", studentName: "Gökhan Arslan", status: "active" }];
  group("Yoklama + not silme (günlük değil)")([
    [SEY2, { desc: "günlüğün eksik bilgisi sayılmaz", fn: isLogAnswer, ok: (r) => r === false }],
    [SEY2, { desc: "iki iş: yoklama + diğer (not silme)", fn: (s) => localPlan(s, () => null)?.map((t) => t.kind).join(","), ok: (k) => k === "attendance,other" }],
    ["Uğraz, Efes antrenmana geldi, yoklamaya ekle", { desc: "yapay zeka günlük dese de yoklama", fn: (s) => cleanPlan({ tasks: [{ kind: "log", say: s }, { kind: "other", say: "notu sil" }] })[0].kind, ok: (k) => k === "attendance" }],
    ["Uğraz", { desc: "Uraz Kaya (ğ duyuldu)", fn: (s) => matchNames([s], ROS).names[0], ok: (n) => n === "Uraz Kaya" }],
    ["Gökan", { desc: "Gökhan Arslan (h düştü)", fn: (s) => matchNames([s], ROS).names[0], ok: (n) => n === "Gökhan Arslan" }],
  ]);
  group("Söylenenin temizlenmesi (insan davranışı)")([
    ["yanlış söyledim kapat", { desc: "baştaki düzeltme sözü", fn: clean2, ok: (r) => r === "kapat" }],
    ["listeye süt ekle listeye süt ekle", { desc: "iki kez söylenen bir kez", fn: clean2, ok: (r) => r === "listeye süt ekle" }],
    ["listeye süt ekleyiver", { desc: "-iver kipi", fn: clean2, ok: (r) => r === "listeye süt ekle" }],
    ["Ali'yi arar mısın lütfen", { desc: "sondaki lütfen", fn: clean2, ok: (r) => r === "Ali'yi arar mısın" }],
  ]);
}
