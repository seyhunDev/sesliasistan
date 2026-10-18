// Yarış multimedya sayfası işleri (elle yapılanların sesle yapılanı):
// "rüzgar 15 knot kuzeybatı" → o günün yarışına rüzgâr kaydı (saat şimdi); "5 dakikalık sayacı başlat" → start sayacı başlar,
// yarışın Süre sekmesi açılır (bugün yarış yoksa antrenman sayfası). Yarış: açık yarış ya da multimedya sayfası, yoksa bugün süren yarış.
import { liveRace, timerCommand, windCommand, dirShort } from "@/lib/raceLive";
import { addWind } from "@/features/athletes/raceLiveStore";
import { startTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";

const pageRace = (path) => /^\/athletes\/races\/([\w-]+)(?:\/media)?$/.exec(path || "")?.[1] || "";
const raceFor = (ctx) => {
  const cur = pageRace(ctx.path);
  return liveRace(ctx.races?.current || [], todayStr(), cur && cur !== "new" ? cur : "");
};

export async function windLogCmd(ctx, s, viaVoice) {
  const { owner, racer, raceOrg, reply, done, setPhase } = ctx;
  const wc = owner && racer ? windCommand(s) : null;
  if (!wc) return undefined;
  const r = raceFor(ctx);
  if (!r) {
    reply("Bugün süren bir yarış yok. Rüzgârı yarışın multimedya sayfasından yazabilirsin.", { engine: "local" }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  try {
    const w = { at: new Date().toISOString(), dir: wc.dir, kn: wc.kn, gust: wc.gust, src: "elle" };
    await addWind(raceOrg, r.id, w);
    window.dispatchEvent(new CustomEvent("sa-race-live", { detail: { id: r.id, wind: w } }));
    done(`Yazdım: ${dirShort(wc.dir)} ${wc.kn} knot${wc.gust ? `, sağanak ${wc.gust}` : ""}.`, { engine: "local" }, viaVoice);
  } catch {
    reply("Rüzgârı kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  }
  return true;
}

export async function timerCmd(ctx, s, viaVoice) {
  const { racer, router, done } = ctx;
  const tc = racer ? timerCommand(s) : null;
  if (!tc) return undefined;
  const r = raceFor(ctx);
  startTimer(tc.sec);
  const href = r ? `/athletes/races/${r.id}/media?tab=sure` : "/training/day";
  if (`${window.location.pathname}${window.location.search}` !== href) router.push(href);
  done(`Sayaç başladı: ${tc.sec / 60} dakika.`, { engine: "local" }, viaVoice);
  return true;
}
