import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminAuth, adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { KINDS, loginEmail, validUsername } from "@/lib/kinds";

export const runtime = "nodejs";

const MAX_ACCOUNTS = 150; // hesabı olan kişi sayısı (yalnız kayıtlı kişiler sınırsız)
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const cleanName = (s) => String(s || "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40);

// Yalnızca ana hesap çağırabilir
async function owner(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (!adminReady()) return { res: bad("Sunucuda Firebase yönetici anahtarı (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) tanımlı değil.", 503) };
  const me = await profileOf(au.uid);
  if (me.role !== "owner") return { res: bad("Bu işlemi yalnızca ana hesap yapabilir.", 403) };
  return { uid: au.uid };
}
async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Hesap aç: { memberId?, name, kind, login (e-posta ya da kullanıcı adı), password }
// memberId verilirse var olan kişi kaydına hesap açılır ve hesabın kimliği kişinin kimliği olur
// (ona verilmiş işler, doğum günü bağlantısı aynen kalır). Verilmezse yeni kişi + hesap oluşur.
export async function POST(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await readBody(request);
  if (!body) return bad("Geçersiz istek");
  const name = cleanName(body.name);
  const kind = KINDS.includes(body.kind) ? body.kind : "staff";
  const login = String(body.login ?? body.email ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(body.password || "");
  if (!name) return bad("Ad gerekli.");
  if (login.includes("@") ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) : !validUsername(login))
    return bad("Geçerli bir e-posta ya da kullanıcı adı yaz (kullanıcı adı: en az 3 karakter; harf, rakam, nokta).");
  if (password.length < 6) return bad("Şifre en az 6 karakter olmalı.");

  const db = adminDb();
  const org = db.collection("orgs").doc(o.uid);
  const members = org.collection("members");
  const all = await members.get();
  const accounts = all.docs.filter((d) => d.data().account !== false && d.data().status !== "left").length;
  if (accounts >= MAX_ACCOUNTS) return bad(`En fazla ${MAX_ACCOUNTS} hesap açılabilir.`);
  const memberId = String(body.memberId || "");
  if (memberId) {
    const m = all.docs.find((d) => d.id === memberId);
    if (!m) return bad("Kişi bulunamadı.", 404);
    if (m.data().account !== false && m.data().status !== "left") return bad("Bu kişinin zaten hesabı var.");
  }

  let user;
  try {
    user = await adminAuth().createUser({ ...(memberId ? { uid: memberId } : {}), email: loginEmail(login), password, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") return bad(login.includes("@") ? "Bu e-posta ile zaten bir hesap var." : "Bu kullanıcı adı alınmış; başka bir tane dene.");
    if (e.code === "auth/uid-already-exists") return bad("Bu kişinin zaten hesabı var.");
    if (e.code === "auth/invalid-password") return bad("Şifre en az 6 karakter olmalı.");
    console.error("[staff] oluşturulamadı:", e.code, e.message);
    return bad("Hesap oluşturulamadı.", 500);
  }
  const now = new Date().toISOString();
  const email = login.includes("@") ? login : "";
  const batch = db.batch();
  batch.set(db.collection("users").doc(user.uid), { name, email: loginEmail(login), role: "staff", kind, orgId: o.uid, createdAt: now });
  batch.set(
    members.doc(user.uid),
    { uid: user.uid, name, kind, role: "staff", account: true, loginName: login, status: "active", ...(email ? { email } : {}), ...(memberId ? {} : { createdAt: now }) },
    { merge: true },
  );
  batch.set(org.collection("directory").doc(user.uid), { name, role: "staff", kind }); // sohbet rehberi
  await batch.commit();
  return NextResponse.json({ ok: true, member: { uid: user.uid, name, login } });
}

// Hesap bilgisi güncelle: { uid, name?, kind?, password? } — kişi kaydı istemcide değişir; burada hesap, profil ve rehber eşitlenir
export async function PATCH(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await readBody(request);
  const uid = String(body?.uid || "");
  const db = adminDb();
  const org = db.collection("orgs").doc(o.uid);
  const m = await org.collection("members").doc(uid).get();
  if (!uid || !m.exists) return bad("Kişi bulunamadı.", 404);
  if (m.data().account === false) return NextResponse.json({ ok: true, skipped: "hesap yok" });
  const name = body.name != null ? cleanName(body.name) : null;
  const kind = KINDS.includes(body.kind) ? body.kind : null;
  const password = body.password != null ? String(body.password) : null;
  if (password != null && password.length < 6) return bad("Şifre en az 6 karakter olmalı.");
  try {
    await adminAuth().updateUser(uid, { ...(name ? { displayName: name } : {}), ...(password ? { password } : {}) });
  } catch (e) {
    console.warn("[staff] hesap güncellenemedi:", e.code);
    if (password) return bad("Şifre değiştirilemedi.", 500);
  }
  const patch = { ...(name ? { name } : {}), ...(kind ? { kind } : {}) };
  if (Object.keys(patch).length) {
    const batch = db.batch();
    batch.set(db.collection("users").doc(uid), patch, { merge: true });
    batch.set(org.collection("directory").doc(uid), patch, { merge: true });
    await batch.commit();
  }
  return NextResponse.json({ ok: true });
}

// Hesabı kapat ya da kişiyi sil: { uid, mode: "account" | "person" }
// account: giriş kapanır, kişi kaydı kalır (sonra yeniden hesap açılabilir).
// person: kişi "ayrıldı" olur (arşivde ve eski mesajlarda adı görünür), gruplardan çıkar, kendi eklediği doğum günleri silinir.
// Ona verilmiş işler ve ana hesabın takvimindeki doğum günü istemcide, silme ekranındaki seçime göre düzenlenir.
export async function DELETE(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await readBody(request);
  const uid = String(body?.uid || "");
  const mode = body?.mode === "account" ? "account" : "person";
  const db = adminDb();
  const org = db.collection("orgs").doc(o.uid);
  const ref = org.collection("members").doc(uid);
  const snap = await ref.get();
  if (!uid || uid === o.uid || !snap.exists) return bad("Kişi bulunamadı.", 404);
  const hadAccount = snap.data().account !== false;
  if (hadAccount) await adminAuth().deleteUser(uid).catch((e) => e.code !== "auth/user-not-found" && console.warn("[staff] auth silinemedi:", e.code));
  const now = new Date().toISOString();
  const batch = db.batch();
  if (hadAccount) {
    batch.delete(db.collection("users").doc(uid));
    batch.set(org.collection("directory").doc(uid), { left: true }, { merge: true });
  }
  batch.set(ref, mode === "account" ? { account: false } : { account: false, status: "left", leftAt: now }, { merge: true });
  if (mode === "person") {
    const groups = await org.collection("chats").where("members", "array-contains", uid).get();
    for (const g of groups.docs) if (g.data().type === "group") batch.update(g.ref, { members: FieldValue.arrayRemove(uid) });
    const bdays = await org.collection("birthdays").where("createdByUid", "==", uid).get();
    for (const b of bdays.docs) batch.delete(b.ref);
    // Sporcunun yoklama kopyası silinir; veli ise bağlı olduğu kopyalardan çıkarılır
    batch.delete(org.collection("athleteAtt").doc(uid));
    const asParent = await org.collection("athleteAtt").where("parents", "array-contains", uid).get();
    for (const d of asParent.docs) batch.update(d.ref, { parents: FieldValue.arrayRemove(uid) });
  }
  await batch.commit();
  return NextResponse.json({ ok: true });
}
