// Teslimat adresi: konuma 300 m içindeki kayıtlı adres kendiliğinden seçilir, yoksa sorulur.
// Adres: { id, name: "Ev"|"Kulüp"|…, text, note, pos: { lat, lng } }

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
