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

// Hesap aç: { memberId?, athleteId?, name, kind, login (e-posta ya da kullanıcı adı), password, auto?, birth?, phone?, children? }
// Kişi kaydını sunucu kurar (telefondaki yazmanın sunucuya ulaşmasını beklemez; eskiden "Kişi bulunamadı" buradan çıkıyordu).
// memberId: var olan kişiye hesap açılır, hesabın kimliği kişinin kimliği olur (işler, doğum günü bağlantısı kalır).
// athleteId (kulüp sporcusu): önce bu sporcuya bağlı kişi, yoksa aynı adlı bağsız sporcu kişisi kullanılır; ikisi de yoksa yeni kişi.
// Sporcunun zaten hesabı varsa yeni hesap açılmaz: { ok, exists, member } döner (ikinci hesap "ege.demir2" olmasın).
// auto: kullanıcı adı alınmışsa sonuna sayı eklenir (ege.demir → ege.demir2).
export async function POST(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await readBody(request);
  if (!body) return bad("Geçersiz istek");
  const name = cleanName(body.name);
  const kind = KINDS.includes(body.kind) ? body.kind : "staff";
  const base = String(body.login ?? body.email ?? "").trim().toLocaleLowerCase("tr-TR");
  const password = String(body.password || "");
  if (!name) return bad("Ad gerekli.");
  if (base.includes("@") ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(base) : !validUsername(base))
    return bad("Geçerli bir e-posta ya da kullanıcı adı yaz (kullanıcı adı: en az 3 karakter; harf, rakam, nokta).");
  if (password.length < 6) return bad("Şifre en az 6 karakter olmalı.");

  const db = adminDb();
  const org = db.collection("orgs").doc(o.uid);
  const members = org.collection("members");
  const all = await members.get();
  const live = all.docs.filter((d) => d.data().status !== "left");
  const hasAcc = (d) => d.data().account !== false;
  if (live.filter(hasAcc).length >= MAX_ACCOUNTS) return bad(`En fazla ${MAX_ACCOUNTS} hesap açılabilir.`);
  const athleteId = String(body.athleteId || "");
  const low = (s) => String(s || "").trim().toLocaleLowerCase("tr-TR");
  let m = body.memberId ? all.docs.find((d) => d.id === String(body.memberId)) : null;
  if (!m && athleteId) {
    m = live.find((d) => d.data().athleteId === athleteId && hasAcc(d)) || live.find((d) => d.data().athleteId === athleteId);
    // Kişiler'den açılmış, kulübe bağlanmamış hesap: aynı ad → bağlanır, ikinci hesap açılmaz
    if (!m) m = live.find((d) => ["athlete", "student"].includes(d.data().kind) && !d.data().athleteId && low(d.data().name) === low(name));
  }
  const exists = (d) => ({ uid: d.id, name: d.data().name, login: d.data().loginName || String(d.data().email || "").replace(/@.*$/, "") });
  if (m && hasAcc(m) && m.data().status !== "left") {
    if (athleteId && m.data().athleteId !== athleteId) await m.ref.set({ athleteId, updatedAt: new Date().toISOString() }, { merge: true });
    if (!athleteId && body.memberId) return bad("Bu kişinin zaten hesabı var.");
    return NextResponse.json({ ok: true, exists: true, member: exists(m) });
  }
  const askedId = /^[A-Za-z0-9]{10,64}$/.test(String(body.memberId || "")) ? String(body.memberId) : "";
  const uid = m ? m.id : askedId || members.doc().id;

  let user;
  let login = base;
  for (let i = 1; i <= 9; i++) {
    login = i === 1 ? base : `${base}${i}`;
    try {
      user = await adminAuth().createUser({ uid, email: loginEmail(login), password, displayName: name });
      break;
    } catch (e) {
      if (e.code === "auth/email-already-exists") {
        if (body.auto && !base.includes("@")) continue;
        return bad(base.includes("@") ? "Bu e-posta ile zaten bir hesap var." : "Bu kullanıcı adı alınmış; başka bir tane dene.");
      }
      // Kişinin eski, kapatılırken silinememiş girişi: aynı kimlikle yeniden kullanılır
      if (e.code === "auth/uid-already-exists") {
        try {
          user = await adminAuth().updateUser(uid, { email: loginEmail(login), password, displayName: name, disabled: false });
          break;
        } catch (e2) {
          if (e2.code === "auth/email-already-exists" && body.auto && !base.includes("@")) continue;
          return bad(e2.code === "auth/email-already-exists" ? "Bu kullanıcı adı alınmış; başka bir tane dene." : "Hesap oluşturulamadı.", e2.code === "auth/email-already-exists" ? 400 : 500);
        }
      }
      if (e.code === "auth/invalid-password") return bad("Şifre en az 6 karakter olmalı.");
      console.error("[staff] oluşturulamadı:", e.code, e.message);
      return bad("Hesap oluşturulamadı.", 500);
    }
  }
  if (!user) return bad("Uygun kullanıcı adı bulunamadı; başka bir ad dene.");
  const now = new Date().toISOString();
  const email = login.includes("@") ? login : "";
  const extra = {
    ...(athleteId ? { athleteId } : {}),
    ...(body.birth ? { birth: String(body.birth).slice(0, 10) } : {}),
    ...(body.phone ? { phone: String(body.phone).slice(0, 20) } : {}),
    ...(Array.isArray(body.children) && body.children.length ? { children: body.children.map(String).slice(0, 20) } : {}),
  };
  const batch = db.batch();
  batch.set(db.collection("users").doc(user.uid), { name, email: loginEmail(login), role: "staff", kind, orgId: o.uid, createdAt: now });
  batch.set(
    members.doc(user.uid),
    { uid: user.uid, name, kind, role: "staff", account: true, loginName: login, status: "active", updatedAt: now, ...extra, ...(email ? { email } : {}), ...(m ? {} : { createdAt: now }) },
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
