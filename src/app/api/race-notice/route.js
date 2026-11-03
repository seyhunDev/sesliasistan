import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { NOTICE_SCHEMA, NOTICE_SYSTEM, noticeOut } from "@/lib/ai/raceNoticeAi";

export const runtime = "nodejs";

// Yarış talimatı (ilan, NoR) PDF, fotoğraf ya da yapıştırılan metin → yarış bilgisi, program, son tarihler, ücretler, oteller, iletişim.
// Kaydetmez; telefon yarışa yazar. Okuyucu lib/ai/raceNoticeAi.js (yarış sitesinden gelen belgeler de onu kullanır).
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024; // Netlify istek sınırı (base64 ile ~5,4 MB)
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "race-notice");
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  // Dosya (PDF/fotoğraf) ya da yapıştırılan metin
  const text = String(body?.text || "").trim().slice(0, 60000);
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (!text) {
    if (!TYPES.includes(mimeType)) return bad("PDF ya da fotoğraf yükle.");
    if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  } else if (text.length < 40) return bad("Talimat metni çok kısa.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = DATE.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);

  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: NOTICE_SYSTEM,
      user: `Bugün: ${today}. Yıl yazmayan tarihlerde yarışın yılını kullan. ${text ? `Bu yarış talimatı metnini oku (kopyalanmış, tablo düzeni bozuk olabilir):\n"""\n${text}\n"""` : "Bu yarış talimatını oku."}`,
      schema: NOTICE_SCHEMA,
      images: text ? [] : [{ mimeType, data }],
      maxTokens: 8000,
      timeoutMs: 50000,
    });
    if (raw?.isNotice === false) return bad("Bu bir yarış talimatına benzemiyor.", 422);
    const out = noticeOut(raw);
    if (!out.name && !out.startDate) return bad("Talimattan yarış adı ve tarihi okunamadı.", 422);
    console.log(`[race-notice] ${Date.now() - t0} ms, program=${out.schedule.length}, son tarih=${out.deadlines.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("race-notice", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Talimat okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
