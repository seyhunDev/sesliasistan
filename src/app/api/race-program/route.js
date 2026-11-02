import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { cleanProgram } from "@/lib/raceProgram";

export const runtime = "nodejs";

// Yarış programı (organizasyonun yarış talimatındaki ya da duyurusundaki program tablosu; PDF, fotoğraf ya da yazı) → günler.
// Belge saklanmaz. lib/raceProgram.js temizler, Yayın › Program önizler, onaylanınca yazar.
const SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının PROGRAMI verilir (yarış talimatı ya da duyurudaki program tablosu; belge, fotoğraf ya da yazı; Türkçe ya da İngilizce).
Programdaki her günü çıkar. Uydurma; okuyamadığını boş bırak.
- isProgram: belge bir yarış programı içermiyorsa false.
- days: her gün için { date YYYY-AA-GG (yıl yazmıyorsa bugünün ve yarışın yılına göre en yakın gelecek tarih), first o günün İLK uyarı işaretinin (ilk start) saati "HH:MM" (birden çok sınıf ya da grup varsa en erken saat; "Uyarı işareti", "Warning signal", "İlk start", "First start" satırları), race o gün yarış (start) var mı (yalnız kayıt, ölçüm, açılış, ödül töreni ya da yedek gün ise false), note o günün kısa özeti en çok 6 kelime (ör. "Kayıt ve ölçüm", "Yarışlar", "Yarışlar · Ödül töreni"), items o günün programdaki bütün maddeleri saat sırasıyla: { at "HH:MM" (saat yoksa boş; aralıksa başlangıç), text Türkçe kısa ad en çok 5 kelime (İngilizceyi çevir: "Coach meeting" → "Antrenör toplantısı", "Skippers meeting" → "Yarışçı toplantısı", "Registration" → "Kayıt", "Measurement" → "Ölçüm", "Warning signal" / "First start" → "İlk start", "No warning signal after" → "Son start saati", "Prize giving" → "Ödül töreni", "Opening ceremony" → "Açılış töreni") } }.`;

const s = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    isProgram: { type: "boolean" },
    days: { type: "array", items: { type: "object", properties: { date: s, first: s, race: { type: "boolean" }, note: s, items: { type: "array", items: { type: "object", properties: { at: s, text: s }, required: ["text"] } } }, required: ["date", "race"] } },
  },
  required: ["isProgram", "days"],
};

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "race-program");
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  const text = String(body?.text || "").slice(0, 30000);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);
  const race = String(body?.race || "").slice(0, 200);
  if (!text && !TYPES.includes(mimeType)) return bad("PDF, fotoğraf ya da yazı ver.");
  if (!text && (!data || data.length > (MAX * 4) / 3 + 8)) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  try {
    const t0 = Date.now();
    const ctx = `Bugün ${today}.${race ? ` Yarış: ${race}.` : ""}`;
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: text ? `${ctx}\nBu yarış programını oku:\n${text}` : `${ctx}\nBu yarış programını oku.`,
      schema: SCHEMA,
      ...(text ? {} : { images: [{ mimeType, data }] }),
      maxTokens: 6000,
      timeoutMs: 55000,
    });
    if (raw?.isProgram === false) return bad("Bu bir yarış programına benzemiyor.", 422);
    const { days } = cleanProgram(raw);
    if (!days.length) return bad("Programda tarih bulunamadı.", 422);
    console.log(`[race-program] ${Date.now() - t0} ms, ${days.length} gün`);
    return NextResponse.json({ days });
  } catch (e) {
    logAiError("race-program", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Program okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
