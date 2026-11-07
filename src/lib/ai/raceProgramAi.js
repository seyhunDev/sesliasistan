// Yarış programı (yarış talimatındaki ya da duyurudaki program tablosu) yapay zekayla günlere: /api/race-program (Yayın › Program,
// telefondan yükleme) ve yarış sitesinden gelen talimat / ek talimat (lib/server/raceSiteTake.js) aynı okuyucuyu kullanır.
import { callGemini } from "./gemini.js";
import { cleanProgram } from "../raceProgram.js";

export const PROGRAM_SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının PROGRAMI verilir (yarış talimatı ya da duyurudaki program tablosu; belge, fotoğraf ya da yazı; Türkçe ya da İngilizce).
Programdaki her günü çıkar. Uydurma; okuyamadığını boş bırak.
- isProgram: belge bir yarış programı içermiyorsa false.
- days: her gün için { date YYYY-AA-GG (yıl yazmıyorsa bugünün ve yarışın yılına göre en yakın gelecek tarih), first o günün İLK uyarı işaretinin (ilk start) saati "HH:MM" (birden çok sınıf ya da grup varsa en erken saat; "Uyarı işareti", "Warning signal", "İlk start", "First start" satırları), race o gün yarış (start) var mı (yalnız kayıt, ölçüm, açılış, ödül töreni ya da yedek gün ise false), note o günün kısa özeti en çok 6 kelime (ör. "Kayıt ve ölçüm", "Yarışlar", "Yarışlar · Ödül töreni"), items o günün programdaki bütün maddeleri saat sırasıyla: { at "HH:MM" (saat yoksa boş; aralıksa başlangıç), text Türkçe kısa ad en çok 5 kelime (İngilizceyi çevir: "Coach meeting" → "Antrenör toplantısı", "Skippers meeting" → "Yarışçı toplantısı", "Registration" → "Kayıt", "Measurement" → "Ölçüm", "Warning signal" / "First start" → "İlk start", "No warning signal after" → "Son start saati", "Prize giving" → "Ödül töreni", "Opening ceremony" → "Açılış töreni"); toplantıları (antrenör/koç, kaptanlar, yarışçı) atlama; o gün planlanan yarış sayısı yazıyorsa ayrı madde { at boş, text "3 yarış planlandı" } } }.`;

const s = { type: "string" };
export const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    isProgram: { type: "boolean" },
    days: { type: "array", items: { type: "object", properties: { date: s, first: s, race: { type: "boolean" }, note: s, items: { type: "array", items: { type: "object", properties: { at: s, text: s }, required: ["text"] } } }, required: ["date", "race"] } },
  },
  required: ["isProgram", "days"],
};

// Dönüş günler (lib/raceProgram.js cleanProgram), belge program değilse null
export async function readProgramAi({ images = [], text = "", today = new Date().toISOString().slice(0, 10), race = "", focus = "", timeoutMs = 55000 }) {
  const ctx = `Bugün ${today}.${race ? ` Yarış: ${race}.` : ""}${focus ? ` ${focus}` : ""}`;
  const raw = await callGemini({
    model: process.env.GEMINI_MODEL,
    system: PROGRAM_SYSTEM,
    user: text ? `${ctx}\nBu yarış programını oku:\n${text}` : `${ctx}\nBu yarış programını oku.`,
    schema: PROGRAM_SCHEMA,
    ...(text ? {} : { images }),
    maxTokens: 6000,
    timeoutMs,
  });
  if (raw?.isProgram === false) return null;
  return cleanProgram(raw).days;
}
