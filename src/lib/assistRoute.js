// Asistan yönlendirmesi: söylenen cümle hangi işe gider? (inceleme adım 5: "önce anla, sonra yap")
// Saf işlev: cümle + bağlam → sıralı aday işler. AssistantSheet `run()` adayları sırayla dener (bir iş "bu benim değil"
// derse sonrakine geçer), testler (yerel/yonlendirme.mjs) aynı işlevi sınar; böylece test ile uygulama ayrışamaz.
// Bekleyen sorular (yarış sorusu, kişi, onay, günlük, taslak, kart) burada değil: onlar run()'da bu adaylardan önce
// (EARLY dışındakiler taslak/kart cevabından sonra) çözülür.
import { reportAsk } from "@/lib/assistReport";
import { testsAsk } from "@/features/tests/testWords";
import { chatOpAsk, isEnd, isNoMore, msgArchAsk, msgDeleteAsk, undoLast } from "@/lib/assistantLocal";
import { wantsLog, bareLog, isLogAnswer } from "@/lib/trainingLog";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsInventory } from "@/features/inventory/invWords";
import { athleteIn, fitLocal, guideWord, wantsFitness } from "@/lib/fitness/words";
import { fold } from "@/lib/fitness/exercises";
import { wantsFood } from "@/lib/fitness/food";
import { bodyCommand } from "@/lib/athleteBody";
import { wantsPost, wantsPostOpen } from "@/features/posts/postModel";
import { raceAsk, wantsRaceOpen, findRace, raceJobHere, wantsRaceText } from "@/features/athletes/raceNav";
import { wantsPerson } from "@/features/people/assistPerson";
import { localNavigate } from "@/lib/nav";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { parseBirthday } from "@/lib/birthdayParse";
import { invoiceCommand } from "@/lib/invoices";
import { payeeAsk } from "@/lib/payee";
import { shopCommand } from "@/features/shop/shopWords";
import { wantsAttendance } from "@/features/athletes/access";
import { messageFirst, isQuestion, wantsNote } from "@/lib/steps";
import { localCommand, localCreate } from "@/lib/commands";
import { matchesWant, readyCreateRow } from "@/lib/brain/readyData";
import { todayStr } from "@/lib/utils/format";
import { absentNotifyCommand, athleteCommand, athleteOpenCommand, personOpenCommand, birthdayDeleteCommand, callCommand, cashCommand, duesCommand, groupCreateCommand, hotelAddCommand, incomeCommand, invoiceTaskCommand, personDeleteCommand, raceHereCommand, receiptPayCommand, receiptScopeCommand, shopClearCommand } from "@/lib/assistMore";
import { matchPerson } from "@/lib/names";
import { isPronoun } from "@/lib/convoContext";
import { versionAsk } from "@/lib/buildInfo";
import { updateAsk } from "@/lib/newVersion";
import { inboxClearAsk } from "@/lib/inbox";
import { resultsAsk } from "@/lib/resultSheet";
import { debtAsk, debtCommand } from "@/lib/debts";
import { wordCommand } from "@/lib/englishWords";
import { timerCommand, windCommand } from "@/lib/raceLive";
import { resultCommand } from "@/lib/raceVoice";
import { attQueryAsk } from "@/lib/attQuery";
import { clubAsk } from "@/lib/clubAsk";
import { infoAsk } from "@/lib/infoAsk";

// Soru gibi (soru cümlesi ya da "göster", "listele", "özetle"): yerel akışlara cevap sayılmaz
export const QUESTION = { test: (s) => isQuestion(s) || /(?<![\p{L}])(ne var|göster\p{L}*|listele\p{L}*|özetle\p{L}*)(?![\p{L}])/u.test(String(s || "").toLocaleLowerCase("tr-TR")) };

// Var olan kaydı değiştiren istek (sil, iptal, ertele, tamamla…): tür sayfasında da yeni kayıt sanılmaz (prefer'e girmez)
export const CHANGE = { test: (s) => /(?<![\p{L}])(sil|siler|silin|sile|silelim|kaldır\p{L}*|iptal|ertele\p{L}*|tamamla\p{L}*|bitti|bitir\p{L}*|yapıldı|değiştir\p{L}*|güncelle\p{L}*|kaydır\p{L}*|öne al\p{L}*)(?![\p{L}])/u.test(String(s || "").toLocaleLowerCase("tr-TR")) };

// Taslak yokken yalnız "kaydet": yapay zekaya gitmez (kaydetmeden "kaydettim" diyebiliyordu)
export const BARE_SAVE = /^(kaydet|kaydeder misin|kaydedebilirsin|kaydet gitsin|onayla)[\s.!]*$/i;

// Bekleyen taslak/kart cevabından ÖNCE denenen işler (antrenman günlüğü, etkinlik, envanter kendi akışlarında kalır)
// Yapay zeka önce: Hazır cevaplar (c.quick, lib/quickMode.js) kapalıyken soru ve kayıt cümleleri yerel kurallarla
// cevaplanmaz; yerelde yalnız cihaz işleri kalır. yonlendirme.js'deki hızlı özet de aynı düğmeye bağlı.
const DEVICE = new Set(["receipt", "meeting", "navigate"]);
export const EARLY = new Set(["close", "report", "tests", "logBare", "log", "event", "inventory", "food", "fitness"]);

// Son eklenen işlerin (assistMore.js) hangisi: test ve öğrenme kaydı için ad; uygulamada runMore kendisi seçer
export function moreKind(s, c = {}) {
  const { owner, racer, path = "", names = [] } = c;
  const onRace = /^\/athletes\/races\/[\w-]+$/.test(path) && !/\/new$/.test(path);
  // "Bugünkü antrenmana kimler katıldı", "Ali dün geldi mi": yoklamadan cevap (plan değil)
  if (racer && attQueryAsk(s, c.today || "2000-01-01")) return "attQuery";
  // "kaç sporcumuz var", "sıradaki yarış ne zaman", "yaklaşan doğum günleri", "Ali'nin velisi kim", "Ali kaç yaşında"
  const ca = clubAsk(s);
  if (ca && (ca.kind === "birthdays" || racer)) return "clubAsk";
  // "ödenmemiş faturalar neler", "bu ay ne kadar harcadık", "okunmamış mesajım var mı"
  const ia = infoAsk(s, c.today || "2000-01-01");
  if (ia && (ia.kind !== "invoices" || owner)) return "infoAsk";
  if (racer && timerCommand(s)) return "raceTimer";
  if (owner && racer && windCommand(s)) return "raceWind";
  if (onRace && racer && raceHereCommand(s)) return "raceHere";
  if (owner && racer && !onRace && resultCommand(s)) return "trainResult";
  if (owner && receiptPayCommand(s)) return "receiptPay";
  if (owner && receiptScopeCommand(s)) return "receiptScope";
  if (owner && racer && absentNotifyCommand(s)) return "absent";
  if (shopClearCommand(s)) return "shopClear";
  if (birthdayDeleteCommand(s)) return "bdayDelete";
  if (owner && personDeleteCommand(s)) return "personDelete";
  if (groupCreateCommand(s)) return "groupCreate";
  if (onRace && racer && hotelAddCommand(s)) return "hotel";
  const bc = owner && racer ? bodyCommand(s) : null;
  if (bc && (bc.explicit || bc.op === "ask" || matchPerson(bc.name, names))) return "athleteBody";
  const po = owner && personOpenCommand(s);
  if (po && matchPerson(po.name, names)) return "personOpen";
  const ao = racer && athleteOpenCommand(s);
  if (ao && matchPerson(ao.name, names)) return "athleteOpen";
  if (owner && invoiceTaskCommand(s)) return "invoiceTask";
  const cc = callCommand(s);
  if (cc?.hotel && onRace) return "call";
  if (cc && !cc.hotel && matchPerson(cc.who, names)) return "call";
  if (owner && racer && duesCommand(s)) return "dues";
  if (owner && (cashCommand(s) || incomeCommand(s, c.today))) return "income";
  const ac = owner && racer ? athleteCommand(s) : null;
  if (ac && (ac.op === "add" || ac.explicit || matchPerson(ac.name, names) || (isPronoun(ac.name) && c.memo?.athlete))) return "athlete";
  return "";
}

// c: { owner (ana hesap), isStaff, racer (sporcu/yarış yetkisi), athleteSide (sporcu/veli/öğrenci), att (yoklama yetkisi),
//      guide (adım adım antrenman ekranı açık), myFit (sporcunun kendi fitness planı var), myFitToday (bugün var),
//      fitPeople (ana hesap: fitness planı olan sporcular [{ uid, name }]),
//      path, today, races, raceNames, names (kişi adları), logHere, invPage, fitHere (Fitness sayfası ya da açık fitness planı), foodHere (Fitness › Beslenme), attHere, curRace, onPost, drafts (taslak var), pending (onay kartı var),
//      chatHere (sohbet ekranı açık), askedMore, invAsk, askTo, prefer, skipRace, shop (alışveriş listesi var), focus (açık kayıt/sohbet), memo (sohbet hafızası), plans, tasks, notes }
// Dönen: [{ id, ...veri }] uygulanacak sırayla; son aday her zaman { id: "ai" }
export function routesOf(s, c = {}) {
  const out = [];
  const add = (id, data) => out.push({ id, ...data });
  const mf = messageFirst(s);
  const { owner, isStaff, racer, athleteSide, path = "", today = "" } = c;
  const nav = (x) => localNavigate(x, { names: c.names || [] });
  // Adım adım antrenman ekranı açık: "tamam", "sonraki", "bu hareketi atla" ekrandaki antrenmanı yürütür
  if (c.guide && guideWord(s)) add("guide");
  if ((isEnd(s) && !mf) || (c.askedMore && isNoMore(s))) add("close");
  if (!mf && updateAsk(s)) add("appUpdate");
  if (!mf && versionAsk(s)) add("version");
  // "Rapor oluştur": bugün asistana söylenenlerin raporu (lib/assistReport.js), Asistan raporu sayfası açılır
  if (reportAsk(s)) add("report");
  // "Testleri çalıştır" / "testleri aç": Testler sayfası (ana hesap), çalıştırınca telefondaki testlerin hepsi başlar
  const ta = owner && !mf ? testsAsk(s) : null;
  if (ta) add("tests", { run: ta === "run" });
  if (!mf && inboxClearAsk(s)) add("inboxClear");
  // Ana hesap: "Ali ile konuşmayı arşivle", "Ali'yle sohbeti herkes için sil" (silme onaylı; ChatProvider archive/deleteChat)
  const co = owner && !c.drafts ? chatOpAsk(s) : null;
  if (co) add("chatOp", { co });
  // Fitness sayfasında ya da açık fitness planında "bugünkü antrenmanı yaptım" fitness'tır, yelken günlüğü değil
  const fitFirst = c.fitHere && owner && !isStaff && wantsFitness(s, true);
  if (!mf && !athleteSide && !fitFirst && wantsLog(s) && bareLog(s)) add("logBare");
  if (!mf && !athleteSide && !fitFirst && (wantsLog(s) || (c.logHere && isLogAnswer(s)))) add("log");
  if (!mf && !isStaff && wantsEvent(s)) add("event");
  if (!mf && !isStaff && wantsInventory(s, !!c.invPage) && !nav(s)) add("inventory");
  // "Mete'nin kilosu 52" sporcunun ölçümüdür: Fitness sayfasında da beslenme/fitness'a gitmez
  const bodyFirst = owner && racer && bodyCommand(s)?.explicit;
  // Beslenme fitness'tan önce: Fitness sayfasında "öğlen tavuk pilav yedim", "kilom 82" yemek/kilo kaydıdır
  if (!mf && !bodyFirst && owner && !isStaff && wantsFood(s, !!c.foodHere) && !nav(s)) add("food");
  // Ana hesap: "sporcular bugün antrenman yaptı mı" her yerde. Sporcu (antrenörün hazırladığı programı varsa):
  // "bugünkü antrenmanım ne", "antrenmana başla", "bu hafta kaç antrenman yaptım"; yaptım/atladım bugün fitness antrenmanı varsa
  const fl = !mf ? fitLocal(s) : null;
  const myFitOp = isStaff && c.myFit && fl && (["today", "start", "stats"].includes(fl.op) || (c.myFitToday && ["done", "skip"].includes(fl.op)));
  // Ana hesap: "Ali bu hafta kaç antrenman yaptı" (Ali'nin fitness planı varsa)
  const fitWho = owner && !isStaff && c.fitPeople?.length && athleteIn(s, c.fitPeople) && /\b(antrenman|idman|fitness)\w*/.test(fold(s)) && /\b(yapt|yapmis|yapmadi|kac\b|durum)/.test(fold(s));
  if (!mf && !bodyFirst && ((owner && !isStaff && (wantsFitness(s, !!c.fitHere) || fl?.op === "athletes" || fitWho)) || (isStaff && c.myFit && (myFitOp || wantsFitness(s, !!c.fitHere)))) && !nav(s)) add("fitness");
  if (!c.drafts && !c.pending && BARE_SAVE.test(s)) add("bareSave");
  // "Atatürk Kupası'nın görselini aç": yarışın kayıtlı gönderisi açılır (yarış sayfası değil)
  if (!mf && owner && !isStaff && racer && wantsPostOpen(s)) add("postOpen");
  if (!mf && !isStaff && !c.onPost && wantsPost(s)) add("post");
  const ra = !mf && owner && racer ? resultsAsk(s) : null;
  if (ra) add("results", { ra });
  if (racer && (raceAsk(s) || (wantsRaceOpen(s) && /yarış|regat/i.test(s) && findRace(s, c.races || [], today)))) add("raceOpen");
  if (wantsPerson(s) && !(owner && racer && athleteCommand(s)?.op === "add")) add("person");
  const po = owner && personOpenCommand(s);
  const n = !(racer && athleteOpenCommand(s)) && !(po && matchPerson(po.name, c.names || [])) && nav(s);
  if (n) add("navigate", { nav: n });
  // Borçlar (yalnız ana hesap): "Ali'ye 500 lira borç verdim", "Ali borcunu ödedi", "kime ne kadar borç verdim"
  const dq = owner && !isStaff ? debtAsk(s) : null;
  const dc = !dq && !mf && owner && !isStaff ? debtCommand(s) : null;
  if (dq || dc) add("debt", { dq, dc });
  // İngilizce kelime çalışma: "resilient kelimesini ekle, bana çalıştır", "X kelimesini öğrendim", "çalıştığım kelimeler neler"
  const wc = !mf && !athleteSide ? wordCommand(s) : null;
  if (wc) add("words", { wc });
  if (c.onPost) add("postEdit");
  if (!mf && wantsSchedule(s, path === "/schedule")) add("schedule");
  const bday = !mf && !wantsNote(s) && !/(sil|kaldır)\p{L}*[\s.!]*$/u.test(s) && !/\?\s*$|ne zaman|kaçında|hangi gün|kaç yaş|(?<![\p{L}])(kim|kimin|kimler|kimlerin|yaklaş\p{L}*|var mı|neler)(?![\p{L}])/iu.test(s) && parseBirthday(s);
  if (bday) add("birthday", { bday });
  // "Son mesajımı sil": açık sohbette (yoksa en son mesaj attığın sohbette) onay sorulup silinir
  const ma = !c.drafts ? msgArchAsk(s) : null;
  if (ma) add("msgArch", { ma });
  const md = !c.drafts && !ma ? msgDeleteAsk(s) : null;
  if (md) add("msgDelete", { md });
  const undo = !c.drafts && undoLast(s);
  if (undo) add("undo", { undo });
  const ia = c.invAsk;
  const ic = !isStaff && !c.drafts && !mf && !isQuestion(s) ? invoiceCommand(s) || (ia && !QUESTION.test(s) && s.split(" ").length <= 6 ? { ...ia, t: s } : null) : null;
  if (ic) add("invoice", { ic, asked: !!ia });
  const pq = !isStaff && owner && !c.drafts ? payeeAsk(s, today) : null;
  if (pq) add("payee", { pq });
  if (!mf && !c.drafts) add("more", { kind: moreKind(s, c) });
  const sc = c.shop ? shopCommand(s) : null;
  if (sc) add("shopping", { sc });
  if (c.askTo && !QUESTION.test(s)) add("askTo");
  if (!mf && c.att && wantsAttendance(s, !!c.attHere)) add("attendance");
  if (racer && !mf && !c.skipRace && (wantsRaceText(s, c.raceNames || []) || (c.curRace && raceJobHere(s)))) add("race");
  if (c.prefer && !c.drafts && !QUESTION.test(s) && !mf && !CHANGE.test(s)) add("prefer");
  const toFocus = !!c.focus && /(^|\s)(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)(\s*[:,]|[.!]?\s*$|\s)/i.test(s);
  // Yapay zeka önce (Seyhun 2026-10-21: "uygulama içinde cevaplar doğru olmuyor, kesinlikle yapay zekaya
  // göndermeliyiz"): kayıt, tamamlama, özet gibi işleri yapay zeka anlar; yerelde yalnız cihaz işleri kalır
  // (fiş kamerası, toplantı kaydı, sayfa açma). Hazır kalıplar (src/data/hazir-kaliplar.json) yalnız Hazır cevaplar açıkken.
  // Öğrenilen hazır kalıplar (yapay zekanın öğrenme kaydı, brain/aiPatterns.js) da yalnız Hazır cevaplar açıkken
  const rc = c.quick && !toFocus && !mf && !c.drafts ? readyCreate(s, today || undefined) || learnedCreate(s, c.learned, today || undefined) : null;
  const lc = rc || (!toFocus && localCommand(s, { plans: c.plans || [], tasks: c.tasks || [], notes: c.notes || [] }, undefined, { aiFirst: true }));
  const cmd = lc && (c.quick || DEVICE.has(lc.type)) ? lc : null;
  if (cmd) add("local", { cmd });
  add("ai", { toFocus });
  return out;
}

// Hazır kalıp kaydı: { type: "create", items, ready: true } ya da null
export function readyCreate(s, today = todayStr()) {
  const row = readyCreateRow(s);
  if (!row) return null;
  const cmd = localCreate(s, today);
  return matchesWant(cmd, row.want, today) ? { ...cmd, ready: true } : null;
}

// Öğrenilen kalıp kaydı: cümle hazır bir kalıba uyuyorsa kayıt kural motoruyla çıkarılır; türü kalıbın türü olmalı,
// kalıbın başlığı varsa başlıkta geçmeli (tutmazsa yapay zekaya gider). learned: store.js learnedReady
const KIND_OF = { "create:plan": "plan", "create:task": "task", "create:note": "note" };
export function learnedCreate(s, learned, today = todayStr()) {
  const hit = typeof learned === "function" ? learned(s) : null;
  if (!hit) return null;
  const cmd = localCreate(s, today);
  const items = cmd?.type === "create" ? cmd.items || [] : [];
  if (items.length !== 1 || items[0].type !== KIND_OF[hit.row.l]) return null;
  const want = fold(hit.slots["başlık"] || "");
  if (want && !fold(items[0].title || items[0].body || "").includes(want)) return null;
  return { ...cmd, ready: true, learned: hit.row.key };
}

// İlk aday (yapay zekasız tahmin): testler ve öğrenme için. "more" adayında yalnız tanınan iş sayılır.
export function routeOf(s, c = {}) {
  for (const r of routesOf(s, c)) {
    if (r.id === "more") {
      if (r.kind) return r.kind;
      continue;
    }
    if (r.id === "shopping") return r.sc.op === "add" || r.sc.op === "read" ? "shopping" : "shopping(mark)";
    if (r.id === "local") return r.cmd.type === "receipt" ? "receiptCam" : r.cmd.type === "meeting" ? "meeting" : r.cmd.type === "navigate" ? "navigate" : `local:${r.cmd.type}`;
    if (r.id === "logBare") return "log";
    if (r.id === "debt") return r.dq ? "debt(ask)" : `debt(${r.dc.op})`;
    if (r.id === "words") return `words(${r.wc.op})`;
    return r.id;
  }
  return "ai";
}
