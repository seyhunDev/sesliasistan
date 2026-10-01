import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { kindOf } from "@/lib/kinds";

export const runtime = "nodejs";

// Sohbet rehberini tamamlar: işletmedeki hesabı olan herkes (ana hesap + çalışan, aile, sporcu…; türüyle) orgs/{org}/directory'de adıyla yer alır.
// Böylece kimse uygulamayı açmamış olsa bile herkes herkesi Mesajlar'da görür. Yalnızca ad ve rol yazılır
// (e-posta yazılmaz); var olan "son görülme" korunur. İşletmenin herhangi bir üyesi çağırabilir.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ ok: false, skipped: "ayar eksik" });
  const me = await profileOf(au.uid);
  const db = adminDb();
  const org = db.collection("orgs").doc(me.orgId);
  const members = await org.collection("members").get();
  if (me.orgId !== au.uid && !members.docs.some((d) => d.id === au.uid)) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  const owner = await profileOf(me.orgId);
  const batch = db.batch();
  const dir = org.collection("directory");
  batch.set(dir.doc(me.orgId), { name: owner.name || "Ana hesap", role: "owner" }, { merge: true });
  // Hesabı olmayan kişi (yalnız kayıt) rehbere girmez; ayrılan kişi eski mesajlarda adıyla görünsün diye "left" işaretli kalır
  for (const d of members.docs) {
    const m = d.data();
    if (m.account === false) continue;
    batch.set(dir.doc(d.id), { name: m.name || "Kişi", role: "staff", kind: kindOf(m), ...(m.status === "left" ? { left: true } : {}) }, { merge: true });
  }
  await batch.commit();
  return NextResponse.json({ ok: true, count: members.size + 1 });
}
