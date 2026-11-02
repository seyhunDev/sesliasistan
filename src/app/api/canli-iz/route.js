import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { cleanLive, pickTimer, rollPlan } from "@/lib/raceLive";
import { cleanStream, currentStart } from "@/lib/raceRounds";
import { cleanVisit, geoOf, lastDays, liveCount, mergeSums, summarize, trDay, viewOf } from "@/lib/visitStats";

export const runtime = "nodejs";

// Canlı yayın ziyaretleri (Seyhun 2026-11-02): herkese açık /canli sayfaları isimsiz haber verir, ana hesap Ayarlar › Yayın'da görür.
// Kayıt Firestore'a DEĞİL Netlify Blobs'a ("canli-iz" deposu) yazılır: /canli zaten günde ~45 bin okuma yapıyor (sınır 50 bin).
// Her oturum kendi anahtarında durur (z/<gün>/<yarış|_>/<oturum>), aynı anda yazanlar birbirini ezmez. Geçmiş günler bir kez
// özetlenir (o/<gün> = { yarış: özet }) ve ham kayıtları silinir. IP saklanmaz; şehir Netlify'ın konum başlığından.
// POST { s, v, r, d, ret, ref, utm, w, dur, ev, end } (girişsiz; sendBeacon) → 204
// GET ?days=1|7|30&race=<id> (yalnız ana hesap) → { total, races: { id: { people, n, live } }, race?, list: [...], today }

const S = (v, n) => String(v ?? "").slice(0, n);
const ID = /^[\w-]{1,60}$/;
const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("süre")), ms))]);

async function store() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name: "canli-iz" });
  } catch {
    return null;
  }
}

// Kötüye kullanıma karşı: sunucu örneği başına adres başı saatte en çok 120 haber
const hits = new Map();
function tooMany(ip) {
  if (!ip) return false;
  const now = Date.now();
  const h = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  h.push(now);
  hits.set(ip, h);
  if (hits.size > 2000) hits.delete(hits.keys().next().value);
  return h.length > 120;
}

const keyOf = (x) => `z/${x.day}/${x.race || "_"}/${x.sid}`;

export async function POST(request) {
  let b;
  try {
    b = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const ip = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "";
  if (tooMany(ip.trim())) return new NextResponse(null, { status: 429 });
  const s = await store();
  if (!s) return new NextResponse(null, { status: 204 });
  const first = cleanVisit(b, { geo: geoOf(request.headers.get("x-nf-geo")), ua: request.headers.get("user-agent") || "" });
  if (!first) return new NextResponse(null, { status: 400 });
  try {
    // ilk haberde önceki kayıt yok; sonrakilerde başlangıç, ilk geliş yeri ve işler korunur
    const was = b.n ? await within(s.get(keyOf(first), { type: "json" }), 2500).catch(() => null) : null;
    const x = was ? cleanVisit(b, { geo: geoOf(request.headers.get("x-nf-geo")), ua: request.headers.get("user-agent") || "", was }) : first;
    await within(s.setJSON(keyOf(x), x), 3000);
  } catch (e) {
    console.warn("[canli-iz]", e?.message?.slice(0, 120));
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

// Bir günün ham oturumları (paralel okuma, en çok 3000)
async function rawDay(s, day) {
  const { blobs } = await s.list({ prefix: `z/${day}/` });
  const keys = blobs.map((b) => b.key).slice(0, 3000);
  const out = [];
  for (let i = 0; i < keys.length; i += 40) {
    const part = await Promise.all(keys.slice(i, i + 40).map((k) => s.get(k, { type: "json" }).catch(() => null)));
    out.push(...part.filter(Boolean));
  }
  return { visits: out, keys };
}

const byRace = (visits) => {
  const g = {};
  for (const x of visits) (g[x.race || "_"] ||= []).push(x);
  return Object.fromEntries(Object.entries(g).map(([r, list]) => [r, summarize(list)]));
};

// Günün yarış yarış özeti: bugün ve dün hep hamdan (hâlâ güncelleniyor), daha eskisi kayıtlı özetten
const memo = new Map(); // gün → { t, sums, live }
async function dayData(s, day, today) {
  const hit = memo.get(day);
  const fresh = day >= trDay(Date.now() - 864e5);
  if (hit && (!fresh || Date.now() - hit.t < 20e3)) return hit;
  if (!fresh) {
    const saved = await s.get(`o/${day}`, { type: "json" }).catch(() => null);
    if (saved) {
      const v = { t: Date.now(), sums: saved, live: {} };
      memo.set(day, v);
      return v;
    }
  }
  const { visits, keys } = await rawDay(s, day);
  const sums = byRace(visits);
  const v = { t: Date.now(), sums, live: day === today || fresh ? liveCount(visits) : {} };
  memo.set(day, v);
  if (memo.size > 60) memo.delete(memo.keys().next().value);
  if (!fresh) {
    // özet kaydedilir, ham kayıt silinir (depo küçük kalsın)
    await s.setJSON(`o/${day}`, sums).catch(() => {});
    for (let i = 0; i < keys.length; i += 40) await Promise.all(keys.slice(i, i + 40).map((k) => s.delete(k).catch(() => {})));
  }
  return v;
}

// Ana hesabın yarışları ve yayın durumu: canliEkran işareti (yayına açık), süren/yaklaşan yarışta raceLive (canlı, YouTube, gün durumu)
async function raceList(org, today) {
  const db = adminDb();
  const base = db.collection("orgs").doc(org);
  const [rs, ptr] = await Promise.all([base.collection("races").orderBy("startDate", "desc").limit(40).get(), db.collection("canliEkran").where("org", "==", org).get()]);
  const pub = new Set(ptr.docs.map((d) => d.id));
  const list = rs.docs.map((d) => {
    const x = d.data() || {};
    return { id: d.id, name: S(x.name, 120), startDate: S(x.startDate, 10), endDate: S(x.endDate || x.startDate, 10), place: [x.district, x.city].filter(Boolean).join(", ").slice(0, 80), pub: pub.has(d.id) };
  });
  await Promise.all(
    list
      .filter((r) => r.pub && r.endDate >= today)
      .map(async (r) => {
        const l = await base.collection("raceLive").doc(r.id).get();
        const d = l.exists ? l.data() : {};
        const lv = cleanLive(d);
        const timer = d.timer ? { ...pickTimer(d.timer), at: Number(d.timer.at) || 0 } : null;
        const cur = currentStart(lv.starts, timer);
        const st = cleanStream(d.stream);
        r.live = !!cur && cur.day === today;
        r.races = lv.starts.filter((x) => !x.void).length;
        r.yt = !!st.url;
        r.status = rollPlan(lv.plan, today).status;
      }),
  );
  return list;
}

export async function GET(request) {
  const au = await requireUser(request, { free: true });
  if (!au.ok) return unauthorized(au);
  const p = await profileOf(au.uid);
  if (p.role !== "owner") return NextResponse.json({ error: "Yalnız ana hesap." }, { status: 403 });
  const q = new URL(request.url).searchParams;
  const n = [1, 7, 30].includes(Number(q.get("days"))) ? Number(q.get("days")) : 1;
  const race = q.get("race") || "";
  if (race && !ID.test(race)) return NextResponse.json({ error: "bad" }, { status: 400 });
  const today = trDay();
  const s = await store();
  try {
    const [list, days] = await Promise.all([
      adminReady() ? raceList(p.orgId, today).catch(() => []) : [],
      s ? Promise.all(lastDays(n).map((d) => within(dayData(s, d, today), 8000).catch(() => null))) : [],
    ]);
    const ok = days.filter(Boolean);
    const live = mergeLive(ok.map((d) => d.live));
    const allSums = ok.flatMap((d) => Object.values(d.sums || {}));
    const races = {};
    for (const d of ok) for (const [r, sum] of Object.entries(d.sums || {})) (races[r] ||= []).push(sum);
    const raceRows = Object.fromEntries(
      Object.entries(races).map(([r, sums]) => {
        const m = mergeSums(sums);
        return [r, { people: m.vs.length, n: m.n, live: live[r === "_" ? "" : r] || 0 }];
      }),
    );
    const total = viewOf(mergeSums(allSums), Object.values(live).reduce((a, b) => a + b, 0));
    const one = race ? viewOf(mergeSums(races[race] || []), live[race === "_" ? "" : race] || 0) : null;
    return NextResponse.json({ today, days: n, total, races: raceRows, race: one, list, blobs: !!s }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.warn("[canli-iz] özet", e?.message?.slice(0, 160));
    return NextResponse.json({ error: "Ziyaretler okunamadı." }, { status: 502 });
  }
}

function mergeLive(list) {
  const o = {};
  for (const l of list) for (const [k, v] of Object.entries(l || {})) o[k] = (o[k] || 0) + v;
  return o;
}
