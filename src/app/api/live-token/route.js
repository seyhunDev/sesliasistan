import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { requireUser, unauthorized } from "@/lib/server/auth";

export const runtime = "nodejs";

// Gemini Live (sesin akışla yazıya çevrilmesi) için kısa ömürlü anahtar. Telefon Google'a doğrudan WebSocket ile bağlanır;
// asıl anahtar (GEMINI_API_KEY) telefona hiç gitmez. Anahtar 3 bağlantılık (denenen modeller), 10 dakikalık; yeni bağlantı
// 2 dakika içinde açılmalı. Ses testi sayfası (Ayarlar › Ses testi) kullanır.
// Modeller: GEMINI_LIVE_MODEL (virgülle birden çok) ya da aşağıdaki sıra; telefon ilk açılanı kullanır.
const MODELS = ["gemini-live-2.5-flash-preview", "gemini-2.0-flash-live-001", "gemini-2.5-flash-native-audio-preview-09-2025"];

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Sunucuda GEMINI_API_KEY yok." }, { status: 501 });
  const now = Date.now();
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ uses: 3, expireTime: new Date(now + 10 * 60e3).toISOString(), newSessionExpireTime: new Date(now + 2 * 60e3).toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.text();
    if (!res.ok) {
      console.warn("[live-token]", res.status, body.slice(0, 300));
      return NextResponse.json({ error: `Google anahtar vermedi (${res.status})`, detail: body.slice(0, 200) }, { status: 502 });
    }
    const token = JSON.parse(body)?.name;
    if (!token) return NextResponse.json({ error: "Google'dan anahtar gelmedi" }, { status: 502 });
    countAi(au, "live");
    const env = String(process.env.GEMINI_LIVE_MODEL || "").split(",").map((m) => m.trim()).filter(Boolean);
    return NextResponse.json({ token, models: env.length ? env : MODELS });
  } catch (e) {
    return NextResponse.json({ error: `Anahtar alınamadı: ${e.message}`.slice(0, 160) }, { status: 502 });
  }
}
