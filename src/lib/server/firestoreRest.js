// Firestore REST: firebase-admin (hizmet hesabı anahtarı) olmadan, çağıranın kendi erişim anahtarıyla okuma/yazma.
// Gmail betiği Google hesabının anahtarını (ScriptApp.getOAuthToken, "datastore" izni) gönderir; sunucu onu aynen kullanır.
// Böylece Netlify'daki yönetici anahtarı bozuk olsa da mail bildirimi çalışır.

const base = () => {
  const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const host = process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1` : "https://firestore.googleapis.com/v1";
  return `${host}/projects/${pid}/databases/(default)/documents`;
};

// JavaScript değeri ⇄ Firestore alanı
export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}
export const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));
export function fromValue(v) {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields);
  return null;
}
export const fromFields = (f = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromValue(v)]));

export function restDb(token) {
  const call = async (method, path, body) => {
    const res = await fetch(`${base()}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
  return {
    // Belge: { id, data } ya da null (yok / yetki yok → status ile)
    async get(path) {
      const r = await call("GET", path);
      return r.status === 200 ? { status: 200, id: path.split("/").pop(), data: fromFields(r.data.fields) } : { status: r.status };
    },
    // Yalnızca verilen alanları günceller
    async patch(path, fields) {
      const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
      return (await call("PATCH", `${path}?${mask}&currentDocument.exists=true`, { fields: toFields(fields) })).status;
    },
    // Yalnızca verilen alanları yazar; belge yoksa oluşturur
    async upsert(path, fields) {
      const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
      return (await call("PATCH", `${path}?${mask}`, { fields: toFields(fields) })).status;
    },
    // Tek alan eşitliğiyle alt koleksiyon sorgusu
    async where(parent, collectionId, field, value, limit = 30) {
      const r = await call("POST", `${parent}:runQuery`, {
        structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: toValue(value) } }, limit },
      });
      if (r.status !== 200 || !Array.isArray(r.data)) return [];
      return r.data.filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").pop(), data: fromFields(x.document.fields) }));
    },
  };
}
