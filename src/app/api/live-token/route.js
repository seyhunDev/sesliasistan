import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { liveOrder } from "@/lib/ai/liveModels";

export const runtime = "nodejs";

// Gemini Live (sesin akışla yazıya çevrilmesi) için kısa ömürlü anahtar. Telefon Google'a doğrudan WebSocket ile bağlanır;
// asıl anahtar (GEMINI_API_KEY) telefona hiç gitmez. Anahtar 3 bağlantılık (denenen modeller), 10 dakikalık; yeni bağlantı
// 2 dakika içinde açılmalı. Ses testi sayfası (Ayarlar › Ses testi) kullanır.
// Asistan da kullanır (dinlerken canlı yazı, lib/speech/geminiLive.js; 2026-10-21).
// Modeller: GEMINI_LIVE_MODEL (virgülle birden çok), sonra Google'ın şu an Live destekleyen modelleri (listeden, 6 saatte bir
// yenilenir; model adları sık değişiyor), en sonda aşağıdaki sıra. Telefon ilk açılanı kullanır (en çok 3).
const MODELS = ["gemini-live-2.5-flash-preview", "gemini-2.0-flash-live-001", "gemini-2.5-flash-native-audio-preview-09-2025"];
const found = globalThis.__liveModels || (globalThis.__liveModels = { at: 0, list: [] });

async function liveModels(key) {
  if (Date.now() - found.at < 6 * 3600e3 && found.list.length) return found.list;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const list = liveOrder((await res.json())?.models);
      if (list.length) Object.assign(found, { at: Date.now(), list });
    }
  } catch {}
  return found.list;
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Sunucuda GEMINI_API_KEY yok." }, { status: 501 });
  // Dinleme bitince telefon akan ses süresini bildirir (harcama: Ayarlar › Yapay zeka kullanımı)
  const body = await request.json().catch(() => null);
  if (body?.used != null) {
    const sec = Math.min(600, Math.max(0, Math.round(Number(body.used) || 0)));
    if (sec) countAi(au, "live-sec", sec);
    return NextResponse.json({ ok: true });
  }
  const now = Date.now();
  const modelsP = liveModels(key);
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
    return NextResponse.json({ token, models: [...new Set([...env, ...(await modelsP), ...MODELS])].slice(0, 3) });
  } catch (e) {
    return NextResponse.json({ error: `Anahtar alınamadı: ${e.message}`.slice(0, 160) }, { status: 502 });
  }
}
