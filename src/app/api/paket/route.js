import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { sayOf } from "@/lib/server/paketSay";
import { DURUM, cleanIstek, cleanPaket, ibanGecerli, ibanTemiz, kodOf, limitOf, onayla } from "@/lib/paket";
import { DOGRULA, dogrulanmadi } from "@/lib/server/dogrula";

export const runtime = "nodejs";
export const maxDuration = 26;

// Sporcu paketleri ve havale (lib/paket.js; Seyhun 2026-11-27). users/{uid}.paket ve .paketIstek yalnız buradan yazılır.
// GET → { paket, istek, count, limit (null: sınırsız), kod, odeme: { iban, alici } }
// GET ?liste=1 (yalnız Velora ana hesabı) → { kisiler: [{ uid, name, email, clubId, createdAt, count, paket, istek }], odeme }
// POST { size, period } → paket isteği (durum "bekliyor"); POST { odedim: true } → "odendi" (ana hesaba bildirim); POST { iptal: true }
// PATCH (yalnız ana hesap): { uid, onay: true } → istek onaylanır, paket açılır; { uid, red: true } → istek silinir;
//   { uid, paket: { size, period, until } } → paket elle verilir (size 0 sınırsız, 3 ücretsize döner); { odeme: { iban, alici } }
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const UID = /^[\w-]{1,128}$/;
const isAdmin = (au) => String(au?.email || "").toLowerCase() === VELORA_ADMIN;

async function gate(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  const { adminReady, adminDb, profileOf } = await import("@/lib/server/admin");
  if (!adminReady()) return { res: bad("Sunucu yönetici hesabı yok.", 503) };
  return { au, db: adminDb(), profileOf, admin: isAdmin(au) };
}
const odemeOf = async (db) => {
  const s = await db.collection("veloraAyar").doc("odeme").get();
  const d = s.exists ? s.data() : {};
  return { iban: d.iban || "", alici: d.alici || "" };
};
const istekOf = (d) => (d?.paketIstek && cleanIstek(d.paketIstek) ? { ...cleanIstek(d.paketIstek), durum: d.paketIstek.durum === "odendi" ? "odendi" : "bekliyor", at: d.paketIstek.at || "", odendiAt: d.paketIstek.odendiAt || "" } : null);

export async function GET(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  const { au, db } = g;
  const odeme = await odemeOf(db);
  if (new URL(request.url).searchParams.get("liste")) {
    if (!g.admin) return bad("Yalnız Velora ana hesabı.", 403);
    const snap = await db.collection("users").get();
    const owners = snap.docs.filter((d) => {
      const x = d.data();
      return (x.role || "owner") === "owner" && (x.orgId || d.id) === d.id;
    });
    const kisiler = await Promise.all(
      owners.map(async (d) => {
        const x = d.data();
        return {
          uid: d.id,
          name: x.name || "",
          email: x.email || "",
          clubId: x.clubId || "",
          createdAt: x.createdAt || "",
          count: await sayOf(db, d.id),
          paket: cleanPaket(x.paket),
          istek: istekOf(x),
          kod: kodOf(d.id),
          admin: String(x.email || "").toLowerCase() === VELORA_ADMIN,
        };
      }),
    );
    return NextResponse.json({ kisiler, odeme });
  }
  const me = await g.profileOf(au.uid);
  if (me.role !== "owner") return bad("Paket yalnız ana hesapta.", 403);
  const d = (await db.collection("users").doc(au.uid).get()).data() || {};
  const limit = limitOf(d.paket, { admin: g.admin });
  return NextResponse.json({ paket: cleanPaket(d.paket), istek: istekOf(d), count: await sayOf(db, au.uid), limit: limit === Infinity ? null : limit, kod: kodOf(au.uid), odeme });
}

export async function POST(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  const { au, db } = g;
  const me = await g.profileOf(au.uid);
  if (me.role !== "owner") return bad("Paket yalnız ana hesapta.", 403);
  const body = await request.json().catch(() => ({}));
  const ref = db.collection("users").doc(au.uid);
  const { FieldValue } = await import("firebase-admin/firestore");
  if (body.iptal) {
    await ref.update({ paketIstek: FieldValue.delete() });
    return NextResponse.json({ ok: true, istek: null });
  }
  const d = (await ref.get()).data() || {};
  if (dogrulanmadi(d, au)) return bad(DOGRULA, 403, { dogrula: true });
  if (body.odedim) {
    const ist = istekOf(d);
    if (!ist) return bad("Önce paket seç.");
    const now = new Date().toISOString();
    await ref.update({ "paketIstek.durum": "odendi", "paketIstek.odendiAt": now });
    // Ana hesaba bildirim (Admin › Paketler'de onay bekler)
    try {
      const { adminAuth } = await import("@/lib/server/admin");
      const adm = await adminAuth().getUserByEmail(VELORA_ADMIN);
      const { sendTo, pushReady } = await import("@/lib/server/pushSend");
      if (pushReady()) await sendTo(adm.uid, { title: "Paket ödemesi bildirildi", body: `${d.name || me.name || "Bir kullanıcı"} · ${ist.size} sporcu · ${kodOf(au.uid)}`, url: "/settings/admin/paketler", tag: "paket" });
    } catch {}
    return NextResponse.json({ ok: true, istek: { ...ist, durum: "odendi", odendiAt: now } });
  }
  const c = cleanIstek(body);
  if (!c) return bad("Geçersiz paket.");
  const istek = { ...c, durum: "bekliyor", at: new Date().toISOString() };
  await ref.update({ paketIstek: istek });
  return NextResponse.json({ ok: true, istek, kod: kodOf(au.uid), odeme: await odemeOf(db), durum: DURUM.bekliyor });
}

export async function PATCH(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  if (!g.admin) return bad("Yalnız Velora ana hesabı.", 403);
  const { db, au } = g;
  const body = await request.json().catch(() => ({}));
  const { FieldValue } = await import("firebase-admin/firestore");
  if (body.odeme) {
    const iban = ibanTemiz(body.odeme.iban);
    if (iban && !ibanGecerli(iban)) return bad("IBAN TR ile başlayan 26 karakter olmalı.");
    const alici = String(body.odeme.alici || "").replace(/\s+/g, " ").trim().slice(0, 80);
    await db.collection("veloraAyar").doc("odeme").set({ iban, alici, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, odeme: { iban, alici } });
  }
  if (!UID.test(body.uid || "")) return bad("Kişi yok.");
  const ref = db.collection("users").doc(body.uid);
  const s = await ref.get();
  if (!s.exists) return bad("Kişi bulunamadı.", 404);
  const d = s.data();
  const now = new Date().toISOString();
  if (body.red) {
    await ref.update({ paketIstek: FieldValue.delete() });
    return NextResponse.json({ ok: true });
  }
  let paket = null;
  if (body.onay) {
    paket = onayla(d.paketIstek, d.paket);
    if (!paket) return bad("Onaylanacak istek yok.");
  } else if (body.paket) {
    paket = cleanPaket(body.paket);
    if (!paket) return bad("Geçersiz paket.");
  } else return bad("Ne yapılacağı yok.");
  const kayit = { ...paket, by: au.uid, at: now };
  await ref.update({ paket: kayit, ...(body.onay ? { paketIstek: FieldValue.delete() } : {}) });
  // Ödeme kaydı (yalnız sunucu okur/yazar): kim, hangi paket, ne zaman onaylandı
  if (body.onay)
    await db.collection("paketOdemeler").add({ uid: body.uid, name: d.name || "", kod: kodOf(body.uid), size: paket.size, period: paket.period, until: paket.until, odendiAt: d.paketIstek?.odendiAt || "", onayAt: now });
  try {
    const { sendTo, pushReady } = await import("@/lib/server/pushSend");
    if (body.onay && pushReady()) await sendTo(body.uid, { title: "Paketin açıldı", body: `${paket.size} sporcu · ${paket.until} tarihine kadar`, url: "/settings/paket", tag: "paket" });
  } catch {}
  return NextResponse.json({ ok: true, paket: kayit });
}
