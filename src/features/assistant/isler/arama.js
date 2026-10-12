// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { callCommand } from "@/lib/assistMore";
import { raceHotels, telOf } from "@/features/athletes/races";
import { matchPerson } from "@/lib/names";
import { kindOf } from "@/lib/kinds";
import { canCall } from "@/lib/call";

export async function callCmd(ctx, s, viaVoice, pre = null) {
  const { askOk, callBusy, contacts, curRace, done, finish, myKind, races, reply, sp, startCall, tts } = ctx;
  // Arama: "Ali'yi ara" (uygulama içi sesli arama), yarış sayfasında "oteli ara" (telefon)
  const cc = pre || callCommand(s);
  if (cc?.hotel && curRace) {
    const r = races.current.find((x) => x.id === curRace);
    const hs = raceHotels(r).filter((h) => telOf(h.phone));
    const words = cc.who.split(" ").filter((w) => !/^otel/u.test(w));
    const h = hs.find((x) => words.some((w) => x.name.toLocaleLowerCase("tr-TR").includes(w))) || (hs.length === 1 ? hs[0] : null);
    if (!h) {
      reply(hs.length ? `Hangi otel? ${hs.map((x) => x.name).join(", ")}.` : "Bu yarışta telefonu kayıtlı otel yok. Özet › Konaklama'dan ekleyebilirsin.", { engine: "local", expect: hs.length > 1 }, viaVoice);
      return true;
    }
    askOk(`${h.name} aransın mı? ${h.phone}`, "Ara", () => {
      window.location.href = telOf(h.phone);
      done(`${h.name} aranıyor.`, { engine: "local" });
    }, viaVoice, /^ara\p{L}*[\s.!]*$/iu);
    return true;
  }
  if (cc && !cc.hotel) {
    const name = matchPerson(cc.who, contacts);
    const p = name ? contacts.find((c) => c.name === name)?.p : null;
    if (!p) return false; // kişi değil ("Turkcell'i ara"): yapay zekaya
    const peerKind = p.role === "owner" ? "owner" : kindOf(p);
    if (!startCall || !canCall(myKind, peerKind)) {
      reply(`${p.name} ile uygulamadan arama yapılamıyor.`, { engine: "local" }, viaVoice);
      return true;
    }
    if (callBusy) {
      reply("Şu an başka bir arama sürüyor.", { engine: "local" }, viaVoice);
      return true;
    }
    askOk(`${p.name} aransın mı?`, "Ara", () => {
      sp.cancel();
      tts.stop();
      startCall(p.uid);
      finish(true);
    }, viaVoice, /^ara\p{L}*[\s.!]*$/iu);
    return true;
  }
}
