import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { cleanLive, dayOf, pickTimer } from "@/lib/raceLive";
import { cleanCourse } from "@/lib/raceCourse";
import { cleanRounds, cleanScreen, cleanStream, currentStart } from "@/lib/raceRounds";
import { cleanSheet, joinGroups } from "@/lib/resultSheet";
import { cleanEntries } from "@/lib/roundSay";
import { cleanGroups } from "@/lib/roundScore";

export const runtime = "nodejs";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01). Girişsiz okuma burada, yönetici anahtarıyla:
// Firestore kuralları değişmedi, kulübün geri kalanı açılmaz. Yalnız ana hesabın "Canlı ekran"ı açtığı yarış okunur
// (canliEkran/{yarış} = { org }). Sayfa 4 sn'de bir sorar; aynı cevap 2 sn bellekte ve CDN'de tutulur (okuma az kalsın).
// GET ?id=<yarış>&y=<start>  → { race, starts, timer, rounds, screen, stream, media, wind, course, fleets, entries, groups, now }
// POST { race } (ana hesap) → yarışı canlı ekrana açar, { id }
const MEMO = 2000;
const memo = new Map(); // anahtar → { t, body }
const sheetMemo = new Map(); // org/yarış → { t, fleets }
const ptrMemo = new Map(); // yarış → { t, org }
const ID = /^[\w-]{1,60}$/;
const S = (v, n) => String(v ?? "").slice(0, n);

// Türkiye saatine göre gün (sunucu UTC'de)
const trDay = (ms = Date.now()) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);

async function orgOf(id) {
  const hit = ptrMemo.get(id);
  if (hit && Date.now() - hit.t < 60e3) return hit.org;
  const snap = await adminDb().collection("canliEkran").doc(id).get();
  const org = snap.exists ? S(snap.data()?.org, 80) : "";
  ptrMemo.set(id, { t: Date.now(), org });
  return org;
}

async function fleetsOf(org, id) {
  const k = `${org}/${id}`;
  const hit = sheetMemo.get(k);
  if (hit && Date.now() - hit.t < 60e3) return hit.fleets;
  const snap = await adminDb().collection("orgs").doc(org).collection("raceLive").doc(id).collection("sheets").get();
  // eskiden yeniye: aynı sınıfın yeni belgesi eskisinin yerine geçer, gruplu belgeler (Altın PDF'i + Gümüş PDF'i) birleşir
  const docs = snap.docs.map((d) => d.data()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  const all = [];
  for (const f of docs.flatMap((d) => cleanSheet(d.fleets))) {
    const i = all.findIndex((x) => x.cls === f.cls);
    if (i < 0) all.push(f);
    else all[i] = joinGroups(all[i], f);
  }
  const fleets = all.map((f) => ({ cls: f.cls, rows: f.rows.map((r) => ({ name: r.name, sail: r.sail, club: r.club, grp: r.grp, rank: r.rank || 0, pts: r.pts ?? null, ...(r.r ? { r: r.r } : {}) })) }));
  sheetMemo.set(k, { t: Date.now(), fleets });
  return fleets;
}

// Kayıt listesi ve günün grupları (geçici genel sıralama için; lib/roundScore.js): ad, kulüp, sınıf, doğum yılı, cinsiyet, kategori
const entryMemo = new Map();
async function entriesOf(org, id) {
  const k = `${org}/${id}`;
  const hit = entryMemo.get(k);
  if (hit && Date.now() - hit.t < 30e3) return hit.v;
  const snap = await adminDb().collection("orgs").doc(org).collection("raceLive").doc(id).collection("entries").doc("list").get();
  const d = snap.exists ? snap.data() : {};
  const v = { entries: cleanEntries(d.rows).map((r) => ({ sail: r.sail, name: r.name, club: r.club, cls: r.cls, born: r.born || "", sex: r.sex || "", cat: r.cat || "" })), groups: cleanGroups(d.groups) };
  entryMemo.set(k, { t: Date.now(), v });
  return v;
}

async function build(id, y) {
  const org = await orgOf(id);
  if (!org) return null;
  const db = adminDb();
  const base = db.collection("orgs").doc(org);
  const [raceSnap, liveSnap, fleets] = await Promise.all([base.collection("races").doc(id).get(), base.collection("raceLive").doc(id).get(), fleetsOf(org, id)]);
  const en = await entriesOf(org, id).catch(() => ({ entries: [], groups: {} }));
  if (!raceSnap.exists) return null;
  const r = raceSnap.data() || {};
  const d = liveSnap.exists ? liveSnap.data() : {};
  const live = cleanLive(d);
  const timer = d.timer ? { ...pickTimer(d.timer), at: Number(d.timer.at) || 0 } : null;
  const cur = currentStart(live.starts, timer);
  const sel = (y && live.starts.find((x) => x.id === y)) || cur;
  const day = sel?.day || trDay();
  const cSnap = await base.collection("raceLive").doc(id).collection("course").doc(day).get();
  const media = live.media
    .filter((m) => m.url)
    .slice(-120)
    .map((m) => ({ id: m.id, kind: m.kind, url: m.url, thumb: m.thumb || "", at: m.at, dur: m.dur || 0, w: m.w || 0, h: m.h || 0, phase: m.phase || "", sec: m.sec ?? null, end: m.end || "", rid: m.rid || "" }));
  return {
    race: { name: S(r.name, 120), startDate: S(r.startDate, 10), endDate: S(r.endDate, 10), place: [r.district, r.city].filter(Boolean).join(", ").slice(0, 80) },
    starts: live.starts,
    cur: cur?.id || "",
    timer,
    rounds: cleanRounds(d.rounds),
    screen: cleanScreen(d.screen),
    stream: cleanStream(d.stream),
    media,
    wind: live.wind.filter((w) => dayOf(w.at) === day || trDay(Date.parse(w.at)) === day).slice(-40),
    day,
    course: cleanCourse(cSnap.exists ? cSnap.data() : {}),
    fleets,
    entries: en.entries,
    groups: en.groups,
  };
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const id = q.get("id") || "";
  const y = q.get("y") || "";
  if (!ID.test(id) || (y && !ID.test(y))) return NextResponse.json({ error: "bad" }, { status: 400 });
  if (!adminReady()) return NextResponse.json({ error: "nokey" }, { status: 503 });
  const key = `${id}/${y}`;
  const hit = memo.get(key);
  let body = hit && Date.now() - hit.t < MEMO ? hit.body : null;
  if (!body) {
    try {
      body = await build(id, y);
    } catch (e) {
      console.warn("[canli]", e?.message?.slice(0, 160));
      return NextResponse.json({ error: "fail" }, { status: 502 });
    }
    if (!body) return NextResponse.json({ error: "yok" }, { status: 404 });
    memo.set(key, { t: Date.now(), body });
    if (memo.size > 200) memo.delete(memo.keys().next().value);
  }
  return NextResponse.json(
    { ...body, now: Date.now() },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=2", "Netlify-CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=2" } },
  );
}

// Ana hesap yarışı canlı ekrana açar (Canlı ekran / Linki kopyala)
export async function POST(request) {
  const au = await requireUser(request, { free: true });
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil." }, { status: 503 });
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const race = S(body?.race, 60);
  if (!ID.test(race)) return NextResponse.json({ error: "Yarış yok." }, { status: 400 });
  const p = await profileOf(au.uid);
  if (p.role !== "owner") return NextResponse.json({ error: "Canlı ekranı yalnız ana hesap açar." }, { status: 403 });
  const org = p.orgId;
  const snap = await adminDb().collection("orgs").doc(org).collection("races").doc(race).get();
  if (!snap.exists) return NextResponse.json({ error: "Yarış bulunamadı." }, { status: 404 });
  const ref = adminDb().collection("canliEkran").doc(race);
  const was = await ref.get();
  if (was.exists && was.data()?.org && was.data().org !== org) return NextResponse.json({ error: "Bu yarış başka kulüpte açık." }, { status: 409 });
  if (!was.exists) await ref.set({ org, at: new Date().toISOString() });
  ptrMemo.set(race, { t: Date.now(), org });
  return NextResponse.json({ id: race });
}
