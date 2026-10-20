// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { autoFill, firstNeed, fresh, isBlank, pub, carry, check, tidy } from "@/features/add/drafts";
import { applyRepeat } from "@/lib/repeat";
import { keepNotes } from "@/lib/steps";
import { todayStr } from "@/lib/utils/format";
import { quickAnswer } from "@/lib/ai/rules";
import { countHit, record } from "@/lib/brain/store";
import { interpretText } from "@/services/aiService";
import { timingMark } from "@/lib/assistTiming";
import { labelFromItems } from "@/lib/brain/model";
import { uidsToNames } from "@/lib/names";

export function draftSay(ctx, msg, list) {
  const need = firstNeed(list);
  // "Kontrol edip kaydedebilirsin" yerine sesli sohbete uygun tek soru: "Kaydedeyim mi?"
  const base = (msg || "").replace(/\s*(kontrol edip |hazırsa )?kaydedebilirsin\.?/gi, "").trim() || `${list.length} kayıt hazırladım.`;
  if (need && !/\?/.test(base)) return `${base} ${need.kind === "date" ? "Hangi gün olsun?" : "Saat kaçta olsun?"}`;
  return need || /\?\s*$/.test(base) ? base : `${base} Kaydedeyim mi?`;
}

// lead: görev listesinde önceki işlerin sonucu ("Tamamladım: …"); cevabın başına gelir
export function startDrafts(ctx, items, s, msg, engine, viaVoice, lead = "") {
  const { armSave, draftSay, draftSrc, ready, reply, setDrafts, withAssignees } = ctx;
  // Not yalnız açıkça istenince ("not al", "notlara yaz"); başka işin yanına kendiliğinden not eklenmez
  draftSrc.current = s;
  let next = autoFill(applyRepeat(keepNotes(items, s), s, todayStr()).map((x) => withAssignees(x, s)).map(fresh), todayStr());
  const need = firstNeed(next);
  if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
  if (ready(next)) return armSave(viaVoice, next, msg, lead); // kartta 3 sn çizgi, dolunca kaydedilir
  setDrafts(next);
  reply(`${lead}${draftSay(/^tamam\.?$/i.test(msg) ? "" : msg, next)}`, { engine }, viaVoice);
}

export async function refineDrafts(ctx, s, viaVoice) {
  const { armSave, ctrl, draftSay, drafts, failNow, firstName, inflight, listenWhileThinking, ready, reply, runId, setDrafts, setPhase, staff, staffNames, turns, withAssignees } = ctx;
  // "Saat kaçta olsun?" → "10'da": kısa cevap yerelde taslağa yazılır, yapay zekaya yeniden gidilmez
  const quick = quickAnswer(s, drafts, todayStr(), firstNeed(drafts));
  if (quick) {
    ++runId.current;
    ctrl.current?.abort();
    countHit("local");
    const need = firstNeed(quick);
    const next = need ? quick.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d)) : quick;
    if (ready(next)) return armSave(viaVoice, next);
    setDrafts(next);
    return reply(draftSay("", next), { engine: "local" }, viaVoice);
  }
  const id = ++runId.current;
  ctrl.current?.abort();
  const c = new AbortController();
  ctrl.current = c;
  setPhase("thinking");
  try {
    const known = drafts.filter((d) => !isBlank(d));
    const history = turns.slice(-10).map((t) => ({ role: t.role, text: t.text }));
    const last = [...turns].reverse().find((t) => t.role === "assistant")?.text || "";
    if (viaVoice) {
      inflight.current = s;
      listenWhileThinking();
    }
    const r = await interpretText(s, firstName, c.signal, { mode: "create", drafts: known.map((d) => pub(d, staff)), last, history }, staffNames);
    if (id !== runId.current) return;
    const items = applyRepeat(keepNotes(r.items, s, known.filter((d) => d.type === "note").length), s, todayStr()).map((x) => withAssignees(x, s));
    let next = autoFill(items.length ? carry(known, items) : drafts, todayStr());
    const need = firstNeed(next);
    if (need && !next[need.idx]._asked) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    if (ready(next)) return armSave(viaVoice, next, r.message);
    setDrafts(next);
    reply(draftSay(r.message, next), { engine: r.source }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    inflight.current = null; // hata: sonraki sözlü istek bu cümleyle birleşmesin (denetim B14)
    failNow(e.message || "Yapay zeka yanıt vermedi", viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

// Tür sayfasından açıldı (Planlar, Görevler, Notlar, Takvim): ilk cümle doğrudan o türde taslağa çevrilir
export async function createAs(ctx, s, kind, viaVoice) {
  const { ctrl, failNow, firstName, inflight, listenWhileThinking, reply, runId, setPhase, staffNames, startDrafts } = ctx;
  const id = ++runId.current;
  ctrl.current?.abort();
  const c = new AbortController();
  ctrl.current = c;
  setPhase("thinking");
  try {
    if (viaVoice) {
      inflight.current = s;
      listenWhileThinking();
    }
    const r = await interpretText(s, firstName, c.signal, null, staffNames, kind);
    if (id !== runId.current) return;
    inflight.current = null;
    if (r.items?.length) startDrafts(r.items, s, r.message, r.source, viaVoice);
    else reply(r.message || "Bunu kayda çeviremedim, biraz daha açık söyler misin?", { engine: r.source }, viaVoice);
  } catch (e) {
    if (id !== runId.current) return;
    inflight.current = null;
    failNow(e.message || "Yapay zeka yanıt vermedi", viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

// pre: yapay zekanın ek sözü (çakışma, rüzgâr…); varsa "Ekledim" cümlesinden önce gelir (akışta okunduysa tekrar okunmaz)
export async function saveDraftsNow(ctx, viaVoice, list = ctx.drafts, pre = "", lead = "") {
  const { by, convo, done, draftMeta, draftSrc, extra, members, memoSet, nextStep, queue, reply, saveDrafts, setDrafts, setPhase, setSaved, toast, turns } = ctx;
  for (const d of list) {
    const e = check(d);
    if (e) return reply(`${e}. Söyler misin?`, {}, viaVoice);
  }
  setPhase("thinking");
  const r = await saveDrafts(list.map(tidy), { source: viaVoice || convo.current ? "voice" : "manual", by });
  timingMark("saved");
  setPhase("idle");
  // Kayıt veritabanına yazılamadıysa "kaydettim" denmez; taslak durur, yeniden "kaydet" denebilir
  if (!r || r.error || r.plans + r.tasks + r.notes === 0) {
    setDrafts(list);
    return reply("Kaydedemedim, bir sorun çıktı. Taslak duruyor; tekrar “kaydet” diyebilirsin.", { engine: "local" }, viaVoice);
  }
  // Öğrenme kaydı: taslağı doğuran cümle (önceden sohbetin İLK cümlesi alınıyordu; ikinci işte yanlış cümle öğreniliyordu)
  const said = draftSrc.current || [...turns].reverse().find((t) => t.role === "user" && !t.chip)?.text;
  if (said) record(said, labelFromItems(list), "user");
  const parts = [r.plans && `${r.plans} plan`, r.tasks && `${r.tasks} görev`, r.notes && `${r.notes} not`].filter(Boolean);
  const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
  setDrafts([]);
  setSaved((r.ids || []).map(([kind, id], i) => list[i] && { kind, id, title: list[i].title || list[i].body || "Başlıksız", meta: draftMeta(list[i]), type: list[i].type }).filter(Boolean));
  toast(`${parts.join(", ")} kaydedildi${who.length ? ` · ${who.join(", ")}` : ""}`);
  navigator.vibrate?.([10, 40, 10]);
  // Ne kaydedildiği açıkça söylenir (yapay zeka sonraki "saatini 11 yap" cümlesinde hangi kayıt olduğunu bilsin)
  if (list.length === 1) memoSet("record", `${{ plan: "plan", task: "görev", note: "not" }[list[0].type] || ""} ${list[0].title || list[0].body || ""}`.trim());
  const what = list.length === 1 ? [list[0].title || list[0].body, ...draftMeta(list[0]).split(" · ").slice(1).filter((x) => !x.startsWith("→"))].join(", ") : parts.join(", ");
  const whoTxt = who.length ? `, ${who.join(" ve ")} sorumlu` : "";
  if (queue.current.length) return nextStep(viaVoice, `${lead}${r.queued ? `${what} kaydedildi, bağlantı gelince gönderilecek. ` : `Ekledim: ${what}${whoTxt}. `}`);
  done(r.queued ? `${lead}İnternet yok: ${what}${whoTxt} kaydedildi, bağlantı gelince gönderilecek.` : `${lead}${extra(pre)}Ekledim: ${what}${whoTxt}.`, { engine: "local" }, viaVoice);
}

export function dropDrafts(ctx, viaVoice) {
  const { done, nextStep, queue, setDrafts } = ctx;
  setDrafts([]);
  if (queue.current.length) return nextStep(viaVoice, "Kaydetmedim. ");
  done("Tamam, kaydetmedim.", { engine: "local" }, viaVoice);
}

// Tam ekranda düzenle: taslaklar yeni kayıt penceresine taşınır
export function editDraftsFull(ctx) {
  const { draftSrc, drafts, heard, openAdd, park, setDrafts, turns } = ctx;
  const said = draftSrc.current || heard;
  const last = [...turns].reverse().find((t) => t.role === "assistant")?.text || "";
  openAdd({ prefill: { text: said, items: drafts, message: last, engine: "local" } });
  setDrafts([]);
  park();
}
