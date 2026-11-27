import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { cleanLib } from "@/lib/fitness/library";
import { cleanHazir } from "@/lib/fitness/ortak";

export const runtime = "nodejs";
export const maxDuration = 26;

// Velora'nın ortak fitness verisi (lib/fitness/ortak.js): hareket kütüphanesi ve yayınlanan hazır programlar, giriş yapan
// herkese salt okunur. Velora sahibinin kulübü e-postasından bulunur. 2 dakika bellekte kalır (okuma az).
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const mem = globalThis.__fitOrtak || (globalThis.__fitOrtak = { at: 0, v: null });

export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const { adminReady, adminDb, adminAuth } = await import("@/lib/server/admin");
  if (!adminReady()) return bad("Sunucu yönetici hesabı yok.", 503);
  if (mem.v && Date.now() - mem.at < 120e3 && !new URL(request.url).searchParams.get("taze")) return NextResponse.json(mem.v);
  try {
    const org = (await adminAuth().getUserByEmail(VELORA_ADMIN)).uid;
    const ref = adminDb().collection("orgs").doc(org);
    const [lib, hz] = await Promise.all([ref.collection("fitLib").doc("main").get(), ref.collection("fitHazir").limit(30).get()]);
    const v = { org, lib: cleanLib(lib.exists ? lib.data() : {}), hazir: hz.docs.map((d) => cleanHazir(d.data(), d.id)).filter(Boolean) };
    mem.at = Date.now();
    mem.v = v;
    return NextResponse.json(v);
  } catch (err) {
    console.warn("[fitness-ortak]", err?.message?.slice(0, 160));
    return bad("Velora hareketleri alınamadı.", 502);
  }
}
