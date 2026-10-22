// İngilizce kelime çalışma: "resilient kelimesini ekle, bana çalıştır", "X kelimesini öğrendim",
// "X kelimesini çalışmadan çıkar", "çalıştığım kelimeler neler", "kelimeleri her gün göster", "see you later cümlesini ekle".
// Deste ana hesapta Firestore'da tek belge (features/words/wordData.js); kelime destede yoksa kartı yapay zeka hazırlar (/api/word).
import { findWord, knowWord, studyList, studyWord, unstudyWord, wordKey } from "@/lib/englishWords";
import { askWord, loadDeck, updateDeck } from "@/features/words/wordData";
import { todayStr } from "@/lib/utils/format";

const L = { engine: "local" };
const gapText = (g) => (g.length === 1 ? (g[0] === 1 ? "her gün" : `${g[0]} günde bir`) : `${g.join(", ")} gün arayla`);


export async function runWords(ctx, { wc }, viaVoice) {
  const { done, owner, profile, reply, setPhase } = ctx;
  const orgId = owner ? profile?.orgId || "" : "";
  setPhase("thinking");
  let deck;
  try {
    deck = await loadDeck(orgId, { fresh: true });
  } catch {
    return reply("Kelime listesini okuyamadım.", { fail: true, ...L }, viaVoice);
  }
  const save = (fn) => updateDeck(orgId, fn);
  try {
    if (wc.op === "ask") {
      const list = wc.known ? deck.words.filter((w) => w.status === "known") : studyList(deck);
      if (!list.length) return reply(wc.known ? "Henüz öğrendim dediğin kelime yok." : "Çalıştığın kelime yok. “resilient kelimesini ekle” diyebilirsin.", L, viaVoice);
      const names = list.slice(0, 12).map((w) => w.en).join(", ");
      return reply(`${list.length} kelime ${wc.known ? "öğrendin" : "çalışıyorsun"}: ${names}${list.length > 12 ? "…" : "."}`, L, viaVoice);
    }
    if (wc.op === "gaps") {
      await save((d) => ({ ...d, gaps: wc.gaps }));
      return done(`Tamam, çalıştığın kelimeleri ${gapText(wc.gaps)} göstereceğim.`, L, viaVoice);
    }
    let w = findWord(deck, wc.word) || deck.words.find((x) => wordKey(x.tr).split(/,\s*/).includes(wordKey(wc.word)));
    if (wc.op === "known" || wc.op === "drop") {
      if (!w) return reply(`“${wc.word}” listende yok.`, { fail: true, ...L }, viaVoice);
      await save((d) => (wc.op === "known" ? knowWord(d, w.en, todayStr()) : unstudyWord(d, w.en)));
      return done(wc.op === "known" ? `Harika, “${w.en}” öğrenildi. Artık göstermeyeceğim.` : `“${w.en}” çalışmadan çıktı.`, L, viaVoice);
    }
    // Çalışmaya al: destede yoksa kartı yapay zeka hazırlar
    if (!w) w = await askWord(wc.word, wc.kind);
    if (findWord(deck, w.en)?.status === "study") return reply(`“${w.en}” zaten çalışma listende.`, L, viaVoice);
    await save((d) => studyWord(d, w, todayStr(), new Date().toISOString()));
    const d = await loadDeck(orgId);
    return done(`Ekledim: ${w.en}, ${w.tr}. Öğrendim diyene kadar ${gapText(d.gaps)} göstereceğim.`, { ...L, engine: findWord(deck, w.en) ? "local" : "ai" }, viaVoice);
  } catch (e) {
    return reply(e?.code === "permission-denied" ? "Kelimeyi kaydetme izni yok." : e?.message || "Kelimeyi kaydedemedim.", { fail: true, ...L }, viaVoice);
  }
}
