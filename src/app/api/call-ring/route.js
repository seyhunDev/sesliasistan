import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady } from "@/lib/server/admin";
import { declineCall, ringCall } from "@/lib/server/callPush";

export const runtime = "nodejs";

// POST { id, end? }: arayan, arananın Android telefonunu çaldırır / susturur (lib/server/callPush.js).
// POST { o, i, s }: Android bildirimindeki Reddet (oturum yok, imzalı).
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  if (!adminReady()) return NextResponse.json({ ok: false });
  try {
    if (body?.s) {
      const r = await declineCall(String(body.o || ""), String(body.i || ""), String(body.s));
      return NextResponse.json(r, { status: r.error ? 400 : 200 });
    }
    const au = await requireUser(request);
    if (!au.ok) return unauthorized(au);
    const r = await ringCall(au.uid, String(body?.id || ""), !!body?.end);
    return NextResponse.json(r, { status: r.error ? 400 : 200 });
  } catch (e) {
    console.error("[call-ring]", e.message);
    return NextResponse.json({ error: "Gönderilemedi" }, { status: 500 });
  }
}
