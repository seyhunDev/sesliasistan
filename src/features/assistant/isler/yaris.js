// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { todayStr } from "@/lib/utils/format";
import { rankRaces, sure, findRace, nearest, raceRef } from "@/features/athletes/raceNav";
import { findRaceAi, runRaceCommand } from "@/features/athletes/assistRace";
import { saveRace, loadRaces } from "@/features/athletes/races";
import { loadAthletes } from "@/features/athletes/data";
import { matchPerson, sameNamed, plain } from "@/lib/names";
import { resultsAnswer } from "@/lib/resultSheet";
import { raceWithAthletes, RACE_KEY, POST_ASK_KEY, wantsPostImage } from "@/features/posts/postModel";
import { record } from "@/lib/brain/store";
import { postHandler } from "@/features/posts/posts";
import { raceHereCommand, hotelAddCommand } from "@/lib/assistMore";
import { deleteRace, addRacePlan, matchStep, stepsOf, doneSteps, cleanDone, cleanHotels, raceHotels } from "@/features/athletes/races";
import { cleanResults } from "@/lib/raceResults";
import { emptyBudget } from "@/features/athletes/budget";

// Söylenen yarışı bul: kesin eşleşme → puanlama → yapay zeka → en yakın seçenekler (yoksa tarihi en yakın 3 yarış)
export async function openRace(ctx, s, viaVoice) {
  const { goRace, races, reply, runId, setPhase, setSteps, stepTo } = ctx;
  const list = races.current;
  const today = todayStr();
  if (!list.length) return reply("Kayıtlı yarış bulamadım. Yarışlar sayfasından ekleyebilirsin.", { engine: "local", nav: "races" }, viaVoice);
  // Puanlama tekne sınıfını ve ayak numarasını da sayar; kesinse o, değilse ad kelimesiyle tam eşleşen
  const ranked = rankRaces(s, list, today);
  if (sure(ranked)) return goRace(ranked[0].race, viaVoice);
  const exact = findRace(s, list, today);
  if (exact && (!ranked[1] || ranked[0]?.race.id === exact.id)) return goRace(exact, viaVoice);
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  stepTo("Yarış aranıyor");
  let ai = null;
  try {
    ai = await findRaceAi(s, list);
  } catch {}
  if (id !== runId.current) return;
  setPhase("idle");
  setSteps([]); // arama adımı iş bitince kalmasın (seçenek sormak hata değil)
  const byId = (x) => list.find((r) => r.id === x);
  if (ai?.raceId && byId(ai.raceId)) return goRace(byId(ai.raceId), viaVoice);
  // Seçenekler: yapay zekanın adayları, yoksa puanı olanlar, o da yoksa tarihi bugüne en yakın 3 yarış
  const fromAi = (ai?.candidates || []).map(byId).filter(Boolean);
  // Yapay zekanın ilk adayı yerel puanlamanın da birincisiyse sormadan açılır
  if (fromAi[0] && ranked[0]?.race.id === fromAi[0].id) return goRace(fromAi[0], viaVoice);
  const scored = ranked.map((x) => x.race);
  const opts = [...fromAi, ...scored].filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i).slice(0, 3);
  const guess = opts.length ? opts : nearest(list, today, 3);
  if (guess.length === 1 && opts.length) return goRace(guess[0], viaVoice);
  const names = guess.map((r) => r.name);
  const said = opts.length ? `Tam emin olamadım. ${names.join(", ")} olabilir. Hangisini açayım?` : `Bu adda bir yarış bulamadım. Tarihi en yakın yarışlar: ${names.join(", ")}. Hangisini açayım?`;
  return reply(said, { engine: ai ? "ai" : "local", races: guess, expect: true }, viaVoice);
}

export function goRace(ctx, r, viaVoice) {
  const { chainRace, curRace, leave, memoSet, router } = ctx;
  navigator.vibrate?.(8);
  chainRace.current = r.id; // sohbetin yarışı: "bunun için gönderi hazırla", "yarışa Ali'yi de ekle"
  memoSet("race", r.name);
  if (curRace !== r.id) router.push(`/athletes/races/${r.id}`);
  leave(curRace === r.id ? `${r.name} sayfası açık.` : `${r.name} yarışını açtım.`, viaVoice);
}

// ---- Elle yapılan diğer işler (lib/assistMore.js): fiş ödendi, gelmeyenlerin velilerine haber, alınanları temizle,
// doğum günü / kişi silme, açık yarışta sporcu çıkarma, sonuç, ödeme, yarışı silme ve planlara ekleme, mesaj grubu kurma ----
export async function saveHereRace(ctx, r, next) {
  const { myUid, profile, raceOrg, races } = ctx;
  await saveRace(raceOrg, myUid || profile.uid, next);
  races.current = races.current.map((x) => (x.id === r.id ? next : x));
  window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
}

export async function runResults(ctx, ra, viaVoice) {
  const { raceOrg, races, reply } = ctx;
  const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
  const hit = matchPerson(ra.name, athletes.map((a) => a.studentName));
  const a = hit ? athletes.find((x) => x.studentName === hit) : null;
  if (!a) return false;
  if (raceOrg) races.current = await loadRaces(raceOrg).catch(() => races.current);
  const list = [...races.current].sort((x, y) => String(y.startDate || "").localeCompare(String(x.startDate || "")));
  reply(resultsAnswer(list, a, ra.race), { engine: "local" }, viaVoice);
  return true;
}

// follow: yeni yarışın tarih/sporcu sorusuna cevap ({ id, n }): o yarışa yazılır
export async function runRace(ctx, s, viaVoice, follow = null) {
  const { by, chain, chainRace, chainStep, curRace, memoSet, myUid, nameIdx, planOn, profile, raceFollow, raceOrg, races, reply, run, runId, saveDrafts, setPhase, setSteps, setTurns, skipRace, stepTo, stepsEnd, toast, waitFor } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  try {
    const orgId = profile?.orgId || myUid;
    const r = await runRaceCommand(s, { idx: nameIdx, orgId, uid: myUid, saveDrafts, by, current: follow?.id || curRace || chainRace.current, follow: follow ? follow.n + 1 : 0, noAsk: planOn.current && chain.current.length > 0 }, stepTo);
    if (id !== runId.current) return;
    // Yarış sayfasında söylenen cümle yarışla ilgili çıkmadıysa her zamanki yoldan sorulur
    if (r.none) {
      setPhase("idle");
      setSteps([]);
      setTurns((p) => (p.at(-1)?.role === "user" ? p.slice(0, -1) : p));
      skipRace.current = true;
      if (planOn.current) chainStep.current = true;
      return run(s, viaVoice);
    }
    stepsEnd(!r.expect || r.follow);
    if (!r.expect || r.follow) {
      navigator.vibrate?.([10, 40, 10]);
      toast("Yarış kaydedildi");
    }
    if (r.id) {
      chainRace.current = r.id;
      if (raceOrg) races.current = await loadRaces(raceOrg).catch(() => races.current);
      memoSet("race", races.current.find((x) => x.id === r.id)?.name);
    }
    if (r.follow) waitFor("raceFollow"), (raceFollow.current = { id: r.id, n: follow ? follow.n + 1 : 0 });
    reply(r.said, { engine: "ai", nav: curRace ? "" : "races", expect: !!r.expect }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    const denied = e.code === "permission-denied";
    reply(denied ? "Kulüp hesabına bağlı değilsin. Sporcular sayfasından bir kez bağlanman gerekiyor." : e.message || "Yarış kaydedilemedi.", { fail: true, engine: "local", nav: "races" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

export function sameIn(ctx, unknown, names) {
  const { AMB } = ctx;
  const amb = (unknown || []).filter((u) => AMB.test(u)).map((u) => u.replace(AMB, "").trim());
  const picks = amb.flatMap((n) => sameNamed(n, names));
  const text = amb.map((n) => {
    const many = sameNamed(n, names);
    return many.length ? `${many.length} ${n} var: ${many.join(", ")}. Hangisi?` : `Birden çok ${n} var, hangisi?`;
  }).join(" ");
  return { text, picks: [...new Set(picks)].slice(0, 4) };
}

// Instagram gönderisi: söylenen yarış bulunursa sporcularıyla bağlanır; gönderi ekranı açılınca yapay zeka yazar (POST_ASK_KEY)
export async function startPost(ctx, s, viaVoice) {
  const { chainRace, curRace, leave, memoSet, raceOrg, racer, races, router, runId, setPhase, setSteps, stepTo, stepsEnd } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  let r = null;
  try {
    if (racer) {
      stepTo("Yarış aranıyor");
      if (raceOrg && !races.current.length) races.current = await loadRaces(raceOrg).catch(() => []);
      // Bu sohbette az önce oluşturulan / açılan yarış adla uyuşuyorsa önce o: aynı adlı eski yarış seçilmesin (denetim B7)
      const near = chainRace.current && races.current.find((x) => x.id === chainRace.current);
      const words = near ? near.name.split(/\s+/).map(plain).filter((w) => w.length > 2 && !/^(yaris|kupasi|kupa|ayak|ligi)$/.test(w)) : [];
      r = (near && words.length && words.every((w) => plain(s).includes(w)) ? near : null) || raceRef(s, races.current, todayStr(), chainRace.current || curRace)?.race || null;
      if (r) {
        stepTo("Sporcular alınıyor");
        const data = await loadAthletes().catch(() => null);
        if (data) r = raceWithAthletes(r, data);
      }
    }
    if (id !== runId.current) return;
    stepsEnd();
    try {
      if (r) sessionStorage.setItem(RACE_KEY, JSON.stringify(r));
      sessionStorage.setItem(POST_ASK_KEY, s);
    } catch {}
    record(s, "nav:posts", "local");
    memoSet("post", r ? `${r.name} gönderisi` : "yeni gönderi");
    // Önce cevap (görev listesinde ✓ ve "Başka bir isteğin var mı?"), sayfa kısa süre sonra açılır: sayfa geçişi
    // cevabın ve işaretin önüne geçmesin (Seyhun: "en son gönderiyi oluşturdu ama tik işareti çıkmadı", 2026-10-09)
    setTimeout(() => router.push("/posts/new"), 400);
    leave(r ? `${r.name} için gönderiyi hazırlıyorum, hazır olunca kendiliğinden kaydedilir. Değiştirmek istediğini söyle.` : "Gönderiyi hazırlıyorum, hazır olunca kendiliğinden kaydedilir. Değiştirmek istediğini söyle.", viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

// Açık gönderi ekranındaki değişiklik (PostEditor setPostHandler)
export async function runPost(ctx, s, viaVoice) {
  const { reply, runId, setPhase, setSteps, stepTo, stepsEnd } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  const h = postHandler();
  stepTo(wantsPostImage(s) ? "Görsel çiziliyor" : "Gönderi yazılıyor");
  try {
    const r = await h.ask(s);
    if (id !== runId.current) return;
    stepsEnd();
    reply(r.say, { engine: "ai" }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    reply(e?.message || "Gönderiyi değiştiremedim.", { fail: true, engine: "local" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

export async function raceHereCmd(ctx, s, viaVoice) {
  const { askOk, curRace, done, park, profile, raceOrg, racer, races, reply, router, saveDrafts, saveHereRace } = ctx;
  // Yarış sayfasında: "Ali'yi yarıştan çıkar", "Ali 3. oldu", "24 tekne yarıştı", "Ali ödedi", "yarışı planlara ekle", "yarışı sil"
  const rh = curRace && racer ? raceHereCommand(s) : null;
  const r = rh ? races.current.find((x) => x.id === curRace) : null;
  if (rh && r) {
    if (rh.op === "delete") {
      askOk(`“${r.name}” yarışı silinsin mi? Bütçesi, evrak bilgisi ve notları da silinir, geri alınamaz.`, "Sil", async (v) => {
        try {
          await deleteRace(raceOrg, r.id);
          races.current = races.current.filter((x) => x.id !== r.id);
          park();
          router.push("/athletes/races");
          done(`${r.name} yarışını sildim.`, { engine: "local" }, v);
        } catch {
          reply("Yarışı silemedim.", { engine: "local" }, v);
        }
      }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
      return true;
    }
    if (rh.op === "plan") {
      const ok = await addRacePlan(saveDrafts, r, { uid: profile.uid, name: profile.name || "" }).catch(() => false);
      if (ok) await saveHereRace(r, { ...r, planAdded: true }).catch(() => {});
      if (ok) done(`${r.name} planlara eklendi.`, { engine: "local" }, viaVoice);
      else reply("Planlara ekleyemedim; yarışın tarihi yazılı mı?", { engine: "local" }, viaVoice);
      return true;
    }
    if (rh.op === "step") {
      const hit = matchStep(r, rh.words, rh.done ? stepsOf(r) : doneSteps(r));
      // Listede yoksa başka işe ait bir cümle olabilir: her zamanki yoldan sürer
      if (!hit) return false;
      const list = cleanDone(r.done).filter((k) => k !== hit.key);
      await saveHereRace(r, { ...r, done: rh.done ? [...list, hit.key] : list });
      done(rh.done ? `İşaretledim: ${hit.label} yapıldı.` : `${hit.label} yeniden yapılacaklara alındı.`, { engine: "local" }, viaVoice);
      return true;
    }
    if (rh.op === "fleet") {
      await saveHereRace(r, { ...r, results: cleanResults({ ...(r.results || {}), fleet: rh.n }) });
      done(`Tekne sayısı ${rh.n} olarak yazıldı.`, { engine: "local" }, viaVoice);
      return true;
    }
    const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
    const mine = athletes.filter((a) => (r.athleteIds || []).includes(a.id));
    if (rh.op === "sheet") {
      const hit = rh.name ? matchPerson(rh.name, mine.map((a) => a.studentName)) : "";
      const one = hit ? mine.find((x) => x.studentName === hit) : null;
      if (rh.name && !one) {
        reply(`${rh.name} bu yarışın sporcuları arasında yok.`, { engine: "local" }, viaVoice);
        return true;
      }
      if (!mine.length) {
        reply("Bu yarışa önce sporcu ekle.", { engine: "local" }, viaVoice);
        return true;
      }
      window.dispatchEvent(new CustomEvent("sa-race-sheet", { detail: { id: r.id, ids: one ? [one.id] : [] } }));
      done(one ? `${one.studentName} için bilgi notunu hazırlıyorum.` : `${mine.length} sporcunun bilgi notunu hazırlıyorum, her sporcuya bir sayfa.`, { engine: "local" }, viaVoice);
      return true;
    }
    const hit = rh.name ? matchPerson(rh.name, mine.map((a) => a.studentName)) : "";
    const a = hit ? mine.find((x) => x.studentName === hit) : null;
    if (!a) {
      reply(`${rh.name} bu yarışın sporcuları arasında yok.`, { engine: "local" }, viaVoice);
      return true;
    }
    try {
      if (rh.op === "remove") {
        await saveHereRace(r, { ...r, athleteIds: r.athleteIds.filter((x) => x !== a.id) });
        done(`${a.studentName} yarıştan çıkarıldı.`, { engine: "local" }, viaVoice);
      } else if (rh.op === "result") {
        const rows = { ...(r.results?.rows || {}), [a.id]: { ...(r.results?.rows?.[a.id] || {}), place: rh.place } };
        await saveHereRace(r, { ...r, results: cleanResults({ ...(r.results || {}), rows }) });
        done(`Yazdım: ${a.studentName} ${rh.place}.${r.results?.fleet ? ` / ${r.results.fleet}` : ""}.`, { engine: "local" }, viaVoice);
      } else {
        const b = r.budget || emptyBudget(r);
        const paid = { ...(b.paid || {}) };
        if (rh.paid) paid[a.id] = true;
        else delete paid[a.id];
        await saveHereRace(r, { ...r, budget: { ...b, paid } });
        done(rh.paid ? `${a.studentName} ödedi olarak işaretlendi.` : `${a.studentName} ödemedi olarak işaretlendi.`, { engine: "local" }, viaVoice);
      }
    } catch {
      reply("Yarışa kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}

export async function hotelAddCmd(ctx, s, viaVoice) {
  const { curRace, done, myUid, profile, raceOrg, racer, races, reply } = ctx;
  // Yarış sayfasında otel ekleme: "otel ekle: Foça Palas, 0232 812 34 56"
  const hc = curRace && racer ? hotelAddCommand(s) : null;
  if (hc) {
    const r = races.current.find((x) => x.id === curRace);
    if (!r) return false;
    try {
      const hotels = cleanHotels([...raceHotels(r), { name: hc.name, phone: hc.phone }]);
      const next = { ...r, hotels };
      await saveRace(raceOrg, myUid || profile.uid, next);
      races.current = races.current.map((x) => (x.id === r.id ? next : x));
      window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
      done(`Ekledim: ${hc.name}${hc.phone ? `, ${hc.phone}` : ""}. Özet › Konaklama'da görünür.`, { engine: "local" }, viaVoice);
    } catch {
      reply("Oteli kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}
