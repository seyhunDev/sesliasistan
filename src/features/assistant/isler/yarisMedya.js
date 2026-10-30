// Yarış multimedya sayfası işleri (elle yapılanların sesle yapılanı):
// "rüzgar 15 knot kuzeybatı" → o günün yarışına rüzgâr kaydı (saat şimdi); "parkur ekseni 320", "pinden komite 110" → o günün
// Parkur ölçümü, bir cümlede birkaçı da (Parkur sekmesindeki Yön ekle / Pusula ile aynı kayıt, kart hemen çizilir); "5 dakikalık sayacı başlat" → start sayacı başlar,
// yarışın Süre sekmesi açılır (bugün yarış yoksa antrenman sayfası). Yarış: açık yarış ya da multimedya sayfası, yoksa bugün süren yarış.
import { liveRace, timerCommand, windCommand, dirShort } from "@/lib/raceLive";
import { addCourseMany, addWind } from "@/features/athletes/raceLiveStore";
import { COURSE_WORD, cleanCourse, cleanObs, courseAsk, courseCommand, courseRelative, obsTitle } from "@/lib/raceCourse";
import { courseView } from "@/features/raceMedia/courseView";
import { askCourseAi } from "@/services/courseService";
import { startTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";

const pageRace = (path) => /^\/athletes\/races\/([\w-]+)(?:\/media)?$/.exec(path || "")?.[1] || "";
const raceFor = (ctx) => {
  const cur = pageRace(ctx.path);
  return liveRace(ctx.races?.current || [], todayStr(), cur && cur !== "new" ? cur : "");
};

export async function windLogCmd(ctx, s, viaVoice) {
  const { owner, racer, raceOrg, reply, done, setPhase } = ctx;
  // parkur cümlesinde birden çok ölçüm varsa (rüzgâr da içinde) parkura yazılır (courseCmd)
  // Parkur sekmesi açıkken rüzgâr da parkura yazılır (courseCmd; "parkurdaki rüzgâr değişik", Seyhun 2026-10-29)
  const wc = owner && racer && !courseView() && !(courseCommand(s)?.list.length > 1) ? windCommand(s) : null;
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
  const own = r ? `/athletes/races/${r.id}/media` : "/training/day";
  startTimer(tc.sec, r ? "start" : "", own); // sayaç gidilen sayfanın (kendi sayfasında görünür)
  const href = r ? `${own}?tab=sure` : own;
  if (`${window.location.pathname}${window.location.search}` !== href) router.push(href);
  done(`Sayaç başladı: ${tc.sec / 60} dakika.`, { engine: "local" }, viaVoice);
  return true;
}

// Ekrandaki parkurun son rüzgârı ve ekseni (yapay zekâya göreli cümleler için)
function lastVals(c) {
  const obs = cleanCourse(c || {}).obs;
  const w = [...obs].reverse().find((x) => x.kind === "wind");
  const a = [...obs].reverse().find((x) => x.kind === "axis");
  return { wind: w ? { deg: w.deg, kn: w.kn } : null, axis: a ? a.deg : null };
}

// Parkur (Seyhun 2026-10-30 "parkurdaki asistan öncelikli olarak parkurla çalışmalı, yapay zekadan hızlıca cevap alalım"):
// önce telefondaki kurallar (tek/çoklu ölçüm); Parkur sekmesi açıksa sorular ("hangi taraf avantajlı", "rüzgar ne kadar döndü"),
// göreli cümleler ("rüzgar 10 derece sağa döndü", "2 knot düştü"), anlaşılmazsa parkur yapay zekâsı (/api/course-parse, ≤5 sn).
// Yazılan yer: açık Parkur sekmesinin yarışı ve günü (courseView.js), yoksa bugün süren yarış.
export async function courseCmd(ctx, s, viaVoice) {
  const { owner, racer, raceOrg, reply, done, setPhase } = ctx;
  if (!owner || !racer) return undefined;
  const v = courseView();
  const cur = v ? v.get() : null;
  let cc = courseCommand(s);
  if (!cc && v) {
    const ans = courseAsk(s, cur);
    if (ans) {
      done(ans, { engine: "local" }, viaVoice);
      return true;
    }
    const rel = courseRelative(s, cur);
    if (rel?.need) {
      reply(rel.need === "axis" ? "Önce parkur eksenini söyle, örneğin “eksen 320”." : "Önce rüzgârın derecesini ve hızını söyle, örneğin “rüzgar 330, 12 knot”.", { engine: "local" }, viaVoice);
      return true;
    }
    if (rel) cc = rel;
    else if (COURSE_WORD.test(String(s).toLocaleLowerCase("tr-TR")) || /\d/.test(s)) {
      setPhase?.("thinking");
      const ai = await askCourseAi(s, lastVals(cur));
      if (ai.items) cc = { list: ai.items };
      else if (ai.error) {
        reply("Parkur için yapay zekâya ulaşamadım. Kısa söyle: “rüzgar 330, 12 knot”, “eksen 320”.", { fail: true, engine: "local" }, viaVoice);
        return true;
      }
    }
  }
  if (!cc) return undefined;
  const r = v ? { id: v.id } : raceFor(ctx);
  if (!r) {
    reply("Bugün süren bir yarış yok. Parkuru yarışın Saha sekmesinden ekleyebilirsin.", { engine: "local" }, viaVoice);
    return true;
  }
  const day = v?.day || todayStr();
  const at = Date.now();
  // birkaç ölçüm aynı anda söylenince sıraları kalsın diye saatleri 1 ms arayla
  const list = cc.list.filter((x) => x.obs).map((x, i) => cleanObs({ ...x.obs, at: new Date(at + i).toISOString() })).filter(Boolean);
  const len = cc.list.find((x) => x.len)?.len || null;
  if (!list.length && !len) return undefined;
  setPhase?.("thinking");
  try {
    await addCourseMany(raceOrg, r.id, day, list, len);
    const said = list.map((o) => `${obsTitle(o)} ${o.deg}°${o.kn != null ? `, ${o.kn} knot` : ""}`);
    if (len) said.push(`orsa ayağı ${len.orsa} m`);
    done(`Yazdım: ${said.join(" · ")}.`, { engine: "local" }, viaVoice);
  } catch {
    reply("Parkura yazamadım, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  }
  return true;
}
