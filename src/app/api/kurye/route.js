import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminReady } from "@/lib/server/admin";
import { loginEmail, validUsername, cleanLogin, shownLogin } from "@/lib/kinds";
import { SAMPLE_PLACES } from "@/yemek/sample";
import { accountCourier, courierCan, deliverPatch, pickupPatch } from "@/yemek/steps";

export const runtime = "nodejs";

// Velora Yemek kurye hesapları (Seyhun 2026-10-23): kurye kendisi kayıt olur (ad, telefon, kullanıcı adı, şifre),
// girince yalnız kurye ekranını görür. Kurye Firestore'da yalnız okur (kurallar: yemekSiparisler, yemek/ayar);
// teslim alma, teslim etme ve konum buradan yazılır. Kayıt, ana hesap Yönetim › Kuryeler'de açınca açıktır.
// Kurye profili: users/{uid} = { role: "courier", orgId: uid, courierOf: <işletme> } (kendi boş işletmesi; diğer
// sunucu işlerinde ana hesabın verisine erişemez).
const MAX = 60;
const OPEN_REF = (db) => db.collection("yemekKayit").doc("acik"); // { orgId, open } (yalnız sunucu okur)
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const clean = (s, n) => String(s || "").replace(/[^\p{L}\p{N} .'+()-]/gu, "").trim().slice(0, n);
const place = (id) => SAMPLE_PLACES.find((p) => p.id === id) || null;
const okPos = (p) => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

async function who(request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  try {
    const { uid } = await adminAuth().verifyIdToken(token);
    const d = (await adminDb().collection("users").doc(uid).get()).data() || {};
    return { uid, role: d.role || "owner", orgId: d.orgId || uid, courierOf: d.courierOf || "", name: d.name || "" };
  } catch {
    return null;
  }
}

const setRef = (db, org) => db.collection("orgs").doc(org).collection("yemek").doc("ayar");
// Ayardaki kurye listesini değiştir (aynı anda başka değişiklik olursa yeniden dener)
const editCouriers = (db, org, fn) =>
  db.runTransaction(async (tx) => {
    const ref = setRef(db, org);
    const list = (await tx.get(ref)).data()?.couriers || [];
    tx.set(ref, { couriers: fn(list) }, { merge: true });
  });

export async function GET() {
  if (!adminReady()) return NextResponse.json({ open: false });
  const d = (await OPEN_REF(adminDb()).get()).data();
  return NextResponse.json({ open: !!d?.open });
}

export async function POST(request) {
  if (!adminReady()) return bad("Sunucuda Firebase yönetici anahtarı tanımlı değil.", 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const db = adminDb();
  const act = String(body?.action || "");

  if (act === "register") {
    const open = (await OPEN_REF(db).get()).data();
    if (!open?.open || !open.orgId) return bad("Kurye kaydı şu an kapalı.", 403);
    const name = clean(body.name, 30);
    const phone = clean(body.phone, 20);
    const login = cleanLogin(body.login);
    const password = String(body.password || "");
    if (!name) return bad("Adını yaz.");
    if (!validUsername(login)) return bad("Kullanıcı adı en az 3 karakter olmalı (harf, rakam, nokta).");
    if (password.length < 6) return bad("Şifre en az 6 karakter olmalı.");
    const list = (await setRef(db, open.orgId).get()).data()?.couriers || [];
    if (list.filter((c) => c.account).length >= MAX) return bad("Kurye sayısı dolu.", 403);
    let user;
    try {
      user = await adminAuth().createUser({ email: loginEmail(login), password, displayName: name });
    } catch (e) {
      if (e.code === "auth/email-already-exists") return bad("Bu kullanıcı adı alınmış; başka bir tane dene.");
      console.error("[kurye] hesap açılamadı:", e.code);
      return bad("Hesap açılamadı.", 500);
    }
    await db.collection("users").doc(user.uid).set({ name, email: loginEmail(login), role: "courier", orgId: user.uid, courierOf: open.orgId, phone, createdAt: new Date().toISOString() });
    await editCouriers(db, open.orgId, (l) => [...l.filter((c) => c.id !== user.uid), accountCourier(user.uid, name, phone, login)]);
    return NextResponse.json({ ok: true });
  }

  const me = await who(request);
  if (!me) return bad("Oturum gerekli.", 401);

  // Ana hesabın işleri: kaydı aç/kapa, hesaplı kuryeyi sil, kuryeye yeni şifre ver (denemeler için; şifre saklanmaz)
  if (act === "signup" || act === "remove" || act === "password") {
    if (me.role !== "owner" || me.orgId !== me.uid) return bad("Yalnız ana hesap.", 403);
    if (act === "signup") {
      const open = !!body.open;
      await OPEN_REF(db).set({ orgId: me.uid, open, at: new Date().toISOString() });
      await setRef(db, me.uid).set({ signup: open }, { merge: true });
      return NextResponse.json({ ok: true, open });
    }
    if (act === "password") {
      const id = String(body.id || "");
      const password = String(body.password || "");
      const u = id ? (await db.collection("users").doc(id).get()).data() : null;
      if (u?.role !== "courier" || u.courierOf !== me.uid) return bad("Kurye hesabı bulunamadı.", 404);
      if (password.length < 6) return bad("Şifre en az 6 karakter olmalı.");
      await adminAuth().updateUser(id, { password });
      const login = shownLogin(u.email);
      await editCouriers(db, me.uid, (l) => l.map((c) => (c.id === id ? { ...c, login } : c)));
      return NextResponse.json({ ok: true, login });
    }
    const id = String(body.id || "");
    const u = id ? (await db.collection("users").doc(id).get()).data() : null;
    if (u?.role === "courier" && u.courierOf === me.uid) {
      await adminAuth().deleteUser(id).catch((e) => e.code !== "auth/user-not-found" && console.warn("[kurye] silinemedi:", e.code));
      await db.collection("users").doc(id).delete();
    }
    await editCouriers(db, me.uid, (l) => l.filter((c) => c.id !== id));
    return NextResponse.json({ ok: true });
  }

  // Kuryenin işleri
  if (me.role !== "courier" || !me.courierOf) return bad("Kurye hesabı değil.", 403);
  const org = me.courierOf;
  const orders = db.collection("orgs").doc(org).collection("yemekSiparisler");
  const settings = (await setRef(db, org).get()).data() || {};
  const courier = (settings.couriers || []).find((c) => c.id === me.uid);
  if (!courier) return bad("Kurye kaydın silinmiş.", 403);

  if (act === "pickup" || act === "deliver") {
    const ref = orders.doc(String(body.id || "x"));
    const snap = await ref.get();
    if (!snap.exists) return bad("Sipariş bulunamadı.", 404);
    const o = { ...snap.data(), id: snap.id };
    const p = place(o.placeId);
    const can = courierCan(o, p, me.uid);
    if (can !== act) return bad(act === "pickup" ? "Bu sipariş teslim alınamaz." : "Bu sipariş sende değil.", 409);
    await ref.update(act === "pickup" ? pickupPatch(o, p, courier) : deliverPatch(o));
    return NextResponse.json({ ok: true });
  }

  if (act === "pos") {
    if (!okPos(body.pos)) return bad("Konum yok.");
    const pos = { lat: +(+body.pos.lat).toFixed(5), lng: +(+body.pos.lng).toFixed(5) };
    const at = new Date().toISOString();
    const ids = (Array.isArray(body.ids) ? body.ids : []).slice(0, 5).map(String);
    await Promise.all(ids.map(async (id) => {
      const ref = orders.doc(id);
      const d = (await ref.get()).data();
      if (d?.courier?.id === me.uid && d.status === "onTheWay") await ref.update({ "courier.pos": pos, "courier.at": at });
    }));
    if (body.here) await editCouriers(db, org, (l) => l.map((c) => (c.id === me.uid ? { ...c, pos, at } : c)));
    return NextResponse.json({ ok: true });
  }

  return bad("Bilinmeyen istek");
}
