// Deniz trafiği (AIS): saf yardımcılar, sunucu (/api/sea), sayfa (/sea) ve asistan (isler/deniz.js) aynı kuralları kullanır.
// Kaynak aisstream.io (ücretsiz). Gemi kaydı: { m: MMSI, n: ad, t: tür kodu, lat, lon, sog: knot, cog, hdg, st: seyir durumu,
// dest: gideceği yer, seen: son sinyal (ms), h: son konumlar [[ms, lat, lon, sog]] (en çok 6) }.

// Dikili çevresi: Midilli boğazı, Ayvalık, Çandarlı, Aliağa
export const SEA_BOX = [[38.75, 26.4], [39.4, 27.05]];
export const SEA_CENTER = { lat: 39.071, lon: 26.886 };
export const PORTS = [
  { id: "dikili", name: "Dikili", lat: 39.0715, lon: 26.8855 },
  { id: "aliaga", name: "Aliağa", lat: 38.8, lon: 26.94 },
  { id: "candarli", name: "Çandarlı", lat: 38.935, lon: 26.935 },
  { id: "ayvalik", name: "Ayvalık", lat: 39.316, lon: 26.69 },
  { id: "midilli", name: "Midilli", lat: 39.104, lon: 26.556 },
];
// Dikili Sahil Güvenlik karakolu (limanda, yaklaşık konum)
export const SG_POST = { name: "Dikili Sahil Güvenlik", lat: 39.0725, lon: 26.8862 };
export const EMERGENCY = [
  { tel: "158", label: "Sahil Güvenlik" },
  { tel: "112", label: "Acil" },
];
export const VHF = "VHF Kanal 16";
export const KEEP_MS = 30 * 60e3; // demirli/bağlı gemiler 3–6 dk'da bir sinyal yollar; 30 dk görünmeyen silinir
export const REFRESH = [10, 20, 30, 60];

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const inBox = (p, box = SEA_BOX) => p && p.lat >= box[0][0] && p.lat <= box[1][0] && p.lon >= box[0][1] && p.lon <= box[1][1];
export function nearestPort(p) {
  let best = null;
  for (const port of PORTS) {
    const d = km(p, port);
    if (!best || d < best.km) best = { ...port, km: d };
  }
  return best;
}

// AIS gemi türü kodu → kısa ad
export function typeLabel(t) {
  const c = Number(t) || 0;
  if (c === 30) return "Balıkçı";
  if (c === 31 || c === 32 || c === 52) return "Römorkör";
  if (c === 36) return "Yelkenli";
  if (c === 37) return "Yat";
  if (c >= 40 && c <= 49) return "Sürat teknesi";
  if (c === 50) return "Kılavuz";
  if (c === 51) return "Arama kurtarma";
  if (c === 53) return "Liman hizmet";
  if (c === 55) return "Kolluk";
  if (c >= 60 && c <= 69) return "Yolcu";
  if (c >= 70 && c <= 79) return "Kuru yük";
  if (c >= 80 && c <= 89) return "Tanker";
  return "Gemi";
}
const SG_NAME = /\b(TCSG|SAHIL ?GUV|SAHİL ?GÜV|COAST ?GUARD|KBS)/i;
export const isGuard = (s) => Number(s?.t) === 55 || Number(s?.t) === 51 || SG_NAME.test(s?.n || "");

// AIS seyir durumu: 0 makineyle seyir, 1 demirde, 2 kumanda edilemiyor, 3 manevrası kısıtlı, 5 bağlı, 6 karaya oturmuş, 7 balık avında, 8 yelkenle seyir
const MOVING = 1; // knot
const STILL = 0.4;
const PORT_KM = 0.8;

// Geminin durumu: { key, label, warn?, port, km, min? }. key: approach | leave | underway | ready | anchor | moored | fishing | trouble
export function shipState(s, now = Date.now()) {
  const p = { lat: s.lat, lon: s.lon };
  const port = nearestPort(p);
  const out = (key, label, extra = {}) => ({ key, label, port: port.name, km: Math.round(port.km * 10) / 10, ...extra });
  const st = Number(s.st);
  const sog = Number(s.sog) || 0;
  if (st === 6) return out("trouble", "Karaya oturmuş", { warn: true });
  if (st === 2) return out("trouble", "Kumanda edilemiyor", { warn: true });
  if (sog >= MOVING) {
    if (st === 7) return out("fishing", "Balık avında");
    // Limana uzaklık: son konumlara göre azalıyorsa yanaşıyor, artıyorsa (limana yakınken) ayrılıyor
    const h = s.h || [];
    const first = h.length > 1 ? h[0] : null;
    if (first) {
      const was = km({ lat: first[1], lon: first[2] }, port);
      const diff = port.km - was;
      if (diff < -0.05 && port.km < 12) return out("approach", "Yanaşıyor", { min: Math.max(1, Math.round((port.km / (sog * 1.852)) * 60)) });
      if (diff > 0.05 && port.km < 6) return out("leave", "Ayrılıyor");
    } else if (port.km < 12 && towards(s, port)) {
      return out("approach", "Yanaşıyor", { min: Math.max(1, Math.round((port.km / (sog * 1.852)) * 60)) });
    }
    return out("underway", "Seyirde");
  }
  // Kalkmaya hazırlanıyor: durmuşken hızlanmaya başladı ya da son 30 dk'da durumunu demirde/bağlı'dan "seyirde"ye çevirdi
  const prev = (s.h || []).at(-2)?.[3];
  const waking = sog > STILL && prev != null && prev <= STILL;
  const atPort = port.km <= PORT_KM;
  const switched = (st === 0 || st === 8) && (s.prevSt === 1 || s.prevSt === 5) && now - (s.stSince || 0) < KEEP_MS;
  if (waking || switched) return out("ready", "Kalkacak", { atPort });
  if (st === 7) return out("fishing", "Balık avında");
  if (st === 5 || (st !== 1 && atPort)) return out("moored", "Limanda");
  return out("anchor", "Demirde");
}
function towards(s, port) {
  const cog = Number(s.cog);
  if (!Number.isFinite(cog) || cog >= 360) return false;
  const y = Math.sin(rad(port.lon - s.lon)) * Math.cos(rad(port.lat));
  const x = Math.cos(rad(s.lat)) * Math.sin(rad(port.lat)) - Math.sin(rad(s.lat)) * Math.cos(rad(port.lat)) * Math.cos(rad(port.lon - s.lon));
  const brg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const d = Math.abs(((cog - brg + 540) % 360) - 180);
  return d < 25;
}

// aisstream mesajı → gemi kaydına yazılacak alanlar ({ m, ...alanlar }) ya da null
export function parseAis(msg, now = Date.now()) {
  const type = msg?.MessageType;
  const meta = msg?.MetaData || {};
  const body = msg?.Message?.[type];
  const m = Number(meta.MMSI || body?.UserID);
  if (!m || !body) return null;
  const name = String(meta.ShipName || "").replace(/@+/g, "").trim();
  const base = { m, ...(name ? { n: name } : {}) };
  if (type === "PositionReport" || type === "StandardClassBPositionReport" || type === "ExtendedClassBPositionReport") {
    const lat = Number(body.Latitude ?? meta.latitude), lon = Number(body.Longitude ?? meta.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const out = { ...base, lat, lon, seen: now, sog: Number(body.Sog) < 102.3 ? Number(body.Sog) : 0, cog: Number(body.Cog), hdg: Number(body.TrueHeading) };
    if (type === "PositionReport") out.st = Number(body.NavigationalStatus);
    if (type === "ExtendedClassBPositionReport" && body.Type) out.t = Number(body.Type);
    return out;
  }
  if (type === "ShipStaticData") {
    return { ...base, ...(body.Name ? { n: String(body.Name).replace(/@+/g, "").trim() } : {}), t: Number(body.Type) || 0, dest: String(body.Destination || "").replace(/@+/g, "").trim() };
  }
  if (type === "StaticDataReport") {
    const a = body.ReportA?.Valid ? body.ReportA : null;
    const b = body.ReportB?.Valid ? body.ReportB : null;
    if (a?.Name) return { ...base, n: String(a.Name).replace(/@+/g, "").trim() };
    if (b?.ShipType) return { ...base, t: Number(b.ShipType) };
    return null;
  }
  return null;
}

// Gelen alanları gemi listesine (MMSI → kayıt) işler; konum geçmişi en çok 6
export function mergeShip(all, part) {
  const old = all[part.m] || { m: part.m };
  const next = { ...old, ...part };
  if (part.lat != null) {
    next.h = [...(old.h || []), [part.seen, part.lat, part.lon, part.sog || 0]].slice(-6);
  }
  // Seyir durumu değişti (ör. demirde → seyirde): önceki durum ve zamanı kalkış tahmini için saklanır
  if (part.st != null && old.st != null && part.st !== old.st) Object.assign(next, { prevSt: old.st, stSince: part.seen });
  all[part.m] = next;
  return all;
}

export function prune(all, now = Date.now()) {
  for (const k of Object.keys(all)) if (!all[k].seen || now - all[k].seen > KEEP_MS) delete all[k];
  return all;
}

// Telefona giden kısa liste: konumu olan gemiler, durumuyla
export function shipList(all, now = Date.now()) {
  return Object.values(all)
    .filter((s) => s.lat != null && inBox(s))
    .map((s) => ({ m: s.m, n: s.n || `MMSI ${s.m}`, t: s.t || 0, type: typeLabel(s.t), lat: s.lat, lon: s.lon, sog: Math.round((s.sog || 0) * 10) / 10, cog: Number.isFinite(s.cog) && s.cog < 360 ? Math.round(s.cog) : null, dest: s.dest || "", seen: s.seen, guard: isGuard(s), state: shipState(s, now) }));
}

// Sayfadaki bölümler (sıra sabit)
export const GROUPS = [
  { id: "move", title: "Yaklaşan / ayrılan", keys: ["approach", "leave", "ready", "trouble"] },
  { id: "underway", title: "Seyirde", keys: ["underway", "fishing"] },
  { id: "anchor", title: "Demirde", keys: ["anchor"] },
  { id: "moored", title: "Limanda", keys: ["moored"] },
];
export function groupShips(list) {
  return GROUPS.map((g) => ({ ...g, ships: list.filter((s) => g.keys.includes(s.state.key)).sort((a, b) => a.state.km - b.state.km) })).filter((g) => g.ships.length);
}

// Satırın alt yazısı: "Yolcu · 11,2 kn · Dikili'ye 20 dk"
const fmt = (n) => String(n).replace(".", ",");
export function shipLine(s) {
  const st = s.state;
  const parts = [s.type];
  if (s.sog >= MOVING) parts.push(`${fmt(s.sog)} kn`);
  if (st.key === "approach") parts.push(`${st.port}${suffix(st.port, "ye")} ${st.min} dk`);
  else if (st.key === "leave") parts.push(`${st.port}${suffix(st.port, "den")} çıkıyor`);
  else if (s.dest) parts.push(s.dest);
  else parts.push(`${st.port} ${fmt(st.km)} km`);
  return parts.join(" · ");
}
// Türkçe ek: Dikili'ye/Aliağa'ya, Dikili'den/Çandarlı'dan
function suffix(name, kind) {
  const last = [...name.toLocaleLowerCase("tr-TR")].reverse().find((c) => "aeıioöuü".includes(c)) || "a";
  const front = "eiöü".includes(last);
  const vowelEnd = "aeıioöuü".includes(name.slice(-1).toLocaleLowerCase("tr-TR"));
  if (kind === "ye") return `'${vowelEnd ? "y" : ""}${front ? "e" : "a"}`;
  return `'${front ? "den" : "dan"}`;
}

// "14 sn önce", "3 dk önce"
export function agoText(at, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s} sn önce` : `${Math.round(s / 60)} dk önce`;
}

// ---- Asistan: "yanaşan gemi var mı", "limanda kaç gemi var", "deniz trafiği nasıl", "sahil güvenliğin numarası ne",
//      "demirde kaç gemi var", "sahil güvenlik nerede". Dönüş: { q: "approach" | "moored" | "anchor" | "underway" | "summary" | "guard" | "emergency" } | null
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!?…]+/gu, " ").replace(/\s+/g, " ").trim();
export function seaAsk(raw) {
  const t = low(raw);
  if (!t) return null;
  const sg = /sahil ?güvenli\p{L}*|sahil ?guvenli\p{L}*/u.test(t);
  if (sg && /(numara|telefon|ar[aı]\p{L}*|ulaş|acil)/u.test(t)) return { q: "emergency" };
  if (sg && /(nerede|neresi|konum|yakın)/u.test(t)) return { q: "guard" };
  if (/denizde acil|acil durum(da)? (kimi|nereyi|nasıl)|denizde (kaza|tehlike)/u.test(t)) return { q: "emergency" };
  const ship = /(gemi|tekne|vapur|feribot|tanker|deniz trafi)\p{L}*/u.test(t);
  if (!ship) return null;
  if (/(ekle|sil|kaydet|not al|hatırlat|plan)/u.test(t)) return null;
  if (/deniz trafi\p{L}*/u.test(t) && /(aç|göster|git)(?!\p{L})/u.test(t) && !/(var mı|nasıl|kaç|ne durumda)/u.test(t)) return null; // sayfa açma: nav
  if (/(yanaş|yaklaş|geliyor|gelen|giriyor|ayrıl|çıkıyor|kalk)/u.test(t)) return { q: "approach" };
  if (/(limanda|bağlı|rıhtım)/u.test(t)) return { q: "moored" };
  if (/(demir)/u.test(t)) return { q: "anchor" };
  if (/(seyirde|hareket ed|yolda|geçiyor)/u.test(t)) return { q: "underway" };
  if (/(deniz trafi|kaç gemi|gemi var mı|gemiler ne|gemiler nerede)/u.test(t)) return { q: "summary" };
  return null;
}

// Asistanın cevabı (veri: /api/sea cevabı)
export function seaAnswer(q, data) {
  if (q === "emergency") return `Denizde acil durumda Sahil Güvenlik 158'i ara, telsizde ${VHF}. Genel acil 112.`;
  if (!data?.ships) return data?.error === "nokey" ? "Deniz trafiği için önce aisstream anahtarını Netlify'a eklemek gerekiyor." : "Gemi bilgisini şu an alamadım.";
  const list = data.ships;
  const of = (keys) => list.filter((s) => keys.includes(s.state.key));
  const names = (arr) => arr.slice(0, 3).map((s) => s.n).join(", ");
  if (q === "guard") {
    const g = list.filter((s) => s.guard);
    if (!g.length) return "Sinyal veren Sahil Güvenlik teknesi görünmüyor. Karakol Dikili limanında; acil durumda 158.";
    return `${g.length} Sahil Güvenlik teknesi görünüyor: ${g.map((s) => `${s.n}, ${s.state.port} ${fmt(s.state.km)} km`).join("; ")}.`;
  }
  if (q === "approach") {
    const a = of(["approach"]), l = of(["leave"]), r = of(["ready"]);
    if (!a.length && !l.length && !r.length) return "Şu an yanaşan ya da ayrılan gemi yok.";
    const out = [];
    if (a.length) out.push(`${a.length} gemi yanaşıyor: ${a.slice(0, 3).map((s) => `${s.n}, ${s.state.port}${suffix(s.state.port, "ye")} ${s.state.min} dk`).join("; ")}`);
    if (l.length) out.push(`${l.length} gemi ayrılıyor: ${names(l)}`);
    if (r.length) out.push(`${r.length} gemi kalkmaya hazırlanıyor: ${names(r)}`);
    return `${out.join(". ")}.`;
  }
  const one = (keys, none, many) => {
    const a = of(keys);
    return a.length ? `${a.length} gemi ${many}: ${names(a)}${a.length > 3 ? "…" : "."}` : none;
  };
  if (q === "moored") return one(["moored"], "Limanda bağlı gemi görünmüyor.", "limanda");
  if (q === "anchor") return one(["anchor"], "Demirde gemi görünmüyor.", "demirde");
  if (q === "underway") return one(["underway", "fishing"], "Seyirde gemi görünmüyor.", "seyirde");
  if (!list.length) return "Çevrede sinyal veren gemi görünmüyor.";
  const c = (keys) => of(keys).length;
  const parts = [[c(["approach"]), "yanaşıyor"], [c(["leave"]), "ayrılıyor"], [c(["underway", "fishing"]), "seyirde"], [c(["anchor"]), "demirde"], [c(["moored"]), "limanda"]].filter(([n]) => n).map(([n, w]) => `${n} ${w}`);
  return `Çevrede ${list.length} gemi var: ${parts.join(", ")}.`;
}
