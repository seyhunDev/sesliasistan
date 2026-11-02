// Tekne takibi sesle (Seyhun 2026-11-02; elle: Yayın › Dönüşler › Tekne takibi): "tekne takibini aç / kapat",
// "takip haritasını göster / kaldır". Yalnız ana hesap. Yarış: açık yarış sayfası, yoksa bugün süren yarış (canliEkran.js ile aynı).
import { liveRace } from "@/lib/raceLive";
import { trackCommand } from "@/lib/boatTrack";
import { loadTrack, saveTrack } from "@/features/tracking/trackStore";
import { ensurePublic } from "@/features/liveScreen/liveActions";
import { todayStr } from "@/lib/utils/format";

const pageRace = (path) => /^\/athletes\/races\/([\w-]+)(?:\/media|\/yayin)?$/.exec(path || "")?.[1] || "";

export async function trackCmd(ctx, s, viaVoice) {
  const { owner, racer, raceOrg, reply, done, setPhase } = ctx;
  if (!owner || !racer) return undefined;
  const c = trackCommand(s);
  if (!c) return undefined;
  const cur = pageRace(ctx.path);
  const r = liveRace(ctx.races?.current || [], todayStr(), cur && cur !== "new" ? cur : "");
  if (!r) {
    reply("Bugün süren bir yarış yok.", { engine: "local" }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  try {
    const t = await loadTrack(r.id);
    const next = await saveTrack(raceOrg, r.id, t, c);
    if (next.on) ensurePublic(r.id).catch(() => {});
    const text = "map" in c ? (c.map ? "Tekne haritası yayında." : "Tekne haritasını yayından kaldırdım.") : c.on ? "Tekne takibi açık. Teknelere linki Yayın › Dönüşler'den gönder." : "Tekne takibini kapattım.";
    done(text, { engine: "local" }, viaVoice);
  } catch {
    reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  }
  return true;
}
