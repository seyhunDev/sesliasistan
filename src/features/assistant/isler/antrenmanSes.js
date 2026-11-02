// Antrenman yarışını sesle yönetme (Seyhun 2026-11-02 "ben sesli yapmak istiyorum hepsini"): yarış günü olmayan günde ya da
// antrenman sayfasındayken. "2 dakika başlat" → ekranda 3 · 2 · 1, sonra geri sayım başlar ve bugünün antrenmanına yarış açılır
// (antrenman sayfasındaki Başlat'ın aynısı, plan yoksa açılır); "yarışı bitir" → yarışın süresi yazılır, sayaç durur;
// "yarışı bitir, birinci Ali ikinci Ayşe" → süre ve sonuç tek kayıtta. Her adımda 8 sn Geri al. Cümleler lib/trainVoice.js.
import { trainCommand, raceToday } from "@/lib/trainVoice";
import { voiceResult, voiceText } from "@/lib/raceVoice";
import { cleanRaces, mmss } from "@/lib/raceScore";
import { upSec } from "@/lib/raceLive";
import { pickPlan } from "@/lib/trainingLog";
import { aliasesOf } from "@/features/athletes/names";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { leadIn, raceStart, readTimer, writeTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";

const OWN = "/training/day";
const where = (plan) => (plan?.title && plan.title !== "Antrenman" ? plan.title : "Antrenman");
const minText = (sec) => (sec % 60 ? `${mmss(sec)}` : `${sec / 60} dakika`);

// Bugünün antrenman planı; yoksa açılır (sayfadaki Başlat gibi)
async function todayPlan(ctx) {
  const today = todayStr();
  const p = pickPlan(ctx.plans, today);
  if (p) return { plan: p, races: p.races || [] };
  const r = await ctx.saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date: today, time: "", place: "", assignees: [] }], { source: "voice", by: ctx.profile?.uid });
  const id = r?.ids?.find((x) => x[0] === "plan")?.[1];
  return id ? { plan: { id, title: "Antrenman", date: today, races: [] }, races: [] } : null;
}

export async function trainVoiceCmd(ctx, s, viaVoice) {
  const { owner, racer, races, path = "", reply, done, toast, updateRecord, by, isLocked, router, setPhase } = ctx;
  if (!owner || !racer) return undefined;
  const p = String(path);
  if (!p.startsWith("/training") && (p.startsWith("/athletes/races/") || raceToday(races?.current || [], todayStr()))) return undefined; // yarış sayfası ya da yarış günü: Yayın
  const tc = trainCommand(s);
  if (!tc) return undefined;
  const t = readTimer();
  const goPage = () => !String(window.location.pathname).startsWith(OWN) && router.push(OWN);

  if (tc.start != null) {
    if (t.end != null) {
      reply("Sayaç zaten çalışıyor. Önce “yarışı bitir” de.", { engine: "local", fail: true }, viaVoice);
      return true;
    }
    setPhase?.("thinking");
    const got = await todayPlan(ctx);
    if (!got) {
      reply("Bugünün antrenmanını açamadım, tekrar dene.", { engine: "local", fail: true }, viaVoice);
      return true;
    }
    const { plan, races: list } = got;
    if (isLocked?.("plan", plan.id)) {
      reply("Bugünkü antrenman kilitli; yarışı başlatamadım.", { engine: "local", fail: true }, viaVoice);
      return true;
    }
    const sec = tc.start || t.dur || 300;
    const at = leadIn(3000);
    goPage();
    done(`${minText(sec)}, başlıyor.`, { engine: "local" }, viaVoice);
    setTimeout(() => {
      if (readTimer().end != null) return; // bu arada elle başlatıldı
      const prevT = readTimer();
      writeTimer({ dur: sec, end: null, left: sec, zero: prevT.zero ?? null, own: OWN, where: where(plan) });
      raceStart(
        {
          onStart: (end, rid) => {
            const r = { id: rid, name: `Yarış ${list.length + 1}`, startAt: end, cd: sec, finishes: [] };
            updateRecord("plan", plan.id, { races: cleanRaces([...list, r]) }, by);
            toast?.(`${r.name} geri sayımı başladı`, { duration: 8000, action: { label: "Geri al", onClick: () => (updateRecord("plan", plan.id, { races: cleanRaces(list) }, by), writeTimer(prevT)) } });
          },
        },
        "start",
        where(plan),
        OWN,
      );
    }, Math.max(0, at - Date.now()));
    return true;
  }

  // Bitir (ve aynı cümlede sonuç)
  const plan = pickPlan(ctx.plans, todayStr());
  const list = plan?.races || [];
  const cur = t.end != null && t.rid ? list.find((r) => r.id === t.rid) : null;
  if (!plan || (!cur && !tc.rest)) {
    reply(t.end != null ? "Sayaç duruyor ama bugünkü antrenmanda süren yarış yok." : "Süren yarış yok.", { engine: "local", fail: true }, viaVoice);
    if (t.end != null && !cur) writeTimer({ dur: t.dur, end: null, left: null, zero: t.end });
    return true;
  }
  if (isLocked?.("plan", plan.id)) {
    reply("Bugünkü antrenman kilitli; yazamadım.", { engine: "local", fail: true }, viaVoice);
    return true;
  }
  const now = Date.now();
  let next = list;
  const said = [];
  if (cur) {
    if (t.end > now) {
      // geri sayım bitmeden: yarış iptal (sonucu yoksa silinir)
      writeTimer({ dur: t.dur, end: null, left: null, zero: t.zero ?? null });
      next = cur.finishes.length ? list : list.filter((r) => r.id !== cur.id);
      updateRecord("plan", plan.id, { races: cleanRaces(next) }, by);
      toast?.("Geri sayım iptal edildi", { duration: 8000, action: { label: "Geri al", onClick: () => (updateRecord("plan", plan.id, { races: cleanRaces(list) }, by), writeTimer(t)) } });
      done("Yarış başlamamıştı, geri sayımı iptal ettim.", { engine: "local" }, viaVoice);
      return true;
    }
    const fin = upSec(cur.startAt ?? t.end, now);
    next = list.map((r) => (r.id === cur.id ? { ...r, fin } : r));
    writeTimer({ dur: t.dur, end: null, left: null, zero: t.end });
    said.push(`${cur.name} bitti, ${mmss(fin)}.`);
  }
  if (tc.rest) {
    setPhase?.("thinking");
    let athletes = [];
    try {
      athletes = ((await loadAthletes()).athletes || []).filter(isActive);
    } catch {}
    const today = todayStr();
    const y = today.slice(0, 4);
    const md = today.slice(5);
    const present = athletes.filter((a) => a.att?.[y]?.[md] === "present").map((a) => a.id);
    const aliases = Object.fromEntries(athletes.map((a) => [a.id, aliasesOf(ctx.nameIdx, a.id)]));
    const r = athletes.length ? voiceResult(tc.rest, { races: next, athletes, present, aliases, runningId: cur?.id || "", force: true }) : { error: "Sporcuları yükleyemedim; sonucu tekrar söyle." };
    if (r.error) said.push(cur ? `Sonucu yazamadım: ${r.error}` : r.error);
    else {
      next = r.list;
      said.push(voiceText(r));
    }
  }
  if (next !== list) {
    updateRecord("plan", plan.id, { races: cleanRaces(next) }, by);
    toast?.(said[0] || "Yazıldı", { duration: 8000, action: { label: "Geri al", onClick: () => (updateRecord("plan", plan.id, { races: cleanRaces(list) }, by), cur && writeTimer(t)) } });
  }
  goPage();
  (next === list ? reply : done)(said.join(" "), { engine: "local", ...(next === list ? { fail: true } : {}) }, viaVoice);
  return true;
}
