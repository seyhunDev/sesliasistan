// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { taskOf } from "@/lib/assistTasks";
import { askLog, syncAttendance, saveLog } from "@/features/training/logAi";
import { missingOf, attLine, logReply } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

// Antrenman günlüğü: anlatılan → alanlar; tarih yoksa sorulur (bir kez), varsa günün antrenmanına yazılır
export async function runLog(ctx, text, viaVoice, { date = "", time = "", planId = "", retry = false } = {}) {
  const { by, convo, isLocked, logFlow, members, myUid, plans, racer, reply, runId, saveDrafts, setPhase, setSteps, stepTo, stepsEnd, toast, updateRecord, waitFor } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  stepTo(taskOf("log").work);
  try {
    const r = await askLog({ text, date });
    if (id !== runId.current) return;
    if (!r.log) {
      setSteps([]);
      reply("Günlüğe yazılacak bilgi duymadım. Rüzgârı, çalışılanları ya da nasıl geçtiğini söyler misin?", { engine: "ai", expect: true }, viaVoice);
      waitFor("log");
      logFlow.current = { collect: true, text, date, time, planId };
      return;
    }
    if (!r.date) {
      setSteps([]);
      reply(retry ? "Günü anlayamadım. “Bugün”, “dün” ya da “3 Ekim” gibi söyler misin?" : "Hangi günün antrenmanı? Bugün, dün ya da gün adını söyle.", { engine: "ai", expect: true }, viaVoice);
      waitFor("log");
      logFlow.current = { ask: true, text };
      return;
    }
    // Katılanlar ↔ yoklama: söylenenler o gün "geldi" olur, yoklamada gelenler günlüğe girer (sporcu yetkisi olanda)
    let att = null;
    if (racer && myUid) {
      stepTo("Yoklamayla eşleştiriliyor");
      att = await syncAttendance(r.log, r.date, { orgId: myUid, members });
      if (id !== runId.current) return;
      r.log = att.log;
    }
    stepTo("Günlüğe yazılıyor");
    const sv = await saveLog({ plans, updateRecord, saveDrafts, isLocked }, { ...r, time: r.time || time, planId: r.date === date ? planId : "" }, by, viaVoice || convo.current ? "voice" : "manual");
    if (id !== runId.current) return;
    if (sv.error) {
      stepsEnd(false);
      return reply(sv.error, { engine: "local" }, viaVoice);
    }
    stepsEnd();
    navigator.vibrate?.([10, 40, 10]);
    toast("Günlük kaydedildi");
    const more = missingOf(sv.log).length > 0;
    const attSay = att ? attLine(att) : "";
    reply(`${logReply(sv.log, r.date, todayStr(), sv.fresh)}${attSay ? ` ${attSay}` : ""}`, { show: sv.id ? [{ kind: "plan", id: sv.id }] : [], nav: "training", engine: "ai", expect: more }, viaVoice);
    if (more) logFlow.current = { date: r.date, time: r.time || time, planId: sv.id };
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Günlük yazılamadı."} Antrenman günlüğü sayfasından elle de yazabilirsin.`, { fail: true, engine: "local", nav: "training" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}
