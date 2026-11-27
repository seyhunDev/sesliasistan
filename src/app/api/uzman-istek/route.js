import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { DERS_MAX, DERS_TUR, acikMi, cleanIstek, cleanPaylas } from "@/lib/fitness/uzmanIstek";

export const runtime = "nodejs";
export const maxDuration = 26;

// "Uzmanla çalış" isteği (Seyhun 2026-11-27; biçim lib/fitness/uzmanIstek.js, Admin › Uzman antrenörler ile ortak).
// Yalnız sunucu yazar, kurallar değişmeden çalışır. Sporcu kendi adına; ana hesap Program ekle'den bir sporcusu adına (for).
// POST { orgId, for?, sure, hedef, spor?, paylas: { acik, turler }, ders?: { name, type, data (base64) } } → { istek }
// GET ?orgId=&for= → kişinin istekleri; GET ?orgId=&ders=<id> → ders programı dosyası (sporcu, açan ya da ana hesap)
// PATCH { orgId, id, paylas?, iptal? } → paylaşımı aç/kapat ya da isteği iptal et
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const ID = /^[\w-]{1,80}$/;

async function gate(request, orgId) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (!ID.test(orgId || "")) return { res: bad("Kulüp yok.") };
  const { adminReady, adminDb, profileOf } = await import("@/lib/server/admin");
  if (!adminReady()) return { res: bad("Sunucu yönetici hesabı yok.", 503) };
  const me = await profileOf(au.uid);
  if (me.orgId !== orgId) return { res: bad("Bu kulübün hesabı değilsin.", 403) };
  const owner = me.role === "owner" && au.uid === orgId;
  return { au, me, owner, db: adminDb(), col: adminDb().collection("orgs").doc(orgId).collection("uzmanIstekleri") };
}

// İsteğin kimin için olduğu: ana hesap başka birini seçebilir (aynı kulüpten), diğerleri yalnız kendisi
async function kimOf(g, forUid) {
  if (!forUid || forUid === g.au.uid) return { uid: g.au.uid, ad: g.me.name || "" };
  if (!g.owner || !ID.test(forUid)) return null;
  const { profileOf } = await import("@/lib/server/admin");
  const p = await profileOf(forUid);
  return p.orgId === g.me.orgId ? { uid: forUid, ad: p.name || "" } : null;
}
const goster = (id, d) => ({
  id,
  sporcuUid: d.sporcuUid,
  sporcuAd: d.sporcuAd || "",
  brans: d.brans,
  uzmanId: d.uzmanId || null,
  sure: d.sure,
  hedef: d.hedef || "",
  yas: d.yas || 0,
  sehir: d.sehir || "",
  ders: d.ders ? { ad: d.ders.ad, type: d.ders.type, size: d.ders.size } : null,
  paylas: d.paylas || { acik: false, turler: [] },
  durum: d.durum || "bekliyor",
  at: d.at?.toMillis?.() || 0,
});
const yetkili = (g, d) => g.owner || d.sporcuUid === g.au.uid || d.by === g.au.uid;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const g = await gate(request, body?.orgId);
  if (g.res) return g.res;
  const kim = await kimOf(g, body?.for);
  if (!kim) return bad("Bu kişi için istek açamazsın.", 403);
  const v = cleanIstek(body);
  // Aynı kişinin açık isteği varsa ikincisi açılmaz (önce iptal)
  const eski = await g.col.where("sporcuUid", "==", kim.uid).limit(20).get();
  if (eski.docs.some((d) => d.data().brans === v.brans && acikMi(d.data().durum))) return bad("Açık bir isteğin zaten var.", 409);
  const ref = g.col.doc();
  let ders = null;
  const f = body?.ders;
  if (f?.data) {
    const type = String(f.type || "");
    if (!DERS_TUR.test(type)) return bad("Ders programı PDF ya da fotoğraf olmalı.");
    const buf = Buffer.from(String(f.data), "base64");
    if (!buf.length || buf.length > DERS_MAX) return bad("Dosya çok büyük (en çok 4 MB).", 413);
    const ad = String(f.name || "ders-programi").replace(/[^\wçğıöşüÇĞİÖŞÜ. -]/g, "").trim().slice(0, 80) || "ders-programi";
    const path = `orgs/${body.orgId}/uzmanDers/${ref.id}/${ad}`;
    const { getStorage } = await import("firebase-admin/storage");
    await getStorage()
      .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
      .file(path)
      .save(buf, { contentType: type, metadata: { cacheControl: "private, max-age=3600" } });
    ders = { path, ad, type, size: buf.length };
  }
  const { FieldValue } = await import("firebase-admin/firestore");
  const d = { sporcuUid: kim.uid, sporcuAd: kim.ad, by: g.au.uid, ...v, uzmanId: null, ders, durum: "bekliyor", at: FieldValue.serverTimestamp(), guncel: FieldValue.serverTimestamp() };
  await ref.set(d);
  return NextResponse.json({ istek: goster(ref.id, { ...d, at: null }) });
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const g = await gate(request, q.get("orgId"));
  if (g.res) return g.res;
  const dersId = q.get("ders");
  if (dersId) {
    if (!ID.test(dersId)) return bad("Geçersiz istek");
    const s = await g.col.doc(dersId).get();
    const d = s.data();
    if (!d?.ders?.path || !yetkili(g, d)) return bad("Dosya bulunamadı.", 404);
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const [buf] = await getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).file(d.ders.path).download();
      return new NextResponse(buf, { headers: { "content-type": d.ders.type || "application/octet-stream", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(d.ders.ad || "ders")}`, "cache-control": "private, max-age=600" } });
    } catch (err) {
      console.warn("[uzman-istek] dosya okunamadı", err?.message?.slice(0, 120));
      return bad("Dosya bulunamadı.", 404);
    }
  }
  const kim = await kimOf(g, q.get("for"));
  if (!kim) return bad("Bu kişinin isteklerini göremezsin.", 403);
  const s = await g.col.where("sporcuUid", "==", kim.uid).limit(20).get();
  const list = s.docs.map((x) => goster(x.id, x.data())).sort((a, b) => b.at - a.at);
  return NextResponse.json({ list });
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const g = await gate(request, body?.orgId);
  if (g.res) return g.res;
  if (!ID.test(body?.id || "")) return bad("Geçersiz istek");
  const ref = g.col.doc(body.id);
  const d = (await ref.get()).data();
  if (!d || !yetkili(g, d)) return bad("İstek bulunamadı.", 404);
  const { FieldValue } = await import("firebase-admin/firestore");
  const up = { guncel: FieldValue.serverTimestamp() };
  if (body.paylas) up.paylas = cleanPaylas(body.paylas);
  if (body.iptal === true && acikMi(d.durum)) up.durum = "iptal";
  await ref.update(up);
  return NextResponse.json({ istek: goster(body.id, { ...d, ...up, at: d.at }) });
}
