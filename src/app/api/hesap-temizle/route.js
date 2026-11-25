import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminAuth, adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { KIND_LABEL, USER_DOMAIN, shownLogin } from "@/lib/kinds";

export const runtime = "nodejs";

// Ayarlar › Hesap › "Hesapları temizle" (Seyhun 2026-11-25): ana hesap dışındaki tüm Velora giriş hesapları silinir.
// GET: silinecekler listesi (hiçbir şey silinmez). POST { uids }: listedekiler silinir (liste sunucuda yeniden hesaplanır).
// Silinmeyenler: ana hesap (çağıran), başka ana hesaplar, Yemek'in kurye ve restoran hesapları.
// Kişiler kayıtları kalır, yalnız hesapsız olur; kulüpteki sporcu kartları, yoklama, aidat değişmez.
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function owner(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (!adminReady()) return { res: bad("Sunucuda Firebase yönetici anahtarı tanımlı değil.", 503) };
  const me = await profileOf(au.uid);
  if (me.role !== "owner") return { res: bad("Bu işlemi yalnızca ana hesap yapabilir.", 403) };
  return { uid: au.uid };
}

// Ana hesaba bağlı giriş hesapları: profili "staff" ve bu ana hesabın, ya da profili hiç olmayan kullanıcı adı hesabı
// (kişi kaydı yarım kalmış eski denemeler). Dönüş: [{ uid, name, login, kind, label }]
async function targets(ownerUid) {
  const db = adminDb();
  const users = [];
  let page;
  do {
    page = await adminAuth().listUsers(1000, page?.pageToken);
    users.push(...page.users);
  } while (page.pageToken);
  const members = await db.collection("orgs").doc(ownerUid).collection("members").get();
  const mem = new Map(members.docs.map((d) => [d.id, d.data()]));
  const out = [];
  for (const u of users) {
    if (u.uid === ownerUid || !u.email) continue;
    const prof = await db.collection("users").doc(u.uid).get();
    const p = prof.exists ? prof.data() : null;
    const ours = p ? p.role === "staff" && p.orgId === ownerUid : u.email.endsWith(`@${USER_DOMAIN}`);
    if (!ours) continue;
    const m = mem.get(u.uid);
    const kind = m?.kind || p?.kind || "";
    out.push({
      uid: u.uid,
      name: m?.name || p?.name || u.displayName || shownLogin(u.email),
      login: shownLogin(u.email),
      kind,
      label: !p && !m ? "Kişi kaydı yok" : KIND_LABEL[kind] || "Kişi",
    });
  }
  // Hesabı var görünen ama girişi olmayan kişi kayıtları: yalnız "hesapsız" yapılır
  const live = new Set(users.map((u) => u.uid));
  const stale = members.docs.filter((d) => d.id !== ownerUid && d.data().account !== false && !live.has(d.id)).map((d) => d.id);
  out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { list: out, stale };
}

export async function GET(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const { list, stale } = await targets(o.uid);
  return NextResponse.json({ list, stale: stale.length });
}

export async function POST(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await request.json().catch(() => null);
  const want = new Set(Array.isArray(body?.uids) ? body.uids.map(String) : []);
  const { list, stale } = await targets(o.uid);
  const db = adminDb();
  const org = db.collection("orgs").doc(o.uid);
  let done = 0;
  const failed = [];
  for (const t of list) {
    if (!want.has(t.uid) || t.uid === o.uid) continue;
    try {
      await adminAuth().deleteUser(t.uid).catch((e) => {
        if (e.code !== "auth/user-not-found") throw e;
      });
      const b = db.batch();
      b.delete(db.collection("users").doc(t.uid));
      b.set(org.collection("directory").doc(t.uid), { left: true }, { merge: true });
      const m = await org.collection("members").doc(t.uid).get();
      if (m.exists) b.set(m.ref, { account: false, loginName: "" }, { merge: true });
      await b.commit();
      done++;
    } catch (e) {
      console.warn("[hesap-temizle] silinemedi:", t.uid, e.code || e.message);
      failed.push(t.name);
    }
  }
  if (stale.length) {
    const b = db.batch();
    for (const id of stale) b.set(org.collection("members").doc(id), { account: false }, { merge: true });
    await b.commit();
  }
  return NextResponse.json({ ok: true, done, failed, fixed: stale.length });
}
