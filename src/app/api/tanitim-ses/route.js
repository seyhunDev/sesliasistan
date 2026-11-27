import { NextResponse } from "next/server";
import { synthesize } from "@/lib/server/tts";
import { TANITIM_SES, TANITIM_SES_STIL } from "@/lib/tanitimSes";

export const runtime = "nodejs";

// Kısa tanıtımın doğal seslendirmesi (Seyhun 2026-11-27). Herkese açık ama yalnız lib/tanitimSes.js'teki sabit cümleler:
// serbest metin kabul edilmez. Ses bir kez Gemini ile üretilir, Storage önbelleğinden (tts-cache) gelir ve CDN'de bir yıl
// saklanır; yani her izleyen yeni bir API çağrısı yapmaz. Yalnız Chirp yedeği gelirse uzun saklanmaz (Gemini dönünce düzelsin).
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  const text = Object.hasOwn(TANITIM_SES, id) ? TANITIM_SES[id] : "";
  if (!text) return NextResponse.json({ error: "Bilinmeyen cümle" }, { status: 404 });
  try {
    const r = await synthesize({ text, ...TANITIM_SES_STIL, cache: true, timeoutMs: 20000 });
    const dogal = r.engine === "gemini";
    const kalici = dogal ? "public, max-age=31536000, immutable" : "public, max-age=300";
    return new Response(new Uint8Array(r.audio), {
      headers: {
        "content-type": r.type,
        "cache-control": kalici,
        "netlify-cdn-cache-control": dogal ? "public, max-age=31536000, durable" : "public, max-age=300",
        "x-tts-engine": r.engine,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Ses üretilemedi", detail: e.detail || e.message }, { status: 503 });
  }
}
