// Asistan yönlendirmesi: söylenen cümle hangi işe gider? (inceleme adım 5: "önce anla, sonra yap")
// Saf işlev: cümle + bağlam → sıralı aday işler. AssistantSheet `run()` adayları sırayla dener (bir iş "bu benim değil"
// derse sonrakine geçer), testler (yerel/yonlendirme.mjs) aynı işlevi sınar; böylece test ile uygulama ayrışamaz.
// Bekleyen sorular (yarış sorusu, kişi, onay, günlük, taslak, kart) burada değil: onlar run()'da bu adaylardan önce
// (EARLY dışındakiler taslak/kart cevabından sonra) çözülür.
import { isEnd, isNoMore, undoLast } from "@/lib/assistantLocal";
import { wantsLog, bareLog, isLogAnswer } from "@/lib/trainingLog";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsInventory } from "@/features/inventory/invWords";
import { wantsPost } from "@/features/posts/postModel";
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
import { localCommand } from "@/lib/commands";
import { absentNotifyCommand, athleteCommand, athleteOpenCommand, birthdayDeleteCommand, callCommand, duesCommand, groupCreateCommand, hotelAddCommand, incomeCommand, invoiceTaskCommand, personDeleteCommand, raceHereCommand, receiptPayCommand, shopClearCommand } from "@/lib/assistMore";
import { matchPerson } from "@/lib/names";
import { isPronoun } from "@/lib/convoContext";

// Soru gibi (soru cümlesi ya da "göster", "listele", "özetle"): yerel akışlara cevap sayılmaz
export const QUESTION = { test: (s) => isQuestion(s) || /(?<![\p{L}])(ne var|göster\p{L}*|listele\p{L}*|özetle\p{L}*)(?![\p{L}])/u.test(String(s || "").toLocaleLowerCase("tr-TR")) };

// Taslak yokken yalnız "kaydet": yapay zekaya gitmez (kaydetmeden "kaydettim" diyebiliyordu)
export const BARE_SAVE = /^(kaydet|kaydeder misin|kaydedebilirsin|kaydet gitsin|onayla)[\s.!]*$/i;

// Bekleyen taslak/kart cevabından ÖNCE denenen işler (antrenman günlüğü, etkinlik, envanter kendi akışlarında kalır)
export const EARLY = new Set(["close", "logBare", "log", "event", "inventory"]);

// Son eklenen işlerin (assistMore.js) hangisi: test ve öğrenme kaydı için ad; uygulamada runMore kendisi seçer
export function moreKind(s, c = {}) {
  const { owner, racer, path = "", names = [] } = c;
  const onRace = /^\/athletes\/races\/[\w-]+$/.test(path) && !/\/new$/.test(path);
  if (onRace && racer && raceHereCommand(s)) return "raceHere";
  if (owner && receiptPayCommand(s)) return "receiptPay";
  if (owner && racer && absentNotifyCommand(s)) return "absent";
  if (shopClearCommand(s)) return "shopClear";
  if (birthdayDeleteCommand(s)) return "bdayDelete";
  if (owner && personDeleteCommand(s)) return "personDelete";
  if (groupCreateCommand(s)) return "groupCreate";
  if (onRace && racer && hotelAddCommand(s)) return "hotel";
  const ao = racer && athleteOpenCommand(s);
  if (ao && matchPerson(ao.name, names)) return "athleteOpen";
  if (owner && invoiceTaskCommand(s)) return "invoiceTask";
  const cc = callCommand(s);
  if (cc?.hotel && onRace) return "call";
  if (cc && !cc.hotel && matchPerson(cc.who, names)) return "call";
  if (owner && racer && duesCommand(s)) return "dues";
  if (owner && incomeCommand(s, c.today)) return "income";
  const ac = owner && racer ? athleteCommand(s) : null;
  if (ac && (ac.op === "add" || ac.explicit || matchPerson(ac.name, names) || (isPronoun(ac.name) && c.memo?.athlete))) return "athlete";
  return "";
}

// c: { owner (ana hesap), isStaff, racer (sporcu/yarış yetkisi), athleteSide (sporcu/veli/öğrenci), att (yoklama yetkisi),
//      path, today, races, raceNames, names (kişi adları), logHere, invPage, attHere, curRace, onPost, drafts (taslak var), pending (onay kartı var),
//      askedMore, invAsk, askTo, prefer, skipRace, shop (alışveriş listesi var), focus (açık kayıt/sohbet), memo (sohbet hafızası), plans, tasks, notes }
// Dönen: [{ id, ...veri }] uygulanacak sırayla; son aday her zaman { id: "ai" }
export function routesOf(s, c = {}) {
  const out = [];
  const add = (id, data) => out.push({ id, ...data });
  const mf = messageFirst(s);
  const { owner, isStaff, racer, athleteSide, path = "", today = "" } = c;
  const nav = (x) => localNavigate(x, { names: c.names || [] });
  if ((isEnd(s) && !mf) || (c.askedMore && isNoMore(s))) add("close");
  if (!mf && !athleteSide && wantsLog(s) && bareLog(s)) add("logBare");
  if (!mf && !athleteSide && (wantsLog(s) || (c.logHere && isLogAnswer(s)))) add("log");
  if (!mf && !isStaff && wantsEvent(s)) add("event");
  if (!mf && !isStaff && wantsInventory(s, !!c.invPage) && !nav(s)) add("inventory");
  if (!c.drafts && !c.pending && BARE_SAVE.test(s)) add("bareSave");
  if (!mf && !isStaff && !c.onPost && wantsPost(s)) add("post");
  if (racer && (raceAsk(s) || (wantsRaceOpen(s) && /yarış|regat/i.test(s) && findRace(s, c.races || [], today)))) add("raceOpen");
  if (wantsPerson(s) && !(owner && racer && athleteCommand(s)?.op === "add")) add("person");
  const n = !(racer && athleteOpenCommand(s)) && nav(s);
  if (n) add("navigate", { nav: n });
  if (c.onPost) add("postEdit");
  if (!mf && wantsSchedule(s, path === "/schedule")) add("schedule");
  const bday = !mf && !wantsNote(s) && !/(sil|kaldır)\p{L}*[\s.!]*$/u.test(s) && !/\?\s*$|ne zaman|kaçında|hangi gün|kaç yaş/iu.test(s) && parseBirthday(s);
  if (bday) add("birthday", { bday });
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
  if (c.prefer && !c.drafts && !QUESTION.test(s)) add("prefer");
  const toFocus = !!c.focus && /(^|\s)(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)(\s*[:,]|[.!]?\s*$|\s)/i.test(s);
  const cmd = !toFocus && localCommand(s, { plans: c.plans || [], tasks: c.tasks || [], notes: c.notes || [] }, undefined, { aiFirst: true });
  if (cmd) add("local", { cmd });
  add("ai", { toFocus });
  return out;
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
    return r.id;
  }
  return "ai";
}
