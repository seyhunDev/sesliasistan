import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { IMAGE_MODEL, imageUsage, spendImage } from "@/lib/server/imageUsage";

export const runtime = "nodejs";
export const maxDuration = 26;

// Fotoğrafı olmayan hareketin fotoğrafı (Seyhun 2026-11-25: hazır program eksiksiz gelsin). Yalnız ana hesap.
// Telefon hazır programın bir fotoğrafını örnek (ref, JPEG base64) olarak yollar: aynı oda, ışık ve kıyafet; hareket
// anlatımdan (how) çizilir, iki kare (başlangıç ve bitiş), yazısız. Kaydetmez: telefon Storage'a yükler (templateSeed.js).
const bad = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Yalnız ana hesap.", 403);
  if (!process.env.GEMINI_API_KEY) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const name = S(body?.name, 60);
  const how = S([body?.setup, body?.how].filter(Boolean).join(" "), 600);
  const ref = typeof body?.ref === "string" && body.ref.length < 1_500_000 ? body.ref : "";
  if (!name) return bad("Hareket adı yok.");
  const usage = await imageUsage(au.uid, "fitpic");
  if (usage.left <= 0) return bad(`Bugünkü fotoğraf hakkı bitti (${usage.limit}).`, 429, { usage });

  const prompt = [
    ref ? "Use the attached photo ONLY as a style reference: same bright home room with white walls, light wood floor, green plants, grey exercise mat, same soft daylight, same outfit (navy t-shirt, navy shorts or leggings, white sneakers). Do not copy the person's face; draw a generic young athlete." : "Bright home room with white walls, light wood floor, plants, grey exercise mat, soft daylight. Generic young athlete in a navy t-shirt, navy shorts and white sneakers.",
    `Create a clean, realistic photo demonstrating the home exercise "${name}".`,
    how ? `How it is done: ${how}` : "",
    "Show two frames side by side: the start position on the left and the end position on the right. The whole body is fully visible and centered in each frame, nothing cut off at the edges. Side or three-quarter camera angle so the movement is clear.",
    "No text, no letters, no numbers, no arrows, no logos, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");

  const model = IMAGE_MODEL();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 24000);
  try {
    const parts = [{ text: prompt }];
    if (ref) parts.push({ inlineData: { mimeType: "image/jpeg", data: ref } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } } }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const e = new Error(`gemini ${res.status}: ${text.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    const out = JSON.parse(text)?.candidates?.[0]?.content?.parts || [];
    const data = out.map((p) => p.inlineData || p.inline_data).find((d) => d?.data);
    if (!data) return bad("Fotoğraf çizilemedi.", 502, { usage });
    const next = await spendImage(au.uid, "fitpic");
    return NextResponse.json({ mimeType: data.mimeType || data.mime_type || "image/png", data: data.data, usage: next });
  } catch (err) {
    logAiError("fitness-pic", "gemini", err);
    if (err.name === "AbortError") return bad("Fotoğraf çok uzun sürdü.", 504, { usage });
    if (err.status === 429) return bad("Google'ın görsel kotası dolu.", 429, { usage });
    return bad("Fotoğraf çizilemedi.", 502, { usage });
  } finally {
    clearTimeout(timer);
  }
}
