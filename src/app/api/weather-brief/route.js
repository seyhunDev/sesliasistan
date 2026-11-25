import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Ana sayfa hava özeti: telefonun hesapladığı gerçeklerden (yağmur, rüzgâr artışı, sıcaklık) tek Türkçe cümle yazar.
// Sayı ya da saat uydurmaz; telefon sonucu en az 30 dk saklar.
const SYSTEM = "Yelken kulübü yöneticisi için ana sayfa hava özetini yazarsın. Verilen gerçeklerden TEK kısa Türkçe cümle yaz (en çok 110 karakter, sade, abartısız). Gerçeklerde olmayan sayı, saat ya da yer uydurma. Emoji kullanma.";
const SCHEMA = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };
const str = (v, n) => String(v ?? "").slice(0, n);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let b;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Bozuk istek." }, { status: 400 });
  }
  if (!b?.title) return NextResponse.json({ error: "Gerçek yok." }, { status: 400 });
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return NextResponse.json({ error: "Yapay zeka anahtarı tanımlı değil." }, { status: 503 });
  countAi(au, "weather-brief");
  const facts = [
    `Yer: ${str(b.place, 40)}`, `Durum: ${str(b.title, 80)}`, `Ayrıntı: ${str(b.sub, 120)}`,
    `${str(b.chart, 20)}: ${str(b.from, 8)}${str(b.unit, 4)} -> en yüksek ${str(b.peak, 8)}${str(b.unit, 4)} (${str(b.peakAt, 2)}:00)`, `Yedek cümle: ${str(b.fallback, 160)}`,
  ].join("\n");
  try {
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user: facts, schema: SCHEMA, maxTokens: 200, timeoutMs: 12000 });
    const text = str(raw?.text, 140).trim();
    if (!text) return NextResponse.json({ error: "Boş cevap." }, { status: 502 });
    return NextResponse.json({ text });
  } catch (e) {
    logAiError("weather-brief", "gemini", e);
    return NextResponse.json({ error: "Özet yazılamadı." }, { status: e.status === 429 ? 429 : 502 });
  }
}

export const POST = withAiCool(handle);
