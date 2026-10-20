// Kulüp soruları (lib/clubAsk.js): sporcu sayısı, sıradaki yarış, yaklaşan doğum günleri, veli, yaş.
// Telefondaki veriden anında cevap; cevap çıkmazsa (ad bulunamadı) iş yapay zekaya bırakılır.
import { clubAsk, clubAnswer } from "@/lib/clubAsk";
import { loadAthletes } from "@/features/athletes/data";
import { todayStr } from "@/lib/utils/format";

const NEEDS_ATH = ["count", "parent", "parentPhone", "age"];

export async function clubAskCmd(ctx, s, viaVoice) {
  const { birthdays = [], racer, races, reply } = ctx;
  const q = clubAsk(s);
  if (!q || (q.kind !== "birthdays" && !racer)) return undefined;
  let athletes = [];
  if (NEEDS_ATH.includes(q.kind)) {
    try {
      ({ athletes } = await loadAthletes());
    } catch {
      return undefined;
    }
  }
  const text = clubAnswer(q, { athletes, races: races?.current || [], birthdays, today: todayStr() });
  if (!text) return undefined;
  reply(text, { engine: "local", nav: q.kind === "nextRace" ? "races" : "" }, viaVoice);
  return true;
}
