// Bildirim testi için sahte sunucu: Firestore (bellekte), Web Push, Android (FCM), oturum ve NextResponse.
// Gerçek sunucu kodu (/api/notify, pushSend, bildirim kutusu, zamanlayıcı) bunlarla çalışır; hiçbir yere bağlanmaz.
// Gönderilen her bildirim globalThis.__fake.sent listesine yazılır; fail[uç] = 410 / 403 gibi hata kodu o cihaza gönderimi düşürür.
const F = (globalThis.__fake ||= { store: new Map(), sent: [], fail: {}, apps: [] });

// ---- Firestore değerleri ----
const DELETE = { __op: "delete" };
const SERVER_TS = { __op: "ts" };
export const FieldValue = {
  delete: () => DELETE,
  serverTimestamp: () => SERVER_TS,
  increment: (n) => ({ __op: "inc", n }),
};
export const Timestamp = { fromMillis: (ms) => ts(ms), now: () => ts(Date.now()) };
export const ts = (ms) => ({ toMillis: () => ms, toDate: () => new Date(ms) });
export const Filter = {
  where: (field, op, value) => ({ kind: "where", field, op, value }),
  or: (...fs) => ({ kind: "or", fs }),
  and: (...fs) => ({ kind: "and", fs }),
};

export const clone = (v) => (v && typeof v === "object" && !v.toMillis ? (Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]))) : v);
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split(".");
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  const last = ks.at(-1);
  if (v === DELETE) delete cur[last];
  else if (v === SERVER_TS) cur[last] = ts(Date.now());
  else if (v?.__op === "inc") cur[last] = (Number(cur[last]) || 0) + v.n;
  else cur[last] = clone(v);
}
function merge(base, data) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !v.__op && !v.toMillis && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) merge(base[k], v);
    else setPath(base, k.replace(/\./g, "\u0000"), v); // birleştirmede anahtar nokta içerse de tek alan
  }
  return base;
}

const cmp = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)));
function test(data, f) {
  if (f.kind === "or") return f.fs.some((x) => test(data, x));
  if (f.kind === "and") return f.fs.every((x) => test(data, x));
  const v = getPath(data, f.field);
  const w = f.value;
  switch (f.op) {
    case "==":
      return v === w;
    case "!=":
      return v !== undefined && v !== w;
    case ">":
      return v !== undefined && cmp(v, w) > 0;
    case ">=":
      return v !== undefined && cmp(v, w) >= 0;
    case "<":
      return v !== undefined && cmp(v, w) < 0;
    case "<=":
      return v !== undefined && cmp(v, w) <= 0;
    case "in":
      return w.includes(v);
    case "array-contains":
      return Array.isArray(v) && v.includes(w);
    default:
      throw new Error(`sahte Firestore: bilinmeyen işlem ${f.op}`);
  }
}

function snapOf(path) {
  const raw = F.store.get(path);
  const id = path.split("/").at(-1);
  return { id, exists: raw !== undefined, data: () => (raw === undefined ? undefined : clone(raw)), ref: docRef(path), updateTime: ts(Date.now()) };
}
function docRef(path) {
  return {
    id: path.split("/").at(-1),
    path,
    get: async () => snapOf(path),
    set: async (data, opt) => {
      const cur = opt?.merge ? clone(F.store.get(path) || {}) : {};
      for (const [k, v] of Object.entries(data)) {
        if (opt?.merge && v && typeof v === "object" && !Array.isArray(v) && !v.__op && !v.toMillis && cur[k] && typeof cur[k] === "object") merge(cur[k], v);
        else setPath(cur, k.replace(/\./g, "\u0000"), v);
      }
      F.store.set(path, unescapeKeys(cur));
    },
    update: async (patch) => {
      if (!F.store.has(path)) throw Object.assign(new Error(`NOT_FOUND: ${path}`), { code: 5 });
      const cur = clone(F.store.get(path));
      for (const [k, v] of Object.entries(patch)) setPath(cur, k, v);
      F.store.set(path, cur);
    },
    delete: async () => void F.store.delete(path),
    collection: (name) => colRef(`${path}/${name}`),
  };
}
// set() ile gelen nokta içeren anahtarlar tek alan sayılır (Firestore'daki gibi); saklarken geri çevrilir
const unescapeKeys = (o) => (o && typeof o === "object" && !Array.isArray(o) && !o.toMillis ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/\u0000/g, "."), unescapeKeys(v)])) : o);

function query(col, filters = []) {
  return {
    where: (a, op, v) => query(col, [...filters, typeof a === "object" ? a : Filter.where(a, op, v)]),
    orderBy: () => query(col, filters),
    limit: () => query(col, filters),
    get: async () => {
      const depth = col.split("/").length + 1;
      const docs = [...F.store.keys()]
        .filter((p) => p.startsWith(`${col}/`) && p.split("/").length === depth)
        .filter((p) => filters.every((f) => test(F.store.get(p), f)))
        .sort()
        .map(snapOf);
      return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
    },
  };
}
function colRef(path) {
  return { ...query(path), id: path.split("/").at(-1), path, doc: (id = Math.random().toString(36).slice(2, 12)) => docRef(`${path}/${id}`) };
}

const db = {
  collection: (name) => colRef(name),
  doc: (path) => docRef(path),
  runTransaction: async (fn) => {
    const t = {
      get: (ref) => ref.get(),
      update: (ref, patch) => ref.update(patch),
      set: (ref, d, o) => ref.set(d, o),
      delete: (ref) => ref.delete(),
    };
    return fn(t);
  },
  batch: () => {
    const ops = [];
    return { update: (r, p) => ops.push(() => r.update(p)), set: (r, d, o) => ops.push(() => r.set(d, o)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const o of ops) await o(); } };
  },
};
export const getFirestore = () => db;

// ---- firebase-admin/app ----
export const cert = (x) => x;
export const getApps = () => F.apps;
export const initializeApp = (o) => {
  const a = { name: "[DEFAULT]", options: o };
  F.apps.push(a);
  return a;
};

// ---- firebase-admin/auth ----
export const getAuth = () => ({ verifyIdToken: async () => { throw new Error("testte oturum doğrulanmaz"); }, createUser: async () => ({ uid: "x" }) });

// ---- firebase-admin/messaging (Android) ----
export const getMessaging = () => ({
  send: async (msg) => {
    const tok = msg?.token;
    if (F.fail[tok]) throw Object.assign(new Error("gone"), { code: "messaging/registration-token-not-registered" });
    F.sent.push({ to: tok, android: true, payload: msg });
    return "ok";
  },
});

// ---- web-push ----
const webpush = {
  setVapidDetails: () => {},
  sendNotification: async (sub, payload) => {
    const code = F.fail[sub?.endpoint];
    if (code) throw Object.assign(new Error("push hatası"), { statusCode: code, body: code === 403 ? "BadJwtToken" : "" });
    F.sent.push({ to: sub.endpoint, payload: JSON.parse(payload) });
    return { statusCode: 201 };
  },
};
export default webpush;

// ---- next/server ----
export const NextResponse = { json: (body, init) => ({ status: init?.status || 200, body, json: async () => body }) };

// ---- @/lib/server/auth: istekteki uid oturum sayılır ----
export const requireUser = async (req) => (req?.uid ? { ok: true, uid: req.uid } : { ok: false, status: 401 });
export const unauthorized = (au) => NextResponse.json({ error: "Giriş gerekli" }, { status: au?.status || 401 });
