// Antrenman yarışı sonucunu sesle girme (Seyhun 2026-10-20): "birinci Ali, ikinci Ayşe, üçüncü Mehmet", "1 Ali 2 Ayşe Can DNF",
// "ikinci yarış: …". Adlar sporculara eşlenir (önce o gün gelenler, ses adları da), yanlış duyulan ad gelenlerden tek birine
// yakınsa düzeltilir; bulunamayan adda en yakını sorulur. Sonuç bugünün antrenman planının yarışına yazılır (onaysız, 8 sn Geri al);
// yarış: söylenen, yoksa sayacı süren, yoksa sonucu boş son yarış, yoksa yeni yarış (lib/raceVoice.js pickRace).
import { resultCommand, resolveResult, pickRace, applyResult, resultLine } from "@/lib/raceVoice";
import { cleanRaces, newRace, standings } from "@/lib/raceScore";
import { pickPlan } from "@/lib/trainingLog";
import { aliasesOf } from "@/features/athletes/names";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { readTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";

const first = (n) => String(n).split(" ")[0];

export async function trainingResultCmd(ctx, s, viaVoice) {
  const { owner, racer, plans, updateRecord, by, isLocked, nameIdx, reply, done, askOk, toast, setPhase } = ctx;
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
  const res = resolveResult(cmd, athletes, present, aliases);

  const save = (items, fixed) => {
    const races = plan.races || [];
    const pick = pickRace(races, cmd, items, readTimer().rid || "");
    if (pick.error) return reply(pick.error, { engine: "local", fail: true }, viaVoice);
    const race = pick.isNew ? newRace(races) : races[pick.index];
    const next = applyResult(race, items);
    const list = pick.isNew ? [...races, next] : races.map((r, i) => (i === pick.index ? next : r));
    updateRecord("plan", plan.id, { races: cleanRaces(list) }, by);
    toast?.(`${next.name} sonucu yazıldı`, { duration: 8000, action: { label: "Geri al", onClick: () => updateRecord("plan", plan.id, { races: cleanRaces(races) }, by) } });
    const table = standings(list, athletes.filter((a) => present.includes(a.id)).map((a) => ({ id: a.id, name: a.studentName })));
    const top = table.races.length > 1 ? ` Genel: ${table.rows.slice(0, 3).map((r) => `${r.rank} ${first(r.name)} ${r.net}`).join(", ")}.` : "";
    const fix = fixed.length ? ` (${fixed.map((f) => `“${f.said}” → ${f.name}`).join(", ")})` : "";
    done(`${next.name}${pick.isNew ? " (yeni)" : ""}: ${resultLine(next)}.${fix}${top}`, { engine: "local", nav: "trainingDay" }, viaVoice);
  };

  if (!res.unknown.length) {
    if (!res.items.length) return setPhase?.("idle"), undefined;
    save(res.items, res.fixed);
    return true;
  }
  // Bulunamayan ad: en yakın sporcuyla tamamlayıp sor (onaylanırsa yazılır); yakını yoksa yeniden söylemesi istenir
  const lost = res.unknown.filter((u) => !u.picks.length);
  if (lost.length) {
    reply(`${lost.map((u) => `“${u.said}”`).join(", ")} adında sporcu bulamadım. Sonucu adı düzelterek yeniden söyle.`, { engine: "local", expect: true, listen: true }, viaVoice);
    return true;
  }
  const guess = res.unknown.map((u) => ({ ...u, a: athletes.find((a) => a.studentName === u.picks[0]) }));
  const items = [...res.items, ...guess.filter((g) => !res.items.some((x) => x.id === g.a.id)).map((g) => (g.code ? { id: g.a.id, name: g.a.studentName, code: g.code } : { id: g.a.id, name: g.a.studentName, place: g.place }))].sort((a, b) => (a.place || 99) - (b.place || 99));
  askOk(`${guess.map((g) => `“${g.said}” ${g.a.studentName} mı`).join(", ")}? Öyleyse yazayım: ${items.map((x) => (x.code ? `${first(x.name)} ${x.code}` : `${x.place} ${first(x.name)}`)).join(", ")}.`, "Yaz", () => save(items, res.fixed), viaVoice);
  return true;
}
