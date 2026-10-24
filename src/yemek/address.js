// Teslimat adresi: konuma 300 m içindeki kayıtlı adres kendiliğinden seçilir, yoksa sorulur.
// Adres: { id, name: "Ev"|"İş"|"Kulüp"|…, street, area, floor, flat, bell, note, text (addressText), pos: { lat, lng } }

export const NEAR_M = 300;

export function distanceM(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const distanceKm = (a, b) => distanceM(a, b) / 1000;

// Sonuç: { address, why: "near"|"last"|"only", ask: false } ya da { address: null, ask: true }
// pos yoksa (konum izni yok) son kullanılan adres seçilir; tek adres varsa o.
export function pickAddress(addresses = [], pos, lastId) {
  if (!addresses.length) return { address: null, ask: true };
  if (pos) {
    const near = addresses.map((a) => ({ a, d: distanceM(pos, a.pos) })).filter((x) => x.d <= NEAR_M).sort((x, y) => x.d - y.d)[0];
    if (near) return { address: near.a, why: "near", ask: false };
    return { address: null, ask: true };
  }
  const last = addresses.find((a) => a.id === lastId);
  if (last) return { address: last, why: "last", ask: false };
  if (addresses.length === 1) return { address: addresses[0], why: "only", ask: false };
  return { address: null, ask: true };
}

// Asistan: "kulübe", "eve gönder" → adres
export function addressBySpeech(addresses = [], s = "") {
  const t = s.toLocaleLowerCase("tr");
  return addresses.find((a) => {
    const n = a.name.toLocaleLowerCase("tr");
    return new RegExp(`(^|\\P{L})${n.slice(0, Math.max(2, n.length - 1))}\\p{L}{0,3}(\\P{L}|$)`, "u").test(t);
  }) || null;
}

// Haritadan adres: Nominatim (OpenStreetMap, ücretsiz, saniyede bir istek) ters arama cevabı → { street, area }
// street "1453 Sk. No 12", area "Cumhuriyet Mah., Dikili"
const short = (s = "") => s.replace(/\s+Mahallesi$/u, " Mah.").replace(/\s+Sokağı$|\s+Sokak$/u, " Sk.").replace(/\s+Caddesi$/u, " Cd.").replace(/\s+Bulvarı$/u, " Blv.");
export function parseReverse(json) {
  const a = json?.address || {};
  const road = a.road || a.pedestrian || a.footway || a.path || "";
  const street = road ? `${short(road)}${a.house_number ? ` No ${a.house_number}` : ""}` : "";
  const hood = a.suburb || a.neighbourhood || a.quarter || a.city_district || "";
  const town = a.town || a.city || a.village || a.county || "";
  const area = [short(hood), town].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).join(", ");
  return { street, area };
}

// Kayıtlı adresin tek satırı (sipariş, restoran ve kurye ekranı bunu gösterir)
export function addressText(a = {}) {
  const parts = [a.street, a.floor && `Kat ${a.floor}`, a.flat && `Daire ${a.flat}`, a.bell && `Zil ${a.bell}`].filter(Boolean).join(", ");
  return [parts, a.area].filter(Boolean).join(" · ");
}

// Haritadaki yerin küçük resmi: yere en yakın 4 OpenStreetMap karosu; dx, dy karonun sol üst köşesinin yere göre pikseli
// (resimde yer ortada dursun: arka plan konumu = yarıçap + dx)
export function tileOf(pos, z = 16) {
  const n = 2 ** z, rad = (pos.lat * Math.PI) / 180;
  const fx = ((pos.lng + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5);
  const out = [];
  for (const x of [x0, x0 + 1]) for (const y of [y0, y0 + 1]) {
    out.push({ url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, dx: Math.round((x - fx) * 256), dy: Math.round((y - fy) * 256) });
  }
  return out;
}
