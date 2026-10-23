// Halka açık canlı kameralar (Seyhun 2026-10-23): seçilen yerin çevresindeki kameralar, Windy Webcams API (ücretsiz katman).
// Saf işlevler: hazır yerler, uzaklık, Windy cevabını sadeleştirme, "x dk önce", sesli komut ("Ayvalık kameralarını aç").
// Sunucu /api/cams, sayfa src/features/cams, asistan isler/kamera.js.

export const CAMS_RADIUS = 100; // km; Dikili'nin kendisinde kamera yok, Ayvalık, Bergama, Midilli, Foça, İzmir bu çemberde
export const CAMS_FIRST = 6; // büyük kartın altında ilk görünen; kalanı "Daha fazla"

// Hazır yerler (yer penceresi ve sesli komut). İlki varsayılan (konum izni yoksa).
export const PLACES = [
  { name: "Dikili", lat: 39.071, lon: 26.889 },
  { name: "Ayvalık", lat: 39.319, lon: 26.694 },
  { name: "Bergama", lat: 39.121, lon: 27.18 },
  { name: "Foça", lat: 38.67, lon: 26.757 },
  { name: "İzmir", lat: 38.423, lon: 27.143 },
  { name: "Midilli", lat: 39.106, lon: 26.555 },
];

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function distKm(a, b) {
  const x = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const kmLabel = (km) => (km < 1 ? "<1 km" : `${Math.round(km)} km`);

// "şimdi", "5 dk", "2 sa", "3 gün" (kameranın son görüntüsü)
export function agoLabel(t, now = Date.now()) {
  if (!t) return "";
  const m = Math.max(0, Math.round((now - t) / 60e3));
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk`;
  if (m < 48 * 60) return `${Math.round(m / 60)} sa`;
  return `${Math.round(m / 1440)} gün`;
}

// Telefonun konumuna 15 km'den yakın hazır yer varsa onun adı ("Konumum · Dikili")
export function nearPlace(p) {
  const best = PLACES.map((x) => ({ x, km: distKm(p, x) })).sort((a, b) => a.km - b.km)[0];
  return best && best.km <= 15 ? best.x.name : "";
}

const fold = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, " ").replace(/[.,!?;:"]/g, " ").replace(/\s+/g, " ").trim();
export const findPlace = (name) => PLACES.find((p) => fold(p.name) === fold(name)) || null;

// Windy v3 kamerası → { id, title, lat, lon, at, thumb, preview, player, link, live }. Görüntüsü olmayan atlanır.
// player.day bazen metin, bazen { embed } olarak gelir; ikisi de okunur.
const url = (v) => (typeof v === "string" ? v : v?.embed || v?.link || "");
export function normCam(w) {
  const im = w?.images?.current || {};
  const preview = im.preview || im.thumbnail || "";
  if (!w?.webcamId || !preview || (w.status && w.status !== "active")) return null;
  const loc = w.location || {};
  const pl = w.player || {};
  return {
    id: String(w.webcamId),
    title: String(w.title || loc.city || "Kamera").trim(),
    lat: +loc.latitude,
    lon: +loc.longitude,
    at: Date.parse(w.lastUpdatedOn || "") || 0,
    thumb: im.thumbnail || preview,
    preview,
    player: url(pl.live) || url(pl.day) || url(pl.lifetime) || "",
    live: !!url(pl.live),
    link: w.urls?.detail || `https://www.windy.com/webcams/${w.webcamId}`,
    src: "Windy",
  };
}

// Sunucu cevabı → yakından uzağa, km eklenmiş liste
export function camList(webcams, at) {
  return (webcams || [])
    .map(normCam)
    .filter(Boolean)
    .map((c) => ({ ...c, km: Number.isFinite(c.lat) ? distKm(at, c) : 999 }))
    .sort((a, b) => a.km - b.km);
}

// YouTube canlı yayını (Türk kıyısındaki belediye, otel, marina kameraları çoğunlukla burada; Windy'de az, 2026-10-23).
// search.list öğesi → kamera; yalnız başlığında ya da kanal adında yerin adı geçen yayın alınır (haber kanalları elenir).
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export function ytCam(it, place) {
  const id = it?.id?.videoId;
  const sn = it?.snippet || {};
  if (!id || (sn.liveBroadcastContent && sn.liveBroadcastContent !== "live")) return null;
  const title = decode(sn.title).trim();
  const ch = decode(sn.channelTitle).trim();
  const p = fold(place);
  if (p && !fold(`${title} ${ch}`).includes(p)) return null;
  if (/(^|\s)(haber|news|son dakika|tv)(\s|$)/i.test(fold(title))) return null;
  const th = sn.thumbnails || {};
  const img = th.high?.url || th.medium?.url || th.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return { id: `yt:${id}`, title, ch, lat: NaN, lon: NaN, at: 0, thumb: img, preview: img, player: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1`, live: true, link: `https://www.youtube.com/watch?v=${id}`, km: null, src: "YouTube" };
}
export const ytList = (items, place) => (items || []).map((x) => ytCam(x, place)).filter(Boolean);

export const camsPath = (place) => (place ? `/cams?yer=${encodeURIComponent(place)}` : "/cams");

// Sesli komut: "kameraları aç", "canlı kameraları göster", "Ayvalık kameralarını aç", "Midilli'deki kameralar",
// "Çeşme kamerası". Tekil ve yersiz "kamerayı aç" fiş kamerasıdır (lib/assistantLocal.js), buraya girmez.
// Dönüş: { place: "Ayvalık" | "Çeşme" | "" } ya da null.
const SKIP = new Set(["canlı", "halka", "açık", "yakındaki", "yakın", "çevredeki", "bütün", "tüm", "bu", "şu", "o", "ön", "arka", "fiş", "fişin", "fatura", "telefon", "telefonun", "zamanlayıcı", "sayaçlı", "web", "yarış", "antrenman", "deniz", "sahil", "liman", "plaj", "zamanlayıcılı", "sayımlı", "iphone", "uygulama"]);
const SUFFIX = /(?:da|de|ta|te)(?:ki)?$|(?:nın|nin|nun|nün|ın|in|un|ün)$/u;
export function camsAsk(text) {
  const t = fold(text);
  if (!t || t.split(" ").length > 8) return null;
  if (/(^|\s)(fiş|fatura|kasa|video|fotoğraf|çek|kaydet|kayıt)/.test(t)) return null;
  const m = t.match(/(^|\s)(kamera\S*|webcam\S*)/);
  if (!m) return null;
  const plural = /^kameralar/.test(m[2]) || /^webcam/.test(m[2]);
  // Yer adı: hazır yerlerden biri cümlede geçiyorsa o; yoksa "kamera"dan önceki kelime (ekiyle: "Çeşme'deki", "Bodrumun")
  const known = PLACES.find((p) => new RegExp(`(^|\\s)${fold(p.name)}`).test(t));
  if (known) return { place: known.name };
  const raw = String(text).match(/(\S+)\s+(?:kamera|webcam)/iu)?.[1] || "";
  const word = fold(raw.replace(/[’']\S*$/, ""));
  if (word && !SKIP.has(word) && word.length > 2) {
    const name = /[’']/.test(raw) ? word : word.replace(SUFFIX, "");
    if (name.length > 2) return { place: name.charAt(0).toLocaleUpperCase("tr-TR") + name.slice(1) };
  }
  if (plural || word === "canlı" || /kamera sayfa|kamera ekran/.test(t)) return { place: "" };
  return null;
}
