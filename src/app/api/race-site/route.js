import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";
import { canSeeAthletes } from "@/features/athletes/access";
import { fileUrl } from "@/lib/siteBoard";
import { pageCache, siteList, syncRace } from "@/lib/server/raceSiteSync";

export const runtime = "nodejs";

// Yarış sitesi (TYF Yelken Ligi, lib/siteBoard.js; Seyhun 2026-11-03), yalnız ana hesap:
// GET ?season=2026-2027        → sezonlar, ayaklar, sınıflar ve belgeleri (Yarışlar › Siteden ekranı)
// GET ?file=292893             → sitedeki belgenin kendisi (yarış ilanı telefonda okunur, yarış ondan açılır)
// POST { raceId, site }         → yarışı izlemeye al (raceSite/{org}_{yarış}) ve sitedeki belgeleri hemen al
// POST { raceId, off: true }    → izlemeyi bırak (alınmış belgeler yarışta kalır)
// POST { raceId, now: true }    → hemen bak (yarış sayfasındaki "Şimdi bak")
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function who(request) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (au.staff || !canSeeAthletes(au.email)) return { res: bad("Bu ekran yalnız ana hesapta.", 403) };
  return { au };
}

export async function GET(request) {
  const { au, res } = await who(request);
  if (!au) return res;
  const q = new URL(request.url).searchParams;
  const fid = q.get("file");
  if (fid) {
    if (!/^\d{1,9}$/.test(fid)) return bad("Belge yok.");
    const r = await fetch(fileUrl(fid), { headers: { "user-agent": "Mozilla/5.0 (Velora)" }, signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (!r?.ok) return bad("Belge siteden alınamadı.", 502);
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 25 * 1024 * 1024) return bad("Belge çok büyük.", 413);
    return new NextResponse(buf, { headers: { "content-type": r.headers.get("content-type") || "application/pdf", "cache-control": "private, max-age=600" } });
  }
  try {
    return NextResponse.json(await siteList(pageCache(), q.get("season") || ""));
  } catch (e) {
    console.warn("[race-site] liste", e.message);
    return bad("Yarış sitesine ulaşılamadı, biraz sonra tekrar dene.", 502);
  }
}

const S = (v, n) => String(v ?? "").trim().slice(0, n);

export async function POST(request) {
  const { au, res } = await who(request);
  if (!au) return res;
  if (!adminReady() || !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) return bad("Sunucu ayarı eksik.", 500);
  const body = await request.json().catch(() => ({}));
  const raceId = S(body.raceId, 40);
  if (!/^[A-Za-z0-9]{6,40}$/.test(raceId)) return bad("Yarış yok.");
  const orgId = au.uid;
  const db = adminDb();
  const race = await db.collection("orgs").doc(orgId).collection("races").doc(raceId).get();
  if (!race.exists) return bad("Yarış bulunamadı.", 404);
  const ref = db.collection("raceSite").doc(`${orgId}_${raceId}`);
  if (body.off) {
    await ref.set({ on: false }, { merge: true });
    return NextResponse.json({ ok: true });
  }
  const r = race.data();
  let entry;
  if (body.site) {
    const s = body.site;
    if (!/^\d{1,9}$/.test(String(s.act || ""))) return bad("Sınıf yok.");
    const old = (await ref.get()).data() || {};
    entry = {
      on: true, orgId, raceId,
      act: String(s.act), cls: S(s.cls, 40), season: S(s.season, 9), n: Number(s.n) || 1, legNo: /^\d{1,4}$/.test(String(s.legNo || "")) ? String(s.legNo) : "",
      name: S(r.name || s.name, 120), startDate: S(r.startDate, 10), endDate: S(r.endDate, 10),
      seen: old.act === String(s.act) ? old.seen || [] : [],
      at: new Date().toISOString(),
    };
    await ref.set(entry);
  } else {
    const snap = await ref.get();
    if (!snap.exists || !snap.data().on) return bad("Bu yarış siteden izlenmiyor.");
    entry = { ...snap.data(), name: S(r.name, 120) || snap.data().name, startDate: S(r.startDate, 10), endDate: S(r.endDate, 10) };
    await ref.set({ name: entry.name, startDate: entry.startDate, endDate: entry.endDate }, { merge: true });
  }
  try {
    const got = await syncRace({ db, bucket: getStorage(db.app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), ref, entry, get: pageCache(), limit: 12 });
    return NextResponse.json({ ok: true, got: got.length });
  } catch (e) {
    console.warn("[race-site] alma", e.message);
    return NextResponse.json({ ok: true, got: 0, error: "Belgeler şimdi alınamadı; birazdan kendiliğinden alınır." });
  }
}
