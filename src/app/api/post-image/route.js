import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { IMAGE_MODEL, imageUsage, spendImage } from "@/lib/server/imageUsage";
import { KINDS, cleanRace, dayOf } from "@/features/posts/postModel";

export const runtime = "nodejs";
export const maxDuration = 26;

// Instagram gönderisi için Gemini ile görsel üretir (GEMINI_IMAGE_MODEL, varsayılan gemini-2.5-flash-image).
// Görselde yazı olmaz: başlık, logo ve kulüp adı telefonda üstüne çizilir (Türkçe harfler düzgün çıksın diye).
// GET: bu ayki ve bugünkü görsel sayısı, günlük sınır, yaklaşık maliyet. Yalnız ana hesap.
const bad = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

const SCENE = {
  duyuru: "an upcoming youth sailing regatta: small dinghies (Optimist, ILCA) with white sails racing on a bright Aegean sea, start line buoys",
  sonuc: "a joyful moment after a youth sailing regatta: sailing dinghies near the shore at golden hour, celebratory mood, trophies feel",
  antrenman: "a youth sailing training session: young sailors in small Optimist dinghies practicing with a coach boat nearby, calm Aegean bay",
  genel: "a calm sailing club harbour on the Aegean coast in the morning, moored dinghies, clear sky, clean composition",
  kayit: "children learning to sail in small Optimist dinghies with an instructor, bright and welcoming, Aegean bay",
  kutlama: "festive sailing club harbour on the Aegean coast with nautical signal flags and Turkish flags waving, sunny day",
  ozel: "sailing dinghies on a calm Aegean sea near Dikili with a large Turkish flag waving on the club mast, clear sky, dignified mood",
  kulup: "a friendly small-town sailing club on the Aegean coast: dinghies on the slipway, flags, sea and sky",
  diger: "sailing on the Aegean sea near Dikili, Turkey",
};

export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Yalnız ana hesap.", 403);
  return NextResponse.json(await imageUsage(au.uid), { headers: { "cache-control": "no-store" } });
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Görsel üretmeyi yalnız ana hesap yapabilir.", 403);
  if (!process.env.GEMINI_API_KEY) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const usage = await imageUsage(au.uid);
  if (usage.left <= 0) return bad(`Bugünkü görsel hakkı bitti (${usage.limit}/${usage.limit}). Gece yarısı yenilenir.`, 429, { usage });

  const kind = KINDS.find(([k]) => k === body?.kind)?.[0] || "diger";
  const race = cleanRace(body?.race);
  const wish = S(body?.wish, 600);
  const topic = S(body?.topic, 600);
  const ratio = { portrait: "4:5", story: "9:16", reels: "9:16" }[body?.format] || "1:1";
  const prompt = [
    `Create a vivid, realistic, high quality photograph for an Instagram post of Dikili Yelken Spor Kulübü (a youth sailing club in Dikili, İzmir, Turkey).`,
    wish ? `What the image should show (Turkish, from the user): "${wish}"` : `Scene: ${SCENE[kind]}.`,
    kind === "ozel" && dayOf(body?.day) ? `Occasion (Turkish national/special day): ${dayOf(body.day).name}. ${dayOf(body.day).mood === "anma" ? "Solemn remembrance mood, muted colors, no celebration." : ""}` : "",
    topic && !wish ? `Context (Turkish): "${topic}"` : "",
    race ? `Event context: ${[race.name, race.place, race.dates, race.classes].filter(Boolean).join(", ")}.` : "",
    `Style: natural light, sharp, vibrant but realistic colors, shot on a professional camera. Leave calm, uncluttered space in the ${body?.pos === "top" ? "upper" : "lower"} third for a headline overlay.`,
    `IMPORTANT: absolutely no text, letters, numbers, logos, watermarks or sail numbers in the image. No recognizable real people's faces in close-up.`,
  ].filter(Boolean).join("\n");

  const model = IMAGE_MODEL();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 24000);
  const t0 = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio } },
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
    const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    const data = img?.inlineData || img?.inline_data;
    if (!data) return bad("Görsel üretilemedi (model resim döndürmedi). Anlatımı değiştirip tekrar dene.", 502, { usage });
    const next = await spendImage(au.uid);
    console.log(`[post-image] ${Date.now() - t0} ms, ${model}, ${ratio}, bugün ${next.today}/${next.limit}, ay ${next.month}`);
    return NextResponse.json({ image: `data:${data.mimeType || data.mime_type || "image/png"};base64,${data.data}`, usage: next });
  } catch (err) {
    logAiError("post-image", "gemini", err);
    if (err.name === "AbortError") return bad("Görsel üretimi çok uzun sürdü, tekrar dene.", 504, { usage });
    if (err.status === 429)
      return bad("Google'ın görsel kotası dolu. Ücretsiz anahtarda görsel üretimi kapalı olabilir; Google AI Studio'da faturalandırmayı açman gerekebilir.", 429, { usage });
    if (err.status === 404 || err.status === 400) return bad(`Görsel modeli (${model}) kullanılamadı. Netlify'da GEMINI_IMAGE_MODEL ayarını kontrol et.`, 502, { usage });
    if (err.status === 403) return bad("Gemini anahtarı görsel üretimine izin vermiyor.", 502, { usage });
    return bad("Görsel üretilemedi, tekrar dene.", 502, { usage });
  } finally {
    clearTimeout(timer);
  }
}
