import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { cleanHata, gunTR, HATA_MAX } from "@/lib/hata";

export const runtime = "nodejs";

// Merkezî hata kaydı (sistem taraması 2026-11-26, madde 9): telefonda sayfa çökünce (lib/crash.js logCrash) buraya da gelir.
// Kulübün günlük belgesine yazılır: orgs/{kulüp}/hatalar/{YYYY-MM-DD} = { n, list: [en yeni 50] }. Ana hesap Ayarlar › Admin › Hatalar'da
// okur (genel ana hesap kuralı). Yalnız giriş yapmış hesap; kişi başı saatte en çok 10 kayıt (yazma limiti).
const hits = globalThis.__hataHits || (globalThis.__hataHits = new Map());
function tooMany(uid, now = Date.now()) {
  const list = (hits.get(uid) || []).filter((t) => now - t < 3600e3);
  if (list.length >= 10) return true;
  hits.set(uid, [...list, now]);
  if (hits.size > 500) hits.delete(hits.keys().next().value);
  return false;
}

export async function POST(request) {
  const au = await requireUser(request, { free: true });
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ ok: false });
  const h = cleanHata(await request.json().catch(() => null));
  if (!h) return NextResponse.json({ error: "Geçersiz kayıt" }, { status: 400 });
  if (tooMany(au.uid)) return NextResponse.json({ ok: true, skipped: true });
  const p = await profileOf(au.uid);
  const ref = adminDb().collection("orgs").doc(p.orgId).collection("hatalar").doc(gunTR());
  const item = { ...h, uid: au.uid, ad: String(p.name || "").slice(0, 40), tur: p.role === "staff" ? p.kind || "staff" : "owner", at: new Date().toISOString() };
  await adminDb().runTransaction(async (tx) => {
    const list = (await tx.get(ref)).data()?.list || [];
    tx.set(ref, { n: FieldValue.increment(1), list: [item, ...list].slice(0, HATA_MAX) }, { merge: true });
  });
  return NextResponse.json({ ok: true });
}
