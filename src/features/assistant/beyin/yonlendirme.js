// Asistanın beyni: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { cleanSay } from "@/lib/speech/normalize";
import { timingStart } from "@/lib/assistTiming";
import { messageFirst, waMode, jobsIn } from "@/lib/steps";
import { isEnd, isNoMore, isNo, isYes, lastCreated, KIND, PAGES } from "@/lib/assistantLocal";
import { splitChain } from "@/lib/chain";
import { looksMulti, actCount, clausesOf, cachedPlan, localPlan, lastPagesPlan, orderPlan } from "@/lib/taskPlan";
import { countHit, learnedReady, record, settlePattern } from "@/lib/brain/store";
import { scoreStart } from "@/lib/brain/scoreStore";
import { historyFor, DRAFT_AGE, isDraftEdit } from "@/lib/convoContext";
import { isDrop } from "@/features/events/eventWords";
import { QUESTION } from "../isler/ortak";
import { localNavigate } from "@/lib/nav";
import { wantsPerson } from "@/features/people/assistPerson";
import { isDrop as invDrop } from "@/features/inventory/invWords";
import { confirmWord } from "@/lib/ai/messageRules";
import { attRetry } from "@/lib/attAsk";
import { isLogAnswer, canLog } from "@/lib/trainingLog";
import { todayStr, rel } from "@/lib/utils/format";
import { quickAnswer } from "@/lib/ai/rules";
import { postHandler } from "@/features/posts/posts";
import { openChat, lastSentChat } from "@/features/chat/ChatProvider";
import { listsFor } from "@/features/shop/shop";
import { routesOf, EARLY } from "@/lib/assistRoute";
import { quickOn } from "@/lib/quickMode";
import { routeFromAct, withAct } from "@/lib/actRun";
import { takeAct } from "./gorevListesi";
import { canSeeAthletes, wantsAttendance } from "@/features/athletes/access";
import { isAthleteSide, GROUPS } from "@/lib/kinds";
import { raceNames } from "@/features/athletes/raceNames";
import { clearInbox } from "@/features/home/Inbox";
import { checkVersion, applyUpdate } from "@/lib/newVersion";
import { buildSpeech } from "@/lib/buildInfo";
import { loadRaces } from "@/features/athletes/races";
import { labelFromCommand } from "@/lib/brain/model";
import { pickChoice } from "@/features/athletes/raceNav";
import { goBack } from "@/lib/navTrail";
import { DROP, SAVE, focusBody } from "./ortak";
import { guideHandler } from "@/features/fitness/guideVoice";
import { guideWord } from "@/lib/fitness/words";
import { myFit, planOf } from "@/lib/fitness/model";
import { wantsRead } from "@/lib/readAloud";
import { briefOf, briefText } from "@/lib/brief";

// Numaralı işlerden doğrudan yola gidenler (1-3 kendi akışlarında alınır: yaris.js, yoklama.js)
const DIRECT = [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];

export async function run(ctx, t, viaVoice = false, fresh = false) {
  const { askAI, askAll, chatRestore, askTasks, askTo, askedMore, athAsk, attAsk, attHere, cancelPending, cards, chainRace, chainStep, confirmPending, contacts, continuePerson, convo, createAs, curRace, done, drafts, dropDrafts, eventFlow, finish, flowOf, focusRef, goRace, heldQ, invAsk, invDelete, invFlow, invPage, isStaff, logFlow, members, memo, msgDraft, myKind, notes, okFlow, openBirthday, openNav, openPost, openRace, owner, park, planTimeAsk, updateRecord, by, parked, past, pastOn, pastTurns, path, personFlow, planCutN, planLearn, planOn, plans, preferRef, prepareSend, profile, queue, raceChoices, raceFollow, raceOrg, racer, races, refineDrafts, reply, run, runAttendance, runDebt, runEvent, runFitness, runFood, runId, runInventory, runInvoice, runLocal, runLog, runMore, runPayee, runPost, runRace, runResults, runSchedule, runShopAdd, runShopMark, runShopRead, saveBirthday, saveDraftsNow, setCards, setError, setHeard, setPhase, setPlan, setPrefer, setSaved, setSteps, setText, setTurns, setVoice, setWork, skipRace, startPerson, startPlan, startPost, tasks, toast, tts, turns, waitFor } = ctx;
  const s = cleanSay(t); // dolgu söz, kekemelik, Türkçe harfsiz yazım, bozuk iş fiilleri ("şey ııı", "foca yarisini ac", "yarışı oluru")
  if (!s) return toast("Yaz veya mikrofona bas");
  timingStart(s, viaVoice);
  if (viaVoice) {
    setVoice(true);
    convo.current = true; // sesle konuşuldu: sohbet sesli sürer
  }
  // Cümle birine mesajla başlıyorsa ("Ali'ye yaz, faturayı ödedim", "ekibe yaz, kamp planı yapıyoruz") yerel akışlara
  // (kapatma, günlük, etkinlik, envanter, gönderi, ders programı, doğum günü, fatura, yoklama, yarış) girmez; mesaj ana yapay zekayla hazırlanır
  const msgFirst = messageFirst(s);
  // Adım adım antrenman ekranı açık: "tamam", "bitti", "atla", "15 saniye ekle", "nasıl yapılır" ekrana gider (kapatmadan önce)
  const gw = guideHandler() && guideWord(s);
  if (gw) {
    setTurns((p) => [...p, { role: "user", text: s }]);
    setHeard(s);
    setText("");
    const say = guideHandler()(gw);
    if (say) return reply(say, { engine: "local" }, viaVoice);
  }
  // Sohbeti bitir ("bitir", "kapat", "tamam teşekkürler"): dinleme durur, sesli cevap yok
  if (isEnd(s) && !msgFirst) {
    finish();
    return;
  }
  // "Başka bir isteğin var mı?" sorusuna "yok", "hayır" cevabı sohbeti bitirir
  const more = askedMore.current;
  askedMore.current = false;
  if (more && isNoMore(s)) {
    finish();
    return;
  }
  const chained = chainStep.current;
  chainStep.current = false;
  // Okuma isteği ("notları oku", "bugün hangi planlar var"): cevap sesli okunur, okuma bitince mikrofon açılır (cevap.js)
  if (!chained && ctx.readMode) ctx.readMode.current = wantsRead(s);
  // Puanlama (yalnız ölçer): yeni tur ya da bekleyen soruya cevap; önceki işi düzeltiyorsa o iş kötü sayılır
  if (!chained) scoreStart(s, { awaiting: !!cards.awaiting || drafts.length > 0, yes: isYes(s) });
  // Öğrenme kaydı: bekleyen kalıp bu sözle geri alındı mı ("geri al", "yanlış", aynı cümle yeniden)
  if (!chained && !cards.awaiting && !drafts.length) settlePattern(s);
  // Hızlı bilgi isteği ("notlarımı oku", "yarın planda neler var", "haftalık özet çıkar"): uzun cümlenin içinde de olsa
  // yapay zekaya gitmeden telefonda cevaplanır ve okunur; cümlede başka iş varsa o kısım cevap okunduktan sonra kendi yoluna gider
  // Yapay zeka önce: Hazır cevaplar (Ayarlar › Öğrenme) kapalıyken özet soruları da yapay zekaya gider, cevap bir kez okunur
  const quick = quickOn();
  const brief = quick && !chained && !msgFirst && !cards.awaiting && !drafts.length ? briefOf(s) : null;
  if (brief) {
    if (ctx.readMode) ctx.readMode.current = !brief.rest; // kalan iş varsa okuma bitince mikrofon açılmaz, iş sürer
    setTurns((p) => [...p, { role: "user", text: s }]);
    setHeard(s);
    setText("");
    const said = briefText(brief.asks, { plans: ctx.plans, tasks: ctx.tasks, notes: ctx.notes, uid: ctx.dataUid || ctx.myUid, today: todayStr() });
    reply(said, { engine: "local", soz: "" }, viaVoice); // özet bilgi olduğu gibi kalır (söz yapay zekasına gitmez)
    if (brief.rest) {
      const id = ctx.runId.current;
      await new Promise((ok) => setTimeout(ok, 300));
      for (let i = 0; i < 80 && (ctx.sayQ.current.busy || ctx.speakingRef.current); i++) await new Promise((ok) => setTimeout(ok, 150));
      if (id !== ctx.runId.current) return;
      chainStep.current = true;
      return ctx.run(brief.rest, viaVoice);
    }
    return;
  }
  // Kullanıcının yeni sözü: görev listesindeki numaralı iş artık geçerli değil
  if (!chained && ctx.actNow) ctx.actNow.current = null;
  // Tek cümlede birden çok iş ("Atatürk Kupası adında yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit
  // verdi. Atatürk Kupası için Instagram görseli hazırla"): yapay zeka sıralı görev listesi çıkarır (/api/tasks), işler
  // sırayla kendi akışlarında yapılır. Bir soruya cevap beklenirken (taslak, kart, yarış sorusu…) bakılmaz.
  // Günlüğün eksik bilgisi beklenirken söylenen yeni çoklu istek ("… geldi, yoklamaya ekle, notu sil") de listeye girer
  const logWait = cards.awaiting && logFlow.current?.date && !logFlow.current.ask && !logFlow.current.collect;
  if (!chained && !msgFirst && (!cards.awaiting || logWait) && !drafts.length && !raceFollow.current) {
    const parts = splitChain(s);
    // Noktalamasız söylense de ("…yarış oluştur yarış için görsel hazırla bugün Mustafa geldi") iki ve fazla iş fiili varsa
    // ve uygulamanın kendi akışlarından biri işin içindeyse düzeni yapay zeka kurar (yoksa cümlenin tamamı tek akışa giderdi)
    if ((parts.length > 1 && parts.some(flowOf)) || looksMulti(s, flowOf) || (actCount(s) > 1 && (flowOf(s) || clausesOf(s).some(flowOf)))) {
      logFlow.current = null; // yeni istek: günlüğün eksik bilgisi beklenmiyor
      setTurns((p) => [...p, { role: "user", text: s }]);
      setText("");
      setHeard(s);
      setError("");
      setSteps([]);
      tts.stop();
      setWork("Görev listesi hazırlanıyor");
      setPhase("thinking");
      // Aynı cümle daha önce söylendiyse görev listesi cihazdaki kopyadan gelir (yapay zekaya gidilmez)
      const known = cachedPlan(s);
      const pid = ++runId.current;
      const tasks = known || (await askTasks(s, fresh));
      // Beklerken Vazgeç ya da kapat denildiyse liste hiç başlamaz (denetim B1)
      if (pid !== runId.current) return;
      setPhase("idle");
      countHit(known ? "brain" : "ai");
      // Yapay zekanın listesi işler ✓ bittikçe öğrenilir (reply), hepsi ✓ ise aynı cümle için saklanır
      planLearn.current = tasks?.length > 1 && !known ? { say: s, tasks, ok: true } : null;
      const split = parts.length > 1 ? parts.map((p) => ({ say: p, label: p.split(/\s+/).slice(0, 5).join(" ") })) : null;
      const list = tasks?.length > 1 ? tasks : !tasks ? split || localPlan(s, flowOf) : null;
      // Sıra yapay zekanın kurduğu düzen; yapay zekasız (yerel) listede aynı kural uygulamada (orderPlan)
      if (!tasks || known) planCutN.current = 0;
      if (list) return startPlan(list === tasks ? lastPagesPlan(list) : orderPlan(list), viaVoice, fresh);
      chainStep.current = true; // tek iş: cümle kendi yoluna (kullanıcının sözü zaten yazıldı)
      const one = tasks?.length === 1 && tasks[0].kind !== "other" ? tasks[0] : null;
      if (ctx.actNow) ctx.actNow.current = one?.act && one.args ? { act: one.act, args: one.args, say: one.say } : null;
      return run(one ? one.say : s, viaVoice, fresh);
    }
  }
  const history = historyFor([...pastTurns(), ...(fresh ? [] : turns)]);
  // Mesaj taslağı birkaç cümle sonra bağlamdan düşer (konu değişti). Yeni sohbette az önceki sohbetin taslağı ve hafızası
  // (PAST_MS içinde) sürer: "onu da ekle", "saati değiştir" önceki konuşmaya göre anlaşılır
  if (fresh) (msgDraft.current = pastOn() ? past.current.msgDraft : null), (chainRace.current = ""), (memo.current = pastOn() ? past.current.memo || {} : {});
  else if (msgDraft.current && ++msgDraft.current.age > DRAFT_AGE) msgDraft.current = null;
  // Sıralı işler yalnız bekleyen taslak ya da mesaj kartı varken sürer; başka bir istekte biter
  if (fresh || !(drafts.length || cards.pending)) queue.current = [];
  // Görev listesi bittiyse yeni istekte listesi kalkar
  if (!chained && !planOn.current) setPlan([]);
  const all = !fresh ? askAll.current : "";
  askAll.current = "";
  parked.current = null; // yeni istek: bekletilen eski yanıt uygulanmaz
  // Görev listesindeki iş kullanıcının sözü değil: balon olarak yazılmaz (listede adı görünür)
  if (!chained) setTurns((p) => [...p, { role: "user", text: s }]);
  setText("");
  if (!chained) setHeard(s); // asistan kutusunda kullanıcının cümlesi kalır (listedeki iş değil)
  setError("");
  setSteps([]);
  setSaved([]);
  tts.stop();

  // Yeni yarışta tarih / sporcular soruldu: cevap o yarışa yazılır; "bilmiyorum", "sonra", "geç" bırakır
  const rf = raceFollow.current;
  raceFollow.current = null;
  if (rf && !fresh) {
    if (isNo(s) || isDrop(s) || /^(bilmiyorum|sonra|daha sonra|geç|atla|şimdilik yok|belli değil)[\s.!]*$/iu.test(s)) return done("Tamam, sonra Yarışlar'dan eklersin.", { engine: "local" }, viaVoice);
    if (!QUESTION.test(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runRace(s, viaVoice, rf);
  }
  // Saatsiz eklenen plana saat teklif edildi ("İstersen saatini söyle"): "17:00", "akşam beşte" saate yazılır, "gerek yok"
  // bırakır; başka bir istekse teklif düşer, aşağıdan devam ("5'te" 17:00 sayılır, quickAnswer)
  const pt = planTimeAsk.current;
  planTimeAsk.current = null;
  // Görevde son tarih teklifi: "cuma", "yarın", "15 Kasım" görevin son tarihine yazılır
  if (pt?.kind === "due" && !fresh) {
    if (isNo(s) || /^(gerek yok|kalsın|tarihsiz kalsın|sonra|daha sonra|şimdilik yok|boş ver|yok)[\s.!]*$/iu.test(s)) return done("Tamam, tarihsiz kalsın.", { engine: "local" }, viaVoice);
    const due = quickAnswer(s, [{ type: "task", title: pt.title, date: "" }], todayStr(), { idx: 0, kind: "date" })?.[0]?.date;
    if (due) {
      await updateRecord("task", pt.id, { due }, by);
      return done(`Tamam, “${pt.title}” son tarihi ${rel(due).replace(/^(Bugün|Yarın)$/, (m) => m.toLocaleLowerCase("tr-TR"))}.`, { engine: "local" }, viaVoice);
    }
  } else if (pt && !fresh) {
    if (isNo(s) || /^(gerek yok|kalsın|saatsiz kalsın|sonra|daha sonra|şimdilik yok|boş ver|yok)[\s.!]*$/iu.test(s)) return done("Tamam, saatsiz kalsın.", { engine: "local" }, viaVoice);
    const time = quickAnswer(s, [{ type: "plan", title: pt.title, date: pt.date, time: "", allDay: false }], todayStr(), { idx: 0, kind: "time" })?.[0]?.time;
    if (time) {
      await updateRecord("plan", pt.id, { time, allDay: false, durationMin: 60, timeSource: "user" }, by);
      return done(`Tamam, “${pt.title}” saat ${time}.`, { engine: "local" }, viaVoice);
    }
  }
  // Kişi ekleme sürüyor: cevap, düzeltme, onay ya da vazgeç (başka bir istekse akış biter, aşağıdan devam)
  if (personFlow.current && !fresh && !["saving", "opening"].includes(personFlow.current.step) && (await continuePerson(s, viaVoice))) return;
  // Etkinlik için yer/zaman soruldu: bu cümle cevaptır (vazgeç, sayfa açma ya da kişi ekleme değilse); plan hazırlanır
  if (eventFlow.current && !fresh) {
    const f = eventFlow.current;
    eventFlow.current = null;
    if (isDrop(s)) return reply("Tamam, etkinlik planını bıraktım.", { engine: "local" }, viaVoice);
    if (!wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runEvent(`${f.text}\nCevap: ${s}`, viaVoice, true);
  }
  // Envanterden silme soruldu: "evet/sil" siler, "hayır/vazgeç" bırakır; başka bir istekse soru düşer, aşağıdan devam
  if (invFlow.current && !fresh) {
    const f = invFlow.current;
    if (isYes(s) || /^sil\S*[\s.!]*$/i.test(s)) return invDelete(f, viaVoice);
    if (isNo(s) || invDrop(s)) {
      invFlow.current = null;
      return done("Tamam, silmedim.", { engine: "local" }, viaVoice);
    }
    invFlow.current = null;
  }
  // Onay bekleyen iş (arama, sporcu silme, aidat hatırlatması): "evet/ara/sil/gönder" yapar, "hayır/vazgeç" bırakır;
  // başka bir istekse soru düşer, aşağıdan devam
  if (okFlow.current && !fresh) {
    const f = okFlow.current;
    okFlow.current = null;
    const cw = confirmWord(s);
    if (cw === "yes" || isYes(s) || f.word?.test(s.trim())) return f.yes(viaVoice);
    if (cw === "no" || isNo(s) || isDrop(s)) return done("Tamam, vazgeçtim.", { engine: "local" }, viaVoice);
  }
  // Yeni sporcunun adı soruldu: kısa cevap addır
  if (athAsk.current && !fresh) {
    athAsk.current = false;
    if (isDrop(s) || isNo(s)) return done("Tamam, eklemedim.", { engine: "local" }, viaVoice);
    if (s.split(/\s+/).length <= 6 && !QUESTION.test(s) && (await runMore(`yeni sporcu ekle: ${s}`, viaVoice))) return;
  }
  // Yoklamada "Kimi ekleyeyim?" soruldu: kısa cevap addır, ilk cümlenin günü ve durumuyla yoklamaya yazılır
  const aa = !fresh ? attAsk.current : null;
  attAsk.current = null;
  if (aa) {
    if (isDrop(s) || isNo(s)) return done("Tamam, yoklamaya eklemedim.", { engine: "local" }, viaVoice);
    if (s.split(/\s+/).length <= 6 && !QUESTION.test(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runAttendance(attRetry(aa.text, s), viaVoice);
  }
  // Antrenman günlüğü sürüyor: tarih soruldu (cevap gün) ya da günlük az önce yazıldı (eksik bilgi: "çok iyi geçti", "90 dakika")
  const lf = !fresh ? logFlow.current : null;
  logFlow.current = null;
  if (lf) {
    if (isDrop(s)) return reply("Tamam, günlüğü bıraktım.", { engine: "local" }, viaVoice);
    // "Antrenman günlüğü oluştur" denmişti, şimdi anlatılıyor: ikisi birlikte günlüğe
    if (lf.collect && !wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runLog(`${lf.text}\n${s}`, viaVoice, lf);
    if (lf.ask && !wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runLog(`${lf.text}\nGün: ${s}`, viaVoice, { retry: true });
    if (lf.date && isLogAnswer(s)) return runLog(s, viaVoice, lf);
  }
  // Yönlendirme (lib/assistRoute.js `routesOf`): cümle + bağlam → sıralı aday işler; her aday kendi akışında denenir,
  // "bu benim değil" derse (false) sonrakine geçilir. Son aday ana yapay zeka. Testler aynı tabloyu sınar (yonlendirme.mjs).
  // Açık antrenman planı ekranında ya da Antrenman günlüğü sayfasında antrenman anlatımı da günlüktür
  const fp = focusRef.current?.rec?.kind === "plan" ? plans.find((p) => p.id === focusRef.current.rec.id) : null;
  const logPlan = fp && canLog(fp, todayStr()) ? fp : null;
  const at = logPlan ? { date: logPlan.date, time: logPlan.time || "", planId: logPlan.id } : {};
  const onPost = !chained && !isStaff && path.startsWith("/posts/") && postHandler();
  const ia = invAsk.current;
  invAsk.current = null;
  const toWho = askTo.current;
  const shopLists = listsFor(myKind, members);
  const mine = isStaff ? myFit(plans, profile?.uid) : [];
  const fitIds = owner ? new Set((ctx.fitOthers || []).map((p) => p.fit?.for)) : null;
  const fitPeople = owner ? members.filter((m) => fitIds.has(m.uid)).map((m) => ({ uid: m.uid, name: m.name || "" })) : [];
  const found = routesOf(s, {
    owner, isStaff, racer, att: canSeeAthletes(profile?.email), athleteSide: isAthleteSide(myKind), path, today: todayStr(),
    races: races.current, raceNames: raceNames(), names: contacts.map((c) => c.name), logHere: !!logPlan || path === "/training",
    invPage, fitHere: path === "/fitness" || !!fp?.fit, foodHere: path === "/fitness" && /tab=food/.test(window.location.search), attHere, curRace, onPost: !!onPost, drafts: drafts.length > 0, pending: !!cards.pending, invAsk: ia, askTo: toWho,
    prefer: preferRef.current, skipRace: skipRace.current, shop: shopLists.length > 0, focus: !!focusRef.current, memo: memo.current, plans, tasks, notes,
    quick, learned: learnedReady, guide: !!guideHandler(), chatHere: !!openChat(), myFit: mine.length > 0, myFitToday: !!planOf(mine, todayStr()), fitPeople,
  });
  // Görev listesinin numaralı işi (4-15): yol önceden belli, komut alanlardan hazır (cümle yeniden okunmaz; actRun.js)
  const routes = chained ? withAct(found, routeFromAct(takeAct(ctx, DIRECT), { today: todayStr() })) : found;
  // Her aday: true → iş yapıldı (ya da soru soruldu), false → sonraki aday
  const go = async (r) => {
    switch (r.id) {
      case "close":
        return finish(), true;
      case "guide": {
        const say = guideHandler()?.(guideWord(s));
        return say ? (reply(say, { engine: "local" }, viaVoice), true) : false;
      }
      // "Son güncelleme ne?": derlemede gömülen yayın bilgisi (lib/buildInfo.js)
      // "Bildirimleri temizle": zildeki bildirim listesi boşalır (yapılacaklar kalır)
      case "inboxClear": {
        const n = (profile?.inbox || []).length;
        if (!n) return reply("Temizlenecek bildirim yok.", { engine: "local" }, viaVoice), true;
        const ok = await clearInbox(profile?.uid).then(() => true, () => false);
        return reply(ok ? `${n} bildirimi temizledim.` : "Bildirimleri temizleyemedim, bağlantıyı kontrol et.", { engine: "local", ...(ok ? {} : { fail: true }) }, viaVoice), true;
      }
      // "Rapor oluştur": rapor sayfası açılır, oradan paylaşılır (yapay zekaya gitmez)
      case "report":
        ctx.router.push("/settings/report");
        reply("Bugünün asistan raporunu açtım. Paylaş'a basıp gönderebilirsin.", { engine: "local" }, viaVoice);
        ctx.showPage();
        return true;
      // "Testleri çalıştır": Testler sayfası açılır ve telefondaki testlerin hepsi başlar (features/tests)
      case "tests":
        ctx.router.push(r.run ? "/settings/tests?calistir=hepsi" : "/settings/tests");
        reply(r.run ? "Testleri başlattım. Bitince rapor açılacak." : "Testler sayfasını açtım.", { engine: "local" }, viaVoice);
        ctx.showPage();
        return true;
      case "version": {
        const nv = await checkVersion();
        return reply(`${buildSpeech()}${nv ? " Yayında daha yeni bir sürüm var; “uygulamayı güncelle” de." : ""}`, { engine: "local" }, viaVoice), true;
      }
      // "Uygulamayı güncelle": yayında yeni sürüm varsa sayfa yenilenir (lib/newVersion.js)
      case "appUpdate": {
        const nv = await checkVersion(true);
        if (!nv) return reply(`Uygulama zaten güncel. ${buildSpeech()}`, { engine: "local" }, viaVoice), true;
        reply("Yeni sürüm var, güncelliyorum.", { engine: "local" }, viaVoice);
        setTimeout(applyUpdate, 1800);
        return true;
      }
      case "logBare":
        reply("Anlat, günlüğe yazayım: hangi gün, rüzgâr kaç knot ve yönü, neler çalıştınız, ne kadar sürdü, nasıl geçti.", { engine: "local", expect: true }, viaVoice);
        waitFor("log");
        logFlow.current = { collect: true, text: s, ...at };
        return true;
      // Antrenman günlüğü: yapay zeka alanlara ayırır, günün antrenman planına yazılır. Tarih yoksa sorulur
      case "log":
        return runLog(s, viaVoice, at), true;
      // Etkinlik planı ("kamp planı yapmak istiyorum"): yer/zaman yoksa sorulur, cevap gelmezse genel plan
      case "event":
        return runEvent(s, viaVoice, false), true;
      // Envanter: ekleme, çıkarma, değiştirme hemen; silme onayla
      case "inventory":
        return runInventory(s, viaVoice), true;
      // Fitness: program (önizlemede açılır), yapılan antrenman (günün fitness planına), sorular
      case "fitness":
        return runFitness(s, viaVoice, fp?.fit ? fp : null), true;
      // Beslenme: yemek (yapay zeka kaloriyi tahmin eder, hemen yazılır), su, kilo, "bugün kaç kalori aldım"
      case "food":
        return runFood(s, viaVoice), true;
      case "bareSave":
        return reply("Kaydedecek bir taslak görmüyorum. Ne eklememi istersin?", { engine: "local", expect: true }, viaVoice), true;
      // Instagram gönderisi: yeni gönderi açılır, yarış ve sporcular bağlanır, yazıları yapay zeka yazar
      case "post":
        return startPost(s, viaVoice), true;
      case "postOpen":
        return openPost(s, viaVoice), true;
      // Tek yarışı açma: yerel eşleştirme, emin değilse yapay zeka, yine olmazsa seçenekler
      case "raceOpen":
        if (raceOrg && !races.current.length) races.current = await loadRaces(raceOrg).catch(() => []);
        record(s, "nav:race", "local");
        return openRace(s, viaVoice), true;
      // Kişi ekleme (yalnız ana hesap, onayla); "… sporcu olarak ekle" sporcudur (aşağıda, more)
      case "person":
        return startPerson(s, viaVoice), true;
      // Sayfa ya da sohbet açma: yapay zekaya gitmeden
      case "navigate":
        record(s, `nav:${r.nav.page || (r.nav.back ? "back" : "messages")}`, "local");
        countHit("local");
        return openNav(r.nav, viaVoice), true;
      // Açık gönderi ekranında söylenen gönderiyi değiştirir
      case "postEdit":
        return runPost(s, viaVoice), true;
      // Ders programı: önizleme açılır, kaydetmeyi kullanıcı seçer
      case "schedule":
        return runSchedule(s, viaVoice), true;
      // Doğum günü: ad ve tarih belliyse hemen kaydedilir, eksikse form dolu açılır
      case "birthday": {
        const bday = r.bday;
        if (bday.name && bday.month) {
          saveBirthday(bday);
          const d = new Date(2024, bday.month - 1, bday.day).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
          toast(`${bday.name} · doğum günü eklendi`);
          reply(`Kaydettim: ${bday.name}, ${d}. Takviminde görünür, o gün ana sayfada hatırlatırım.`, { engine: "local" }, viaVoice);
          return true;
        }
        park();
        openBirthday({ prefill: bday });
        return true;
      }
      // Açık sohbette "son mesajımı sil": kendi son mesajı (ana hesap "son mesajı sil" derse kimin olursa); onaylanınca silinir
      case "msgDelete": {
        const oc = openChat() || (await lastSentChat(ctx));
        const pick = oc && [...oc.msgs].reverse().find((m) => !m.deleted && !m.pending && m.text && (m.by === profile?.uid || (!r.md.mine && owner)));
        if (!pick) return reply(openChat() ? "Bu sohbette silinecek mesajın görünmüyor." : "Silinecek son mesajını bulamadım; sohbeti açıp mesaja dokunarak silebilirsin.", { engine: "local" }, viaVoice), true;
        const t = pick.text.length > 80 ? `${pick.text.slice(0, 80)}…` : pick.text;
        const me = profile?.uid;
        const how = owner ? "Arşive kaldırmamı (kimse görmeyecek) onaylıyor musun?" : "Senden kaldırmamı onaylıyor musun?";
        reply(`${pick.by === me ? "Son mesajın" : "Son mesaj"}: “${t}”. ${how}`, { engine: "local", pending: { msgDel: { chat: oc.chat, m: pick } } }, viaVoice);
        return true;
      }
      // Açık sohbetin arşivi: son arşivlenen mesajı geri al (hemen) ya da kalıcı sil (yalnız ana hesap, onayla)
      case "msgArch": {
        const oc = openChat();
        if (!oc) return reply("Önce sohbeti aç; arşivdeki mesajlar sohbetin üstünde görünür.", { engine: "local" }, viaVoice), true;
        const list = oc.archived || [];
        const purge = r.ma.op === "purge";
        if (purge && !owner) return reply("Kalıcı silme yalnız ana hesapta. Mesajı senden kaldırabilirim.", { engine: "local" }, viaVoice), true;
        const pick = [...list].reverse().find((m) => !purge || m.arch);
        if (!pick) return reply("Bu sohbetin arşivinde mesaj yok.", { engine: "local" }, viaVoice), true;
        const t = String(pick.text || "").length > 80 ? `${pick.text.slice(0, 80)}…` : pick.text || "";
        if (purge) return reply(`Arşivdeki son mesaj: “${t}”. Kalıcı silmemi onaylıyor musun? Geri alınamaz.`, { engine: "local", pending: { msgPurge: { chat: oc.chat, m: pick } } }, viaVoice), true;
        const ok = await chatRestore?.(oc.chat.id, pick);
        reply(ok ? `Geri aldım: “${t}”. Sohbette yeniden görünüyor.` : "Mesajı geri alamadım; tekrar dene.", { engine: "local" }, viaVoice);
        return true;
      }
      // Ana hesap: "Ali ile konuşmayı arşivle / arşivden çıkar" hemen; "herkes için sil" onay sorulup sunucuda silinir
      case "chatOp": {
        const { co } = r;
        const dest = ctx.resolveTo(co.who);
        const chat = dest?.cid && (ctx.chats || []).find((c) => c.id === dest.cid && !c._ghost);
        if (!chat) return reply(co.who ? `${dest?.label || co.who} ile bir sohbetin görünmüyor.` : "Hangi sohbet? Kişinin ya da grubun adını söyle.", { engine: "local" }, viaVoice), true;
        if (co.op === "delete") return reply(`${chat.title} sohbetindeki tüm mesajlar ve ekler herkes için kalıcı silinecek, geri alınamaz. Onaylıyor musun?`, { engine: "local", pending: { chatDel: { cid: chat.id, label: chat.title } } }, viaVoice), true;
        if (GROUPS[chat.id]) return reply(`${chat.title} sabit bir grup, arşivlenmez.`, { engine: "local" }, viaVoice), true;
        const on = co.op === "archive";
        if (chat.archivedByMe === on) return reply(on ? `${chat.title} sohbeti zaten arşivde.` : `${chat.title} sohbeti arşivde değil.`, { engine: "local" }, viaVoice), true;
        const ok = await ctx.chatArchive?.(chat, on);
        reply(ok ? (on ? `${chat.title} sohbetini arşivledim. Mesajlar listesinin altındaki Arşiv'de duruyor.` : `${chat.title} sohbetini arşivden çıkardım.`) : "Yapamadım; tekrar dene.", { engine: "local" }, viaVoice);
        return true;
      }
      // "Son kaydı geri al": en son eklenen plan/görev/not, onay sorulup silinir
      case "undo": {
        const undo = r.undo;
        const last = lastCreated({ plans, tasks, notes }, profile?.uid, undo.kind);
        if (!last) return reply(`Silinecek ${undo.kind ? KIND[undo.kind].toLocaleLowerCase("tr-TR") : "kayıt"} bulamadım; senin eklediğin bir kayıt görünmüyor.`, { engine: "local" }, viaVoice), true;
        const when = rel(String(last.rec.createdAt).slice(0, 10)).toLocaleLowerCase("tr-TR");
        reply(`En son eklediğin ${KIND[last.kind].toLocaleLowerCase("tr-TR")}: “${last.rec.title}” (${when} eklendi). Silmemi onaylıyor musun?`, {
          show: [{ kind: last.kind, id: last.rec.id }],
          pending: { actions: [{ op: "delete", kind: last.kind, id: last.rec.id }] },
          engine: "local",
          expect: true,
        }, viaVoice);
        return true;
      }
      // Fatura: "Turkcell faturası ödendi"; "Hangi fatura?" sorulduysa bu cümle firma adı
      case "invoice":
        return runInvoice(r.ic, viaVoice, r.asked);
      // Borçlar: ekle (hemen), ödendi (hemen), sil (onayla), "kime ne kadar borç verdim" (yerel cevap)
      case "debt":
        return runDebt(r, viaVoice), true;
      // Gelen ödemeler: "bu ay ne kadar ödeme aldım"
      case "payee":
        return runPayee(r.pq, viaVoice), true;
      // Sporcunun yarış sonuçları: "Ali'nin sonuçları", "Foça yarışında Ali kaçıncı oldu" (sporcu bulunamazsa sıradaki aday)
      case "results":
        return runResults(r.ra, viaVoice);
      // Son eklenen işler (lib/assistMore.js): arama, sporcu, nakit gelir, aidat hatırlatması…
      case "more":
        return runMore(s, viaVoice, r.pre);
      // Alışveriş listesi: ekle / aldım / sil / oku ("ekmek aldım" listede yoksa alışveriş değildir)
      case "shopping": {
        const list = /ekip|kulüp|kulup/i.test(s) && shopLists.includes("team") ? "team" : shopLists[0];
        if (r.sc.op === "add") return runShopAdd(r.sc.what, list, viaVoice), true;
        if (r.sc.op === "read") return runShopRead(list, viaVoice), true;
        return runShopMark(r.sc, list, viaVoice);
      }
      // Önceki turda "Ekibe ne yazayım?" diye sorulduysa bu cümle mesajın kendisidir
      case "askTo":
        return prepareSend(toWho, focusBody(s), "", "local", viaVoice, "", waMode(s)), true;
      // Sporcu yoklaması; cümlede başka iş de varsa yoklamadan sonra yapay zekaya gider
      case "attendance":
        return runAttendance(s, viaVoice, jobsIn(s).length ? { s, history } : null), true;
      // Yarış ekleme / yarışa sporcu ya da not; yarış sayfasında ad gerekmez
      case "race":
        return runRace(s, viaVoice), true;
      // Tür sayfasından gelen ilk cümle: o türde taslak
      case "prefer": {
        const kind = preferRef.current;
        preferRef.current = "";
        setPrefer("");
        return createAs(s, kind, viaVoice), true;
      }
      // Kısa, kalıba uyan komutlar yapay zekaya gitmeden anında çalışır
      case "local":
        record(s, labelFromCommand(r.cmd), "local");
        countHit("local");
        return runLocal(r.cmd, s, viaVoice), true;
      default:
        return askAI(s, s, viaVoice, history, r.toFocus), true;
    }
  };
  // Önce: kapatma, günlük, etkinlik, envanter (bekleyen taslak/karttan önce kendi akışlarında)
  for (const r of routes) if (EARLY.has(r.id) && (await go(r))) return;
  // Panelde bekleyen taslak: "kaydet" / "vazgeç"; soru değilse söylenen taslağı tamamlar/değiştirir
  if (drafts.length && !fresh) {
    if (SAVE.test(s)) return saveDraftsNow(viaVoice);
    if (DROP.test(s)) return dropDrafts(viaVoice);
    // Yoklama cümlesi taslağa eklenmez (not olarak taslağa düşüyordu); aşağıda yoklama olarak yapılır
    if (!QUESTION.test(s) && !(canSeeAthletes(profile?.email) && wantsAttendance(s, attHere))) return refineDrafts(s, viaVoice);
  }
  // Onay bekleyen işlem varsa "evet / hayır" yerelde çözülür
  if (!fresh && cards.pending) {
    const cw = cards.pending.send ? confirmWord(s) : "";
    if (cw === "yes" || isYes(s)) return confirmPending(true);
    if (cw === "no" || isNo(s)) return cancelPending(true);
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    // Mesaj taslağına değişiklik: sıradaki işler yapay zekanın yeni taslağına kadar bekler
    heldQ.current = queue.current;
    queue.current = [];
  }
  // Sıralı işte mesajın içeriği soruldu: cevap, tüm istekle birlikte doğrudan yapay zekaya (yerel kurallar onu plan sanmasın)
  if (all && !DROP.test(s) && !QUESTION.test(s)) return askAI(s, `${all}\nMesajın içeriği: ${s}`, viaVoice, history, false);
  // Az önce hazırlanan mesaja değişiklik ("şunu da ekle", "saati 10 yap"): taslakla birlikte doğrudan yapay zekaya
  if (msgDraft.current && isDraftEdit(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return askAI(s, s, viaVoice, history, false, { edit: true });
  // Önceki turda sorulan yarış seçenekleri: "ikincisi", "sonuncu", "Foça olan"
  const choices = raceChoices.current;
  raceChoices.current = [];
  const picked = choices.length ? pickChoice(s, choices, todayStr()) : null;
  if (picked) return goRace(picked, viaVoice);
  askTo.current = null; // alıcı sorusu yalnız bu cümleye: cevabı "askTo" adayı alır
  skipRace.current = false;
  for (const r of routes) if (!EARLY.has(r.id) && (await go(r))) return;
}

// Hızlı komutlar (lib/commands): fiş kamerası, sayfa, yeni kayıt, görev tamamlama, özet
export function runLocal(ctx, cmd, s, viaVoice) {
  const { go, openMeeting, openReceipt, owner, park, reply, startDrafts, toast, toggleTask } = ctx;
  if (cmd.type === "receipt") {
    navigator.vibrate?.(8);
    park();
    openReceipt({ camera: true, voice: viaVoice, ...(cmd.kasa && owner ? { kasa: true } : {}) }); // kasa: fiş ödendi yazılır, kasadan nakit çıkış // kaydedince fiş numarası sesle de söylenir
  } else if (cmd.type === "meeting") {
    navigator.vibrate?.(8);
    park();
    openMeeting();
  } else if (cmd.type === "navigate") go(cmd.page, `${PAGES[cmd.page].label} sayfasını açtım.`, viaVoice);
  else if (cmd.type === "create") startDrafts(cmd.items, s, cmd.message, cmd.brain ? "brain" : "local", viaVoice);
  else if (cmd.type === "complete") {
    toggleTask(cmd.id);
    toast("1 görev güncellendi");
    reply(`Tamam, ${cmd.title} görevini tamamladım.`, { show: [{ kind: "task", id: cmd.id }], engine: "local" }, viaVoice);
  } else reply(cmd.message, { show: cmd.show, engine: cmd.brain ? "brain" : "local" }, viaVoice);
}

// Yerel ya da yapay zekadan gelen gezinme: sayfa, grup sohbeti ya da kişiyle sohbet
export function openNav(ctx, nav, viaVoice) {
  const { go, groupIds, leave, openChatAt, reply, resolveTo, router } = ctx;
  if (nav.page) return go(nav.page, "", viaVoice);
  // "geri dön": önceki sayfa (uygulama yeni açıldıysa geçmiş yok, ana sayfa)
  if (nav.back) {
    navigator.vibrate?.(8);
    goBack(router, PAGES.home.path);
    return leave("Önceki sayfaya döndüm.", viaVoice);
  }
  if (nav.chat) {
    if (!groupIds.includes(nav.chat)) return reply(`${GROUPS[nav.chat]?.name || "Bu"} grubunda değilsin.`, { engine: "local" }, viaVoice);
    return openChatAt(nav.chat, `${GROUPS[nav.chat].name} grubunu açtım.`, viaVoice);
  }
  const dest = resolveTo(nav.chatWith);
  if (!dest?.cid) return reply(`${nav.chatWith} ile mesajlaşamıyorsun ya da kişiyi bulamadım.`, { engine: "local" }, viaVoice);
  return openChatAt(dest.cid, `${dest.label} ile sohbeti açtım.`, viaVoice);
}

export function openChatAt(ctx, cid, message, viaVoice) {
  const { leave, router } = ctx;
  navigator.vibrate?.(8);
  router.push(`/messages?c=${encodeURIComponent(cid)}`);
  leave(message, viaVoice);
}

// Kaydı düzenleme ekranında aç (iptal: iptal ekranıyla)
export function openRecord(ctx, a, said, viaVoice) {
  const { openAdd, park } = ctx;
  park(); // söz yalnız yazılır, sesli okunmaz (yalnız okuma isteğinde okunur, 2026-10-19)
  openAdd({ edit: { kind: a.kind, id: a.id, ...(a.op === "cancel" ? { cancel: true } : {}) } });
}
