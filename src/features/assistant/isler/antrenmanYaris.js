// Antrenman yarışı sonucunu sesle girme (Seyhun 2026-10-20): "birinci Ali, ikinci Ayşe, üçüncü Mehmet", "1 Ali 2 Ayşe Can DNF",
// "ikinci yarış: …". Adlar sporculara eşlenir (önce o gün gelenler, ses adları da), yanlış duyulan ad gelenlerden tek birine
// yakınsa düzeltilir; bulunamayan ad en yakın sporcuya yazılır, hiç yakını yoksa atlanır (onay yok, Seyhun 2026-10-20). Sonuç bugünün antrenman planının yarışına yazılır (onaysız, 8 sn Geri al);
// yarış: söylenen, yoksa sayacı süren, yoksa sonucu boş son yarış, yoksa yeni yarış (lib/raceVoice.js pickRace).
import { resultCommand, voiceResult, voiceText } from "@/lib/raceVoice";
import { cleanRaces, standings } from "@/lib/raceScore";
import { pickPlan } from "@/lib/trainingLog";
import { aliasesOf } from "@/features/athletes/names";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { readTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";

const first = (n) => String(n).split(" ")[0];

export async function trainingResultCmd(ctx, s, viaVoice) {
  const { owner, racer, plans, updateRecord, by, isLocked, nameIdx, reply, done, toast, setPhase } = ctx;
  const cmd = owner && racer ? resultCommand(s) : null;
  if (!cmd) return undefined;
  const today = todayStr();
  const plan = pickPlan(plans, today);
  if (!plan) {
    reply("Bugün antrenman planı yok. Önce antrenman sayfasından antrenmanı ekle, sonra sonucu söyle.", { engine: "local", nav: "trainingDay" }, viaVoice);
    return true;
  }
  if (isLocked?.("plan", plan.id)) {
    reply("Bugünkü antrenman kilitli; sonucu yazamadım.", { engine: "local", fail: true }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  let athletes = [];
  try {
    athletes = ((await loadAthletes()).athletes || []).filter(isActive);
  } catch {
    reply("Sporcuları yükleyemedim, tekrar dene.", { engine: "local", fail: true }, viaVoice);
    return true;
  }
  const y = today.slice(0, 4);
  const md = today.slice(5);
  const present = athletes.filter((a) => a.att?.[y]?.[md] === "present").map((a) => a.id);
  const aliases = Object.fromEntries(athletes.map((a) => [a.id, aliasesOf(nameIdx, a.id)]));
  const races = plan.races || [];
  const r = voiceResult(s, { races, athletes, present, aliases, runningId: readTimer().rid || "" });
  if (r.error) {
    reply(r.error, { engine: "local", fail: true, expect: true, listen: true }, viaVoice);
    return true;
  }
  updateRecord("plan", plan.id, { races: cleanRaces(r.list) }, by);
  toast?.(`${r.race.name} sonucu yazıldı`, { duration: 8000, action: { label: "Geri al", onClick: () => updateRecord("plan", plan.id, { races: cleanRaces(races) }, by) } });
  const table = standings(r.list, athletes.filter((a) => present.includes(a.id)).map((a) => ({ id: a.id, name: a.studentName })));
  const top = table.races.length > 1 ? ` Genel: ${table.rows.slice(0, 3).map((x) => `${x.rank} ${first(x.name)} ${x.net}`).join(", ")}.` : "";
  done(`${voiceText(r)}${top}`, { engine: "local", nav: "trainingDay" }, viaVoice);
  return true;
}
