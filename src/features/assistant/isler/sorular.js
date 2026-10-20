// Kulüp soruları (lib/clubAsk.js): sporcu sayısı, sıradaki yarış, yaklaşan doğum günleri, veli, yaş.
// Telefondaki veriden anında cevap; cevap çıkmazsa (ad bulunamadı) iş yapay zekaya bırakılır.
import { clubAsk, clubAnswer } from "@/lib/clubAsk";
import { infoAsk, infoAnswer } from "@/lib/infoAsk";
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

// Fatura, harcama ve okunmamış mesaj soruları (lib/infoAsk.js): telefondaki veriden anında cevap. Faturalar yalnız ana
// hesapta yüklenir; liste henüz gelmediyse iş yapay zekaya bırakılır.
export function infoAskCmd(ctx, s, viaVoice) {
  const { chats = [], club, owner, receipts = [], reply } = ctx;
  const q = infoAsk(s, todayStr());
  if (!q || (q.kind === "invoices" && !owner)) return undefined;
  const text = infoAnswer(q, { invoices: club?.current?.invoices, receipts, chats });
  if (!text) return undefined;
  reply(text, { engine: "local", nav: { unread: "messages", invoices: "invoices", spend: "receipts" }[q.kind] }, viaVoice);
  return true;
}
