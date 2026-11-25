// Anında açılış (Seyhun 2026-10-31: "uygulama direkt açılsın, değişiklik varsa alalım"): oturum profili ve ana veriler
// (planlar, görevler, notlar, fişler, doğum günleri, dersler) telefonda kopya olarak tutulur. Uygulama açılınca ekran bu
// kopyayla hemen çizilir, açılış ekranı beklenmez; Firestore dinleyicileri arkada tazeler, fark gelirse üstte ince çizgi
// görünür (SyncLine). Kopya yalnız ekran içindir: yazmalar her zaman Firestore'a gider. Çıkışta silinir.
import { GeoPoint, Timestamp } from "firebase/firestore";

const ME = "sa-warm-me"; // (adı app/layout.jsx WARM_SCRIPT içinde de geçer) { uid, email, name, doc } (users/{uid} belgesi)
const DATA = "sa-warm-data"; // { uid, orgId, staff, data }
const LONG = 4000; // bundan uzun yazılar (fotoğraf data adresi vb.) kopyaya girmez; birkaç yüz ms sonra Firestore'dan gelir
const MAX = 2_500_000; // kopya bundan büyükse yazılmaz (localStorage sınırı ~5 MB)

// Firestore tarih/konum değerleri JSON'a { type: "firestore/…" } olarak yazılır; okurken aynı türe döner
function revive(_k, v) {
  if (v && typeof v === "object" && typeof v.type === "string") {
    if (v.type === "firestore/timestamp/1.0") return new Timestamp(v.seconds, v.nanoseconds);
    if (v.type === "firestore/geoPoint/1.0") return new GeoPoint(v.latitude, v.longitude);
  }
  return v;
}
const trim = (_k, v) => (typeof v === "string" && v.length > LONG ? undefined : v);

// Karşılaştırma ve kayıt için tek biçim (uzun yazılar atılmış JSON)
export const slim = (v) => JSON.stringify(v, trim);
export const unslim = (s) => JSON.parse(s, revive);

function read(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? unslim(s) : null;
  } catch {
    return null;
  }
}
function write(key, v) {
  try {
    const s = slim(v);
    if (s.length > MAX) localStorage.removeItem(key);
    else localStorage.setItem(key, s);
  } catch {}
}

export function readWarmMe() {
  const w = read(ME);
  return w?.uid && w.doc && typeof w.doc === "object" ? w : null;
}
export function saveWarmMe(user, doc) {
  if (user?.uid && doc && typeof doc === "object") write(ME, { uid: user.uid, email: user.email || "", name: user.displayName || "", doc });
}

// Aynı kullanıcı ve işletmenin kopyası yoksa null
export function readWarmData(uid, orgId, staff) {
  const w = read(DATA);
  return uid && w?.uid === uid && w.orgId === orgId && !!w.staff === !!staff && w.data && typeof w.data === "object" ? w.data : null;
}
export function saveWarmData(uid, orgId, staff, data) {
  if (uid && orgId) write(DATA, { uid, orgId, staff: !!staff, data });
}

export function clearWarm() {
  try {
    localStorage.removeItem(ME);
    localStorage.removeItem(DATA);
  } catch {}
}

