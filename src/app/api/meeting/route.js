import { NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { TOOL, toDrafts } from "@/lib/ai/schema";
import { requireUser, unauthorized } from "@/lib/server/auth";

export const runtime = "nodejs";

// Toplantı metninden özet, kararlar ve eylem planı (plan / görev / not taslakları)
const SYSTEM = `Sen bir spor kulübünün (yelken) toplantı asistanısın. Sana bir toplantının ses kaydından çıkarılmış Türkçe metin verilir. Metin ses tanımadan geldiği için yazım hataları ve eksik cümleler olabilir; anlamı koru, uydurma.

Çıktı:
- summary: Toplantının özeti. 3-8 kısa madde, her madde "- " ile başlayan ayrı satır. Konuşulan ana konular ve sonuçları. Kimlerin konuştuğu belli değilse isim uydurma.
- decisions: Alınan net kararlar (her biri tek cümle). Yoksa boş liste.
- items: Eylem planı. Toplantıda kararlaştırılan etkinlikler "plan" (tarih/saat söylendiyse doldur), yapılacak işler "task" (başlık emir kipinde, kısa; son tarih söylendiyse date), önemli bilgiler "note". En fazla 12 kayıt. Tarihleri YYYY-MM-DD, saatleri HH:MM yaz; göreli tarihleri (yarın, cuma, haftaya) verilen bugüne göre çöz. Tarih ya da saat uydurma, bilinmiyorsa boş bırak. Toplantının kendisi için ayrıca plan oluşturma.
- title: Toplantıya 2-5 kelimelik kısa bir başlık.
- message: Kullanıcıya 1-2 cümlelik, samimi, sesli okunacak bir yanıt (kaç karar ve kaç iş çıktığını söyle).`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    items: TOOL.input_schema.properties.items,
    message: { type: "string" },
  },
  required: ["title", "summary", "decisions", "items", "message"],
};

function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const text = String(body?.text ?? "").trim().slice(0, 40000);
  if (text.length < 20) return NextResponse.json({ error: "Özetlenecek kadar konuşma yok" }, { status: 400 });
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
  const user = `Bugün: ${today} (${weekday}). Saat dilimi: Europe/Istanbul.\n\nTOPLANTI METNİ:\n"""\n${text}\n"""`;

  const provider = pickProvider();
  const hasKey = provider === "gemini" ? process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL : provider === "anthropic" && process.env.ANTHROPIC_API_KEY;
  if (!hasKey) return NextResponse.json({ error: "Yapay zeka anahtarı tanımlı değil" }, { status: 503 });

  try {
    const t0 = Date.now();
    const raw =
      provider === "gemini"
        ? await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 4096, timeoutMs: 25000 })
        : await callClaude({
          model: process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001",
          system: SYSTEM,
          tool: { name: "toplanti", description: "Toplantı özeti ve eylem planı", input_schema: SCHEMA },
          messages: [{ role: "user", content: user }],
          maxTokens: 4096,
        });
    console.log(`[meeting:${provider}] ${Date.now() - t0} ms, ${text.length} karakter`);
    return NextResponse.json({
      title: String(raw?.title || "Toplantı").slice(0, 80),
      summary: String(raw?.summary || "").slice(0, 4000),
      decisions: (Array.isArray(raw?.decisions) ? raw.decisions : []).map(String).slice(0, 20),
      items: toDrafts(raw?.items).slice(0, 12),
      message: String(raw?.message || "").slice(0, 300),
      source: "ai",
    });
  } catch (e) {
    console.error(`[meeting:${provider}]`, e.message);
    return NextResponse.json({ error: e.status === 429 ? "Yapay zeka kotası dolu" : "Yapay zeka yanıt vermedi" }, { status: 502 });
  }
}

export const POST = withAiCool(handle);
