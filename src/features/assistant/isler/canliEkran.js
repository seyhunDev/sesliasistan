// Canlı ekran işleri (herkese açık /canli sayfası, Seyhun 2026-11-01), elle yapılanın (Canlı ekran penceresi) sesle yapılanı:
// "birinci şamandıra 1302 1287 1415", "finish 1287 1302" → o anki yarışın dönüşleri; "parkur 1 4 1 2 3 finish" → dönüş sırası;
// "ekranda birinci yarışın startını döngüde göster", "ekranda canlı yayını göster", "ekrandan kaldır"; hemen ardından "geri al".
// Yalnız ana hesap. Yarış: açık yarış ya da multimedya sayfası, yoksa bugün süren yarış (yarisMedya ile aynı).
import { liveRace } from "@/lib/raceLive";
import { courseUndo } from "@/lib/raceCourse";
import { roundCommand, routeCommand, screenCommand } from "@/lib/raceRounds";
import { roundAt, roundJust, roundSay, roundUndo, screenSay } from "@/features/liveScreen/liveActions";
import { courseAt } from "./yarisMedya";
import { todayStr } from "@/lib/utils/format";

const pageRace = (path) => /^\/athletes\/races\/([\w-]+)(?:\/media|\/yayin)?$/.exec(path || "")?.[1] || "";
const raceFor = (ctx) => {
  const cur = pageRace(ctx.path);
  return liveRace(ctx.races?.current || [], todayStr(), cur && cur !== "new" ? cur : "");
};

export async function liveScreenCmd(ctx, s, viaVoice) {
  const { owner, racer, raceOrg, reply, done, setPhase } = ctx;
  if (!owner || !racer) return undefined;
  // geri al: son iş dönüş yazımıysa (parkur ölçümü daha yeni değilse)
  if (courseUndo(s) && roundJust() && roundAt() >= courseAt()) {
    setPhase?.("thinking");
    try {
      await roundUndo();
      done("Geri aldım, son yazdığım dönüşleri sildim.", { engine: "local" }, viaVoice);
    } catch {
      reply("Geri alamadım, Yayın sayfasından düzelt.", { fail: true, engine: "local" }, viaVoice);
    }
    return true;
  }
  const mine = routeCommand(s) || roundCommand(s) || screenCommand(s);
  if (!mine) return undefined;
  const r = raceFor(ctx);
  if (!r) {
    reply("Bugün süren bir yarış yok.", { engine: "local" }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  try {
    const out = (await roundSay(raceOrg, r.id, s)) || (await screenSay(raceOrg, r.id, s));
    if (!out) return undefined;
    if (out.fail) reply(out.fail, { engine: "local" }, viaVoice);
    else done(out.text, { engine: "local" }, viaVoice);
  } catch {
    reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  }
  return true;
}
