// Tekne takibi (Seyhun 2026-11-02 "her tekneye takip cihazı, yelken numarasına atayayım; şamandıranın yanından geçince dönüş yazılsın"):
// her teknede su geçirmez kılıfta bir telefon /takip/<yarış>?k=<anahtar> sayfasını açar, yelken numarasını seçer, konumunu gönderir.
// Kayıt (Firestore, kurallar firestore.rules "takip"):
//   takip/{yarış} = { org, k: anahtar, on: açık mı, map: yayında harita, at }   (yalnız ana hesap okur/yazar)
//   takip/{yarış}/tekne/{yelken} = { k, lat, lon, acc, spd, hdg, t }           (telefon anahtarla yazar; okumayı sunucu ve ana hesap yapar)
// Şamandıra yerleri günün parkur kaydında (raceCourse.js pts m1…m4, "burada" ile işaretlenen); finiş komite–pin hattı.
// Dönüş: tekne sıradaki şamandırasına DONE_M içine girip uzaklaşınca, en yakın geçtiği an dönmüş sayılır (Yayın › Dönüşler'de öneri).
// Saf işlevler (test: scripts/asistan-test/yerel/yaris.mjs "Tekne takibi").
import { digits } from "@/lib/raceRounds";
import { dist } from "@/lib/raceCourse";

export const SEND_MS = 3000; // telefon en sık 3 sn'de bir yazar
export const IDLE_MS = 15000; // kımıldamayan tekne 15 sn'de bir
export const MOVE_M = 3; // bu kadar kımıldamadıysa beklenir
export const STALE_MS = 60000; // 1 dk'dır konum gelmeyen tekne haritada soluk, 5 dk sonra hiç yok
export const GONE_MS = 5 * 60000;
export const NEAR_M = 30; // şamandıraya bu kadar yaklaşan "yanında"
export const OUT_M = 15; // yanından bu kadar daha uzaklaşınca dönüş tamam
export const BAD_ACC = 40; // doğruluğu bundan kötü konum yok sayılır

const N = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v);
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const SAIL = /^\d{1,6}$/;
export const cleanSail = (s) => {
  const d = digits(s);
  return SAIL.test(d) ? d : "";
};

// Rastgele anahtar (link içinde; bilen yazabilir, okuyamaz)
export function newKey() {
  const a = new Uint8Array(12);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}
export const KEY = /^[a-z2-9]{12,24}$/;
export const trackUrl = (origin, race, k) => `${origin}/takip/${race}?k=${k}`;

// Tek konum: { lat, lon, acc, spd (kn), hdg (°), t (ms) } | null
export function cleanFix(f) {
  const lat = N(f?.lat);
  const lon = N(f?.lon);
  const t = N(f?.t);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !t || t <= 0) return null;
  const acc = N(f?.acc);
  const spd = N(f?.spd);
  const hdg = N(f?.hdg);
  return {
    lat: r6(lat),
    lon: r6(lon),
    acc: acc === null || acc < 0 ? null : Math.min(9999, Math.round(acc)),
    spd: spd === null || spd < 0 || spd > 60 ? null : Math.round(spd * 10) / 10,
    hdg: hdg === null ? null : ((Math.round(hdg) % 360) + 360) % 360,
    t: Math.round(t),
  };
}
// Telefonun konumu (GeolocationPosition) → kayıt; hız m/sn → kn
export const fromGeo = (p) => cleanFix({ lat: p?.coords?.latitude, lon: p?.coords?.longitude, acc: p?.coords?.accuracy, spd: N(p?.coords?.speed) === null ? null : p.coords.speed * 1.943844, hdg: p?.coords?.heading, t: p?.timestamp || Date.now() });
// Yeni konum yazılsın mı: ilk konum, 3 sn geçti ve kımıldadı, ya da 15 sn geçti
export function shouldSend(last, fix) {
  if (!fix) return false;
  if (!last) return true;
  const dt = fix.t - last.t;
  if (dt >= IDLE_MS) return true;
  return dt >= SEND_MS && dist(last, fix) >= MOVE_M;
}

// Teknelerin son konumları (sunucu ve Yayın): [{ sail, lat, lon, acc, spd, hdg, t, old }] yeni → eski; 5 dk'dan eskiler düşer
export function cleanBoats(rows, now = Date.now()) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((r) => ({ sail: cleanSail(r?.sail ?? r?.id), ...cleanFix(r) }))
    .filter((b) => b.sail && b.t && now - b.t < GONE_MS && !seen.has(b.sail) && seen.add(b.sail))
    .map((b) => ({ ...b, old: now - b.t > STALE_MS }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 300);
}

// ---- Şamandıra dönüşü ----
const lastPos = (legs, sail) => {
  for (let k = (legs || []).length - 1; k >= 0; k--) if ((legs[k] || []).includes(sail)) return k;
  return -1;
};
// Teknenin sıradaki noktası: { k, mark } | null (parkur bitti ya da parkur yok)
export function nextMark(entry, sail) {
  const route = entry?.route || [];
  const k = lastPos(entry?.legs, sail) + 1;
  return k < route.length ? { k, mark: route[k] } : null;
}
// Noktanın yeri: şamandıra { at: {lat, lon} }, finiş { a: komite, b: pin }; işaretlenmemişse null (tahmini yer kullanılmaz)
export function markPlace(course, mark) {
  const pts = course?.pts || {};
  if (mark === "F") return pts.komite && pts.pin ? { a: pts.komite, b: pts.pin } : null;
  const p = pts[`m${mark}`];
  return p ? { at: p } : null;
}
// Yerel düzlem (metre): o noktaya göre doğu (x), kuzey (y)
const xy = (o, p) => ({ x: ((p.lon - o.lon) * Math.PI * 6371000 * Math.cos((o.lat * Math.PI) / 180)) / 180, y: ((p.lat - o.lat) * Math.PI * 6371000) / 180 });
// İki konum arası finiş hattını (20 m uzatılmış) kestiyse kesişme anı (ms), yoksa null
export function lineCross(p0, p1, a, b, ext = 20) {
  const A = { x: 0, y: 0 };
  const B = xy(a, b);
  const P = xy(a, p0);
  const Q = xy(a, p1);
  const L = Math.hypot(B.x, B.y);
  if (!L) return null;
  const ux = B.x / L;
  const uy = B.y / L;
  const A2 = { x: A.x - ux * ext, y: A.y - uy * ext };
  const B2 = { x: B.x + ux * ext, y: B.y + uy * ext };
  const cr = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cr(A2, B2, P);
  const d2 = cr(A2, B2, Q);
  const d3 = cr(P, Q, A2);
  const d4 = cr(P, Q, B2);
  if (!(d1 * d2 < 0 && d3 * d4 < 0)) return null;
  const f = d1 / (d1 - d2);
  return Math.round(p0.t + (p1.t - p0.t) * f);
}

// Bir teknenin izlenmesi: watch (önceki durum) + yeni konum → { watch, hit: { k, mark, t, near } | null }
// watch = { k, last, inside, minD, minT }; sıradaki nokta değişince baştan başlar
export function stepWatch(watch0, fix, target, place) {
  if (!fix || !target || !place || (fix.acc !== null && fix.acc > BAD_ACC)) return { watch: watch0 || null, hit: null };
  const w = watch0 && watch0.k === target.k ? { ...watch0 } : { k: target.k, last: null, inside: false, minD: Infinity, minT: 0 };
  if (w.last && fix.t <= w.last.t) return { watch: w, hit: null };
  let hit = null;
  if (place.at) {
    const d = dist(fix, place.at);
    if (d <= NEAR_M) {
      w.inside = true;
      if (d < w.minD) {
        w.minD = d;
        w.minT = fix.t;
      }
    } else if (w.inside && d > NEAR_M + OUT_M) {
      hit = { k: target.k, mark: target.mark, t: w.minT, near: Math.round(w.minD) };
      w.inside = false;
      w.minD = Infinity;
    }
  } else if (place.a && w.last) {
    const t = lineCross(w.last, fix, place.a, place.b);
    if (t) hit = { k: target.k, mark: target.mark, t, near: 0 };
  }
  w.last = fix;
  return { watch: w, hit };
}

// Dönüşü kayda yerleştirir: aynı noktada saati daha geç olanlardan önce (konumdan gelen dönüş geç onaylansa da sıra doğru kalır).
// entry: cleanEntry biçimi (route, legs, tm). Dönüş: yeni entry | null (zaten yazılı ya da nokta yok)
export function placeRound(entry, k, sail, t) {
  const route = entry?.route || [];
  if (k < 0 || k >= route.length) return null;
  const legs = route.map((_, j) => [...(entry.legs?.[j] || [])]);
  if (legs[k].includes(sail)) return null;
  const tm = route.map((_, j) => ({ ...(entry.tm?.[j] || {}) }));
  let i = legs[k].findIndex((s) => tm[k][s] && tm[k][s] > t);
  if (i < 0) i = legs[k].length;
  legs[k].splice(i, 0, sail);
  tm[k][sail] = t;
  return { ...entry, route: [...route], legs, tm };
}

// Teknenin hangi startta yarıştığı: günün grubu (groups[day] { yelken: grup }) süren startların grubuyla eşleşir; tek start varsa o
export function startOfBoat(sail, starts, groupOf) {
  const list = (starts || []).filter(Boolean);
  if (list.length <= 1) return list[0] || null;
  const g = groupOf?.[sail] || "";
  return (g && list.find((s) => (s.grp || "") === g)) || null;
}

// ---- Harita (yayında küçük kart) ----
// Noktaları kutuya sığdırır; up: yukarı gelecek yön (parkur ekseni, yoksa kuzey). Dönüş: { pts: [{ id, x, y }], m: metre/birim }
export function fitMap(items, { W = 240, H = 240, pad = 22, up = 0 } = {}) {
  const ok = (items || []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  if (!ok.length) return { pts: [], m: 0 };
  const o = { lat: ok.reduce((s, p) => s + p.lat, 0) / ok.length, lon: ok.reduce((s, p) => s + p.lon, 0) / ok.length };
  const a = (up * Math.PI) / 180;
  const raw = ok.map((p) => {
    const q = xy(o, p);
    return { ...p, rx: q.x * Math.cos(a) - q.y * Math.sin(a), ry: q.x * Math.sin(a) + q.y * Math.cos(a) };
  });
  const xs = raw.map((p) => p.rx);
  const ys = raw.map((p) => p.ry);
  const spanX = Math.max(80, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(80, Math.max(...ys) - Math.min(...ys));
  const m = Math.max(spanX / (W - pad * 2), spanY / (H - pad * 2));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return { pts: raw.map(({ rx, ry, ...p }) => ({ ...p, x: Math.round((W / 2 + (rx - cx) / m) * 10) / 10, y: Math.round((H / 2 - (ry - cy) / m) * 10) / 10 })), m };
}

// Sesle (asistan, isler/tekneTakip.js): "tekne takibini aç/başlat/kapat/durdur", "takip haritasını aç/göster/kapat/kaldır"
// → { on } | { map } | null
export function trackCommand(raw) {
  const s = ` ${String(raw || "").toLocaleLowerCase("tr-TR").replace(/[.!?,]/g, " ").replace(/\s+/g, " ").trim()} `;
  const has = (re) => new RegExp(` (?:${re}) `).test(s);
  const val = has("kapat|durdur|kaldır|bitir|kapansın|dursun") ? false : has("aç|başlat|göster|açılsın|başlasın") ? true : null;
  if (val === null) return null;
  if (has("(?:takip|tekne) harita(?:sı|sını|yı)?|haritada tekneler(?:i)?")) return { map: val };
  if (has("(?:tekne|teknelerin|konum) takib(?:i|ini)")) return { on: val };
  return null;
}
