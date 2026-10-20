import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, modelOf, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { aiErrorKind, logAiError } from "@/lib/ai/errors";
import { SOZ_SCHEMA, SOZ_SYSTEM, sozOk, sozUser } from "@/lib/ai/soz";

export const runtime = "nodejs";

// Söz yapay zekası (lib/ai/soz.js): işin sonucunu doğal konuşma cümlesine çevirir. İşten ayrı, küçük ve kısa süreli
// (en çok 4,5 sn); olmazsa telefon kendi cümlesini kullanır. Model: GEMINI_SOZ_MODEL (hızlı model), yoksa GEMINI_MODEL.
const bad = (error, status = 400, reason = "") => NextResponse.json({ error, ...(reason ? { reason } : {}) }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const result = String(body?.result ?? "").trim();
  if (!result) return bad("Sonuç boş");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503, "nokey");
  countAi(au, "soz");
  const t0 = Date.now();
  try {
    const raw = await callGemini({ model: process.env.GEMINI_SOZ_MODEL || process.env.GEMINI_MODEL, system: SOZ_SYSTEM, user: sozUser({ said: body?.said, result }), schema: SOZ_SCHEMA, maxTokens: 300, timeoutMs: 4500, attemptMs: 4500 });
    const text = String(raw?.text ?? "").replace(/\s+/g, " ").trim();
    const ms = Date.now() - t0;
    if (!sozOk(result, text)) {
      console.warn(`[soz] denetimden geçmedi ${ms} ms: ${text.slice(0, 120)}`);
      return bad("Söz denetimden geçmedi", 422, "unclear");
    }
    return NextResponse.json({ text, ms, model: modelOf(raw) });
  } catch (e) {
    logAiError("soz", "gemini", e, Date.now() - t0);
    return bad("Söz yazılamadı", e.status === 429 ? 429 : 502, aiErrorKind(e));
  }
}

export const POST = withAiCool(handle);
