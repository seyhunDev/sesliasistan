// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { askSchedule, showSchedule } from "@/features/schedule/assistSchedule";

export async function runSchedule(ctx, s, viaVoice) {
  const { ctrl, dataUid, lessons, path, reply, router, runId, setPhase, setSteps, stepTo, stepsEnd } = ctx;
  const id = ++runId.current;
  ctrl.current?.abort();
  setPhase("thinking");
  setSteps([]);
  stepTo("Ders programı hazırlanıyor");
  try {
    const current = lessons.filter((l) => l.createdByUid === dataUid).map(({ title, day, start, end, place, teacher }) => ({ title, day, start, end, place, teacher }));
    const r = await askSchedule({ text: s, current });
    if (id !== runId.current) return;
    stepsEnd(true);
    if (!r.lessons?.length) return reply(r.message || "Ders bulamadım. Gün, saat ve dersi söyler misin?", { engine: "ai", expect: true }, viaVoice);
    showSchedule(r);
    if (path !== "/schedule") router.push("/schedule");
    reply(`${(r.message || `${r.lessons.length} ders hazırladım.`).trim()} Önizlemeyi açtım, kontrol edip kaydet.`, { engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(e.message || "Ders programı hazırlanamadı.", { fail: true, engine: "ai" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}
