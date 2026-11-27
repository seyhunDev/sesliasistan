import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { ownsAthletes } from "@/lib/server/athleteAccess";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { limitOf } from "@/lib/paket";
import { sayOf } from "@/lib/server/paketSay";
import { DOGRULA, dogrulanmadi } from "@/lib/server/dogrula";

export const runtime = "nodejs";

// Sporcu ekleme sunucudan (Seyhun 2026-11-27 sporcu paketleri; lib/paket.js): ana hesap kendi alanına (orgs/{uid}/athletes)
// ekler; sporcu sayısı paket sınırına ulaştıysa 402 { error, full: true, count, limit }. firestore.rules istemciden yeni
// sporcu belgesini yalnız Velora ana hesabına bırakır, öteki hesaplar buradan geçer.
// POST { fields: { studentName, studentBirthDate (YYYY-MM-DD), ... } } → { id }
const bad = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const KEY = /^[a-zA-Z][\w]{0,40}$/;

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!(await ownsAthletes(au))) return bad("Sporcu eklemek için ana hesap gerekir.", 403);
  const { adminReady, adminDb } = await import("@/lib/server/admin");
  if (!adminReady()) return bad("Sunucu yönetici hesabı yok.", 503);
  const body = await request.json().catch(() => ({}));
  const f = body.fields && typeof body.fields === "object" ? body.fields : {};
  const name = String(f.studentName || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!name) return bad("Ad soyad yaz.");
  const db = adminDb();
  const admin = String(au.email || "").toLowerCase() === VELORA_ADMIN;
  const u = (await db.collection("users").doc(au.uid).get()).data() || {};
  if (!admin && dogrulanmadi(u, au)) return bad(DOGRULA, 403, { dogrula: true });
  const limit = limitOf(u.paket, { admin });
  const count = await sayOf(db, au.uid);
  if (count >= limit) return bad(`${limit} sporcu hakkın doldu.`, 402, { full: true, count, limit });
  const { Timestamp } = await import("firebase-admin/firestore");
  const data = { status: "active", currentClassId: "", currentCoachId: "" };
  for (const [k, v] of Object.entries(f)) if (KEY.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) data[k] = typeof v === "string" ? v.slice(0, 300) : v;
  data.studentName = name;
  const d = String(f.studentBirthDate || "").slice(0, 10);
  data.studentBirthDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? Timestamp.fromDate(new Date(`${d}T12:00:00`)) : null;
  data.createdAt = Timestamp.now();
  const ref = await db.collection("orgs").doc(au.uid).collection("athletes").add(data);
  return NextResponse.json({ id: ref.id, count: count + 1, limit: limit === Infinity ? null : limit });
}
