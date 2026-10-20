// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { parseAttendance, attSummary, applyAttendance } from "@/features/athletes/assistAttendance";
import { takeAct } from "../beyin/gorevListesi";
import { closeNames } from "@/lib/names";
import { soon } from "@/lib/soon";
import { absentNotifyCommand } from "@/lib/assistMore";
import { addDays, todayStr } from "@/lib/utils/format";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { authFetch } from "@/lib/authFetch";
import { attQueryAsk, attQueryAnswer } from "@/lib/attQuery";

// ---- Yoklama (asistandan) ----
// rest: cümledeki diğer işler ({ s, history }); yoklama kaydedilince (ya da onay kartında vazgeçilince) yapay zekaya gider
export async function runAttendance(ctx, s, viaVoice, rest = null) {
  const { AMB, askAI, attAsk, nameIdx, reply, restAfterAtt, runId, sameIn, saveAtt, setPhase, setSteps, stepTo, stepsEnd, waitFor } = ctx;
  const id = ++runId.current;
  setPhase("thinking");
  setSteps([]);
  try {
    const r = await parseAttendance(s, nameIdx, stepTo, takeAct(ctx, [3])?.args);
    if (id !== runId.current) return;
    const n = Object.keys(r.changes).length;
    if (!n) {
      stepsEnd(false);
      // Cümle yoklama değil de başka işmiş (yoklama sayfasında "Ali'ye geldi mi diye sor"): yapay zekaya gider
      if (rest) return void askAI(rest.s, rest.s, viaVoice, rest.history, false);
      // Ad söylenmedi ya da bulunamadı: kısa soru, yanlış duyulmuş ada en yakın sporcular seçenek, sesle sorulduysa mikrofon açılır
      const amb = sameIn(r.unknown, Object.values(r.names));
      const picks = amb.picks.length ? amb.picks : closeNames(r.unknown.length ? r.unknown.join(" ") : s, Object.values(r.names));
      waitFor("attName");
      attAsk.current = { text: s };
      if (amb.text) return reply(`${amb.text} Adını söyle ya da seç.`, { engine: "local", expect: true, picks, listen: true }, viaVoice);
      return reply(`${r.unknown.length ? `${r.unknown.join(", ")} adında sporcu bulamadım. ` : ""}Kimi ekleyeyim? ${picks.length ? "Adını söyle ya da seç." : "Adını söyle."}`, { engine: "local", expect: true, picks, listen: true }, viaVoice);
    }
    // Bulunamayan ad varsa kaydetmeden sor
    if (r.unknown.length) {
      stepsEnd();
      const amb = sameIn(r.unknown, Object.values(r.names));
      const lost = r.unknown.filter((u) => !AMB.test(u));
      return reply(`${amb.text ? `${amb.text} ` : ""}${lost.length ? `${lost.join(", ")} adını bulamadım. ` : ""}${attSummary(r)}. Bunları kaydedeyim mi?`, { pending: { att: r, rest }, att: { ...r, saved: false }, engine: "ai", expect: true }, viaVoice);
    }
    await saveAtt(r, viaVoice);
    if (rest) restAfterAtt(rest, viaVoice, `Yoklama kaydedildi (${attSummary(r)}).`);
  } catch (e) {
    if (id !== runId.current) return;
    stepsEnd(false);
    const denied = e.code === "permission-denied";
    reply(denied ? "Kulüp hesabına bağlı değilsin. Yoklama sayfasından bir kez bağlanman gerekiyor." : e.message || "Yoklama yapılamadı.", { fail: true, engine: "local", nav: "attendance" }, viaVoice);
  } finally {
    if (id === runId.current) setPhase("idle");
  }
}

export async function restAfterAtt(ctx, rest, viaVoice, done) {
  const { askAI, runId, sayQ, speakingRef } = ctx;
  const id = runId.current;
  for (let i = 0; i < 80 && (sayQ.current.busy || speakingRef.current); i++) await new Promise((ok) => setTimeout(ok, 150)); // en çok 12 sn
  if (id !== runId.current) return; // bu arada başka bir şey söylendi
  askAI(rest.s, `${rest.s}\n(${done} Yoklamayı yeniden yapma; cümledeki diğer işleri yap.)`, viaVoice, rest.history, false);
}

export async function saveAtt(ctx, r, viaVoice) {
  const { members, myUid, reply, stepTo, stepsEnd, toast } = ctx;
  stepTo("Yoklama kaydediliyor");
  await soon(applyAttendance(myUid, members, r.date, r.changes), 4000, "Yoklama");
  stepsEnd();
  navigator.vibrate?.([10, 40, 10]);
  toast("Yoklama kaydedildi");
  reply(`Kaydettim. ${attSummary(r)}.`, { att: { ...r, saved: true }, engine: "ai" }, viaVoice);
}

export async function undoAtt(ctx, r) {
  const { members, myUid, reply, setSteps, stepTo, stepsEnd, toast } = ctx;
  setSteps([]);
  stepTo("Yoklama geri alınıyor");
  try {
    await applyAttendance(myUid, members, r.date, r.prev);
    stepsEnd();
    toast("Geri alındı");
    reply("Geri aldım; yoklama önceki haline döndü.", { engine: "local" });
  } catch (e) {
    stepsEnd(false);
    toast(e.message || "Geri alınamadı");
  }
}

export async function absentNotifyCmd(ctx, s, viaVoice) {
  const { askOk, done, members, owner, racer, reply, setPhase } = ctx;
  // Gelmeyenlerin velilerine haber (yoklama): uygulamadaki velilere bildirim, onayla
  const an = owner && racer ? absentNotifyCommand(s) : null;
  if (an) {
    setPhase("thinking");
    const day = an.day ? addDays(an.day) : todayStr();
    let absent;
    try {
      const { athletes } = await loadAthletes({ fresh: true });
      absent = athletes.filter((a) => isActive(a) && a.att?.[day.slice(0, 4)]?.[day.slice(5)] === "absent");
    } catch {
      reply("Yoklamayı okuyamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
    const ids = absent.map((a) => linked.get(a.id)).filter(Boolean);
    const when = an.day ? "Dün" : "Bugün";
    if (!absent.length) {
      reply(`${when} yoklamada gelmedi yazılan sporcu yok.`, { engine: "local" }, viaVoice);
      return true;
    }
    if (!ids.length) {
      reply(`${when} ${absent.length} sporcu gelmedi ama velileri uygulamada değil. Yoklama sayfasındaki WhatsApp düğmeleriyle haber verebilirsin.`, { engine: "local", nav: "attendance" }, viaVoice);
      return true;
    }
    askOk(`${when} gelmeyen ${absent.length} sporcudan ${ids.length} tanesinin velisine uygulamadan bildirim gitsin mi? (${absent.map((a) => a.studentName).slice(0, 6).join(", ")})`, "Gönder", async (v) => {
      try {
        const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "absent", date: day, ids }) });
        const d = await res.json().catch(() => ({}));
        done(res.ok ? `Haber verdim${d.parents ? `: ${d.parents} veli` : ""}.` : "Bildirim gönderilemedi (bugün zaten gönderilmiş olabilir).", { engine: "local" }, v);
      } catch {
        reply("Bildirim gönderilemedi.", { engine: "local" }, v);
      }
    }, viaVoice, /^gönder\p{L}*[\s.!]*$/iu);
    return true;
  }
}

// Yoklama sorusu ("bugünkü antrenmana kimler katıldı", "Ali dün geldi mi", "bu ay kim en çok gelmedi"): telefondaki
// yoklamadan anında cevap; yapay zekaya ve planlara gitmez
export async function attQueryCmd(ctx, s, viaVoice) {
  const { racer, reply, setPhase, stepTo, stepsEnd } = ctx;
  const q = racer ? attQueryAsk(s, todayStr()) : null;
  if (!q) return undefined;
  setPhase("thinking");
  stepTo("Yoklama kayıtlarına bakılıyor");
  try {
    const { athletes } = await loadAthletes();
    stepsEnd();
    reply(attQueryAnswer(q, athletes), { engine: "local", nav: "attendance" }, viaVoice);
  } catch {
    stepsEnd(false);
    reply("Yoklamayı okuyamadım.", { engine: "local", fail: true }, viaVoice);
  } finally {
    setPhase("idle");
  }
  return true;
}
