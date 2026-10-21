import { readyLessons } from "@/lib/brain/readyData";
import { arrayUnion, collection, doc, getDoc, getDocs, increment, query, where } from "firebase/firestore";
import { deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { auth, db } from "@/lib/firebase/clientApp";
import { knownLesson, lessonKey, predict, train } from "./model";
import { HOLD_MS, patKey, readyLearned, tallyPats, undoneBy } from "./aiPatterns";

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
// Yapay zekanın öğrenme kaydı (aiPatterns.js): aynı aylık belgenin pats dizisine, örneklerle aynı yazmada gider
//   ({ x, p, k, l, c, v, ok, t }); doğru da yanlış da yazılır (kalıbın ne kadar tuttuğu buradan). Silinen kalıplar
//   drop dizisine (kalıp anahtarı) yazılır; yüklenirken o kalıplar atılır. Ek okuma yok, kural değişmedi.
const KEY = "sa-brain";
const FLUSH_AT = 15;
const MIN_GAP = 2 * 60 * 1000;
const RELOAD_DAYS = 7;
const DOC_LIMIT = 900 * 1024;
const MAX_LOCAL = 3000;
const MAX_PATS = 3000;

const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const prevYm = () => {
  const d = new Date();
  return ym(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};
const sizeOf = (x) => new Blob([JSON.stringify(x)]).size;
const noHits = () => ({ local: 0, brain: 0, ai: 0 });
const empty = () => ({ uid: "", org: "", role: "", items: [], team: 0, pending: [], loadedAt: 0, flushedAt: 0, month: ym(), reads: 0, writes: 0, docBytes: 0, off: false, clearedAt: 0, hits: noHits(), pats: [], pendPats: [], drop: [], hold: null });
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
  state.pats ||= [];
  state.pendPats ||= [];
  state.drop ||= [];
  return state;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  index = null; // dizin yeniden kurulsun
  listeners.forEach((f) => f());
}
const key = (e) => lessonKey(e.x, e.l); // aynı söz + aynı sonuç bir kez
const patId = (e) => `${e.t}|${e.x}|${e.p}`;

// Oturum açılınca: kullanıcı ya da işletme değiştiyse yerel veriyi sıfırla, gerekiyorsa Firebase'den yükle
// profile: { uid, orgId, role: "owner" | "staff", brainOff, brainResetAt }
export async function initBrain(profile) {
  const s = load();
  const { uid, orgId, role, brainOff, brainResetAt } = profile || {};
  if (!uid || !orgId) return;
  if ((s.uid && s.uid !== uid) || (s.org && s.org !== orgId) || (s.role && s.role !== role)) Object.assign(s, empty());
  Object.assign(s, { uid, org: orgId, role, off: !!brainOff });
  if (brainOff) Object.assign(s, { pending: [], pendPats: [], hold: null });
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
    const seenPat = new Set(s.pats.map(patId));
    s.team = 0;
    docs.forEach((d) => {
      if (d.id === docId(uid, ym())) s.docBytes = d.bytes || 0;
      const other = d.uid && d.uid !== uid;
      (d.drop || []).forEach((k) => !s.drop.includes(k) && s.drop.push(k));
      (d.pats || []).forEach((e) => !seenPat.has(patId(e)) && (seenPat.add(patId(e)), s.pats.push(e)));
      (d.items || []).forEach((e) => {
        if (other) s.team++;
        if (!seen.has(key(e))) {
          seen.add(key(e));
          s.items.push(e);
        }
      });
    });
    s.items = s.items.slice(-MAX_LOCAL);
    const gone = new Set(s.drop);
    s.pats = s.pats.filter((e) => !gone.has(patKey(e.p))).sort((a, b) => (a.t || 0) - (b.t || 0)).slice(-MAX_PATS);
    s.loadedAt = Date.now();
  } catch (e) {
    console.warn("[brain] yüklenemedi", e?.code || e?.message);
  }
  save();
}

function clearLocal(s, at) {
  Object.assign(s, { items: [], pending: [], team: 0, docBytes: 0, clearedAt: at, pats: [], pendPats: [], drop: [], hold: null });
}

// Bir komutu ve sonucunu kaydet. src: "local" | "ai" | "user"
export function record(text, label, src) {
  const x = String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (!x || !label) return;
  const s = load();
  if (s.off || knownLesson(s.items, x, label)) return; // zaten biliniyor: yeniden eklenmez (yazma da olmaz)
  const e = { x, l: label, s: src, t: Math.floor(Date.now() / 1000) };
  s.items.push(e);
  s.pending.push(e);
  s.items = s.items.slice(-MAX_LOCAL);
  save();
  if (s.pending.length + s.pendPats.length >= FLUSH_AT) flush();
}

// Bekleyenleri Firebase'e tek yazmayla gönder
export async function flush(force = false) {
  const s = load();
  const uid = auth.currentUser?.uid;
  if (s.hold && Date.now() - s.hold.t * 1000 > HOLD_MS) commitHold(s, false); // bekleme bitti: doğru sayılır
  if (!uid || uid !== s.uid || !s.org || !(s.pending.length || s.pendPats.length) || s.off) return false;
  if (!force && Date.now() - s.flushedAt < MIN_GAP) return false;
  const batch = s.pending.slice(0, 200);
  const pb = s.pendPats.slice(0, 200);
  const bytes = (batch.length ? sizeOf(batch) : 0) + (pb.length ? sizeOf(pb) : 0);
  if (s.docBytes + bytes > DOC_LIMIT) {
    console.warn("[brain] aylık belge sınıra yakın, yazma durdu");
    return false;
  }
  try {
    await setDoc(
      doc(db, "orgs", s.org, "learn", docId(uid, ym())),
      {
        uid,
        month: ym(),
        ...(batch.length ? { items: arrayUnion(...batch) } : {}),
        ...(pb.length ? { pats: arrayUnion(...pb) } : {}),
        n: increment(batch.length),
        bytes: increment(bytes),
        v: 2,
      },
      { merge: true },
    );
    s.writes += 1;
    s.docBytes += bytes;
    s.flushedAt = Date.now();
    const sent = new Set(batch.map(key));
    s.pending = s.pending.filter((e) => !sent.has(key(e)));
    const sentPat = new Set(pb.map(patId));
    s.pendPats = s.pendPats.filter((e) => !sentPat.has(patId(e)));
    save();
    return true;
  } catch (e) {
    console.warn("[brain] yazılamadı", e?.code || e?.message);
    return false;
  }
}

// Yapay zekanın öğrenme kaydı (aiPatterns.js lessonOf). İş ✓ bittiyse (ok) HOLD_MS bekletilir: o sürede "geri al",
// "yanlış" ya da aynı cümle yeniden söylenirse yanlış, söylenmezse doğru yazılır. Hata, ✗, vazgeçme hemen yanlış.
function addPat(s, e) {
  s.pats.push(e);
  s.pats = s.pats.slice(-MAX_PATS);
  s.pendPats.push(e);
  save();
  if (s.pending.length + s.pendPats.length >= FLUSH_AT) flush();
}
function commitHold(s, undone) {
  const h = s.hold;
  if (!h) return;
  s.hold = null;
  addPat(s, { ...h, ok: undone ? 0 : 1 });
}
export function holdPattern(e, ok) {
  if (!e) return;
  const s = load();
  if (s.off) return;
  commitHold(s, false); // önceki iş üstüne yeni iş geldi: önceki doğru
  const it = { ...e, t: Math.floor(Date.now() / 1000) };
  if (!ok) return addPat(s, { ...it, ok: 0 });
  s.hold = it;
  save();
}
// Kullanıcının yeni sözü: bekleyen kayıt geri alındı mı (score.js isCorrection / similar ile aynı ölçü)
export function settlePattern(text) {
  const s = load();
  if (s.hold) commitHold(s, undoneBy(text, s.hold));
}

// Kalıp tablosu (Ayarlar › Öğrenme): kalıp başına kaç kez, kaçı doğru, hazır mı
export function patternRows() {
  const s = load();
  return tallyPats(s.pats, s.drop);
}

// Hazır cevaplar açıkken: cümle hazır bir kayıt ekleme kalıbına uyuyor mu ({ row, slots } ya da null)
export function learnedReady(text) {
  const s = load();
  return s.off ? null : readyLearned(text, tallyPats(s.pats, s.drop));
}

// Kalıbı sil: bu cihazdan hemen, öbür cihazlardan bir sonraki yüklemede (aylık belgeye drop, 1 yazma)
export async function dropPattern(k) {
  const s = load();
  if (!k) return;
  if (!s.drop.includes(k)) s.drop.push(k);
  s.pats = s.pats.filter((e) => patKey(e.p) !== k);
  s.pendPats = s.pendPats.filter((e) => patKey(e.p) !== k);
  if (s.hold && patKey(s.hold.p) === k) s.hold = null;
  save();
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== s.uid || !s.org) return;
  await setDoc(doc(db, "orgs", s.org, "learn", docId(uid, ym())), { uid, month: ym(), drop: arrayUnion(k), v: 2 }, { merge: true });
  s.writes += 1;
  save();
}

// Tahmin: yeterli örnek yoksa null
export function guess(text) {
  const s = load();
  if (s.off) return null;
  // Hazır kalıplar (src/data/hazir-kaliplar.json) kullanıcı örneği gibi baştan dizinde: öğrenme beklemeden tahmin yapılır
  if (!index) index = train([...readyLessons(), ...s.items]);
  if (index.n < 5) return null;
  return predict(index, text);
}

export function stats() {
  const s = load();
  const by = {};
  s.items.forEach((e) => (by[e.l] = (by[e.l] || 0) + 1));
  return {
    count: s.items.length,
    team: s.team || 0, // ana hesapta: çalışanlardan gelen örnek
    pending: s.pending.length + s.pendPats.length,
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

// Yerelde kaçan komutlar: yapay zekanın sayfa açtığı cümleler (kurallar tanıyabilmeliydi). Yeni kurala ve teste
// eklensin diye Ayarlar › Öğrenme'de listelenir, kopyalanır. Son 30 farklı cümle, yeniden eskiye.
export function missedLocal() {
  const seen = new Set();
  return load()
    .items.filter((e) => e.s === "ai" && e.l.startsWith("nav:"))
    .reverse()
    .filter((e) => !seen.has(e.x) && seen.add(e.x))
    .slice(0, 30)
    .map((e) => ({ x: e.x, l: e.l }));
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
  if (off) Object.assign(s, { pending: [], pendPats: [], hold: null });
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
