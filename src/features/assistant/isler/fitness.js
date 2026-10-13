// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { todayStr } from "@/lib/utils/format";
import { fitLocal, athleteIn, withoutName } from "@/lib/fitness/words";
import { kindOf } from "@/lib/kinds";
import { markStart } from "@/features/fitness/guideVoice";
import { activeOf as fitActive, loadPrograms as loadFitPrograms, syncPlans as fitSyncPlans, removePlans as fitRemovePlans, askFitness, saveProfile as saveFitProfile, showProgram as showFitProgram, addSession as fitAddSession } from "@/features/fitness/fitnessData";
import { weekStats as fitWeek, monthStats as fitMonth, programLine as fitProgLine, planOf as fitPlanOf, applyLog, recentText as fitRecent, resLine as fitResLine, myFit, athleteNext, dayRows, dayLine, STATUS } from "@/lib/fitness/model";
import { foodLocal, targets as foodTargets, dayOf as foodDayOf, monthKey as foodMonth, dayLine as foodDayLine, totals as foodTotals } from "@/lib/fitness/food";
import { saveWeight as saveFoodWeight, loadMonth as loadFoodMonth, addWater as foodAddWater, askFood, addMeals as foodAddMeals } from "@/features/fitness/foodData";

// Yoklamadan sonra cümledeki diğer işler: yoklama cevabı okunup bitince yapay zekaya (görev listesi) gider
// Fitness (yalnız ana hesap). Yerelde: "programı planlara ekle / takvimden kaldır", "bugünkü antrenmanı yaptım / atladım",
// "bu hafta kaç antrenman yaptım". Diğerleri /api/fitness: program hazırlama ya da değiştirme Fitness sayfasında önizlemede
// açılır (kaydetmeyi kullanıcı seçer); yapılan antrenman (set, tekrar, kilo) o günün fitness planına yazılır, plan yoksa açılır.
// Sporcu (programını antrenör hazırlar): "bugünkü antrenmanım ne", "antrenmana başla" (adım adım ekran açılır),
// "bugünkü antrenmanı yaptım / atladım", "bu hafta kaç antrenman yaptım". Program istemi yapay zekaya gitmez.
// Ana hesap: "sporcular bugün antrenman yaptı mı" (gün listesi), "Ali bu hafta kaç antrenman yaptı",
// "Ali için program hazırla" (sporcunun adı yapay zekaya gitmez; önizleme Ali için açılır).
const dayText = (rows) => rows.map((r) => `${r.name} ${STATUS[r.st].toLocaleLowerCase("tr-TR")}`).join(", ");
const exList = (p) => (p?.fit?.items || []).slice(0, 6).map((it) => it.name).filter(Boolean).join(", ");
const whenOf = (p, today) => (p.date === today ? "Bugün" : p.date === addDay(today) ? "Yarın" : p.date.split("-").reverse().slice(0, 2).join("."));
function addDay(d) {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
}
function weekText(w, you = true) {
  const v = you ? "yaptın" : "yaptı";
  if (!w.planned && !w.done) return you ? "Bu hafta antrenmanın yok." : "Bu hafta antrenmanı yok.";
  return `Bu hafta ${w.planned} antrenmandan ${w.done} tanesini ${v}${w.left ? `, ${w.left} tane kaldı` : ""}${w.missed ? `, ${w.missed} tanesi yapılmadı` : ""}.`;
}

function runAthleteFit(ctx, s, viaVoice, loc) {
  const { myUid, openAdd, plans, profile, reply, updateRecord } = ctx;
  const uid = profile?.uid || myUid;
  const today = todayStr();
  const mine = myFit(plans, uid);
  if (!mine.length) return reply("Henüz fitness programın yok. Antrenörün program hazırlayınca burada görünür.", { engine: "local" }, viaVoice);
  if (loc?.op === "stats") return reply(`${weekText(fitWeek(mine, today))} Bu ay ${fitMonth(mine, today.slice(0, 7), today).done} antrenman.`, { engine: "local" }, viaVoice);
  if (loc?.op === "done" || loc?.op === "skip") {
    const p = fitPlanOf(mine, today);
    if (!p || p.fit?.res?.st) return reply("Bugün yapılacak antrenmanın yok.", { engine: "local" }, viaVoice);
    const fit = applyLog(p.fit || { items: [] }, { st: loc.op });
    return updateRecord("plan", p.id, { fit: { ...fit, for: p.fit.for } }, { name: profile?.name || "" }).then(
      () => reply(`Yazdım: ${p.fit?.name || p.title} ${loc.op === "done" ? "yapıldı" : "atlandı"}.`, { engine: "local", show: [{ kind: "plan", id: p.id }] }, viaVoice),
      () => reply("Yazamadım, bağlantıyı kontrol et.", { engine: "local", fail: true }, viaVoice),
    );
  }
  const nx = athleteNext(plans, uid, today);
  if (loc?.op === "start") {
    const p = nx?.today ? nx.plan : fitPlanOf(mine, today);
    if (!p || p.fit?.res?.st) return reply(nx ? `Bugün antrenmanın yok. Sıradaki: ${whenOf(nx.plan, today)}, ${nx.plan.fit?.name || nx.plan.title}.` : "Bugün antrenmanın yok.", { engine: "local" }, viaVoice);
    markStart(p.id);
    openAdd({ edit: { kind: "plan", id: p.id } });
    return reply(`${p.fit?.name || p.title} başlıyor. Her seti bitirince “tamam” de; “atla”, “nasıl yapılır”, “15 saniye ekle” de olur.`, { engine: "local" }, viaVoice);
  }
  if (!nx) return reply("Şu an yapılacak antrenmanın yok.", { engine: "local" }, viaVoice);
  const p = nx.plan;
  const list = exList(p);
  return reply(`${whenOf(p, today)}${p.time ? ` ${p.time}` : ""}: ${p.fit?.name || p.title}${p.durationMin ? `, ${p.durationMin} dakika` : ""}.${list ? ` Hareketler: ${list}.` : ""}${nx.today ? " Başlamak için “antrenmana başla” de." : ""}`, { engine: "local", show: [{ kind: "plan", id: p.id }] }, viaVoice);
}

export async function runFitness(ctx, s, viaVoice, focusFit) {
  const { fitOthers = [], isStaff, members = [], myUid, path, plans, profile, reply, router, runId, setPhase, setSteps, stepTo, stepsEnd, updateRecord } = ctx;
  if (isStaff) return runAthleteFit(ctx, s, viaVoice, fitLocal(s));
  // Ana hesap: sporcular (uygulamada hesabı olan sporcu ve öğrenciler)
  const athletes = members.filter((m) => m.account !== false && (kindOf(m) === "athlete" || kindOf(m) === "student")).map((m) => ({ uid: m.uid, name: m.name || "Sporcu" }));
  const who = athleteIn(s, athletes);
  if (fitLocal(s)?.op === "athletes" && !who) {
    const today = todayStr();
    const day = /\bdün\b/iu.test(s) ? new Date(Date.now() - 864e5).toLocaleDateString("sv-SE") : today;
    const rows = dayRows(fitOthers, athletes, day, today);
    if (path !== "/fitness") router.push("/fitness?sporcular=1");
    else window.dispatchEvent(new Event("sa-fit-athletes"));
    const when = day === today ? "Bugün" : "Dün";
    return reply(rows.length ? `${dayLine(rows, when)}. ${dayText(rows)}.` : `${when} sporcuların fitness antrenmanı yok.`, { engine: "local" }, viaVoice);
  }
  if (who) return runForAthlete(ctx, s, viaVoice, who);
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

// Ana hesap, cümlede sporcu adı var: istatistik yerelde; program yapay zekayla (ad gitmez), önizleme o sporcu için açılır
async function runForAthlete(ctx, s, viaVoice, who) {
  const { fitOthers = [], path, reply, router, runId, setPhase, setSteps, stepTo, stepsEnd } = ctx;
  const today = todayStr();
  const mine = fitOthers.filter((p) => p.fit?.for === who.uid);
  const loc = fitLocal(s);
  if (loc?.op === "stats" || loc?.op === "athletes" || /\b(kaç|yaptı mı|yapmış mı|durum)/iu.test(s)) {
    const w = fitWeek(mine, today);
    const last = fitPlanOf(mine, today);
    return reply(mine.length ? `${who.name}: ${weekText(w, false)}${last && last.date === today ? ` Bugünkü antrenmanı: ${STATUS[last.fit?.res?.st === "done" ? "done" : last.fit?.res?.st === "skip" ? "skip" : "today"].toLocaleLowerCase("tr-TR")}.` : ""}` : `${who.name} için fitness programı yok.`, { engine: "local" }, viaVoice);
  }
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  try {
    stepTo(`${who.name} için program hazırlanıyor`);
    const r = await askFitness({ text: withoutName(s, who.name) || "Genel fitness programı hazırla", profile: {}, program: null, recent: "" });
    if (id !== runId.current) return;
    if (r.op !== "program" || !r.program) {
      stepsEnd(false);
      return reply(`${who.name} için program hazırlayamadım. Fitness › Sporcular'dan elle hazırlayabilirsin.`, { engine: "ai", fail: true }, viaVoice);
    }
    stepsEnd(true);
    showFitProgram({ ...r.program, title: `${who.name} · fitness`, for: who.uid, forName: who.name });
    if (path !== "/fitness") router.push("/fitness");
    return reply(`${who.name} için programı hazırladım. Önizlemeyi açtım; kontrol edip “Kaydet ve planlara ekle”ye bas, ${who.name} bildirim alır.`, { engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(`${e.message || "Program hazırlanamadı."} Fitness › Sporcular'dan elle de hazırlayabilirsin.`, { fail: true, engine: "ai" }, viaVoice);
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
