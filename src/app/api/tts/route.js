import { requireUser, unauthorized } from "@/lib/server/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Gemini ses üretimi (aynı GEMINI_API_KEY). Ham PCM döner, tarayıcının çalabilmesi için WAV'a çeviriyoruz.
const MODELS = () => [...new Set([process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"])];
const VOICE = () => process.env.GEMINI_TTS_VOICE || "Kore";

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function generate(model, text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Say in a warm, friendly, natural everyday Turkish tone: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE() } } },
        },
      }),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${raw.slice(0, 160)}`);
    const part = JSON.parse(raw).candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error("ses verisi yok");
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) || 24000;
    return pcmToWav(Buffer.from(part.inlineData.data, "base64"), rate);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  // TTS_ENGINE=device: Gemini ses kotası harcanmaz, istemci cihazın kendi sesiyle okur
  if (process.env.TTS_ENGINE === "device") return NextResponse.json({ error: "Sunucu sesi kapalı" }, { status: 501 });
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Ses anahtarı yok" }, { status: 501 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const text = String(body?.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) return NextResponse.json({ error: "Metin boş" }, { status: 400 });
  if (text.length > 400) return NextResponse.json({ error: "Metin çok uzun" }, { status: 400 });

  let last = "";
  for (const m of MODELS()) {
    try {
      const wav = await generate(m, text);
      return new Response(new Uint8Array(wav), { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
    } catch (e) {
      last = `${m}: ${e.name === "AbortError" ? "zaman aşımı" : e.message}`;
      console.error("[tts]", last);
    }
  }
  return NextResponse.json({ error: "Ses üretilemedi", detail: last }, { status: 502 });
}
