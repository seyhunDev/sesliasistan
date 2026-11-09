import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { cleanSheet } from "@/lib/resultSheet";
import { RESULTS_SCHEMA as SCHEMA, RESULTS_SYSTEM as SYSTEM } from "@/lib/ai/raceResultsAi";

export const runtime = "nodejs";

// Yarış sonuç belgesi (PDF ya da fotoğraf) → sınıf sınıf sonuç listesi. Sıralamayı (kategori, kızlar) ve bizim
// sporcuları bulmayı telefon yapar (resultSheet.js); burada yalnız liste okunur. Belge saklanmaz.

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "race-results");
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (!TYPES.includes(mimeType)) return bad("PDF ya da fotoğraf yükle.");
  if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  // Bizim sporcuların adları: yapay zeka bu satırları özellikle dikkatli okusun (eşleştirmeyi telefon yapar)
  const ours = (Array.isArray(body?.names) ? body.names : []).map((n) => String(n || "").slice(0, 60)).filter(Boolean).slice(0, 80);
  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: `Bu sonuç belgesini oku.${ours.length ? ` Bizim sporcularımız (adlarını ve kategorilerini özellikle doğru oku): ${ours.join(", ")}.` : ""}`,
      schema: SCHEMA,
      images: [{ mimeType, data }],
      maxTokens: 24000,
      timeoutMs: 55000,
    });
    if (raw?.isResults === false) return bad("Bu bir sonuç listesine benzemiyor.", 422);
    const fleets = cleanSheet(raw?.fleets);
    if (!fleets.length) return bad("Sonuç listesi okunamadı.", 422);
    console.log(`[race-results] ${Date.now() - t0} ms, ${fleets.map((f) => `${f.cls}=${f.rows.length}`).join(" ")}`);
    return NextResponse.json({ fleets });
  } catch (e) {
    logAiError("race-results", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Sonuç belgesi okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
