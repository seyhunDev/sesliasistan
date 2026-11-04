import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { readProgramAi } from "@/lib/ai/raceProgramAi";

export const runtime = "nodejs";

// Yarış programı (organizasyonun yarış talimatındaki ya da duyurusundaki program tablosu; PDF, fotoğraf ya da yazı) → günler.
// Belge saklanmaz. lib/raceProgram.js temizler, Yayın › Program önizler, onaylanınca yazar.
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
    const days = await readProgramAi({ text, images: text ? [] : [{ mimeType, data }], today, race });
    if (days === null) return bad("Bu bir yarış programına benzemiyor.", 422);
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
