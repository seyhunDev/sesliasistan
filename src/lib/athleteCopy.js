// Sporcuları kulüp projesinden (dikili-c7cc8) Velora'ya taşıma (Seyhun 2026-11-27): telefonla sunucu arasında aynı biçim.
// Telefon kulüpten okur (yalnız okuma), bu biçimde sunucuya yollar; sunucu Velora'ya aynı kimliklerle yazar (orgs/{ana hesap}/athletes/{id},
// geçmişi athletes/{id}/history/{id}, sınıflar sailingClasses, antrenörler coaches). Kulüpteki veri silinmez.
// Karşılaştırma: iki taraf da belgeyi aynı biçimde (anahtarlar sıralı, tarih = ms) yazıya çevirip özetini (hash) alır.

// Firestore değeri -> düz JSON. Tarih (Timestamp, Date) { __ts: ms } olur; geri çevirmek için decodeDoc.
export function encodeValue(v) {
  if (v == null) return null;
  if (typeof v.toDate === "function") return { __ts: v.toDate().getTime() };
  if (v instanceof Date) return { __ts: v.getTime() };
  if (Array.isArray(v)) return v.map(encodeValue);
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encodeValue(x)]));
  return v;
}

// Düz JSON -> Firestore değeri. toTs: ms -> Timestamp (sunucuda firebase-admin Timestamp.fromMillis)
export function decodeValue(v, toTs) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map((x) => decodeValue(x, toTs));
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === "__ts" && Number.isFinite(v.__ts)) return toTs(v.__ts);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeValue(x, toTs)]));
  }
  return v;
}

// Anahtarları sıralı yazı (aynı veri iki tarafta aynı yazıyı verir)
export function stable(v) {
  if (v == null) return "null";
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

// Kısa özet (FNV-1a 32 bit, iki kez farklı tohumla): güvenlik için değil, "aynı mı" karşılaştırması için
export function digest(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

// Bir sporcunun özeti: kartı + geçmiş kayıtları (kimliğe göre sıralı). enc: encodeValue çıktısı
export const athleteDigest = (data, history = []) =>
  digest(stable({ data, history: [...history].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)).map((h) => [h.id, h.data]) }));

export const docDigest = (data) => digest(stable(data));

// Kaynak ve hedef özetlerini karşılaştır. src/dst: { athletes: {id: özet}, classes: {id: özet}, coaches: {id: özet} }
// Dönüş: { ok, counts: { athletes: [kaynak, hedef], … }, missing: [ad], changed: [ad], extra: [ad] }
export function compareCopy(src, dst, names = {}) {
  const out = { ok: true, counts: {}, missing: [], changed: [], extra: [] };
  for (const part of ["athletes", "classes", "coaches"]) {
    const a = src?.[part] || {}, b = dst?.[part] || {};
    out.counts[part] = [Object.keys(a).length, Object.keys(b).length];
    const label = (id) => (part === "athletes" ? names[id] || id : `${part === "classes" ? "Sınıf" : "Antrenör"} ${names[id] || id}`);
    for (const id of Object.keys(a)) {
      if (!(id in b)) out.missing.push(label(id));
      else if (a[id] !== b[id]) out.changed.push(label(id));
    }
    for (const id of Object.keys(b)) if (!(id in a)) out.extra.push(label(id));
  }
  out.ok = !out.missing.length && !out.changed.length && !out.extra.length;
  return out;
}

// Sunucuya kaçar sporcu birden yollanır (istek boyutu küçük kalsın)
export const COPY_CHUNK = 15;
