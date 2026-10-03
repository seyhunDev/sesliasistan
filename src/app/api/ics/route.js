import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { icsOf } from "@/lib/ics";

export const runtime = "nodejs";

// iPhone/Mac takvim aboneliği. Takvim uygulaması giriş yapamadığı için gizli bir bağlantı kullanılır:
// icsTokens/{token} = { uid, orgId, staff } (yalnız sunucu yazar, kurallar istemciye kapalı), users/{uid}.icsToken.
// GET ?t=TOKEN → planlar (.ics); son 30 gün … 180 gün sonrası, çalışan yalnız kendisinin olduğu planları görür.
// Takvim uygulamaları sık sorar; CDN 6 saat, tarayıcı 1 saat saklar (Firestore okuması az kalsın).
// POST { action: "get" | "new" | "off" } (giriş gerekir) → { token } (get yoksa oluşturmaz, new yenisini verir, eskisi çalışmaz olur).
const DAY = 864e5;
const isoIn = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(ms));
const ok = (t) => /^[A-Za-z0-9_-]{20,40}$/.test(t || "");

export async function GET(request) {
  const t = new URL(request.url).searchParams.get("t");
  if (!ok(t)) return new NextResponse("Bağlantı geçersiz", { status: 404 });
  try {
    const { adminDb } = await import("@/lib/server/admin");
    const db = adminDb();
    const tok = await db.collection("icsTokens").doc(t).get();
    if (!tok.exists) return new NextResponse("Bağlantı geçersiz", { status: 404 });
    const { uid, orgId, staff, name } = tok.data();
    // Kişi kulüpten çıkarıldıysa ya da bağlantı yenilendiyse eski bağlantı çalışmaz
    const u = (await db.collection("users").doc(uid).get()).data() || {};
    if (u.icsToken !== t || (u.orgId || uid) !== orgId) return new NextResponse("Bağlantı geçersiz", { status: 404 });
    const now = Date.now();
    const snap = await db.collection("orgs").doc(orgId).collection("plans").where("date", ">=", isoIn(now - 30 * DAY)).where("date", "<=", isoIn(now + 180 * DAY)).get();
    const plans = snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((p) => !staff || (p.people || []).includes(uid));
    return new NextResponse(icsOf(plans, { name: name || "Sesli Asistan" }), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'inline; filename="sesliasistan.ics"',
        "cache-control": "public, max-age=3600",
        "netlify-cdn-cache-control": "public, s-maxage=21600",
      },
    });
  } catch (e) {
    console.warn("[ics]", e?.message);
    return new NextResponse("Takvim şu an hazırlanamadı", { status: 503 });
  }
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const { action } = await request.json().catch(() => ({}));
  try {
    const { adminDb, profileOf } = await import("@/lib/server/admin");
    const db = adminDb();
    const user = db.collection("users").doc(au.uid);
    const old = (await user.get()).data()?.icsToken || "";
    if (action === "get") return NextResponse.json({ token: old });
    if (old) await db.collection("icsTokens").doc(old).delete();
    if (action === "off") {
      await user.set({ icsToken: "" }, { merge: true });
      return NextResponse.json({ token: "" });
    }
    const p = await profileOf(au.uid);
    const token = randomBytes(18).toString("base64url");
    await db.collection("icsTokens").doc(token).set({ uid: au.uid, orgId: p.orgId, staff: p.role === "staff", name: p.role === "staff" ? "Sesli Asistan" : "Kulüp planları", at: new Date().toISOString() });
    await user.set({ icsToken: token }, { merge: true });
    return NextResponse.json({ token });
  } catch (e) {
    console.warn("[ics]", e?.message);
    return NextResponse.json({ error: "Sunucu takvim bağlantısını oluşturamadı" }, { status: 503 });
  }
}
