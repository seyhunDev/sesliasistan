// Asistanın beyni: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { waMode } from "@/lib/steps";
import { PAGES } from "@/lib/assistantLocal";
import { historyFor, draftFor, memoFor } from "@/lib/convoContext";
import { athleteNames } from "@/features/athletes/data";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { loadFixes, learnFixes } from "@/lib/sttFixes";
import { wantsPost } from "@/features/posts/postModel";
import { wantsRace } from "@/features/athletes/assistRace";
import { wantsAttendance } from "@/features/athletes/access";
import { absentNotifyCommand, cashCommand, incomeCommand, athleteCommand, duesCommand, receiptPayCommand, receiptScopeCommand, callCommand } from "@/lib/assistMore";
import { debtCommand } from "@/lib/debts";
import { invoiceCommand } from "@/lib/invoices";
import { wantsInventory } from "@/features/inventory/invWords";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsLog } from "@/lib/trainingLog";
import { wantsFood } from "@/lib/fitness/food";
import { wantsFitness } from "@/lib/fitness/words";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { shopCommand } from "@/features/shop/shopWords";
import { localNavigate } from "@/lib/nav";
import { learnedKind } from "@/lib/taskPlan";
import { guess as brainGuess } from "@/lib/brain/store";

// Numaralı iş (actCatalog): akış cümleyi yeniden yapay zekaya sormadan alanlardan yapar (actRun.js)
const actOf = (t) => (t && typeof t === "object" && t.act && t.args ? { act: t.act, args: t.args, say: t.say } : null);
// Akış o anki görev satırının numaralı işini alır (bir kez; run() cümleyi temizleyebildiği için cümleye değil numaraya bakılır).
// Numara bu akışın değilse null: akış eski yoldan (cümle → yapay zeka) gider
export function takeAct(ctx, nos) {
  const a = ctx.actNow?.current;
  if (!a || !nos.includes(a.act)) return null;
  ctx.actNow.current = null;
  return a;
}

export function nextInChain(ctx, viaVoice) {
  const { actNow, chain, chainGen, chainStep, planIdx, planKind, planNow, raceFailed, reply, run, setPlan, setWork, speaking } = ctx;
  const next = chain.current.shift();
  if (!next) return;
  const gen = chainGen.current;
  // Cevap okunurken araya girilmez: okuma bitince (en çok ~15 sn) sıradaki iş başlar
  const go = (n = 0) => {
    if (gen !== chainGen.current) return;
    if (speaking.current && n < 60) return setTimeout(() => go(n + 1), 250);
    chainStep.current = true;
    planNow.current = next.label || "";
    planKind.current = next.kind || "";
    actNow.current = actOf(next);
    // Satır işi başlatırken açıkça "sürüyor" olur: işaret bir önceki cevabın zamanlamasına bağlı kalmaz
    // (önceden son iş hiç "sürüyor" olmayınca ✓ konacak satır bulunamıyordu; denetim D, 2026-10-09)
    if (Number.isInteger(next.i)) {
      planIdx.current = next.i;
      setPlan((p) => p.map((x, j) => (j === next.i ? { ...x, st: "run" } : x)));
    }
    if (next.label) setWork(next.label);
    if (raceFailed.current && next.kind === "post") return reply("Yarış oluşturulamadığı için gönderiyi hazırlamadım.", { fail: true, engine: "local" }, viaVoice);
    run(typeof next === "string" ? next : next.say, viaVoice);
  };
  setTimeout(go, 700);
}

// Sıralı işlerin bir adımı: mesaj kartı (onayla gönderilir) ya da kayıtlar (bilgisi tamamsa hemen kaydedilir)
// lead: önceki adımın sonucu ("Gönderdim. "); msg: yapay zekanın ilk adım için yazdığı cümle (akışta okunmuş olabilir)
export function runStep(ctx, st, viaVoice, lead = "", msg = "") {
  const { askDelete, prepareSend, startDrafts } = ctx;
  if (st.send) return prepareSend(st.send.to, st.send.text, msg, st.engine, viaVoice, lead, waMode(st.s));
  if (st.actions) return askDelete(st.actions, viaVoice, lead, msg);
  return startDrafts(st.items, st.s, msg, st.engine, viaVoice, lead);
}

export function nextStep(ctx, viaVoice, lead, msg = "") {
  const { queue, runStep } = ctx;
  const st = queue.current.shift();
  if (!st) return false;
  runStep(st, viaVoice, lead, msg);
  return true;
}

export function go(ctx, page, message, viaVoice = false) {
  const { canOpen, leave, reply, router, showPage } = ctx;
  if (!PAGES[page]) return reply("O sayfayı bulamadım.", { engine: "local" }, viaVoice);
  if (!canOpen(page)) return reply(`${PAGES[page].label} sayfası senin hesabında açık değil.`, { engine: "local" }, viaVoice);
  navigator.vibrate?.(8);
  router.push(PAGES[page].path);
  leave(message || `${PAGES[page].label} sayfasını açtım.`, viaVoice);
  showPage();
}

// Görev listesini başlat: işler sırayla, her biri kendi akışında; listede yalnız işlerin adı ve sonucu görünür
export function startPlan(ctx, tasks, viaVoice, fresh) {
  const { actNow, chain, chainGen, chainStep, planFails, planIdx, planKind, planLearn, planNow, planOn, raceFailed, raceFollow, run, setPlan, setWork } = ctx;
  chain.current = tasks.slice(1).map((x, k) => ({ ...x, i: k + 1 }));
  chainGen.current++;
  raceFollow.current = null;
  planOn.current = true;
  planIdx.current = 0;
  planKind.current = tasks[0].kind || "";
  actNow.current = actOf(tasks[0]);
  raceFailed.current = false;
  planNow.current = tasks[0].label || "";
  planFails.current = [];
  if (planLearn.current) planLearn.current.tasks = tasks; // listenin son sırası (yapılış sırası)
  setPlan(tasks.map((x, i) => ({ label: x.label, st: i ? "wait" : "run" })));
  chainStep.current = true;
  setWork(tasks[0].label);
  return run(tasks[0].say, viaVoice, fresh);
}

// Görev listesini yapay zekaya sordurur. Adı askTasks: etkinlik planının askPlan'ı (events.js) ile karışmasın
// (önceden aynı adlı yerel işlev içe aktarılanı gölgeliyordu, etkinlik planı yanlış uca gidiyordu). En çok 18 sn: sunucu 16 sn
// içinde takılan isteği bir kez yeniler; cevap yoksa liste yerelde kurulur (localPlan).
// Önceki konuşma ve açık mesaj taslağı da gider: "onu da ekle", "Ali'yi çıkar" önceki konuşmaya göre bölünür
export async function askTasks(ctx, s, fresh) {
  const { contacts, memo, msgDraft, past, pastOn, pastTurns, planCutN, sayRace, staffNames, turns } = ctx;
  const history = historyFor([...pastTurns(), ...(fresh ? [] : turns)]);
  const draft = draftFor(msgDraft.current || (fresh && pastOn() ? past.current.msgDraft : null));
  // Ses tanıma ipuçları: bilinen adlar ve öğrenilen düzeltmeler; yapay zeka düzelttiği adları geri verir, saklanır
  const names = [...new Set([...staffNames, ...contacts.map((c) => c.name), ...athleteNames()])].slice(0, 150);
  try {
    const res = await authFetch("/api/tasks", { method: "POST", timeout: 18000, headers: { "content-type": "application/json" }, body: JSON.stringify({ text: s, today: todayStr(), race: sayRace(), memo: memoFor(memo.current), history, names, fixes: loadFixes().slice(0, 40), sessions: ctx.sessionsNow?.() || [], ...(draft ? { draft } : {}) }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) learnFixes(d.fixes, names);
    planCutN.current = res.ok && d.cut > 0 ? d.cut : 0;
    return res.ok && Array.isArray(d.tasks) ? d.tasks : null;
  } catch {
    return null;
  }
}

// Bekleyen isteği bırak, metni geri getir
// Görev listesini durdur: kalan işler yapılmaz, listede "yapılmadı" görünür (Vazgeç; denetim B2)
export function stopPlan(ctx) {
  const { chain, chainGen, planFails, planIdx, planOn, setPlan } = ctx;
  if (!planOn.current && !chain.current.length) return;
  chain.current = [];
  chainGen.current++;
  if (ctx.actNow) ctx.actNow.current = null;
  planOn.current = false;
  planIdx.current = -1;
  planFails.current = [];
  setPlan((p) => p.map((x) => (x.st === "run" || x.st === "wait" ? { ...x, st: "skip" } : x)));
}

// Cümleciğin gittiği uygulama akışı (görev listesi gerekir mi diye bakılır); yapay zeka işi (plan, görev, mesaj…) null
export function flowOf(ctx, x) {
  const { contacts, owner, racer } = ctx;
  if (wantsPost(x)) return "post"; // "yarış için görsel oluştur" yarış değil gönderi
  if (racer && wantsRace(x)) return "race";
  if (racer && wantsAttendance(x, false)) return "attendance";
  if (racer && absentNotifyCommand(x)) return "absent"; // gelmeyenlerin velilerine haber
  if (owner && debtCommand(x)) return "debt";
  if (cashCommand(x) || incomeCommand(x, todayStr()) || /(aidat\p{L}*|ödemesini) (yaptı|verdi|ödedi)|nakit (verdi|ödedi|getirdi)/iu.test(x)) return "income";
  if (racer && (athleteCommand(x) || duesCommand(x))) return "athlete";
  if (invoiceCommand(x)) return "invoice";
  if (wantsInventory(x, false)) return "inventory";
  if (wantsEvent(x)) return "event";
  if (wantsLog(x)) return "log";
  if (owner && wantsFood(x, false)) return "food";
  if (owner && wantsFitness(x, false)) return "fitness";
  if (wantsSchedule(x, false)) return "schedule";
  if (shopCommand(x)) return "shopping";
  if (receiptPayCommand(x) || receiptScopeCommand(x)) return "receipt";
  if (callCommand(x)) return "call";
  if (localNavigate(x, { names: contacts.map((c) => c.name) })) return "nav";
  // Kurallar tanımadı: daha önce yapay zekanın görev listesinde öğrenilen benzer söz (lib/brain, "plan:<tür>")
  return learnedKind(brainGuess(x));
}

// Sohbetteki yarışın adı (görev listesinde "yarış görseli", "bunun için" o yarış sayılsın)
export function sayRace(ctx) {
  const { chainRace, curRace, races } = ctx;
  const id = chainRace.current || curRace;
  return (id && races.current.find((r) => r.id === id)?.name) || "";
}
