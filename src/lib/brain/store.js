import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";
import { predict, train } from "./model";

// Öğrenme verisi: önce bu cihazda (localStorage) birikir, Firebase'e toplu yazılır.
//   Firestore: orgs/{işletme}/learn/{uid}_{YYYY-MM} = { uid, month, items: [{ x, l, s, t }], n, bytes, v }
//   Her kişi kendi belgesine yazar. Çalışan yalnızca kendi öğrenmesini okur;
//   ana hesap işletmedeki herkesin öğrenmesini okur (ekibin konuşma biçiminden de öğrenir).
//   Eski biçim (orgs/{uid}/learn/{YYYY-MM}) ana hesapta okunmaya devam eder.
// Maliyet sınırları:
//   - Yazma: bekleyen örnek FLUSH_AT'e ulaşınca ya da uygulama arka plana geçince; en sık MIN_GAP'te bir.
//     Her eşitleme = 1 yazma (aylık belgeye arrayUnion).
//   - Okuma: yerel kopya RELOAD_DAYS'den eskiyse bu ay + geçen ay = 2 okuma.
//   - Aylık belge DOC_LIMIT'e yaklaşınca yazma durur (Firestore belge sınırı 1 MB).
// Kapatma ve sıfırlama (Ayarlar › Öğrenme): profildeki brainOff kapalıysa hiçbir şey kaydedilmez ve öğrenilenler kullanılmaz.
//   Sıfırlama belgeleri boşaltır (resetAt yazar); öbür cihazlar profil (brainResetAt) ya da belgedeki resetAt ile yerel kopyayı siler.
// Sayaçlar (hits): bu ay kaç isteğin yapay zekasız (kural / öğrenilen) çözüldüğü, kaçının yapay zekaya gittiği.
const KEY = "sa-brain";
const FLUSH_AT = 15;
const MIN_GAP = 2 * 60 * 1000;
const RELOAD_DAYS = 7;
const DOC_LIMIT = 900 * 1024;
const MAX_LOCAL = 3000;

const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const prevYm = () => {
  const d = new Date();
  return ym(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};
const sizeOf = (x) => new Blob([JSON.stringify(x)]).size;
const noHits = () => ({ local: 0, brain: 0, ai: 0 });
const empty = () => ({ uid: "", org: "", role: "", items: [], team: 0, pending: [], loadedAt: 0, flushedAt: 0, month: ym(), reads: 0, writes: 0, docBytes: 0, off: false, clearedAt: 0, hits: noHits() });
const docId = (uid, m) => `${uid}_${m}`;

let state = null;
let index = null;
const listeners = new Set();

function load() {
  if (state) return state;
  try {
    state = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    state = empty();
  }
  if (state.month !== ym()) Object.assign(state, { month: ym(), reads: 0, writes: 0, docBytes: 0, hits: noHits() }); // aylık sayaçlar
  state.hits ||= noHits();
  return state;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  index = null; // dizin yeniden kurulsun
  listeners.forEach((f) => f());
}
const key = (e) => `${e.t}|${e.x}`;

// Oturum açılınca: kullanıcı ya da işletme değiştiyse yerel veriyi sıfırla, gerekiyorsa Firebase'den yükle
// profile: { uid, orgId, role: "owner" | "staff", brainOff, brainResetAt }
export async function initBrain(profile) {
  const s = load();
  const { uid, orgId, role, brainOff, brainResetAt } = profile || {};
  if (!uid || !orgId) return;
  if ((s.uid && s.uid !== uid) || (s.org && s.org !== orgId) || (s.role && s.role !== role)) Object.assign(s, empty());
  Object.assign(s, { uid, org: orgId, role, off: !!brainOff });
  if (brainOff) s.pending = [];
  if ((brainResetAt || 0) > s.clearedAt) clearLocal(s, brainResetAt); // başka cihazda sıfırlandı
  if (Date.now() - s.loadedAt < RELOAD_DAYS * 864e5 && s.items.length) return save();
  try {
    const months = [ym(), prevYm()];
    const docs = [];
    if (role === "staff") {
      // Çalışan: yalnızca kendi belgeleri
      const snaps = await Promise.all(months.map((m) => getDoc(doc(db, "orgs", orgId, "learn", docId(uid, m)))));
      s.reads += 2;
      snaps.forEach((sn) => sn.exists() && docs.push({ id: sn.id, ...sn.data() }));
    } else {
      // Ana hesap: işletmedeki herkesin bu ay ve geçen ayki belgeleri + eski biçimdeki kendi belgeleri
      const [team, ...legacy] = await Promise.all([
        getDocs(query(collection(db, "orgs", orgId, "learn"), where("month", "in", months))),
        ...months.map((m) => getDoc(doc(db, "orgs", orgId, "learn", m))),
      ]);
      s.reads += Math.max(1, team.size) + 2;
      team.forEach((sn) => docs.push({ id: sn.id, ...sn.data() }));
      legacy.forEach((sn) => sn.exists() && docs.push({ id: sn.id, ...sn.data(), uid, month: sn.id }));
    }
    // Belgeler (ana hesap tarafından da) sıfırlandıysa yerel kopya da silinir
    const resetAt = Math.max(0, ...docs.map((d) => d.resetAt || 0));
    if (resetAt > s.clearedAt) clearLocal(s, resetAt);
    const seen = new Set(s.items.map(key));
    s.team = 0;
    docs.forEach((d) => {
      if (d.id === docId(uid, ym())) s.docBytes = d.bytes || 0;
      const other = d.uid && d.uid !== uid;
      (d.items || []).forEach((e) => {
        if (other) s.team++;
        if (!seen.has(key(e))) {
          seen.add(key(e));
          s.items.push(e);
        }
      });
    });
    s.items = s.items.slice(-MAX_LOCAL);
    s.loadedAt = Date.now();
  } catch (e) {
    console.warn("[brain] yüklenemedi", e?.code || e?.message);
  }
  save();
}

function clearLocal(s, at) {
  Object.assign(s, { items: [], pending: [], team: 0, docBytes: 0, clearedAt: at });
}

// Bir komutu ve sonucunu kaydet. src: "local" | "ai" | "user"
export function record(text, label, src) {
  const x = String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (!x || !label) return;
  const s = load();
  if (s.off) return;
  const e = { x, l: label, s: src, t: Math.floor(Date.now() / 1000) };
  s.items.push(e);
  s.pending.push(e);
  s.items = s.items.slice(-MAX_LOCAL);
  save();
  if (s.pending.length >= FLUSH_AT) flush();
}

// Bekleyenleri Firebase'e tek yazmayla gönder
export async function flush(force = false) {
  const s = load();
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== s.uid || !s.org || !s.pending.length || s.off) return false;
  if (!force && Date.now() - s.flushedAt < MIN_GAP) return false;
  const batch = s.pending.slice(0, 200);
  const bytes = sizeOf(batch);
  if (s.docBytes + bytes > DOC_LIMIT) {
    console.warn("[brain] aylık belge sınıra yakın, yazma durdu");
    return false;
  }
  try {
    await setDoc(
      doc(db, "orgs", s.org, "learn", docId(uid, ym())),
      { uid, month: ym(), items: arrayUnion(...batch), n: increment(batch.length), bytes: increment(bytes), v: 2 },
      { merge: true },
    );
    s.writes += 1;
    s.docBytes += bytes;
    s.flushedAt = Date.now();
    const sent = new Set(batch.map(key));
    s.pending = s.pending.filter((e) => !sent.has(key(e)));
    save();
    return true;
  } catch (e) {
    console.warn("[brain] yazılamadı", e?.code || e?.message);
    return false;
  }
}

// Tahmin: yeterli örnek yoksa null
export function guess(text) {
  const s = load();
  if (s.off || s.items.length < 5) return null;
  if (!index) index = train(s.items);
  return predict(index, text);
}

export function stats() {
  const s = load();
  const by = {};
  s.items.forEach((e) => (by[e.l] = (by[e.l] || 0) + 1));
  return {
    count: s.items.length,
    team: s.team || 0, // ana hesapta: çalışanlardan gelen örnek
    pending: s.pending.length,
    bytes: sizeOf(s.items),
    docBytes: s.docBytes,
    docLimit: DOC_LIMIT,
    reads: s.reads,
    writes: s.writes,
    flushedAt: s.flushedAt,
    off: !!s.off,
    hits: { ...noHits(), ...s.hits },
    byLabel: Object.entries(by).sort((a, b) => b[1] - a[1]),
  };
}

// İsteğin nasıl çözüldüğünü say: "local" (kurallar), "brain" (öğrenilenler), "ai" (yapay zeka)
export function countHit(kind) {
  const s = load();
  s.hits[kind] = (s.hits[kind] || 0) + 1;
  save();
}

// Öğrenmeyi aç/kapat (profilde tutulur: tüm cihazlarda geçerli). Kapalıyken bekleyenler gönderilmez.
export async function setBrainOff(off) {
  const s = load();
  s.off = !!off;
  if (off) s.pending = [];
  save();
  const uid = auth.currentUser?.uid;
  if (uid) await updateDoc(doc(db, "users", uid), { brainOff: !!off });
}

// Öğrenilenleri sil. Ana hesap: işletmedeki herkesinkini; çalışan: yalnız kendisininkini.
// Belgeler boşaltılır (resetAt ile) ki öbür cihazlar da yerel kopyalarını silsin. Dönüş: silinen örnek sayısı.
export async function resetBrain() {
  const s = load();
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== s.uid || !s.org) throw new Error("Oturum yok");
  const at = Date.now();
  const blank = (u, m) => ({ uid: u, month: m, items: [], n: 0, bytes: 0, v: 2, resetAt: at });
  let n = 0;
  if (s.role === "staff") {
    for (const m of [ym(), prevYm()]) {
      const ref = doc(db, "orgs", s.org, "learn", docId(uid, m));
      const sn = await getDoc(ref);
      n += sn.exists() ? (sn.data().items || []).length : 0;
      await setDoc(ref, blank(uid, m));
    }
  } else {
    const all = await getDocs(collection(db, "orgs", s.org, "learn"));
    for (const d of all.docs) {
      n += (d.data().items || []).length;
      // Eski biçim (ay adlı belge) silinir; kişi belgeleri boşaltılır
      if (!d.data().uid) await deleteDoc(d.ref);
      else await setDoc(d.ref, blank(d.data().uid, d.data().month || ym()));
    }
  }
  await updateDoc(doc(db, "users", uid), { brainResetAt: at }).catch(() => {});
  clearLocal(s, at);
  s.loadedAt = Date.now();
  save();
  return n;
}

export const subscribe = (f) => (listeners.add(f), () => listeners.delete(f));
