// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { todayStr } from "@/lib/utils/format";
import { fitLocal } from "@/lib/fitness/words";
import { activeOf as fitActive, loadPrograms as loadFitPrograms, syncPlans as fitSyncPlans, removePlans as fitRemovePlans, askFitness, saveProfile as saveFitProfile, showProgram as showFitProgram, addSession as fitAddSession } from "@/features/fitness/fitnessData";
import { weekStats as fitWeek, monthStats as fitMonth, programLine as fitProgLine, planOf as fitPlanOf, applyLog, recentText as fitRecent, resLine as fitResLine } from "@/lib/fitness/model";
import { foodLocal, targets as foodTargets, dayOf as foodDayOf, monthKey as foodMonth, dayLine as foodDayLine, totals as foodTotals } from "@/lib/fitness/food";
import { saveWeight as saveFoodWeight, loadMonth as loadFoodMonth, addWater as foodAddWater, askFood, addMeals as foodAddMeals } from "@/features/fitness/foodData";

// Yoklamadan sonra cümledeki diğer işler: yoklama cevabı okunup bitince yapay zekaya (görev listesi) gider
// Fitness (yalnız ana hesap). Yerelde: "programı planlara ekle / takvimden kaldır", "bugünkü antrenmanı yaptım / atladım",
// "bu hafta kaç antrenman yaptım". Diğerleri /api/fitness: program hazırlama ya da değiştirme Fitness sayfasında önizlemede
// açılır (kaydetmeyi kullanıcı seçer); yapılan antrenman (set, tekrar, kilo) o günün fitness planına yazılır, plan yoksa açılır.
export async function runFitness(ctx, s, viaVoice, focusFit) {
  const { myUid, path, plans, profile, reply, router, runId, setPhase, setSteps, stepTo, stepsEnd, updateRecord } = ctx;
  const id = ++runId.current;
  const org = profile?.orgId || myUid;
  const uid = profile?.uid || myUid;
  const today = todayStr();
  const by = { name: profile?.name || "" };
  const loc = fitLocal(s);
  setPhase("thinking");
  setSteps([]);
  try {
    const prog = fitActive(await loadFitPrograms(org).catch(() => []));
    if (loc?.op === "stats") {
      const w = fitWeek(plans, today);
      const m = fitMonth(plans, today.slice(0, 7), today);
      const msg = w.planned || m.done
        ? `Bu hafta ${w.planned} antrenmandan ${w.done} tanesini yaptın${w.left ? `, ${w.left} tane kaldı` : ""}${w.missed ? `, ${w.missed} tanesini kaçırdın` : ""}.${w.minutes ? ` Toplam ${w.minutes} dakika.` : ""} Bu ay ${m.done} antrenman${w.streak > 1 ? `, ${w.streak} haftadır aralıksız` : ""}.`
        : "Henüz fitness antrenmanın yok. “Pazartesi, çarşamba, cuma sabah 7'de program hazırla” diyebilirsin.";
      return reply(msg, { engine: "local" }, viaVoice);
    }
    if (loc?.op === "plans" || loc?.op === "unplan") {
      if (!prog) return reply("Kayıtlı bir fitness programın yok. Önce program hazırlayalım: günlerini ve saatini söyle.", { engine: "local", expect: true }, viaVoice);
      stepTo(loc.op === "plans" ? "Antrenmanlar takvime yazılıyor" : "Antrenmanlar takvimden kaldırılıyor");
      if (loc.op === "plans") {
        const r = await fitSyncPlans(org, uid, prog, plans, by);
        stepsEnd(true);
        return reply(`Ekledim: ${r.added} antrenman takvimde (${fitProgLine(prog)}).`, { engine: "local" }, viaVoice);
      }
      const n = await fitRemovePlans(org, prog, plans);
      stepsEnd(true);
      return reply(`Takvimden ${n} antrenmanı kaldırdım. Yapılanlar duruyor.`, { engine: "local" }, viaVoice);
    }
    if (loc?.op === "done" || loc?.op === "skip") {
      const p = focusFit || fitPlanOf(plans, today);
      if (!p) return reply("Bugün için fitness antrenmanı bulamadım. Ne yaptığını söylersen yazarım, ör. “30 dakika koştum”.", { engine: "local", expect: true }, viaVoice);
      stepTo("Antrenman yazılıyor");
      const fit = applyLog(p.fit || { items: [] }, { st: loc.op });
      await updateRecord("plan", p.id, { fit }, by);
      stepsEnd(true);
      return reply(loc.op === "done" ? `Yazdım: ${p.fit?.name || p.title} yapıldı.` : `Yazdım: ${p.fit?.name || p.title} atlandı.`, { engine: "local", show: [{ kind: "plan", id: p.id }] }, viaVoice);
    }
    stepTo("Fitness isteğin hazırlanıyor");
    const r = await askFitness({ text: s, profile: profile?.fit || {}, program: prog || null, recent: fitRecent(plans, today) });
    if (id !== runId.current) return;
    // Söylenen kişisel bilgi (kilo, hedef…) profile yazılır
    const pf = Object.fromEntries(Object.entries(r.profile || {}).filter(([, v]) => (Array.isArray(v) ? v.length : !!v)));
    if (Object.keys(pf).length) await saveFitProfile(uid, { ...(profile?.fit || {}), ...pf }).catch(() => {});
    if (r.op === "program" && r.program) {
      // "yeni program hazırla" yeni programdır; diğer cümleler açık programı değiştirir
      const fresh = !prog || /(yeni|baştan|sıfırdan)/iu.test(s);
      const next = fresh ? r.program : { ...prog, ...r.program, id: prog.id, plansAt: prog.plansAt, createdAt: prog.createdAt };
      stepsEnd(true);
      showFitProgram(next);
      if (path !== "/fitness") router.push("/fitness");
      return reply(`${(r.message || "Programı hazırladım.").trim()} Önizlemeyi açtım; kontrol edip ${next.plansAt ? "kaydet, takvim de güncellenir" : "“Kaydet ve planlara ekle”ye bas"}.`, { engine: "ai" }, viaVoice);
    }
    if (r.op === "log" && r.log) {
      const date = r.log.date || today;
      const p = focusFit && focusFit.date === date ? focusFit : plans.find((x) => x.fit && x.status !== "cancelled" && x.date === date);
      stepTo("Antrenman yazılıyor");
      let fit;
      let pid;
      if (p) {
        fit = applyLog(p.fit, r.log);
        pid = p.id;
        await updateRecord("plan", p.id, { fit }, by);
      } else {
        fit = applyLog({ name: "Fitness", items: [] }, r.log);
        pid = await fitAddSession(org, uid, { date, title: "Fitness", fit }, by);
      }
      stepsEnd(true);
      const line = fitResLine(fit);
      return reply(r.log.st === "skip" ? "Yazdım: antrenman atlandı." : `Yazdım${line ? `: ${line}` : ""}.`, { engine: "ai", show: pid ? [{ kind: "plan", id: pid }] : undefined }, viaVoice);
    }
    stepsEnd(true);
    return reply(r.message || (Object.keys(pf).length ? "Profiline yazdım." : "Anlayamadım, tekrar söyler misin?"), { engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Fitness isteği işlenemedi."} Fitness sayfasından elle de yapabilirsin.`, { fail: true, engine: "ai" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

// Beslenme (Fitness › Beslenme): su, kilo ve gün özeti yerelde; yemek yapay zekayla (/api/food) okunup hemen yazılır,
// düzeltme Fitness › Beslenme'de yemeğe dokunarak
export async function runFood(ctx, s, viaVoice) {
  const { myUid, profile, reply, runId, setPhase, setSteps, stepTo, stepsEnd } = ctx;
  const id = ++runId.current;
  const org = profile?.orgId || myUid;
  const uid = profile?.uid || myUid;
  const today = todayStr();
  const loc = foodLocal(s);
  const tg = () => foodTargets(profile?.fit || {}, 3);
  setPhase("thinking");
  setSteps([]);
  try {
    if (loc?.op === "weight") {
      const list = await saveFoodWeight(uid, profile?.fitW || [], loc.kg);
      const prev = list.length > 1 ? list[list.length - 2].kg : 0;
      const d = prev ? Math.round((loc.kg - prev) * 10) / 10 : 0;
      return reply(`Yazdım: ${String(loc.kg).replace(".", ",")} kg.${d ? ` Öncekine göre ${d > 0 ? "+" : ""}${String(d).replace(".", ",")} kg.` : ""}`, { engine: "local" }, viaVoice);
    }
    if (loc?.op === "stats") {
      const day = foodDayOf(await loadFoodMonth(org, uid, foodMonth(today)), today);
      return reply(foodDayLine(day, tg()), { engine: "local" }, viaVoice);
    }
    if (loc?.op === "water") {
      const day = await foodAddWater(org, uid, today, loc.n);
      const goal = tg()?.water;
      return reply(`Yazdım: ${loc.n} bardak su. Bugün ${day.water}${goal ? `/${goal}` : ""} bardak.`, { engine: "local" }, viaVoice);
    }
    stepTo("Yemekler okunuyor");
    const r = await askFood({ text: s });
    if (id !== runId.current) return;
    if (!r.isFood) {
      stepsEnd(false);
      return reply("Ne yediğini anlayamadım. Örneğin “öğlen tavuk pilav ve ayran içtim” de.", { engine: "ai", expect: true, fail: true }, viaVoice);
    }
    const date = r.date || today;
    let day = r.items.length ? await foodAddMeals(org, uid, date, r.items) : null;
    if (r.water) day = await foodAddWater(org, uid, date, r.water);
    stepsEnd(true);
    const what = r.items.map((m) => `${m.name} (${m.kcal} kcal)`).join(", ");
    const t = day ? foodTotals(day.meals).kcal : 0;
    const goal = tg()?.kcal;
    const sum = date === today && t ? ` Bugün ${t}${goal ? ` / ${goal}` : ""} kalori.` : "";
    return reply(`Yazdım: ${[what, r.water ? `${r.water} bardak su` : ""].filter(Boolean).join(", ")}.${sum}`, { engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Yazamadım."} Fitness › Beslenme'den elle ekleyebilirsin.`, { fail: true, engine: "ai" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}
