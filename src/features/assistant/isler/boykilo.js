// Sporcunun boy ve kilosu: "Mete'nin kilosu 52", "Mete'nin boyu 1.52 kilosu 43", "Mete'nin kilosu kaç"
// Ölçüm sporcu sayfasındaki Boy / Kilo kartına (kulüp projesinde sporcu belgesi) yazılır.
import { bodyCommand, bodyText, lastBody } from "@/lib/athleteBody";
import { loadAthletes, saveBody, fmtDate } from "@/features/athletes/data";
import { matchPerson } from "@/lib/names";
import { canSeeAthletes } from "@/features/athletes/access";
import { todayStr } from "@/lib/utils/format";

export async function athleteBodyCmd(ctx, s, viaVoice) {
  const { done, memoSet, owner, profile, reply, setPhase } = ctx;
  const bc = owner && canSeeAthletes(profile?.email) ? bodyCommand(s) : null;
  if (!bc) return undefined;
  let athletes;
  try {
    ({ athletes } = await loadAthletes());
  } catch {
    if (!bc.explicit) return undefined;
    reply("Sporcu listesini okuyamadım.", { engine: "local" }, viaVoice);
    return true;
  }
  const hit = matchPerson(bc.name, athletes.map((a) => a.studentName));
  const a = hit ? athletes.find((x) => x.studentName === hit) : null;
  if (!a) {
    if (!bc.explicit && bc.op !== "ask") return undefined;
    reply(`${bc.name} adında sporcu bulamadım.`, { engine: "local" }, viaVoice);
    return true;
  }
  memoSet?.("athlete", a.studentName);
  if (bc.op === "ask") {
    const l = lastBody(a.body);
    const parts = [l.h ? `boyu ${l.h} cm (${fmtDate(l.hd)})` : "", l.kg ? `kilosu ${String(l.kg).replace(".", ",")} kg (${fmtDate(l.kd)})` : ""].filter(Boolean);
    reply(parts.length ? `${a.studentName}: ${parts.join(", ")}.` : `${a.studentName} için boy ve kilo yazılmamış.`, { engine: "local" }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  try {
    await saveBody(a.id, { d: todayStr(), h: bc.h, kg: bc.kg });
    done(`Yazdım: ${a.studentName} ${bodyText(bc)}.`, { engine: "local" }, viaVoice);
  } catch (e) {
    reply(e?.code === "permission-denied" ? "Kulüp hesabının yazma izni yok." : "Ölçümü kaydedemedim.", { fail: true, engine: "local" }, viaVoice);
  }
  return true;
}
