// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { athleteOpenCommand, athleteCommand } from "@/lib/assistMore";
import { loadAthletes, isActive, createAthlete, setArchived, deleteAthlete } from "@/features/athletes/data";
import { matchPerson } from "@/lib/names";
import { canSeeAthletes } from "@/features/athletes/access";
import { isPronoun } from "@/lib/convoContext";
import { linkMember, unlinkMembers } from "@/features/athletes/memberSync";

export async function athleteOpenCmd(ctx, s, viaVoice) {
  const { leave, park, racer, router, showPage } = ctx;
  // Sporcu kartı: "Ali Kaya'nın sporcu kartını aç"
  const ao = racer ? athleteOpenCommand(s) : null;
  if (ao) {
    const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
    const hit = matchPerson(ao.name, athletes.map((a) => a.studentName));
    const a = hit ? athletes.find((x) => x.studentName === hit) : null;
    if (!a) return false;
    park();
    router.push(`/athletes/${a.id}`);
    leave(`${a.studentName} kartını açtım.`, viaVoice);
    showPage();
    return true;
  }
}

export async function athleteCmd(ctx, s, viaVoice, pre = null) {
  const { askOk, athAsk, birthdays, dataUid, deleteRecord, done, members, memo, memoSet, owner, profile, reply, setPhase, stepTo, stepsEnd, waitFor } = ctx;
  // Sporcu: ekle (hemen), arşive al / çıkar (hemen), sil (onayla)
  const ac = owner && canSeeAthletes(profile?.email) ? pre || athleteCommand(s) : null;
  if (!ac) return false;
  if (ac.op === "add" && !ac.name) {
    reply("Yeni sporcunun adı soyadı ne?", { engine: "local", expect: true }, viaVoice);
    waitFor("athlete");
    athAsk.current = true;
    return true;
  }
  setPhase("thinking");
  let athletes;
  try {
    ({ athletes } = await loadAthletes({ fresh: true }));
  } catch {
    reply("Sporcu listesini okuyamadım.", { engine: "local" }, viaVoice);
    return true;
  }
  const low = (x) => String(x || "").toLocaleLowerCase("tr-TR");
  // "onu arşive al", "bunu sil": sohbette az önce konuşulan sporcu
  const name = isPronoun(ac.name) ? memo.current.athlete || "" : ac.name;
  const hit = name ? matchPerson(name, athletes.map((a) => a.studentName)) : "";
  const a = hit ? athletes.find((x) => x.studentName === hit) : null;
  if (a) memoSet("athlete", a.studentName);
  if (ac.op === "add") {
    const same = athletes.find((x) => low(x.studentName) === low(ac.name));
    if (same) {
      reply(`${same.studentName} zaten sporcularda${isActive(same) ? "" : " (arşivde; “arşivden çıkar” diyebilirsin)"}.`, { engine: "local" }, viaVoice);
      return true;
    }
    stepTo("Sporcu ekleniyor");
    try {
      const id = await createAthlete({ studentName: ac.name, studentBirthDate: ac.birth });
      memoSet("athlete", ac.name);
      await linkMember(dataUid || profile.uid, members, { id, name: ac.name, birth: ac.birth }).catch(() => {});
      stepsEnd();
      done(`Ekledim: ${ac.name}${ac.birth ? `, ${ac.birth.slice(0, 4)} doğumlu` : ""}. Sınıfını ve veli bilgisini sporcu kartından tamamlayabilirsin.`, { engine: "local", nav: "athletes" }, viaVoice);
    } catch (e) {
      stepsEnd(false);
      reply(e?.code === "permission-denied" ? "Kulüp hesabının sporcu ekleme izni yok." : "Sporcuyu ekleyemedim.", { fail: true, engine: "local" }, viaVoice);
    }
    return true;
  }
  if (!a) {
    if (!ac.explicit) return false; // sporcu adı değil: başka iş (yapay zekaya)
    reply(`${ac.name} adında sporcu bulamadım.`, { engine: "local" }, viaVoice);
    return true;
  }
  if (ac.op === "archive" || ac.op === "unarchive") {
    const on = ac.op === "archive";
    if (isActive(a) !== on) {
      reply(on ? `${a.studentName} zaten arşivde.` : `${a.studentName} arşivde değil.`, { engine: "local" }, viaVoice);
      return true;
    }
    try {
      await setArchived(a, on, { classes: [], coaches: [] });
      done(on ? `${a.studentName} arşive alındı; yoklama ve aidat listesinde görünmez.` : `${a.studentName} arşivden çıkarıldı.`, { engine: "local", nav: "athletes" }, viaVoice);
    } catch {
      reply("Kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }
  askOk(`${a.studentName} sporculardan tamamen silinsin mi? Geçmişiyle birlikte silinir, geri alınamaz. İstersen arşive de alabilirim.`, "Sil", async (v) => {
    setPhase("thinking");
    try {
      await deleteAthlete(a.id);
      try {
        await unlinkMembers(dataUid || profile.uid, members, a.id);
        birthdays.filter((b) => b.athleteId === a.id).forEach((b) => deleteRecord("birthday", b.id));
      } catch {}
      done(`${a.studentName} silindi.`, { engine: "local", nav: "athletes" }, v);
    } catch (e) {
      reply(e?.code === "permission-denied" ? "Kulüp hesabının sporcu silme izni yok." : "Silemedim, tekrar dene.", { fail: true, engine: "local" }, v);
    }
  }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
  return true;
}
