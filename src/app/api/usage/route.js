import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { quotaOf } from "@/lib/server/quota";
import { aiUsageOf } from "@/lib/server/aiUsage";
import { imageUsage } from "@/lib/server/imageUsage";
import { USD_TRY } from "@/lib/aiPrice";

export const runtime = "nodejs";

// Kişinin bugünkü kalan hakları: { assistant: {limit,left,resetAt}|{unlimited}, receipt: ... }
// ?ai=1 (yalnız ana hesap): kulübün bu ay / geçen ay yapay zeka istekleri görsel sayaçları ve tanımlı servis anahtarları (Ayarlar › Harcamalar)
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (new URL(request.url).searchParams.get("ai")) {
    if (au.staff) return NextResponse.json({ error: "Yalnız ana hesap" }, { status: 403 });
    const kinds = ["postimg", "engpic", "fitpic", "fitanim"];
    const [ai, ...ims] = await Promise.all([aiUsageOf(au.uid).catch(() => null), ...kinds.map((k) => imageUsage(au.uid, k).catch(() => null))]);
    const img = ims[0];
    const imgs = Object.fromEntries(kinds.map((k, i) => [k, ims[i]]));
    // Hangi dış servisin anahtarı tanımlı (yalnız var/yok; Ayarlar › Harcamalar listesi)
    const keys = { anthropic: !!process.env.ANTHROPIC_API_KEY, openai: !!process.env.OPENAI_API_KEY, groq: !!process.env.GROQ_API_KEY, googleTts: !!process.env.GOOGLE_TTS_KEY };
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    return NextResponse.json(
      { ai, img, imgs, keys, textPrice: Number(process.env.GEMINI_TEXT_PRICE) || 0.001, rate: Number(process.env.USD_TRY) || USD_TRY, today },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const [assistant, receipt] = await Promise.all([quotaOf(au, "assistant"), quotaOf(au, "receipt")]);
  return NextResponse.json({ assistant, receipt }, { headers: { "cache-control": "no-store" } });
}
