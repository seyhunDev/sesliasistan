// Asistanın beyni: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { startLine } from "@/lib/sayLines";
import { editPrecue, draftFor, memoFor } from "@/lib/convoContext";
import { precue } from "@/lib/precue";
import { todayStr } from "@/lib/utils/format";
import { guess as brainGuess, countHit } from "@/lib/brain/store";
import { dayHours, cached as cachedWeather, wantsWeather, weatherDigest, loadWeather } from "@/features/weather/weather";
import { timingInfo, timingMark } from "@/lib/assistTiming";
import { clubDigest } from "@/lib/ai/clubDigest";
import { buildDigest } from "@/lib/ai/digest";
import { askAssistant } from "@/services/assistantService";
import { PHONE_WAIT_MS, retryable } from "@/lib/ai/budget";
import { digestScope } from "@/lib/ai/digestScope";
import { brainCommand } from "@/lib/commands";
import { isMulti, waMode, wantsNote, keepNotes, wantsRecord, taskList, jobsIn } from "@/lib/steps";
import { TEAM_WORD, groupOf } from "../isler/ortak";
import { messageIntent } from "@/lib/ai/messageRules";
import { looksLikeCreate, localQuery, buildPatch, describeAction } from "@/lib/assistantLocal";
import { interpretText } from "@/services/aiService";
import { isAthleteSide } from "@/lib/kinds";
import { looksLikeLog } from "@/lib/trainingLog";
import { labelFromAI } from "@/lib/brain/model";
import { fromMessage } from "@/lib/ai/assistant";
import { noteDonePatch, noteReopenPatch } from "@/lib/noteState";
import { planDonePatch, planReopenPatch } from "@/lib/planActions";
import { namesToUids } from "@/lib/names";
import { ASKED, SENT_CLAIM, focusBody } from "./ortak";

// Yapay zekaya sorar. s: kullanıcının bu cümlesi, ask: yapay zekaya giden istek (sıralı işte önceki istekle birleşik)
// opts.edit: açık mesaj taslağının değiştirilmesi (ön cevap yalnız "Tamam.", tür ipucu gitmez)
export async function askAI(ctx, s, ask, viaVoice, history, toFocus, opts = {}) {
  const { askTo, clearSay, club, contactNames, contacts, ctrl, enqueueSay, failNow, firstName, focusRef, handle, inflight, listenWhileThinking, live, memo, msgDraft, notes, plans, prepareSend, races, receipts, reply, resolveTo, runId, runLocal, setPhase, setStreamText, setTurns, setWork, sp, staff, staffNames, startDrafts, streamSaid, tasks, toast, waitFor } = ctx;
  // Öğrenilenler (brain) artık yapay zekadan önce kayıt hazırlamaz: yalnızca yapay zekaya ulaşılamazsa yedek (aşağıda)
  const id = ++runId.current;
  ctrl.current?.abort();
  const c = new AbortController();
  ctrl.current = c;
  // Bağlantı takılırsa (iPhone Wi-Fi ↔ hücresel geçişi) istek asılı kalmasın: sunucu ~9,5 sn'de biter, telefon 14 sn sonra
  // vazgeçer ve yedek yola geçer (önceden 25 sn; lib/ai/budget.js)
  let late = false;
  const limit = setTimeout(() => {
    late = true;
    c.abort();
  }, PHONE_WAIT_MS);
  setPhase("thinking");
  // Ön cevap: yapay zeka düşünürken hemen kısa bir giriş (veriden bilgiyle) söylenir ve gösterilir; bildiği alanlar
  // taslak kartta belirir. Yapay zekaya da ne söylendiği gider, cevabı bunun devamı olur (lib/precue.js).
  const pc = opts.edit ? editPrecue() : precue(ask, { plans, today: todayStr(), guess: brainGuess(s), weatherRows: (d) => dayHours(cachedWeather(), d) });
  clearSay();
  streamSaid.current = "";
  setStreamText("");
  if (viaVoice) inflight.current = s;
  setWork(pc?.work || "");
  // Tek bilgi kanalı (Seyhun: "yapay zeka anladım diyor, bilgi kısmında da anladım yazıyor", 2026-10-09): beklerken ne
  // yapıldığını yalnız bilgi alanı söyler ("Plan hazırlanıyor…"); sohbete ve sese "Tamam / Bakıyorum" yazılmaz, yalnız asıl
  // cevap gelir. Ön cevapta veriden yardımcı bilgi varsa ("O saatlerde “Toplantı” planı da var.") yalnız o yazılır ve okunur.
  if (pc) timingMark("pre");
  // Sesli okuma: okuma isteğinde (readMode, 2026-10-19) ya da Ayarlar › Sesli yanıt açıksa (2026-10-20)
  const voiceOn = !!ctx.tts?.enabled;
  const reading = !!ctx.readMode?.current || voiceOn;
  if (pc?.info) setTurns((p) => [...p, { role: "assistant", text: pc.info, pre: true }]);
  // Yanıtın okunması bunun ardından (kuyruk). Okunurken mikrofon açılmaz (kendi sesini duymasın);
  // bitince dinlenir: kullanıcı devam ederse söylediği öncekine eklenir.
  // Sesli yanıt açıksa yapay zeka beklenirken hemen hazır cümle söylenir ("Tamam, planı hazırlıyorum.", "Bakıyorum.");
  // yazıda değişiklik yok (bekleme yazısı gösterir)
  const first = voiceOn && !opts.edit ? startLine(pc) : pc?.info && reading ? pc.info : "";
  if (first) enqueueSay(first, viaVoice ? listenWhileThinking : undefined);
  else if (viaVoice) listenWhileThinking();
  // Akış: yanıt metni geldikçe ekranda büyür; tamamlanan cümleler hemen kuyruğa (bekleme 1–2 sn'ye iner)
  const onText = (m) => {
    if (id !== runId.current) return;
    timingMark("first");
    setStreamText(m);
    const end = Math.max(...[". ", "? ", "! ", "… ", ".\n", "?\n", "!\n"].map((p) => m.lastIndexOf(p)));
    if (end < 0) return;
    const upto = m.slice(0, end + 1);
    if (reading && upto.length > streamSaid.current.length && upto.startsWith(streamSaid.current)) {
      enqueueSay(upto.slice(streamSaid.current.length).trim());
      streamSaid.current = upto;
    }
  };
  try {
    // Hava sorusuysa (ya da önceki soru havaysa, "peki pazar?" gibi) güncel hava verisi de gider
    const wx = wantsWeather(s) || history.slice(-2).some((h) => h.role === "user" && wantsWeather(h.text));
    const weather = wx ? weatherDigest(await loadWeather().catch(() => cachedWeather())) : "";
    const { athletes: clubAth, dues: clubDues, invoices: clubInv, inventories: clubInvs } = club.current;
    // Küçük özet: isteğin konusu dışındaki bölümler (kulüp, yılın tüm planları, fişler) gitmez; açık ekran varsa hepsi gider
    const recent = history.slice(-4).filter((h) => h.role === "user").map((h) => h.text);
    const scope = focusRef.current?.text ? null : digestScope(ask, recent, [...(clubAth || []).map((a) => a.studentName), ...(races.current || []).map((r) => r.name)]);
    const clubText = !scope || scope.club ? clubDigest({ races: races.current, athletes: clubAth, dues: clubDues, invoices: clubInv, inventories: clubInvs, today: todayStr() }) : "";
    const digest = [buildDigest({ plans, tasks, notes, receipts, name: firstName, members: staff, scope }), clubText, weather, focusRef.current?.text && `## AÇIK EKRAN\n${focusRef.current.text}`].filter(Boolean).join("\n\n");
    if (id !== runId.current) return;
    countHit("ai");
    timingMark("ai");
    const req = { text: ask, name: firstName, digest, history, draft: draftFor(msgDraft.current), memo: memoFor(memo.current), sessions: ctx.sessionsNow?.() || [], people: staffNames, contacts: contactNames, precue: pc?.hint || "", onText };
    const t0 = Date.now();
    let r;
    try {
      r = await askAssistant(req, c.signal);
    } catch (e1) {
      // Bağlantı koptu ya da sunucuya ulaşılamadı (hızlı hata): bir kez sessizce yeniden denenir. Cevabın bir kısmı
      // okunduysa denenmez (aynı cümle iki kez söylenmesin)
      if (late || id !== runId.current || streamSaid.current || !retryable(e1, Date.now() - t0)) throw e1;
      timingInfo({ retry: e1?.reason || "network" });
      setStreamText("");
      r = await askAssistant(req, c.signal);
    }
    if (id !== runId.current) return;
    timingMark("aiDone");
    timingInfo({ model: r.model || r.provider || "" });
    setPhase("preparing");
    handle(r, ask, viaVoice); // bekleme yok: işler hemen yapılır
  } catch (err) {
    if (id !== runId.current) return;
    const e = late ? new Error("Yapay zeka çok geç kaldı, bağlantını kontrol edip tekrar dene.") : err;
    timingInfo({ err: late ? "timeout" : err?.reason || (err?.name === "TimeoutError" ? "timeout" : err?.name === "NetworkError" ? "network" : "other") });
    setStreamText("");
    streamSaid.current = "";
    inflight.current = null;
    if (live.current.spStatus === "listening" && !live.current.heardNow) sp.cancel();
    // Yapay zeka yok: önce öğrenilmiş örneklerden tahmin (kendi küçük modelimiz)
    const guessed = brainCommand(s);
    if (guessed) {
      toast("Yapay zekaya ulaşamadım, öğrendiklerime göre hazırladım. Kontrol et.");
      return runLocal(guessed, s, viaVoice);
    }
    // Sıralı birden çok iş kurallarla ayrılamaz (mesaj metni "takvime ekle…" olurdu): tek tek söylenmesi istenir
    if (isMulti(ask)) return reply("Yapay zekaya şu an ulaşamadım; birden çok işi sırayla yapamıyorum. Tek tek söyler misin?", { engine: "rules", expect: true }, viaVoice);
    // Mesaj isteği ("Ali'ye yaz: …", "ekibe söyle …"): basit kurallarla taslak (düzenleme yapılmaz, olduğu gibi)
    const toTeam = TEAM_WORD.test(s);
    const mi = messageIntent(toTeam ? s.replace(/^\S+(\s+grubuna)?\s+/i, "") : s, contacts);
    if (toFocus && !mi?.to && !toTeam) {
      toast("Yapay zekaya ulaşamadım, mesajı olduğu gibi hazırladım. Kontrol et.");
      return prepareSend("", focusBody(s), "", "rules", viaVoice);
    }
    // Alıcı belli ama ne yazılacağı söylenmedi ("ekip grubuna mesaj gönder"): sor, sonraki cümle mesaj olur
    if ((toTeam || mi?.to) && !String(mi?.send || "").trim().replace(/^(bir\s+)?mesaj\s*(gönder|at|yaz)?$/i, "")) {
      const to = toTeam ? s.split(/\s+/)[0] : mi.to;
      const dest = resolveTo(to);
      if (dest) {
        waitFor("to");
        askTo.current = to;
        return reply(`${dest.team ? `${dest.label} grubuna` : `${dest.label} için`} ne yazayım?`, { engine: "rules", expect: true }, viaVoice);
      }
    }
    if (mi?.send && (toTeam || mi.to || mi.unknown)) {
      toast("Yapay zekaya ulaşamadım, mesajı olduğu gibi hazırladım. Kontrol et.");
      return prepareSend(toTeam ? s.split(/\s+/)[0] : mi.to || mi.unknown, mi.send, "", "rules", viaVoice, "", waMode(s));
    }
    // Ekleme isteğine benziyorsa panelde taslak hazırlanır (sunucu yedek kurallarla kart çıkarır)
    if (looksLikeCreate(s)) {
      toast("Yapay zekaya ulaşamadım, kaydı basit kurallarla hazırlıyorum. Kontrol et.");
      try {
        const r = await interpretText(s, firstName, undefined, null, staffNames);
        if (r.items?.length) return startDrafts(r.items, s, r.message, r.source, viaVoice);
      } catch {
        /* aşağıdaki yerel sorguya düş */
      }
    }
    const lq = localQuery(s, { plans, tasks });
    if (lq) reply(lq.show.length ? lq.message : `Yapay zekaya şu an ulaşamadım. ${lq.message}`, { show: lq.show, engine: "rules" }, viaVoice);
    else failNow(e.message || "Asistan şu an yanıt vermedi", viaVoice);
  } finally {
    clearTimeout(limit);
    if (id === runId.current) {
      setPhase("idle");
      setStreamText("");
    }
  }
}

export function handle(ctx, r, s, viaVoice) {
  const { aiLesson, askAll, askTo, done, find, go, groupIds, handle, heldQ, holdIfTalking, inflight, live, myKind, nextStep, openNav, openRecord, queue, reply, resolveTo, runLog, runNow, sentOk, sp, startDrafts, streamSaid, waitFor } = ctx;
  // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa bekle, sözünü kesme (konuşması bitince öncekiyle birleştirilip yeniden sorulur)
  if (holdIfTalking(() => handle(r, s, viaVoice))) return;
  inflight.current = null;
  if (live.current.spStatus === "listening") sp.cancel();
  // Antrenman anlatımından yalnız not çıktıysa not açılmaz, günlüğe yazılır (not nottur, günlük günlüktür)
  const onlyNotes = r.items?.length && r.items.every((d) => d?.type === "note") && !r.actions?.length && !r.send?.text && !r.sends?.length;
  if (onlyNotes && !isAthleteSide(myKind) && !wantsNote(s) && looksLikeLog(s)) return runLog(s, viaVoice);
  // Not açıkça istenmediyse yapay zekanın başka işin yanına eklediği not atılır (öğrenme verisine de girmez)
  if (r.items?.length) r = { ...r, items: keepNotes(r.items, s) };
  const msg = (r.message || "").trim();
  aiLesson.current = { x: s, l: labelFromAI(r) }; // öğrenme verisi: iş ✓ bitince yazılır (reply)
  const held = heldQ.current;
  heldQ.current = null;

  // Görev listesi: yapay zekanın çıkardığı işler. Onay gerekmeyenler (tamamla, değiştir, yeni kayıt) hemen yapılır,
  // onay gerekenler (silme, mesaj) ardından tek tek sorulur. Ne yapıldığını yapay zeka değil uygulama söyler (gerçek sonuç).
  // Yapay zeka mesajı yalnızca cevabına yazdıysa ("Ekibe şunu göndereyim mi: …") kart yine hazırlanır
  const sendRec = r.intent === "message" && !r.send?.text ? fromMessage(msg) : null;
  // Yalnız mesaj istendiyse ("Perşembe 9.30'da antrenman var, sporculara gönder") mesajdaki gün/saat kayıt değildir:
  // takvim/plan/görev/not denmedikçe yapay zekanın eklediği kayıtlar atılır (kendiliğinden plan açılmasın)
  if ((r.send?.text || r.sends?.length || sendRec?.text) && r.items?.length && !wantsRecord(s)) r = { ...r, items: [] };
  const job = taskList(sendRec?.text ? { ...r, sends: [sendRec] } : r);
  const { items, open: opened } = job;
  if (job.confirm.length || items.length || job.now.length) {
    const now = runNow([...job.now, ...(job.confirm[0]?.actions || [])]);
    const sends = job.confirm.filter((st) => st.send);
    const steps = [...(now.deletes.length ? [{ actions: now.deletes }] : []), ...sends, ...(sends.length && !items.length ? held || [] : [])].map((st) => ({ ...st, s, engine: r.source }));
    let lead = now.said;
    if (now.missing && !now.done && !now.deletes.length) lead += "Bir kaydı bulamadım. ";
    if (opened && !items.length && !steps.length) return openRecord(opened, lead, viaVoice);
    queue.current = steps;
    streamSaid.current = "";
    // Yeni kayıtlar: bilgisi tamamsa hemen kaydedilir, eksikse tek soru sorulur; ardından sıradaki onaylar
    if (items.length) return startDrafts(items, s, msg, r.source, viaVoice, lead);
    if (nextStep(viaVoice, lead, steps.length === 1 && steps[0].actions && /\?\s*$/.test(msg) && !lead ? msg : "")) return;
    const show = now.touched.filter((x) => find(x.kind, x.id));
    if (now.done) return done(lead.trim() || "Tamamdır.", { show, engine: r.source }, viaVoice);
    return reply(lead.trim() || (now.missing ? "Bunu kayıtlarda bulamadım." : "Tamamdır."), { show, engine: r.source }, viaVoice);
  }
  // Gönderim yalnızca kartta onayla olur: yapay zeka "gönderdim" dese de gerçekte gönderilmediyse bunu söyleme
  // ("gönderdin mi?" sorusuna, gerçekten gönderildiyse "gönderdim" demesi doğrudur)
  if (r.intent === "message" || (SENT_CLAIM.test(msg) && !(sentOk.current && ASKED.test(s)))) {
    const to = r.send?.to || "";
    if (to && resolveTo(to)) waitFor("to"), (askTo.current = to);
    if (r.intent === "message" && isMulti(s)) askAll.current = s; // sıralı iş: cevapla birlikte hepsi yeniden
    return reply(SENT_CLAIM.test(msg) || !msg || /^tamam\.?$/i.test(msg) ? `Mesajı henüz göndermedim. ${to ? "Ne yazayım?" : "Kime ve ne yazayım?"}` : msg, { engine: r.source, expect: true }, viaVoice);
  }
  if (opened) return openRecord(opened, msg, viaVoice);
  // Yapay zeka sohbet açmayı seçtiyse ("Sanver'le yazışmamı aç" gibi belirsiz söyleyişler)
  if (r.openChat && r.intent === "navigate") {
    const g = groupOf(r.openChat, groupIds);
    return openNav(TEAM_WORD.test(r.openChat) && g ? { chat: g } : { chatWith: r.openChat }, viaVoice);
  }
  if (r.navigate && (r.intent === "navigate" || !r.show?.length)) {
    go(r.navigate, msg, viaVoice);
    return;
  }

  // Sıralı işte mesajın içeriği soruldu ("Gökhan'a ne yazayım?"): cevap gelince tüm istek yeniden sorulur
  if (r.expectReply && isMulti(s) && jobsIn(s).includes("send")) askAll.current = s;
  const said = msg || "Bunu tam anlayamadım, bir daha söyler misin?";
  reply(said, { show: (r.show || []).filter((x) => find(x.kind, x.id)), nav: r.navigate || "", engine: r.source, expect: !!r.expectReply }, viaVoice);
}

// Görev listesinin onaysız işleri: görev tamamlama/yeniden açma ve güncelleme hemen uygulanır; silmeler onaya kalır.
// Dönüş: said ("Tamamladım: … Değiştirdim: … "), deletes, touched (gösterilecek kayıtlar), done, missing
export function runNow(ctx, acts) {
  const { by, canAssign, find, members, rejectDelete, toast, toggleTask, updateRecord } = ctx;
  const out = { said: "", deletes: [], touched: [], done: 0, missing: 0 };
  const ticked = [];
  const opened2 = [];
  const changed = [];
  const notesDone = [];
  const notesBack = [];
  const plansDone = [];
  const plansBack = [];
  for (const a of acts) {
    const rec = find(a.kind, a.id);
    if (!rec) {
      out.missing++;
      continue;
    }
    if (a.op === "delete" || a.op === "delete_series" || a.op === "approve_delete") {
      out.deletes.push(a);
      continue;
    }
    if (a.op === "reject_delete" && rec.deleteReq) {
      rejectDelete(a.kind, a.id);
      changed.push(`${rec.title}, silme isteği reddedildi`);
    } else if (a.kind === "plan" && a.op === "uncancel") {
      if (rec.status === "cancelled") updateRecord("plan", a.id, { status: "planned", cancelReason: "", cancelledAt: null }, by);
      changed.push(`${rec.title}, iptal geri alındı`);
    } else if (a.kind === "note" && (a.op === "pin_note" || a.op === "unpin_note")) {
      updateRecord("note", a.id, { pinned: a.op === "pin_note" }, by);
      changed.push(`${rec.title}, ${a.op === "pin_note" ? "sabitlendi" : "sabitleme kaldırıldı"}`);
    } else
    if (a.kind === "task" && (a.op === "complete_task" || a.op === "reopen_task")) {
      if (rec.done !== (a.op === "complete_task")) toggleTask(a.id);
      (a.op === "complete_task" ? ticked : opened2).push(rec.title);
    } else if (a.kind === "note" && (a.op === "done_note" || a.op === "reopen_note")) {
      // Not silinmez: "yapıldı" Arşiv'e kaldırır, "geri al" Notlar'a döndürür
      const on = a.op === "done_note";
      if (!!rec.archived !== on || !!rec.done !== on) updateRecord("note", a.id, on ? noteDonePatch() : noteReopenPatch(), by);
      (on ? notesDone : notesBack).push(rec.title);
    } else if (a.kind === "plan" && (a.op === "done_plan" || a.op === "reopen_plan")) {
      // Plan silinmez: "bitti" Planlar'dan kaldırıp Arşiv'e koyar, "geri al" döndürür
      const on = a.op === "done_plan";
      if (!!rec.done !== on) updateRecord("plan", a.id, on ? planDonePatch() : planReopenPatch(), by);
      (on ? plansDone : plansBack).push(rec.title);
    } else if (a.op === "update") {
      const patch = buildPatch(a.kind, a.patch, rec);
      // Sorumlu değişikliği ("motor görevini Ali'ye ver"): adlar kişi kimliklerine
      if (canAssign && Array.isArray(a.patch?.assignTo)) patch.assignees = namesToUids(a.patch.assignTo, members);
      if (!Object.keys(patch).length) continue;
      updateRecord(a.kind, a.id, patch, by);
      changed.push(describeAction(a, rec).replace(/^Güncelle: /, "").replace(" → ", ", "));
    } else continue;
    out.done++;
    out.touched.push({ kind: a.kind, id: a.id });
  }
  const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ve ${xs.at(-1)}` : xs[0]);
  if (ticked.length) out.said += `Tamamladım: ${list(ticked)}. `;
  if (opened2.length) out.said += `Yeniden açtım: ${list(opened2)}. `;
  if (changed.length) out.said += `Değiştirdim: ${changed.join("; ")}. `;
  if (notesDone.length) out.said += `Yapıldı, Arşiv'e kaldırdım: ${list(notesDone)}. `;
  if (notesBack.length) out.said += `Notlara geri aldım: ${list(notesBack)}. `;
  if (plansDone.length) out.said += `Bitti, Arşiv'e kaldırdım: ${list(plansDone)}. `;
  if (plansBack.length) out.said += `Planlara geri aldım: ${list(plansBack)}. `;
  if (out.done) {
    toast(`${out.done} kayıt güncellendi`);
    navigator.vibrate?.([10, 40, 10]);
  }
  return out;
}

// Silme onayı (görev listesinin onay adımı): kayıtlar kartta görünür, "evet / onayladım" ile silinir
export function askDelete(ctx, actions, viaVoice, lead = "", msg = "") {
  const { find, reply } = ctx;
  const names = actions
    .map((a) => [a, find(a.kind, a.id)])
    .filter(([, x]) => x)
    .map(([a, x]) => `“${x.title || "Başlıksız"}”${a.op === "delete_series" ? " (bu ve sonraki haftalar)" : a.op === "approve_delete" ? " (silme isteği)" : ""}`);
  const said = msg || `${lead}${names.length > 1 ? `${names.slice(0, -1).join(", ")} ve ${names.at(-1)}` : names[0] || "Bu kayıt"} silinsin mi?`;
  reply(said, { show: actions.map((a) => ({ kind: a.kind, id: a.id })), pending: { actions }, engine: "local", expect: true }, viaVoice);
}
