import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";

export const runtime = "nodejs";

// Tanıtımı ve "Şimdi sen dene" yönlendirmesini sıfırlar (deneme için). Ana hesap: kendisi ve kurumdaki herkes. Diğerleri: yalnız kendisi.
// Kişiler uygulamayı bir sonraki açışta (açıksa hemen) karşılamayı baştan görür.
const RESET = { onboarded: false, introV: 0, tourDone: false };

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucuda Firebase yönetici anahtarı tanımlı değil." }, { status: 503 });
  const me = await profileOf(au.uid);
  const db = adminDb();
  if (me.role !== "owner") {
    await db.collection("users").doc(au.uid).set(RESET, { merge: true });
    return NextResponse.json({ count: 1, all: false });
  }
  const snap = await db.collection("users").where("orgId", "==", au.uid).get();
  const batch = db.batch();
  const ids = new Set([au.uid, ...snap.docs.map((d) => d.id)]);
  ids.forEach((id) => batch.set(db.collection("users").doc(id), RESET, { merge: true }));
  await batch.commit();
  return NextResponse.json({ count: ids.size, all: true });
}
