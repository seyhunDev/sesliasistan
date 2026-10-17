import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { avatarOk } from "@/lib/avatar";

export const runtime = "nodejs";

// Profil fotoğrafını kaydeder: herkes kendi fotoğrafını, ana hesap işletmedeki herkesinkini.
// Fotoğraf istemcide küçültülüp Storage'a (orgs/{org}/avatars/{uid}/…) yüklenir; burada adresi üç yere yazılır:
// users/{uid} (kendi Ayarlar'ı), orgs/{org}/members/{uid} (Kişiler, kişi sayfası, ana sayfa) ve orgs/{org}/directory/{uid} (Mesajlar).
// Gövde: { uid, photo, path } — photo boş ise fotoğraf kaldırılır.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu ayarı eksik" }, { status: 503 });
  const { uid, photo = "", path = "" } = await request.json().catch(() => ({}));
  if (typeof uid !== "string" || !/^[\w-]{1,128}$/.test(uid)) return NextResponse.json({ error: "Kişi yok" }, { status: 400 });
  const me = await profileOf(au.uid);
  const owner = me.role === "owner" && me.orgId === au.uid;
  if (uid !== au.uid && !owner) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  const orgId = me.orgId;
  if (photo && !avatarOk(photo, path, orgId, uid, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)) return NextResponse.json({ error: "Geçersiz fotoğraf" }, { status: 400 });
  const db = adminDb();
  const org = db.collection("orgs").doc(orgId);
  const member = org.collection("members").doc(uid);
  const [m, u] = await Promise.all([member.get(), db.collection("users").doc(uid).get()]);
  // Başka birinin fotoğrafı: yalnız kendi işletmesindeki kişi
  if (uid !== orgId && !m.exists) return NextResponse.json({ error: "Kişi bulunamadı" }, { status: 404 });
  const val = photo ? { photo, photoPath: path } : { photo: FieldValue.delete(), photoPath: FieldValue.delete() };
  const batch = db.batch();
  if (m.exists) batch.update(member, val);
  if (u.exists && (u.data().orgId || uid) === orgId) batch.update(u.ref, val);
  batch.set(org.collection("directory").doc(uid), { photo: photo || FieldValue.delete() }, { merge: true });
  await batch.commit();
  return NextResponse.json({ ok: true });
}
