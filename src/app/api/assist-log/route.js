import { NextResponse } from "next/server";
import { adminDb, adminReady } from "@/lib/server/admin";
import { requireUser, unauthorized } from "@/lib/server/auth";

export const runtime = "nodejs";

// Asistan konuşma raporları (Seyhun: "asistan her başlatıldığında raporu tutulmalı, tarih tarih; öğrenmede kullanacağız",
// 2026-10-21). Asistan kapanınca telefon o konuşmanın raporunu (lib/assistReport.js) gönderir; yalnız sunucu yazar ve okur
// (Firestore kuralı gerekmez). Yer: asstReports/{uid}/list/{id} = { at, day, n, first, text }.
// GET: son 100 raporun listesi (yazısız); GET ?id=…: tek rapor. POST { at, n, first, text }: kaydet.
const list = (uid) => adminDb().collection("asstReports").doc(uid).collection("list");
const dayOf = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(ms));

export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu ayarı eksik" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const d = await list(au.uid).doc(String(id).slice(0, 60)).get();
    if (!d.exists) return NextResponse.json({ error: "Rapor yok" }, { status: 404 });
    return NextResponse.json({ id: d.id, ...d.data() }, { headers: { "cache-control": "no-store" } });
  }
  const snap = await list(au.uid).orderBy("at", "desc").limit(100).select("at", "day", "n", "first").get();
  return NextResponse.json({ list: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu ayarı eksik" }, { status: 503 });
  const b = await request.json().catch(() => null);
  const text = String(b?.text || "").slice(0, 60000);
  const at = Math.round(Number(b?.at) || 0);
  if (!text || !(at > 0) || Math.abs(Date.now() - at) > 30 * 86400e3) return NextResponse.json({ error: "Geçersiz rapor" }, { status: 400 });
  // Aynı konuşma iki kez gelirse (bağlantı koptu, yeniden denendi) tek kayıt: kimlik açılış anından
  await list(au.uid)
    .doc(`k${at}`)
    .set({ at, day: dayOf(at), n: Math.max(0, Math.min(500, Math.round(Number(b.n) || 0))), first: String(b.first || "").slice(0, 120), text });
  return NextResponse.json({ ok: true });
}
