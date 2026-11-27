import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { athleteDigest, compareCopy, decodeValue, docDigest, encodeValue } from "@/lib/athleteCopy";

export const runtime = "nodejs";

// Sporcuları kulüp projesinden Velora'ya taşıma (Ayarlar › Sporcuları Velora'ya taşı, yalnız ana hesap; Seyhun 2026-11-27).
// Telefon kulüpten okur ve parça parça buraya yollar; burası Velora'ya aynı kimliklerle yazar. Kulüpteki veri silinmez.
// POST { op: "write", athletes: [{ id, data, history: [{ id, data }] }], classes?, coaches? } -> { done }
// POST { op: "check", src: { athletes, classes, coaches } (özetler), names } -> karşılaştırma; sonuç orgs/{uid}/sporcuTasima/son'a yazılır
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const toTs = (ms) => Timestamp.fromMillis(ms);
const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function owner(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (!adminReady()) return { res: bad("Sunucuda Firebase yönetici anahtarı tanımlı değil.", 503) };
  const me = await profileOf(au.uid);
  if (me.role !== "owner") return { res: bad("Bu işlemi yalnızca ana hesap yapabilir.", 403) };
  return { uid: au.uid };
}

// En çok 400 yazmalık partiler
async function commitAll(db, ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = db.batch();
    for (const op of ops.slice(i, i + 400)) op.del ? b.delete(op.ref) : b.set(op.ref, op.data);
    await b.commit();
  }
}

async function write(org, body) {
  const db = adminDb();
  const col = org.collection("athletes");
  const ops = [];
  const list = Array.isArray(body.athletes) ? body.athletes.slice(0, 50) : [];
  for (const a of list) {
    if (!ID.test(String(a?.id || "")) || !a.data || typeof a.data !== "object") return bad("Geçersiz sporcu kaydı.");
    const ref = col.doc(a.id);
    ops.push({ ref, data: decodeValue(a.data, toTs) });
    const keep = new Set();
    for (const h of Array.isArray(a.history) ? a.history : []) {
      if (!ID.test(String(h?.id || ""))) continue;
      keep.add(h.id);
      ops.push({ ref: ref.collection("history").doc(h.id), data: decodeValue(h.data || {}, toTs) });
    }
    // Önceki bir denemeden kalan, kulüpte artık olmayan geçmiş kayıtları silinir (kopya birebir olsun)
    const old = await ref.collection("history").get();
    for (const d of old.docs) if (!keep.has(d.id)) ops.push({ ref: d.ref, del: true });
  }
  for (const [key, name] of [["classes", "sailingClasses"], ["coaches", "coaches"]]) {
    if (!Array.isArray(body[key])) continue;
    const seen = new Set();
    for (const c of body[key]) {
      if (!ID.test(String(c?.id || ""))) continue;
      seen.add(c.id);
      ops.push({ ref: org.collection(name).doc(c.id), data: decodeValue(c.data || {}, toTs) });
    }
    const old = await org.collection(name).get();
    for (const d of old.docs) if (!seen.has(d.id)) ops.push({ ref: d.ref, del: true });
  }
  await commitAll(db, ops);
  return NextResponse.json({ done: list.length });
}

// Velora'daki kopyanın özetleri (telefondaki kulüp özetleriyle aynı yöntem)
async function digests(org) {
  const snap = await org.collection("athletes").get();
  const athletes = {};
  await Promise.all(
    snap.docs.map(async (d) => {
      const h = await d.ref.collection("history").get();
      athletes[d.id] = athleteDigest(encodeValue(d.data()), h.docs.map((x) => ({ id: x.id, data: encodeValue(x.data()) })));
    }),
  );
  const map = async (name) => Object.fromEntries((await org.collection(name).get()).docs.map((d) => [d.id, docDigest(encodeValue(d.data()))]));
  return { athletes, classes: await map("sailingClasses"), coaches: await map("coaches") };
}

async function check(org, body) {
  const dst = await digests(org);
  const names = body.names && typeof body.names === "object" ? body.names : {};
  const r = compareCopy(body.src || {}, dst, names);
  // İlk "Hepsi aynı"da active: true olur ve bir daha kalkmaz: uygulama o andan sonra sporcuları yalnız Velora'dan okur ve yazar
  // (features/athletes/veloraMem.js onVelora). Sonra kulüpteki eski veriyle yeniden kopyalama reddedilir (POST başı).
  const counts = { athletes: r.counts.athletes[1], classes: r.counts.classes[1], coaches: r.counts.coaches[1] };
  const now = new Date().toISOString();
  await org.collection("sporcuTasima").doc("son").set({ at: now, ok: r.ok, counts, ...(r.ok ? { active: true, activeAt: now } : {}) }, { merge: true });
  return NextResponse.json(r);
}

export async function POST(request) {
  const o = await owner(request);
  if (o.res) return o.res;
  const body = await request.json().catch(() => ({}));
  const org = adminDb().collection("orgs").doc(o.uid);
  try {
    const st = (await org.collection("sporcuTasima").doc("son").get()).data() || {};
    if (st.active) return bad("Sporcular zaten Velora'da. Kulüpteki eski veriyle yeniden kopyalanmaz.", 409);
    if (body.op === "write") return await write(org, body);
    if (body.op === "check") return await check(org, body);
    return bad("Bilinmeyen işlem.");
  } catch (e) {
    console.error("[sporcu-tasi]", e?.message || e);
    return bad("Velora'ya yazılamadı. Tekrar dene.", 500);
  }
}
