import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { aheadWind, cleanLive, dayOf, dayTime, pickTimer, raceDays, raceName, rollPlan, screenDay, nextRaceDay } from "@/lib/raceLive";
import { cleanCourse, withRaceCards } from "@/lib/raceCourse";
import { cleanCourseShow, cleanRounds, cleanScreen, cleanStream, currentStart } from "@/lib/raceRounds";
import { cleanSheet, joinGroups } from "@/lib/resultSheet";
import { cleanEntries } from "@/lib/roundSay";
import { cleanCamBy, cleanOnAir, onAirStart } from "@/lib/raceCams";
import { cleanGroups } from "@/lib/roundScore";
import { nearestStation, obsRows, parseSynop, utcRange } from "@/lib/windObs";
import { racePlace } from "@/features/athletes/raceWeather";
import { GONE_MS, cleanBoats } from "@/lib/boatTrack";

export const runtime = "nodejs";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01). Girişsiz okuma burada, yönetici anahtarıyla:
// Firestore kuralları değişmedi, kulübün geri kalanı açılmaz. Yalnız ana hesabın "Canlı ekran"ı açtığı yarış okunur
// (canliEkran/{yarış} = { org }). Sayfa 4 sn'de bir sorar; aynı cevap 2 sn bellekte ve CDN'de tutulur (okuma az kalsın).
// GET ?id=<yarış>&y=<start>  → { race, starts, timer, rounds, screen, stream, media, wind, course, fleets, boats, entries, groups, plan, forecast, forecastNext, now }
// POST { race } (ana hesap) → yarışı canlı ekrana açar, { id }
// GET (id yok) → { list: [{ id, name, startDate, endDate, place }] } açık yarışlar (bitmemiş), genel sayfa /canli için
// DELETE { race } (ana hesap) → yarış silinince (raceWipe.js) işaret ve yarışın bütün yayın verisi silinir; link "yarış kaldırıldı" der
// DELETE { sweep: true } (ana hesap) → yarışı silinmiş ama yayın verisi kalmış (yetim) kayıtları bulur ve siler, { n, ids }
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
  const fleets = all.map((f) => ({ cls: f.cls, rows: f.rows.map((r) => ({ name: r.name, sail: r.sail, club: r.club, grp: r.grp, rank: r.rank || 0, pts: r.pts ?? null, ...(r.r ? { r: r.r } : {}), ...(r.sex ? { sex: r.sex } : {}), ...(r.cat ? { cat: r.cat } : {}), ...(r.born ? { born: r.born } : {}) })) }));
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

// Tekne konumları (lib/boatTrack.js, Seyhun 2026-11-02 tekne takibi): takip açık ve "Yayında harita" açıksa son 5 dk'da konum gönderen
// tekneler. Takip kaydı 30 sn, konumlar yanıtla birlikte (2 sn) bellekte; anahtar ve doğruluk dışarı verilmez.
const trackMemo = new Map();
async function boatsOf(org, id) {
  const hit = trackMemo.get(id);
  let head = hit && Date.now() - hit.t < 30e3 ? hit.head : null;
  const ref = adminDb().collection("takip").doc(id);
  if (!head) {
    const s = await ref.get();
    const d = s.exists ? s.data() : {};
    head = { on: d.on === true && d.org === org, map: d.map !== false };
    trackMemo.set(id, { t: Date.now(), head });
    if (trackMemo.size > 200) trackMemo.delete(trackMemo.keys().next().value);
  }
  if (!head.on || !head.map) return [];
  const snap = await ref.collection("tekne").where("t", ">", Date.now() - GONE_MS).limit(300).get();
  return cleanBoats(snap.docs.map((d) => ({ sail: d.id, ...d.data() }))).map((b) => ({ sail: b.sail, lat: b.lat, lon: b.lon, hdg: b.hdg, spd: b.spd, t: b.t, old: b.old }));
}

// Günün rüzgâr tahmini (bekleme ekranı; Seyhun 2026-11-01 "gün boyu grafiğimiz"): yarış yeri (spot, yoksa kayıtlı tahmin yeri) için
// Open-Meteo saatlik rüzgâr; org/yarış/gün başına 30 dk bellekte
const fcMemo = new Map();
// Yer yoksa (spot ya da kayıtlı tahmin yeri) yarış sayfasının hava sekmesindeki gibi: Çevre'deki yarış alanı, sonra ilçe/il
// (Seyhun 2026-11-02 "her yarışın rüzgârını alıyorum, yarış neredeyse onun grafiği"; önceden yer kaydedilmemiş yarışta grafik hiç gelmiyordu)
async function forecastOf(org, id, r, day) {
  const k = `${org}/${id}/${day}`;
  const hit = fcMemo.get(k);
  if (hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
  let sp = r.spot || r.weather?.place;
  if (!Number.isFinite(Number(sp?.lat)) || !Number.isFinite(Number(sp?.lon))) sp = await racePlace(r).catch(() => null);
  const lat = Number(sp?.lat);
  const lon = Number(sp?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    fcMemo.set(k, { t: Date.now(), v: null });
    return null;
  }
  let v = null;
  try {
    // ertesi gün de alınır (Seyhun 2026-11-03 19:12 "bugün bitiyorsa beklenen rüzgâr yarına geçsin"): rows yalnız bu gün, next ertesi günün rüzgârı
    const d2 = new Date(Date.parse(`${day}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
    const q = new URLSearchParams({ latitude: lat, longitude: lon, timezone: "Europe/Istanbul", wind_speed_unit: "kn", start_date: day, end_date: d2, hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,temperature_2m,precipitation,precipitation_probability" });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const h = (await res.json()).hourly || {};
      const N = (x) => (Number.isFinite(Number(x)) && x !== null ? Math.round(Number(x)) : null);
      const all = (h.time || []).map((t, i) => ({ d: t.slice(0, 10), hh: t.slice(11, 13), wind: N(h.wind_speed_10m?.[i]), gust: N(h.wind_gusts_10m?.[i]), dir: N(h.wind_direction_10m?.[i]), code: N(h.weather_code?.[i]), t: N(h.temperature_2m?.[i]), mm: Number.isFinite(Number(h.precipitation?.[i])) && h.precipitation[i] !== null ? Math.round(Number(h.precipitation[i]) * 10) / 10 : null, pop: N(h.precipitation_probability?.[i]) })).filter((x) => x.wind != null);
      const rows = all.filter((x) => x.d === day).map(({ d, ...x }) => x);
      const next = all.filter((x) => x.d === d2).map((x) => ({ hh: x.hh, wind: x.wind, gust: x.gust, dir: x.dir }));
      if (rows.length) v = { place: S(sp.name, 60), rows, ...(next.length ? { next } : {}) };
    }
    // Gerçekleşen rüzgâr (Seyhun 2026-11-02 "tahmin ve gerçekleşen grafiğimiz neden gösterilmiyor"): en yakın istasyon (100 km'ye kadar, /api/wind-obs far gibi)
    const st = v && nearestStation(lat, lon);
    if (st && st.km <= 100) {
      try {
        const { begin, end } = utcRange(day);
        const res = await fetch(`https://www.ogimet.com/cgi-bin/getsynop?${new URLSearchParams({ block: st.id, begin, end })}`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          v.obs = obsRows((await res.text()).split("\n").map((l) => parseSynop(l, st.id)), day).map((o) => ({ hh: o.hh, wind: o.wind, gust: o.gust ?? null, dir: o.dir ?? null, rain: o.rain ?? null, temp: o.temp ?? null, code: o.code ?? null }));
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

// Yarışa günler varken yarış günlerinin beklenen rüzgârı (open-meteo en çok 16 gün ileri); 1 saat önbellek
async function aheadOf(org, id, r, plan) {
  const today = trDay();
  const start = S(r.startDate, 10);
  if (!start || start <= today) return null;
  const lim = trDay(Date.now() + 15 * 864e5);
  const days = raceDays(start, S(r.endDate, 10), plan).filter((d) => d <= lim);
  if (!days.length) return { days: raceDays(start, S(r.endDate, 10), plan).map((day) => ({ day, at: plan?.times?.[day] || plan?.daily || "", wind: null, gust: null, dir: null })) };
  const k = `${org}/${id}/ahead/${days[0]}/${days.at(-1)}/${plan?.daily || ""}`;
  const hit = fcMemo.get(k);
  if (hit && Date.now() - hit.t < 60 * 60e3) return hit.v;
  let v = null;
  try {
    let sp = r.spot || r.weather?.place;
    if (!Number.isFinite(Number(sp?.lat)) || !Number.isFinite(Number(sp?.lon))) sp = await racePlace(r).catch(() => null);
    const lat = Number(sp?.lat), lon = Number(sp?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const q = new URLSearchParams({ latitude: lat, longitude: lon, timezone: "Europe/Istanbul", wind_speed_unit: "kn", start_date: days[0], end_date: days.at(-1), hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m" });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const h = (await res.json()).hourly || {};
        const N = (x) => (Number.isFinite(Number(x)) && x !== null ? Math.round(Number(x)) : null);
        const rows = (h.time || []).map((t, i) => ({ t: S(t, 13), wind: N(h.wind_speed_10m?.[i]), gust: N(h.wind_gusts_10m?.[i]), dir: N(h.wind_direction_10m?.[i]) }));
        v = { place: S(sp?.name, 60), days: aheadWind(rows, days, plan) };
      }
    }
  } catch (e) {
    console.warn("[canli] ileri tahmin", e?.message?.slice(0, 120));
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
  // ekranda gösterilen yarış: Yayın'da ▶ ile seçilen (onAir), yoksa en son başlayan (Seyhun 2026-11-02 grupları ayrı yönet)
  const cur = onAirStart(live.starts, cleanOnAir(d.onAir), currentStart(live.starts, timer));
  const sel = (y && live.starts.find((x) => x.id === y)) || cur;
  // ekranın günü: "Ekran yeni güne geçer" akşam saatiyse o saatten sonra yarın (lib/raceLive.js screenDay)
  const see = screenDay(live.plan, Date.now(), timer);
  const day = sel?.day || see;
  // Gün bitince alttaki şeritte yarının beklenen rüzgârı (Seyhun 2026-11-02 tasarım 5): yarının tahmini de alınır
  // ekrandaki plan: bugün yarış yoksa bir sonraki yarış günü next'e yazılır (Seyhun 2026-11-02 "bugün yarış yok" sayfası, örnek A)
  const vplan = rollPlan(live.plan, see);
  if (vplan.status === "none" && !vplan.next) vplan.next = nextRaceDay(vplan, see, S(r.startDate, 10), S(r.endDate, 10));
  const nd = (vplan.status === "done" || vplan.status === "none") && vplan.next?.day && vplan.next.day !== day ? vplan.next.day : "";
  const [cSnap, forecast, forecastNext, ahead, boats] = await Promise.all([base.collection("raceLive").doc(id).collection("course").doc(day).get(), forecastOf(org, id, r, day), nd ? forecastOf(org, id, r, nd) : null, aheadOf(org, id, r, live.plan), boatsOf(org, id).catch(() => [])]);
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
    courseShow: cleanCourseShow(d.courseShow),
    camBy: cleanCamBy(d.camBy),
    onAir: cleanOnAir(d.onAir),
    stream: cleanStream(d.stream),
    media,
    wind: live.wind.filter((w) => dayOf(w.at) === day || trDay(Date.parse(w.at)) === day).slice(-40),
    day,
    course: cleanCourse(withRaceCards(cSnap.exists ? cSnap.data() : {}, d.cards)),
    fleets,
    boats,
    entries: en.entries,
    groups: en.groups,
    plan: vplan,
    see,
    forecast,
    forecastNext,
    ahead,
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
      // Genel sayfanın büyük kartı için (Seyhun 2026-11-03 örnek F): süren yarışın adı ve grubu, ilk start saati, son rüzgâr
      const pl = rollPlan(lv.plan, today);
      const grp = cur ? cur.grp || cleanRounds(ld.rounds)?.[cur.id]?.grp || "" : "";
      const w = [...cleanCourse(ld.course || {}).obs].reverse().find((o) => o.kind === "wind");
      const first = todayRace ? pl.at : dayTime(pl, S(x.startDate, 10)) || pl.daily || "";
      return { id: d.id, name: S(x.name, 120), startDate: S(x.startDate, 10), endDate: S(x.endDate, 10), place: [x.district, x.city].filter(Boolean).join(", ").slice(0, 80), live, today: todayRace, status: pl.status, now: live ? [raceName(cur), grp ? `${grp} grup` : ""].filter(Boolean).join(" · ") : "", at: S(first, 5), wind: w ? { deg: w.deg, kn: w.kn ?? null } : null };
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
  // canlı ekranın saat eşlemesi: yalnız sunucu saati, hiç önbelleğe alınmaz (Firestore okumaz)
  if (q.get("saat")) return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" } });
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

// Yarışın bütün yayın verisi (Seyhun 2026-11-03 "yarışı silince datalar silinmiyor; veri belki lazım olur diye tutulmasın"):
// canlı kayıt orgs/{org}/raceLive/{yarış} ve alt belgeleri (sonuç listeleri, parkur, kayıt listesi), fotoğraf/video dosyaları
// (Storage orgs/{org}/raceMedia/{id} ve küçük resmi), tekne takibi takip/{yarış} ve tekne konumları, herkese açık ekran işareti
// canliEkran/{yarış}, isimsiz ziyaret sayıları. Yalnız yarış belgesi yoksa çağrılır (yarış silinmiş).
async function wipeLive(org, race) {
  const db = adminDb();
  const lref = db.collection("orgs").doc(org).collection("raceLive").doc(race);
  const l = await lref.get().catch(() => null);
  const media = (l?.exists ? l.data()?.media : null) || [];
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (name && media.length) {
    const b = getStorage().bucket(name);
    for (const m of media) {
      const mid = S(m?.id, 80);
      if (!/^[\w-]{1,80}$/.test(mid)) continue;
      for (const path of [`orgs/${org}/raceMedia/${mid}`, `orgs/${org}/raceMedia/${mid}-k`]) await b.file(path).delete({ ignoreNotFound: true }).catch(() => {});
    }
  }
  await db.recursiveDelete(lref).catch((e) => console.warn("[canli] canlı kayıt silinemedi", race, e?.message?.slice(0, 120)));
  const tref = db.collection("takip").doc(race);
  const t = await tref.get().catch(() => null);
  if (t?.exists && t.data()?.org === org) await db.recursiveDelete(tref).catch(() => {});
  const pref = db.collection("canliEkran").doc(race);
  const ptr = await pref.get().catch(() => null);
  if (ptr?.exists && ptr.data()?.org === org) await pref.delete().catch(() => {});
  await dropVisits(race);
  ptrMemo.delete(race);
  sheetMemo.delete(`${org}/${race}`);
  entryMemo.delete(`${org}/${race}`);
  trackMemo.delete(race);
  for (const k of [...memo.keys()]) if (k.startsWith(`${race}/`)) memo.delete(k);
  listMemo = null;
}
// Herkese açık sayfanın isimsiz ziyaret sayıları (Netlify Blobs "canli-iz", api/canli-iz): o yarışın ham oturumları (z/<gün>/<yarış>/…)
// ve gün özetlerindeki satırı (o/<gün>)
async function dropVisits(race) {
  try {
    const { getStore } = await import("@netlify/blobs");
    const st = getStore({ name: "canli-iz" });
    const { blobs: z } = await st.list({ prefix: "z/" });
    for (const b of z) if (b.key.split("/")[2] === race) await st.delete(b.key).catch(() => {});
    const { blobs: o } = await st.list({ prefix: "o/" });
    for (const b of o) {
      const v = await st.get(b.key, { type: "json" }).catch(() => null);
      if (v && typeof v === "object" && race in v) {
        delete v[race];
        await st.setJSON(b.key, v).catch(() => {});
      }
    }
  } catch {
    /* Netlify dışında (yerelde) depo yok */
  }
}
// Yetimler: işareti, canlı kaydı ya da tekne takibi olup yarış belgesi olmayanlar. Antrenman kayıtları (ant-…) ve ortak yarışlar dokunulmaz.
async function orphansOf(org) {
  const db = adminDb();
  const base = db.collection("orgs").doc(org);
  const [ptr, lives, tr] = await Promise.all([db.collection("canliEkran").where("org", "==", org).get(), base.collection("raceLive").listDocuments(), db.collection("takip").where("org", "==", org).get()]);
  const ids = [...new Set([...ptr.docs.map((d) => d.id), ...lives.map((d) => d.id), ...tr.docs.map((d) => d.id)])].filter((x) => ID.test(x) && !x.startsWith("ant-"));
  const out = [];
  for (const id of ids) {
    const [r, sh] = await Promise.all([base.collection("races").doc(id).get(), db.collection("sharedRaces").doc(id).get()]);
    if (!r.exists && !sh.exists) out.push(id);
  }
  return out;
}

// Yarış silinince ana hesap yayın verisini siler (başka kulübün kaydına dokunulmaz); sweep ile kalmış eski kayıtları temizler
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
  const p = await profileOf(au.uid);
  if (p.role !== "owner") return NextResponse.json({ error: "Yalnız ana hesap." }, { status: 403 });
  const org = p.orgId;
  if (body?.sweep === true) {
    const ids = await orphansOf(org);
    for (const id of ids) await wipeLive(org, id);
    return NextResponse.json({ ok: true, n: ids.length, ids });
  }
  const race = S(body?.race, 60);
  if (!ID.test(race)) return NextResponse.json({ error: "Yarış yok." }, { status: 400 });
  const ref = adminDb().collection("canliEkran").doc(race);
  const was = await ref.get();
  if (was.exists && was.data()?.org && was.data().org !== org) return NextResponse.json({ error: "Bu yarış başka kulüpte açık." }, { status: 409 });
  // yarış hâlâ duruyorsa yalnız işaret kalkar (ekran kapatılır); silinmişse her şey gider
  const r = await adminDb().collection("orgs").doc(org).collection("races").doc(race).get();
  if (r.exists) {
    if (was.exists) await ref.delete();
    ptrMemo.delete(race);
    for (const k of [...memo.keys()]) if (k.startsWith(`${race}/`)) memo.delete(k);
    listMemo = null;
    return NextResponse.json({ ok: true });
  }
  await wipeLive(org, race);
  return NextResponse.json({ ok: true, wiped: true });
}
