import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { IMAGE_MODEL, imageUsage, spendImage } from "@/lib/server/imageUsage";
import { chunkById } from "@/lib/englishChunkStudy";
import { picPrompt } from "@/lib/englishPics";

export const runtime = "nodejs";
export const maxDuration = 26;

// İngilizce kalıbın resmi (englishPics.js sahnesi, Gemini görsel modeli, kare). Yalnız ana hesap. Kaydetmez: telefon küçültüp
// orgs/{org}/englishPic/{id} belgesine yazar (features/words/chunkPics.js). Sayaç Instagram görsellerinden ayrı (engpic).
// GET: bugünkü sayı ve sınır.
const bad = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });

export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Yalnız ana hesap.", 403);
  return NextResponse.json(await imageUsage(au.uid, "engpic"), { headers: { "cache-control": "no-store" } });
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Resmi yalnız ana hesap çizdirebilir.", 403);
  if (!process.env.GEMINI_API_KEY) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const c = chunkById(String(body?.id || ""));
  const prompt = c && picPrompt(c);
  if (!prompt) return bad("Bu kalıbın resmi yok.");
  const usage = await imageUsage(au.uid, "engpic");
  if (usage.left <= 0) return bad(`Bugünkü resim hakkı bitti (${usage.limit}). Yarın devam ederim.`, 429, { usage });

  const model = IMAGE_MODEL();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 24000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const e = new Error(`gemini ${res.status}: ${text.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    const parts = JSON.parse(text)?.candidates?.[0]?.content?.parts || [];
    const data = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
    if (!data) return bad("Resim çizilemedi, tekrar dene.", 502, { usage });
    const next = await spendImage(au.uid, "engpic");
    return NextResponse.json({ image: `data:${data.mimeType || data.mime_type || "image/png"};base64,${data.data}`, usage: next });
  } catch (err) {
    logAiError("english-pic", "gemini", err);
    if (err.name === "AbortError") return bad("Resim çok uzun sürdü, tekrar dene.", 504, { usage });
    if (err.status === 429) return bad("Google'ın görsel kotası dolu, biraz sonra tekrar dene.", 429, { usage });
    if (err.status === 404 || err.status === 400) return bad(`Görsel modeli (${model}) kullanılamadı.`, 502, { usage });
    return bad("Resim çizilemedi, tekrar dene.", 502, { usage });
  } finally {
    clearTimeout(timer);
  }
}
