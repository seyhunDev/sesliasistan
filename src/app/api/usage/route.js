import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { quotaOf } from "@/lib/server/quota";

export const runtime = "nodejs";

// Kişinin bugünkü kalan hakları: { assistant: {limit,left,resetAt}|{unlimited}, receipt: ... }
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const [assistant, receipt] = await Promise.all([quotaOf(au, "assistant"), quotaOf(au, "receipt")]);
  return NextResponse.json({ assistant, receipt }, { headers: { "cache-control": "no-store" } });
}
