// Yarışın çevresi: yarış alanı ve otelin konumu, aradaki yol, yakındaki market/eczane/restoran, gezilecek yerler.
// Gerçek yerler OpenStreetMap'ten gelir (anahtarsız, ücretsiz; istekler telefondan gider): konum Nominatim,
// yakın yerler Overpass, yol OSRM. Yapay zeka (/api/race-around) yalnız ulaşım özetini yazar ve
// OSM'den gelen adaylar arasından gezilecek yerleri seçer; yer uydurmaz.
// Sonuç yarışın `around` alanına kaydedilir; yalnız kullanıcı "Getir" deyince istenir.

export const KINDS = {
  market: { label: "Market", tone: "#16a34a", letter: "M" },
  pharmacy: { label: "Eczane", tone: "#dc2626", letter: "+" },
  food: { label: "Restoran", tone: "#ea580c", letter: "R" },
  sight: { label: "Gezilecek", tone: "#7c3aed", letter: "★" },
};
const PER_KIND = 5; // her nokta için her türden en yakın kaç yer
const NEAR_M = { market: 1500, pharmacy: 2000, food: 1000 };
const SIGHT_M = 15000;
const MAX_SIGHTS = 8;

const S = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, d = 5) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null;
};
const okPoint = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

// İki nokta arası kuş uçuşu mesafe (metre)
export function meters(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export const distText = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",")} km`);
export const minText = (min) => (min < 60 ? `${Math.max(1, Math.round(min))} dk` : `${Math.floor(min / 60)} sa${Math.round(min % 60) ? ` ${Math.round(min % 60)} dk` : ""}`);

// Kayıtta yalnız bilinen alanlar kalır (Firestore belgesi küçük kalsın)
function cleanPoint(p) {
  if (!p || typeof p !== "object") return null;
  const out = { q: S(p.q, 120), name: S(p.name, 160), lat: num(p.lat), lon: num(p.lon) };
  return okPoint(out) ? out : null;
}
function cleanPlace(p) {
  if (!p || typeof p !== "object" || !KINDS[p.kind]) return null;
  const out = { id: S(p.id, 40), kind: p.kind, name: S(p.name, 80), lat: num(p.lat), lon: num(p.lon), m: Math.max(0, Math.round(Number(p.m) || 0)) };
  if (!out.id || !out.name || !okPoint(out)) return null;
  if (p.near === "hotel" || p.near === "venue") out.near = p.near;
  if (p.why) out.why = S(p.why, 200);
  if (p.sub) out.sub = S(p.sub, 40);
  return out;
}
export function cleanAround(a) {
  if (!a || typeof a !== "object") return null;
  const venue = cleanPoint(a.venue);
  if (!venue) return null;
  // Firestore iç içe dizi kabul etmez: çizgi düz dizi [enlem, boylam, enlem, boylam…] olarak tutulur
  const raw = (Array.isArray(a.route?.line) ? a.route.line : []).flat().map((x) => num(x));
  const line = [];
  for (let i = 0; i + 1 < raw.length && line.length < 240; i += 2) if (raw[i] !== null && raw[i + 1] !== null) line.push(raw[i], raw[i + 1]);
  const route = a.route && Number(a.route.km) > 0 ? { km: Math.round(Number(a.route.km) * 10) / 10, min: Math.max(1, Math.round(Number(a.route.min) || 0)), line } : null;
  const seen = new Set();
  const places = (Array.isArray(a.places) ? a.places : []).map(cleanPlace).filter((p) => p && !seen.has(p.id) && seen.add(p.id)).slice(0, 60);
  return {
    venue,
    hotel: cleanPoint(a.hotel),
    route,
    places,
    transport: S(a.transport, 600),
    tip: S(a.tip, 300),
    at: S(a.at, 30),
  };
}

// Aranacak metinler: önce en ayrıntılısı (ad + ilçe + il), bulunamazsa sadeleşir
export function searchTexts(name, r) {
  const n = S(name, 120);
  const d = S(r?.district, 40);
  const c = S(r?.city, 40);
  const has = (s) => n.toLocaleLowerCase("tr-TR").includes(s.toLocaleLowerCase("tr-TR"));
  const list = [];
  if (n) {
    list.push([n, d && !has(d) && d, c && !has(c) && c].filter(Boolean).join(", "));
    if (d && !has(d)) list.push(`${n}, ${d}`);
    list.push(n);
  }
  return [...new Set(list.filter(Boolean))];
}

// Overpass sonucundaki yerin türü
export function kindOf(tags = {}) {
  if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy") return "pharmacy";
  if (/^(supermarket|convenience|greengrocer)$/.test(tags.shop || "")) return "market";
  if (/^(restaurant|fast_food|cafe)$/.test(tags.amenity || "")) return "food";
  if (/^(attraction|museum|viewpoint|gallery)$/.test(tags.tourism || "") || /^(castle|monument|ruins|archaeological_site|memorial|fort)$/.test(tags.historic || "") || tags.natural === "beach" || tags.leisure === "park" || tags.leisure === "nature_reserve") return "sight";
  return null;
}
const SUB = {
  supermarket: "Süpermarket", convenience: "Bakkal / market", greengrocer: "Manav", restaurant: "Restoran", fast_food: "Hızlı yemek", cafe: "Kafe",
  attraction: "Görülecek yer", museum: "Müze", viewpoint: "Manzara noktası", gallery: "Galeri", castle: "Kale", monument: "Anıt", ruins: "Kalıntı",
  archaeological_site: "Antik kent / ören yeri", memorial: "Anıt", fort: "Kale", beach: "Plaj", park: "Park", nature_reserve: "Doğa alanı",
};
const subOf = (t) => SUB[t.shop] || SUB[t.amenity] || SUB[t.tourism] || SUB[t.historic] || SUB[t.natural] || SUB[t.leisure] || "";
const nameOf = (t, kind) => S(t["name:tr"] || t.name || (kind === "pharmacy" ? "Eczane" : ""), 80);

// Overpass öğeleri → en yakın yerler. points: { venue, hotel? }
// Her nokta için her türden en yakın PER_KIND yer; iki noktaya da yakınsa en yakın olana yazılır.
export function pickPlaces(elements, points) {
  const all = new Map();
  for (const e of Array.isArray(elements) ? elements : []) {
    const t = e?.tags || {};
    const kind = kindOf(t);
    if (!kind || kind === "sight") continue;
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    const name = nameOf(t, kind);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const id = `${e.type || "n"}/${e.id}`;
    let best = null;
    for (const near of ["venue", "hotel"]) {
      if (!okPoint(points[near])) continue;
      const m = meters(points[near], { lat, lon });
      if (m <= NEAR_M[kind] && (!best || m < best.m)) best = { near, m };
    }
    if (best && !all.has(id)) all.set(id, { id, kind, name, sub: subOf(t), lat, lon, ...best });
  }
  const out = [];
  for (const near of ["venue", "hotel"])
    for (const kind of ["market", "pharmacy", "food"])
      out.push(...[...all.values()].filter((p) => p.near === near && p.kind === kind).sort((a, b) => a.m - b.m).slice(0, PER_KIND));
  return out.map(cleanPlace).filter(Boolean);
}

// Gezilecek yer adayları (yapay zeka bunlar arasından seçer): adı olan, aynı adı tekrar etmeyen, yakından uzağa
export function pickSights(elements, venue) {
  const seen = new Set();
  return (Array.isArray(elements) ? elements : [])
    .map((e) => {
      const t = e?.tags || {};
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      const name = S(t["name:tr"] || t.name, 80);
      if (kindOf(t) !== "sight" || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { id: `${e.type || "n"}/${e.id}`, kind: "sight", name, sub: subOf(t), lat, lon, m: meters(venue, { lat, lon }), wiki: !!(t.wikipedia || t.wikidata) };
    })
    .filter((p) => p && !seen.has(p.name.toLocaleLowerCase("tr-TR")) && seen.add(p.name.toLocaleLowerCase("tr-TR")))
    .sort((a, b) => b.wiki - a.wiki || a.m - b.m)
    .slice(0, 30);
}

// Haritada yol tarifi. Apple cihazlarda Apple Haritalar, diğerlerinde Google Haritalar.
export const isApple = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent || "");
export function routeLink(from, to, apple = isApple()) {
  const f = from ? `${from.lat},${from.lon}` : "";
  const t = `${to.lat},${to.lon}`;
  return apple
    ? `https://maps.apple.com/?${f ? `saddr=${f}&` : ""}daddr=${t}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1${f ? `&origin=${f}` : ""}&destination=${t}&travelmode=driving`;
}
export function placeLink(p, apple = isApple()) {
  const q = encodeURIComponent(p.name || "");
  return apple ? `https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${q}` : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
}

// --- İstekler (telefondan) ---

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const OSRM = "https://router.project-osrm.org/route/v1/driving";
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function getJson(url, init = {}, ms = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Ad → konum. Nominatim saniyede bir istek ister; aramalar arasında bekler.
export async function findPoint(name, r) {
  for (const [i, q] of searchTexts(name, r).entries()) {
    if (i) await wait(1100);
    const list = await getJson(`${NOMINATIM}?format=jsonv2&limit=1&accept-language=tr&q=${encodeURIComponent(q)}`).catch(() => {
      throw new Error("Harita servisine ulaşılamadı. İnternet bağlantısını kontrol edip biraz sonra tekrar dene.");
    });
    const hit = list?.[0];
    if (hit) return { q: S(name, 120), name: S(hit.display_name, 160), lat: num(hit.lat), lon: num(hit.lon) };
  }
  return null;
}

async function overpass(query) {
  let last;
  for (const url of OVERPASS) {
    try {
      const p = await getJson(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(query)}` }, 30000);
      return p.elements || [];
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("overpass");
}

const at = (p, m) => `(around:${m},${p.lat},${p.lon})`;
export function nearQuery(points) {
  const parts = [];
  for (const p of [points.venue, points.hotel].filter(okPoint)) {
    parts.push(
      `nwr${at(p, NEAR_M.market)}[shop~"^(supermarket|convenience|greengrocer)$"][name];`,
      `nwr${at(p, NEAR_M.pharmacy)}[amenity=pharmacy];`,
      `nwr${at(p, NEAR_M.food)}[amenity~"^(restaurant|fast_food|cafe)$"][name];`,
    );
  }
  return `[out:json][timeout:25];(${parts.join("")});out center tags 600;`;
}
export function sightQuery(v) {
  return `[out:json][timeout:25];(nwr${at(v, SIGHT_M)}[tourism~"^(attraction|museum|viewpoint)$"][name];nwr${at(v, SIGHT_M)}[historic~"^(castle|ruins|archaeological_site|fort)$"][name];nwr${at(v, SIGHT_M)}[natural=beach][name];);out center tags 300;`;
}

// Kayıttaki düz çizgi → harita noktaları [[enlem, boylam]…]
export const linePoints = (line = []) => Array.from({ length: Math.floor(line.length / 2) }, (_, i) => [line[2 * i], line[2 * i + 1]]);

// Otel ↔ yarış alanı araç yolu (km, dakika, haritadaki çizgi en çok 120 nokta)
export async function findRoute(a, b) {
  const p = await getJson(`${OSRM}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`, {}, 15000).catch(() => null);
  const r = p?.routes?.[0];
  if (!r) return null;
  const pts = r.geometry?.coordinates || [];
  const step = Math.max(1, Math.ceil(pts.length / 120));
  const line = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(([lo, la]) => [num(la), num(lo)]);
  return { km: Math.round(r.distance / 100) / 10, min: Math.max(1, Math.round(r.duration / 60)), line };
}

// Hepsini getirir. step(metin): ilerleme. Yapay zeka: askAi(veri) → { transport, tip, sights: [{ id, why }] } (hata verirse atlanır)
export async function gatherAround(r, { venueName, hotelName }, { step = () => {}, askAi } = {}) {
  step("Yarış alanı haritada aranıyor");
  const venue = await findPoint(venueName, r);
  if (!venue) throw new Error("Yarış alanı haritada bulunamadı. Adını değiştirip tekrar dene (ör. kulüp ya da marina adı).");
  let hotel = null;
  if (S(hotelName)) {
    step("Otel haritada aranıyor");
    await wait(1100);
    hotel = await findPoint(hotelName, r).catch(() => null);
  }
  step(hotel ? "Yol, market, eczane ve restoranlar getiriliyor" : "Market, eczane ve restoranlar getiriliyor");
  const [near, sights, route] = await Promise.all([
    overpass(nearQuery({ venue, hotel })).catch(() => {
      throw new Error("Yakındaki yerler getirilemedi (harita servisi meşgul olabilir). Biraz sonra tekrar dene.");
    }),
    overpass(sightQuery(venue)).catch(() => []),
    hotel && meters(venue, hotel) > 150 ? findRoute(hotel, venue) : null,
  ]);
  const places = pickPlaces(near, { venue, hotel });
  const cands = pickSights(sights, venue);
  let ai = null;
  if (askAi) {
    step("Yapay zeka ulaşımı ve gezilecek yerleri hazırlıyor");
    ai = await askAi({ venue, hotel, route, places, sights: cands }).catch(() => null);
  }
  const why = new Map((ai?.sights || []).map((x) => [x.id, x.why]));
  const chosen = ai?.sights?.length ? cands.filter((c) => why.has(c.id)).map((c) => ({ ...c, why: why.get(c.id) })) : cands.slice(0, 6);
  return cleanAround({
    venue,
    hotel,
    route,
    places: [...places, ...chosen.slice(0, MAX_SIGHTS)],
    transport: ai?.transport || localTransport(route, hotel),
    tip: ai?.tip || "",
    at: new Date().toISOString(),
  });
}

// Yapay zeka yoksa kısa ulaşım cümlesi
export function localTransport(route, hotel) {
  if (!hotel) return "";
  if (!route) return "Otel yarış alanına çok yakın, yürüyerek gidilebilir.";
  const walk = route.km <= 3 ? `, yürüyerek yaklaşık ${minText((route.km / 4.5) * 60)}` : "";
  return `Otelden yarış alanına yol ${String(route.km).replace(".", ",")} km, araçla yaklaşık ${minText(route.min)}${walk}.`;
}
