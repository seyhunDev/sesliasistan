// Asistan yönlendirmesi: söylenen cümle hangi işe gidiyor? AssistantSheet.jsx içindeki run() sırası (boş sohbet, taslak/kart yok)
// burada birebir taklit edilir: kapatma → günlük → etkinlik → envanter → gönderi → yarış açma → kişi → sayfa → ders programı →
// doğum günü → geri al → fatura → ödeme sorusu → son eklenenler (arama, aidat, nakit gelir, sporcu) → alışveriş → yoklama → yarış → yerel komut → ana yapay zeka.
// run() sırası değişirse bu dosya da değişir. Yapay zekaya gidenlerde ön cevabın (precue) doğru işi söylemesi de sınanır.
// Tek tek parçaların testleri asistan.mjs'te; burası parçaların birbirini yutmadığını (karışma) sınar. 2026-10-06 denetimi.
import { isEnd, isNoMore, undoLast } from "@/lib/assistantLocal";
import { wantsLog, bareLog, isLogAnswer } from "@/lib/trainingLog";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsInventory } from "@/features/inventory/invWords";
import { wantsPost } from "@/features/posts/postModel";
import { raceAsk, wantsRaceOpen, findRace, raceJobHere, wantsRaceText as wantsRace } from "@/features/athletes/raceNav";
import { wantsPerson } from "@/features/people/assistPerson";
import { localNavigate } from "@/lib/nav";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { parseBirthday } from "@/lib/birthdayParse";
import { invoiceCommand } from "@/lib/invoices";
import { payeeAsk } from "@/lib/payee";
import { shopCommand } from "@/features/shop/shopWords";
import { wantsAttendance } from "@/features/athletes/access";
import { messageFirst, isQuestion, wantsNote } from "@/lib/steps";
import { localCommand } from "@/lib/commands";
import { precue } from "@/lib/precue";
import { TASKS } from "@/lib/assistTasks";
import { athleteCommand, callCommand, duesCommand, incomeCommand } from "@/lib/assistMore";
import { matchPerson } from "@/lib/names";
import { todayStr } from "@/lib/utils/format";
import { suite } from "./ortak.mjs";

const today = todayStr();
const races = [
  { id: "r1", name: "TYF Yelken Ligi ILCA 1. Ayak MW Phokaia Beach Resort Kupası", district: "Foça", startDate: "2026-10-26", endDate: "2026-10-31" },
  { id: "r2", name: "Coupe D'Azur Optimist", district: "Cannes", startDate: "2027-02-12", endDate: "2027-02-16" },
  { id: "r3", name: "Çeşme Optimist Kupası", district: "Çeşme", startDate: "2026-11-07", endDate: "2026-11-11" },
];
const names = ["Ali Kaya", "Ayşe Yılmaz", "Gökhan Demir", "Zeynep Ak", "Emre Şahin", "Mehmet Öz"];
const BARE_SAVE = /^(kaydet|kaydeder misin|kaydedebilirsin|kaydet gitsin|onayla)[\s.!]*$/i;
const FOCUS_MSG = /(^|\s)(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)(\s*[:,]|[.!]?\s*$|\s)/i;

// ctx: { owner: true (ana hesap) | false (çalışan), athlete: sporcu/veli/öğrenci, path }
function route(s, ctx = {}) {
  const owner = ctx.owner !== false && !ctx.athlete;
  const isStaff = !owner;
  const racer = owner; // yarış/yoklama yetkisi yalnız Seyhun'un e-postasında (NEXT_PUBLIC_SPORCU_EMAILS)
  const path = ctx.path || "/";
  const athleteSide = !!ctx.athlete;
  const nav = (x) => localNavigate(x, { names });
  const mf = messageFirst(s);
  if (isEnd(s) && !mf) return "close";
  if (ctx.askedMore && isNoMore(s)) return "close";
  if (!mf && !athleteSide && wantsLog(s) && bareLog(s)) return "log";
  if (!mf && !athleteSide && (wantsLog(s) || (path === "/training" && isLogAnswer(s)))) return "log";
  if (!mf && !isStaff && wantsEvent(s)) return "event";
  if (!mf && !isStaff && wantsInventory(s, path.startsWith("/inventory")) && !nav(s)) return "inventory";
  if (BARE_SAVE.test(s)) return "bareSave";
  if (!mf && !isStaff && !path.startsWith("/posts/") && wantsPost(s)) return "post";
  if (racer && (raceAsk(s) || (wantsRaceOpen(s) && /yarış|regat/i.test(s) && findRace(s, races, today)))) return "raceOpen";
  if (wantsPerson(s) && !(owner && racer && athleteCommand(s)?.op === "add")) return owner ? "person" : "person(yetkisiz)";
  const n = nav(s);
  if (n) return "navigate";
  if (!mf && wantsSchedule(s, path === "/schedule")) return "schedule";
  const bday = !mf && !wantsNote(s) && !/\?\s*$|ne zaman|kaçında|hangi gün|kaç yaş/iu.test(s) && parseBirthday(s);
  if (bday) return "birthday";
  if (undoLast(s)) return "undo";
  if (!isStaff && !mf && !isQuestion(s) && invoiceCommand(s)) return "invoice";
  if (!isStaff && owner && payeeAsk(s, today)) return "payee";
  // runMore (assistMore.js): kişi adları burada sporcu adı yerine de geçer
  if (!mf) {
    const cc = callCommand(s);
    if (cc?.hotel && /^\/athletes\/races\/r/.test(path)) return "call";
    if (cc && !cc.hotel && matchPerson(cc.who, names)) return "call";
    if (owner && racer && duesCommand(s)) return "dues";
    if (owner && incomeCommand(s, today)) return "income";
    const ac = owner && racer ? athleteCommand(s) : null;
    if (ac && (ac.op === "add" || ac.explicit || matchPerson(ac.name, names))) return "athlete";
  }
  const sc = shopCommand(s);
  if (sc) return sc.op === "add" || sc.op === "read" ? "shopping" : "shopping(mark)";
  if (!mf && racer && wantsAttendance(s, path === "/athletes/attendance")) return "attendance";
  const curRace = /^\/athletes\/races\/([\w-]+)$/.exec(path)?.[1];
  if (racer && !mf && (wantsRace(s, races.map((r) => r.name)) || (curRace && curRace !== "new" && raceJobHere(s)))) return "race";
  const toFocus = false && FOCUS_MSG.test(s);
  const cmd = !toFocus && localCommand(s, { plans: [], tasks: [], notes: [] }, undefined, { aiFirst: true });
  if (cmd) return cmd.type === "receipt" ? "receiptCam" : cmd.type === "meeting" ? "meeting" : cmd.type === "navigate" ? "navigate" : `local:${cmd.type}`;
  return "ai";
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
const PATH = { undo: "undo", birthday: "birthday", payee: "payee", navigate: "navigate", receiptCam: "receiptCam", meeting: "meeting", close: "close", attendance: "attendance", log: "log", raceOpen: "raceOpen", race: "race", inventory: "inventory", invoice: "invoice", post: "post", event: "event", schedule: "schedule", person: "person", shopping: "shopping", call: "call", dues: "dues", income: "income", athlete: "athlete" };
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
  shopping: ["listeye süt ekle", "alışveriş listesine ekmek ve yumurta ekle", "alışveriş listesini oku", "listeden sütü sil"],
};

// Görevler arası karışma ihtimali olan cümleler: beklenen görev ve neden
const CROSS = [
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
const STAFF = { desc: "çalışanda yalnız ana hesaba açık akış başlamaz", fn: (s) => route(s, { owner: false }), ok: (r) => !["inventory", "event", "post", "person", "invoice", "payee", "attendance", "race", "raceOpen", "dues", "income", "athlete"].includes(r) };
group("Yönlendirme: çalışan hesabı")(["envantere 3 Optimist teknesi ekle", "kamp planı yapmak istiyorum", "Foça yarışı için Instagram gönderisi hazırla", "bu ay ne kadar ödeme aldım", "Turkcell faturası ödendi", "yoklama al, Ali geldi", "Foça yarışını aç", "aidat hatırlatması gönder", "Ahmet'ten 2000 lira bağış geldi", "Ali Kaya'yı arşive al"].map((s) => [s, STAFF]));
