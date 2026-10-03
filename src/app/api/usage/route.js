import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { quotaOf } from "@/lib/server/quota";
import { aiUsageOf } from "@/lib/server/aiUsage";
import { imageUsage } from "@/lib/server/imageUsage";

export const runtime = "nodejs";

// Kişinin bugünkü kalan hakları: { assistant: {limit,left,resetAt}|{unlimited}, receipt: ... }
// ?ai=1 (yalnız ana hesap): kulübün bu ay / geçen ay yapay zeka istekleri ve görsel sayacı (Ayarlar › Kullanım)
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (new URL(request.url).searchParams.get("ai")) {
    if (au.staff) return NextResponse.json({ error: "Yalnız ana hesap" }, { status: 403 });
    const [ai, img] = await Promise.all([aiUsageOf(au.uid).catch(() => null), imageUsage(au.uid).catch(() => null)]);
    return NextResponse.json({ ai, img, textPrice: Number(process.env.GEMINI_TEXT_PRICE) || 0.001 }, { headers: { "cache-control": "no-store" } });
  }
  const [assistant, receipt] = await Promise.all([quotaOf(au, "assistant"), quotaOf(au, "receipt")]);
  return NextResponse.json({ assistant, receipt }, { headers: { "cache-control": "no-store" } });
}
