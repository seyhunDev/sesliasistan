import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady } from "@/lib/server/admin";
import { callsOverview, recordCall } from "@/lib/server/callUsage";

export const runtime = "nodejs";

// POST: arama bitince bu cihazın ölçtüğü veri kullanımı { id, sent, recv, relay, sec } (lib/server/callUsage.js)
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ ok: false });
  let body = {};
  try {
    body = await request.json();
  } catch {}
  try {
    const r = await recordCall(au.uid, body);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[call-stats]", e.message);
    return NextResponse.json({ error: "Kaydedilemedi" }, { status: 500 });
  }
}

// GET (yalnız ana hesap): Ayarlar › Aramalar
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return NextResponse.json({ error: "Yalnız ana hesap" }, { status: 403 });
  if (!adminReady()) return NextResponse.json({ error: "Sunucu ayarı eksik" }, { status: 503 });
  try {
    return NextResponse.json(await callsOverview(au.uid), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[call-stats]", e.message);
    return NextResponse.json({ error: "Okunamadı" }, { status: 500 });
  }
}
