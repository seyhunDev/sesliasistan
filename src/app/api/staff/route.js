import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminAuth, adminDb, adminReady, profileOf } from "@/lib/server/admin";

export const runtime = "nodejs";

const MAX_STAFF = 5;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Yalnızca ana hesap çağırabilir
async function owner(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (!adminReady()) return { res: bad("Sunucuda Firebase yönetici anahtarı (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) tanımlı değil.", 503) };
  const me = await profileOf(au.uid);
  if (me.role !== "owner") return { res: bad("Bu işlemi yalnızca ana hesap yapabilir.", 403) };
  return { uid: au.uid };
}

// Çalışan hesabı oluştur: { name, email, password }
export async function POST(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const name = String(body?.name || "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!name) return bad("Ad gerekli.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Geçerli bir e-posta yaz.");
  if (password.length < 6) return bad("Şifre en az 6 karakter olmalı.");

  const db = adminDb();
  const members = db.collection("orgs").doc(o.uid).collection("members");
  if ((await members.count().get()).data().count >= MAX_STAFF) return bad(`En fazla ${MAX_STAFF} kişi eklenebilir.`);

  let user;
  try {
    user = await adminAuth().createUser({ email, password, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") return bad("Bu e-posta ile zaten bir hesap var.");
    if (e.code === "auth/invalid-password") return bad("Şifre en az 6 karakter olmalı.");
    console.error("[staff] oluşturulamadı:", e.code, e.message);
    return bad("Hesap oluşturulamadı.", 500);
  }
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(db.collection("users").doc(user.uid), { name, email, role: "staff", orgId: o.uid, createdAt: now });
  batch.set(members.doc(user.uid), { uid: user.uid, name, email, role: "staff", createdAt: now });
  await batch.commit();
  return NextResponse.json({ ok: true, member: { uid: user.uid, name, email } });
}

// Çalışanı kaldır: { uid }. Hesap silinir; eklediği kayıtlar işletmede kalır.
export async function DELETE(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const uid = String(body?.uid || "");
  const db = adminDb();
  const ref = db.collection("orgs").doc(o.uid).collection("members").doc(uid);
  if (!uid || !(await ref.get()).exists) return bad("Kişi bulunamadı.", 404);
  await adminAuth().deleteUser(uid).catch((e) => console.warn("[staff] auth silinemedi:", e.code));
  const batch = db.batch();
  batch.delete(ref);
  batch.delete(db.collection("users").doc(uid));
  await batch.commit();
  return NextResponse.json({ ok: true });
}
