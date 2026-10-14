// Asistanın beyni: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { timingReply } from "@/lib/assistTiming";
import { failed, PLAN_MAX, planLessons, rememberPlan } from "@/lib/taskPlan";
import { record } from "@/lib/brain/store";
import { DROPPED, MORE } from "./ortak";

export function reply(ctx, message, extra = {}, viaVoice = false) {
  const { aiLesson, chain, convo, enqueueSay, eventFlow, holdIfTalking, inflight, invFlow, listenOnce, live, nextInChain, okFlow, personFlow, planCutN, planFails, planIdx, planKind, planLearn, planNow, planOn, raceChoices, raceFailed, reply, setCards, setPhase, setPlan, setStreamText, setTurns, sp, startAuto, streamSaid, waitFor } = ctx;
  // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa yanıtı gösterme ve sözünü kesme: konuşması kendiliğinden
  // bitince (sessizlik) söyledikleri öncekiyle birleştirilip yeniden sorulur
  if (holdIfTalking(() => reply(message, extra, viaVoice))) return;
  timingReply(extra.engine); // süre kaydı (Ayarlar › Asistan süre kaydı)
  inflight.current = null;
  // Cevap geldi: iş bitti, "çalışıyor" durumu kalkar (yerel akışların bir kısmı kendisi kaldırmıyordu; denetim B3)
  setPhase("idle");
  if (live.current.spStatus === "listening") sp.cancel(); // düşünürken açılan mikrofon: konuşulmadı, kapat
  const { show = [], pending = null, nav = "", chat = "", share = "", wa = "", att = null, engine = "", expect = false, races = [], person = null, event = null, inv = null, ok = null, picks = [], listen = false } = extra;
  const awaiting = expect || !!pending || !!ok;
  // Görev listesinin son işi: yapılamayanlar elle yapılsın diye söylenir
  // İşin sonucu: akış açıkça "olmadı" dediyse (fail) ya da cevapta başarısızlık sözü varsa ✗
  const badStep = !awaiting && planOn.current && (extra.fail ?? failed(message));
  if (badStep && planNow.current) planFails.current.push(planNow.current);
  if (badStep && planKind.current === "race") raceFailed.current = true;
  if (!awaiting && planOn.current && !chain.current.length && planFails.current.length) {
    const f = planFails.current;
    message = `${message} Yapamadığım: ${f.join(", ")}. ${f.length > 1 ? "Bunları" : "Bunu"} elle yapman gerekiyor.`;
    planFails.current = [];
  }
  if (!awaiting && planOn.current && !chain.current.length && planCutN.current) {
    message = `${message} Çok iş vardı, ilk ${PLAN_MAX} işi yaptım; kalanını yeniden söyler misin?`;
    planCutN.current = 0;
  }
  if (!ok) okFlow.current = null; // onay kartı kalktıysa onay da biter
  if (!person) personFlow.current = null; // kişi kartı kalktıysa kişi ekleme de biter
  if (!event?.asking) eventFlow.current = null; // soru kartı kalktıysa etkinlik sorusu da biter
  if (!inv?.ask?.length) invFlow.current = null; // silme sorusu kalktıysa onay da biter
  setStreamText("");
  // Sonuç düğmeleri (kayıtlar, Sohbeti aç, WhatsApp, sayfa aç) bu cevabın altına sabitlenir: sohbet altta sürer, düğmeler yerinde kalır
  const links = show.length || chat || share || nav ? { show, chat, share, wa, nav } : null;
  setTurns((p) => [...p, links ? { role: "assistant", text: message, links } : { role: "assistant", text: message }]);
  setCards({ show: [], pending, nav: "", chat: "", share: "", att, engine, awaiting, races, person, event, inv, ok, picks });
  if (races?.length) waitFor("raceChoice");
  raceChoices.current = races;
  // Görev listesi: iş bitti (soru sormadıysa) → ✓ ya da ✗, sıradaki başlar
  // Görev listesinin son işi bitti: liste ✓ ile kalır, mikrofon yeniden açılmaz, çalışma durur
  // (Seyhun: "o tik işaretini de almalı, sonra çalışmayı durdurmalı", 2026-10-09)
  const planEnd = !awaiting && planOn.current && !chain.current.length;
  // Liste sürerken adımlar arasında mikrofon açılmaz: bir "tamam" ya da gürültü süren işi kesmesin (denetim B8)
  const midPlan = !awaiting && planOn.current && chain.current.length > 0;
  // Öğrenme: iş bitti (soru sormadı). Başarılıysa yapay zekanın sonucu depoya yazılır (aynısı varsa eklenmez)
  if (!awaiting && aiLesson.current) {
    const ls = aiLesson.current;
    aiLesson.current = null;
    if (!(extra.fail ?? failed(message)) && !DROPPED.test(message)) record(ls.x, ls.l, "ai");
  }
  if (!awaiting && planOn.current && planLearn.current) {
    const pl = planLearn.current;
    const t = pl.tasks[planIdx.current];
    if (badStep || DROPPED.test(message)) pl.ok = false;
    else if (t) planLessons([t]).forEach((e) => record(e.x, e.l, "ai")); // her işin sözü öğrenilir
    if (planEnd) {
      if (pl.ok) rememberPlan(pl.say, pl.tasks); // hepsi ✓: aynı cümle yeniden söylenince yapay zekaya gidilmez
      planLearn.current = null;
    }
  }
  if (!awaiting && planOn.current) {
    const bad = badStep;
    const at = planIdx.current;
    setPlan((p) => {
      const i = at >= 0 && at < p.length ? at : p.findIndex((x) => x.st === "run");
      if (i < 0) return p;
      return p.map((x, j) => (j === i ? { ...x, st: bad ? "fail" : "done" } : x));
    });
    if (!chain.current.length) planOn.current = false;
  }
  if (!awaiting && chain.current.length) nextInChain(viaVoice);
  navigator.vibrate?.([8, 30, 8]);
  // Akışta bir kısmı okunduysa yalnızca kalanı (yanıt farklı çıktıysa tekrar okunmaz)
  const said = streamSaid.current;
  streamSaid.current = "";
  const rest = !said ? message : message.startsWith(said) ? message.slice(said.length).trim() : "";
  enqueueSay(rest, planEnd || midPlan ? undefined : listen && viaVoice ? listenOnce : viaVoice || convo.current ? startAuto : undefined);
}

export function done(ctx, message, extra = {}, viaVoice = false) {
  const { askedMore, chain, planOn, reply } = ctx;
  // Sırada iş varsa (zincir) "Başka bir isteğin var mı?" sorulmaz; sıradaki işe geçilir
  if (chain.current.length) return reply(message.trim(), extra, viaVoice);
  // Görev listesinin son işi: soru sorulmaz, liste ✓ ile biter ve çalışma durur
  if (planOn.current) return reply(message.trim(), extra, viaVoice);
  reply(`${message.trim()} ${MORE}`, extra, viaVoice);
  askedMore.current = true;
}

// Başka bir tam ekran açılırken (fiş kamerası, kayıt, toplantı…) mikrofon kapanır; kubbe altta kalır, sohbet sürer
export function park(ctx) {
  const { sp } = ctx;
  sp.cancel();
}

// Başka sayfaya geçince asistan açık kalır: ne yapıldığı söylenir ve gösterilir, sohbet kullanıcı kapatana kadar sürer
export function leave(ctx, message, viaVoice) {
  const { reply } = ctx;
  reply(message, { engine: "local" }, viaVoice);
}

// Tam sayfa asistan sayfayı örter: açıkça istenen sayfa açılınca asistan kapanır, sayfa görünür. Görev listesi ya da
// sıradaki iş sürerken kapanmaz; sayfalar arkada değişir, sonuçtaki düğmelerle gidilir (Seyhun, 2026-10-14)
export function showPage(ctx) {
  const { chain, finish, planOn, queue } = ctx;
  if (planOn.current || chain.current.length || queue.current.length) return;
  setTimeout(() => finish(true), 700);
}

// Yapay zeka hatası: görev listesi sürüyorsa iş ✗ sayılır ve liste kalan işlerle sürer (önceden liste donuyordu;
// denetim B5), değilse hata kutusu çıkar
export function failNow(ctx, message, viaVoice) {
  const { planOn, reply, setError } = ctx;
  if (planOn.current) return reply(message, { fail: true, engine: "local" }, viaVoice);
  setError(message);
}

// Sohbeti bitir: panel kapanır, konuşma temizlenir
export function finish(ctx, keepSpeech = false) {
  const { askAll, cancelRun, chain, chainGen, chainRace, clearSay, convo, memo, msgDraft, onClose, planOn, queue, setPlan, sp, tts, waitFor } = ctx;
  sp.cancel();
  cancelRun();
  if (!keepSpeech) clearSay();
  if (!keepSpeech) tts.stop();
  convo.current = false;
  queue.current = [];
  askAll.current = "";
  chain.current = [];
  chainGen.current++;
  waitFor(); // sohbet bitti: bekleyen soru kalmaz (yeni sohbetteki ilk cümle eski soruya cevap sayılmasın)
  memo.current = {};
  chainRace.current = ""; // sohbet bitti: yeni sohbette yarış adla, "son yarış" ya da "sıradaki yarış" diye söylenir
  planOn.current = false;
  setPlan([]);
  msgDraft.current = null; // sohbet bitti: bağlam sıfırlanır
  onClose();
}

export function abort(ctx) {
  const { cancelRun, heard, setText, setTurns, stopPlan } = ctx;
  const t = heard;
  cancelRun();
  stopPlan();
  setTurns((p) => p.slice(0, -1));
  setText(t);
}

// ---- Son eklenen işler (lib/assistMore.js). Geri alınamayanlar önce sorar (okFlow + onay kartı) ----
export function askOk(ctx, text, label, yes, viaVoice, word) {
  const { okFlow, reply, waitFor } = ctx;
  waitFor("ok");
  okFlow.current = { yes, word };
  reply(text, { engine: "local", ok: { label } }, viaVoice);
}
