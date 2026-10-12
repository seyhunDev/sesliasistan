// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { taskOf } from "@/lib/assistTasks";
import { askPlan, saveEvent, deleteEvent } from "@/features/events/events";
import { kindFromText } from "@/features/events/eventWords";
import { countsText } from "@/features/events/eventModel";

// Etkinlik planı: yapay zeka yer/zaman eksikse soru döner (general false), yoksa plan; plan Etkinlikler'e kaydedilir
export async function runEvent(ctx, text, viaVoice, general, lead = "") {
  const { eventFlow, myUid, profile, reply, runId, setPhase, setSteps, stepTo, stepsEnd, toast, waitFor } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  stepTo(general ? taskOf("event").work : "Etkinlik inceleniyor");
  try {
    const p = await askPlan({ text, general });
    if (id !== runId.current) return;
    if (p.ask?.length) {
      setSteps([]);
      waitFor("event");
      eventFlow.current = { text, turns: null };
      return reply(`${p.question} Bilmiyorsan “genel plan yap” de.`, { event: { asking: true, kind: p.event?.kind || kindFromText(text), text }, engine: "ai", expect: true }, viaVoice);
    }
    stepTo("Etkinliklere kaydediliyor");
    const ev = p.event;
    const nid = await saveEvent(profile?.orgId || myUid, profile?.uid || myUid, ev);
    stepsEnd();
    navigator.vibrate?.([10, 40, 10]);
    toast("Etkinlik kaydedildi");
    const counts = countsText(ev);
    const first = (ev.summary.match(/^[^.!?]+[.!?]/) || [""])[0];
    reply(`${lead}${ev.title} planını hazırladım ve Etkinlikler'e kaydettim${counts ? `: ${counts}` : ""}. ${first}`.trim(), { event: { ...ev, id: nid, saved: true }, engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Plan hazırlanamadı."} Etkinlikler sayfasından elle de ekleyebilirsin.`, { fail: true, engine: "local", nav: "events" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

export async function eventDelete(ctx, e) {
  const { myUid, profile, reply, toast } = ctx;
  try {
    await deleteEvent(profile?.orgId || myUid, e.id);
    toast("Etkinlik silindi");
    reply(`Sildim, “${e.title}” artık Etkinlikler'de yok.`, { event: { ...e, deleted: true }, engine: "local" });
  } catch {
    toast("Silinemedi");
  }
}
