import { requireUser, unauthorized } from "@/lib/server/auth";
import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { synthesize, ttsReady } from "@/lib/server/tts";

export const runtime = "nodejs";

// Seslendirme ucu: asıl iş lib/server/tts.js'te (Gemini-TTS doğal ses → olmazsa Chirp 3 HD). Kullanım: docs/seslendirme.md
// Gövde: { text (≤400), voice?, lang? "tr"|"en", style? asistan|anlatim|fitness|ingilizce, rate?, cache? }
// Yanıt: ses dosyası (audio/mpeg); başlıkta x-tts-engine (gemini|chirp) ve x-tts-cached (1|0).
export async function POST(request) {
  // Anahtar yoksa ve TTS_ENGINE=device ise istemci cihazın kendi sesiyle okur
  if (process.env.TTS_ENGINE === "device" && !process.env.GOOGLE_TTS_KEY && !process.env.GEMINI_TTS_KEY) return NextResponse.json({ error: "Sunucu sesi kapalı" }, { status: 501 });
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!ttsReady()) return NextResponse.json({ error: "Ses anahtarı yok" }, { status: 501 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const text = String(body?.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) return NextResponse.json({ error: "Metin boş" }, { status: 400 });
  if (text.length > 400) return NextResponse.json({ error: "Metin çok uzun" }, { status: 400 });

  try {
    const r = await synthesize({ text, voice: String(body?.voice || ""), lang: body?.lang, style: body?.style, rate: body?.rate, cache: body?.cache === true });
    if (!r.cached) countAi(au, r.engine === "chirp" ? "tts-chr" : "tts-gem", text.length);
    return new Response(new Uint8Array(r.audio), {
      headers: { "content-type": r.type, "cache-control": "no-store", "x-tts-engine": r.engine, "x-tts-cached": r.cached ? "1" : "0" },
    });
  } catch (e) {
    return NextResponse.json({ error: "Ses üretilemedi", detail: e.detail || e.message }, { status: 502 });
  }
}
