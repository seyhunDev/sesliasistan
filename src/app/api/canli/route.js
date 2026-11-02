import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { cleanLive, dayOf, pickTimer, rollPlan } from "@/lib/raceLive";
import { cleanCourse } from "@/lib/raceCourse";
import { cleanRounds, cleanScreen, cleanStream, currentStart } from "@/lib/raceRounds";
import { cleanSheet, joinGroups } from "@/lib/resultSheet";
import { cleanEntries } from "@/lib/roundSay";
import { cleanGroups } from "@/lib/roundScore";
import { nearestStation, obsRows, parseSynop, utcRange } from "@/lib/windObs";

export const runtime = "nodejs";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01). Girişsiz okuma burada, yönetici anahtarıyla:
// Firestore kuralları değişmedi, kulübün geri kalanı açılmaz. Yalnız ana hesabın "Canlı ekran"ı açtığı yarış okunur
// (canliEkran/{yarış} = { org }). Sayfa 4 sn'de bir sorar; aynı cevap 2 sn bellekte ve CDN'de tutulur (okuma az kalsın).
// GET ?id=<yarış>&y=<start>  → { race, starts, timer, rounds, screen, stream, media, wind, course, fleets, entries, groups, plan, forecast, forecastNext, now }
// POST { race } (ana hesap) → yarışı canlı ekrana açar, { id }
// GET (id yok) → { list: [{ id, name, startDate, endDate, place }] } açık yarışlar (bitmemiş), genel sayfa /canli için
// DELETE { race } (ana hesap) → işareti kaldırır (yarış silinince, raceWipe.js); link artık "yarış kaldırıldı" der
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

// Günün rüzgâr tahmini (bekleme ekranı; Seyhun 2026-11-01 "gün boyu grafiğimiz"): yarış yeri (spot, yoksa kayıtlı tahmin yeri) için
// Open-Meteo saatlik rüzgâr; org/yarış/gün başına 30 dk bellekte
const fcMemo = new Map();
async function forecastOf(org, id, r, day) {
  const sp = r.spot || r.weather?.place;
  const lat = Number(sp?.lat);
  const lon = Number(sp?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const k = `${org}/${id}/${day}`;
  const hit = fcMemo.get(k);
  if (hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
  let v = null;
  try {
    const q = new URLSearchParams({ latitude: lat, longitude: lon, timezone: "Europe/Istanbul", wind_speed_unit: "kn", start_date: day, end_date: day, hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code" });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const h = (await res.json()).hourly || {};
      const N = (x) => (Number.isFinite(Number(x)) && x !== null ? Math.round(Number(x)) : null);
      const rows = (h.time || []).map((t, i) => ({ hh: t.slice(11, 13), wind: N(h.wind_speed_10m?.[i]), gust: N(h.wind_gusts_10m?.[i]), dir: N(h.wind_direction_10m?.[i]), code: N(h.weather_code?.[i]) })).filter((x) => x.wind != null);
      if (rows.length) v = { place: S(sp.name, 60), rows };
    }
    // Gerçekleşen rüzgâr (Seyhun 2026-11-02 "tahmin ve gerçekleşen grafiğimiz neden gösterilmiyor"): en yakın istasyon (100 km'ye kadar, /api/wind-obs far gibi)
    const st = v && nearestStation(lat, lon);
    if (st && st.km <= 100) {
      try {
        const { begin, end } = utcRange(day);
        const res = await fetch(`https://www.ogimet.com/cgi-bin/getsynop?${new URLSearchParams({ block: st.id, begin, end })}`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          v.obs = obsRows((await res.text()).split("\n").map((l) => parseSynop(l, st.id)), day).map((o) => ({ hh: o.hh, wind: o.wind, gust: o.gust ?? null, dir: o.dir ?? null }));
          v.station = S(st.name, 40);
        }
      } catch (e) {
        console.warn("[canli] ölçüm", e?.message?.slice(0, 120));
      }
    }
  } catch (e) {
    console.warn("[canli] tahmin", e?.message?.slice(0, 120));
  }
  fcMemo.set(k, { t: Date.now(), v });
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
  // Gün bitince alttaki şeritte yarının beklenen rüzgârı (Seyhun 2026-11-02 tasarım 5): yarının tahmini de alınır
  const nd = live.plan.status === "done" && live.plan.next?.day && live.plan.next.day !== day ? live.plan.next.day : "";
  const [cSnap, forecast, forecastNext] = await Promise.all([base.collection("raceLive").doc(id).collection("course").doc(day).get(), forecastOf(org, id, r, day), nd ? forecastOf(org, id, r, nd) : null]);
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
    plan: rollPlan(live.plan, trDay()),
    forecast,
    forecastNext,
  };
}

// Açık yarışların listesi (/canli genel sayfası): canliEkran işaretleri → yarış adı/tarihi; bitmişler (bitiş günü geçen) düşer
let listMemo = null; // { t, list }
async function openList() {
  if (listMemo && Date.now() - listMemo.t < 10e3) return listMemo.list;
  const db = adminDb();
  const ptr = await db.collection("canliEkran").limit(60).get();
  const today = trDay();
  const rows = await Promise.all(
    ptr.docs.map(async (d) => {
      const org = S(d.data()?.org, 80);
      if (!org || !ID.test(d.id)) return null;
      const base = db.collection("orgs").doc(org);
      const [r, l] = await Promise.all([base.collection("races").doc(d.id).get(), base.collection("raceLive").doc(d.id).get()]);
      if (!r.exists) return null;
      const x = r.data() || {};
      const end = S(x.endDate || x.startDate, 10);
      if (end && end < today) return null;
      // Şu an süren yarış (sayaç ya da bitmemiş bugünkü start) → listede "Canlı" (Seyhun 2026-11-01 "yarış varsa anlık gösterilmeli")
      const ld = l.exists ? l.data() : {};
      const lv = cleanLive(ld);
      const timer = ld.timer ? { ...pickTimer(ld.timer), at: Number(ld.timer.at) || 0 } : null;
      const cur = currentStart(lv.starts, timer);
      const live = !!cur && cur.day === today;
      const todayRace = S(x.startDate, 10) <= today && today <= end;
      return { id: d.id, name: S(x.name, 120), startDate: S(x.startDate, 10), endDate: S(x.endDate, 10), place: [x.district, x.city].filter(Boolean).join(", ").slice(0, 80), live, today: todayRace, status: rollPlan(lv.plan, today).status };
    }),
  );
  const list = rows.filter(Boolean).sort((a, b) => a.startDate.localeCompare(b.startDate));
  listMemo = { t: Date.now(), list };
  return list;
}

// Netlify-Vary: query: CDN önbelleği ?id= ve ?y= ile ayrılır; yoksa genel liste yanıtı yarış sayfasına gidebilir (2026-11-02 çökme)
export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const id = q.get("id") || "";
  const y = q.get("y") || "";
  if (!adminReady()) return NextResponse.json({ error: "nokey" }, { status: 503 });
  if (!id) {
    try {
      return NextResponse.json({ list: await openList(), now: Date.now() }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=10", "Netlify-Vary": "query" } });
    } catch (e) {
      console.warn("[canli]", e?.message?.slice(0, 160));
      return NextResponse.json({ error: "fail" }, { status: 502 });
    }
  }
  if (!ID.test(id) || (y && !ID.test(y))) return NextResponse.json({ error: "bad" }, { status: 400 });
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
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=2", "Netlify-CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=2", "Netlify-Vary": "query" } },
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
  listMemo = null;
  return NextResponse.json({ id: race });
}

// Yarış silinince ana hesap işareti kaldırır (başka kulübün işaretine dokunulmaz)
export async function DELETE(request) {
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
  if (p.role !== "owner") return NextResponse.json({ error: "Yalnız ana hesap." }, { status: 403 });
  const ref = adminDb().collection("canliEkran").doc(race);
  const was = await ref.get();
  if (was.exists && was.data()?.org && was.data().org !== p.orgId) return NextResponse.json({ error: "Bu yarış başka kulüpte açık." }, { status: 409 });
  if (was.exists) await ref.delete();
  ptrMemo.delete(race);
  sheetMemo.delete(`${p.orgId}/${race}`);
  entryMemo.delete(`${p.orgId}/${race}`);
  for (const k of [...memo.keys()]) if (k.startsWith(`${race}/`)) memo.delete(k);
  listMemo = null;
  return NextResponse.json({ ok: true });
}
