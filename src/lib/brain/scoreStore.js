import { arrayUnion, deleteField, doc, getDoc, increment } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { auth, db } from "@/lib/firebase/clientApp";
import { applyEvent, endPoints, isCorrection, oldestKeys, patternKey, POINTS, report, similar, WIN } from "./score";

// Asistan puanlaması: turları izler, puanları bu cihazda biriktirir, Firebase'e toplu yazar.
//   Özet (asıl kaynak): orgs/{org}/learnSum/{uid} = { pats: {anahtar: {x, e, n, b, p, t}}, weeks: {"2026-W42": {n, b, p}}, v }
//     Açılışta günde en çok 1 okuma; yazma increment ile (iki cihaz çakışmaz), en sık 2 dk'da bir ve uygulama arka plana geçince.
//   Olay defteri (ham): orgs/{org}/learn/{uid}_{YYYY-MM}.ev (arrayUnion), rapor bozulursa yeniden hesap için.
// Öğrenme kapalıysa (brainOff) hiçbir şey ölçülmez.
const KEY = "sa-score";
const MIN_GAP = 2 * 60e3;
const RELOAD = 864e5;
const empty = () => ({ uid: "", org: "", off: false, sum: { pats: {}, weeks: {} }, delta: [], evs: [], recent: [], loadedAt: 0, flushedAt: 0 });

let state = null;
let cur = null; // süren tur: { x, k, t, path, asked, yes, card }
const listeners = new Set();

function load() {
  if (state) return state;
  try {
    state = typeof localStorage === "undefined" ? empty() : { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    state = empty();
  }
  return state;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((f) => f());
}
const here = () => (typeof location === "undefined" ? "" : location.pathname);
const on = () => {
  const s = load();
  return s.uid && s.org && !s.off;
};

// Olay: hem yerel özete hem bekleyen yazmalara
function add(ev) {
  const s = load();
  const e = { t: Date.now(), ...ev };
  applyEvent(s.sum, e);
  s.delta.push(e);
  s.evs.push({ x: e.x, e: e.e, o: e.o, p: e.p, t: e.t });
  if (s.delta.length > 400) s.delta = s.delta.slice(-400);
  if (s.evs.length > 400) s.evs = s.evs.slice(-400);
}

// Biten turlar: 2 dk dokunulmadıysa +1; pencereleri geçenler listeden çıkar
function settle(now = Date.now()) {
  const s = load();
  for (const r of s.recent) {
    if (!r.paid && !r.bad && !r.fail && now - r.t >= WIN.done) {
      r.paid = true;
      add({ k: r.k, x: r.x, e: r.e, o: "done", p: POINTS.done, t: now });
    }
  }
  s.recent = s.recent.filter((r) => now - r.t < WIN.edit);
}

function penalize(r, o) {
  add({ k: r.k, x: r.x, e: r.e, o, p: POINTS[o], b: r.bad ? 0 : 1 });
  r.bad = true;
}

// Oturum açılınca: özeti yükle (günde en çok 1 okuma)
export async function initScore({ uid, orgId, brainOff } = {}) {
  const s = load();
  if (!uid || !orgId) return;
  if ((s.uid && s.uid !== uid) || (s.org && s.org !== orgId)) Object.assign(s, empty());
  Object.assign(s, { uid, org: orgId, off: !!brainOff });
  if (brainOff) Object.assign(s, { delta: [], evs: [], recent: [] });
  if (Date.now() - s.loadedAt < RELOAD) return save();
  try {
    const sn = await getDoc(doc(db, "orgs", orgId, "learnSum", uid));
    s.sum = sn.exists() ? { pats: sn.data().pats || {}, weeks: sn.data().weeks || {} } : { pats: {}, weeks: {} };
    s.delta.forEach((e) => applyEvent(s.sum, e)); // henüz yazılmamış olaylar
    s.loadedAt = Date.now();
  } catch (e) {
    console.warn("[puan] okunamadı", e?.code || e?.message);
  }
  save();
}

// Kullanıcı bir şey söyledi (run başı). awaiting: bir soru/kart cevap bekliyordu; yes: "evet" dedi
export function scoreStart(text, { awaiting = false, yes = false } = {}) {
  if (!on() || !text) return;
  const s = load();
  const now = Date.now();
  settle(now);
  // Sorulan soruya cevap: aynı tur sürer; kart tek "evet"le onaylandıysa +1
  if (cur && awaiting) {
    if (yes && cur.card && !cur.answered) add({ k: cur.k, x: cur.x, e: "", o: "yes", p: POINTS.yes });
    cur.answered = true;
    return;
  }
  // Yeni söz: son biten tur düzeltiliyor ya da yeniden söyleniyorsa (anlaşılmadı) o tur kötü
  const last = s.recent[s.recent.length - 1];
  if (last && now - last.t < WIN.repeat) {
    if (isCorrection(text)) penalize(last, "fix");
    else if (similar(text, last.x)) penalize(last, "repeat");
  }
  cur = { x: String(text).slice(0, 80), k: patternKey(text), t: now, path: here(), asked: false, card: false, answered: false };
  save();
}

// Asistan cevap verdi (reply). awaiting: soru sordu ya da kart bekliyor; final: görev listesinde sıradaki iş yok
export function scoreEnd({ engine = "", fail = false, dropped = false, awaiting = false, card = false, final = true, ids = [] } = {}) {
  if (!on() || !cur) return;
  const s = load();
  if (awaiting) {
    cur.asked = true;
    if (card) cur.card = true;
    return;
  }
  if (!final) return; // görev listesi sürüyor: tur liste bitince kapanır
  if (fail || dropped) {
    add({ k: cur.k, x: cur.x, e: engine, o: "fail", p: POINTS.fail, n: 1, b: 1 });
  } else {
    const [first] = endPoints({ asked: cur.asked });
    add({ k: cur.k, x: cur.x, e: engine, o: first ? first.e : "end", p: first ? first.p : 0, n: 1 });
  }
  s.recent.push({ k: cur.k, x: cur.x, e: engine, t: Date.now(), ids: ids.filter(Boolean), moved: here() !== cur.path, bad: !!(fail || dropped), fail: !!(fail || dropped) });
  if (s.recent.length > 20) s.recent = s.recent.slice(-20);
  cur = null;
  save();
}

// Asistanın eklediği kayıt elle düzeltildi (10 dk içinde)
export function scoreEdit(id) {
  if (!on() || !id) return;
  const s = load();
  const r = [...s.recent].reverse().find((x) => x.ids?.includes(id) && Date.now() - x.t < WIN.edit && !x.edited);
  if (!r) return;
  r.edited = true;
  penalize(r, "edit");
  save();
}

// Geri düğmesi: asistanın açtığı sayfadan 30 sn içinde geri dönüldü
export function scoreBack() {
  if (!on()) return;
  const s = load();
  const r = s.recent[s.recent.length - 1];
  if (!r || !r.moved || r.backed || Date.now() - r.t > WIN.back) return;
  r.backed = true;
  penalize(r, "back");
  save();
}

// Bekleyen puanları tek yazmayla özete, ham olayları aylık deftere
export async function flushScore(force = false) {
  const s = load();
  const uid = auth.currentUser?.uid;
  settle();
  if (!uid || uid !== s.uid || !s.org || s.off || !s.delta.length) return save(), false;
  if (!force && Date.now() - s.flushedAt < MIN_GAP) return false;
  const delta = s.delta;
  const evs = s.evs;
  const patch = { pats: {}, weeks: {} };
  const d = { pats: {}, weeks: {} };
  delta.forEach((e) => applyEvent(d, e));
  for (const [k, v] of Object.entries(d.pats)) {
    patch.pats[k] = { x: v.x, e: v.e, t: v.t, n: increment(v.n), b: increment(v.b), p: increment(v.p) };
  }
  for (const [w, v] of Object.entries(d.weeks)) {
    if (v.n || v.b || v.p) patch.weeks[w] = { n: increment(v.n), b: increment(v.b), p: increment(v.p) };
  }
  oldestKeys(s.sum.pats).forEach((k) => {
    patch.pats[k] = deleteField();
    delete s.sum.pats[k];
  });
  try {
    const m = new Date();
    const month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    await setDoc(doc(db, "orgs", s.org, "learnSum", uid), { ...patch, v: 1 }, { merge: true });
    if (evs.length) {
      const bytes = new Blob([JSON.stringify(evs)]).size;
      await setDoc(doc(db, "orgs", s.org, "learn", `${uid}_${month}`), { uid, month, ev: arrayUnion(...evs), bytes: increment(bytes) }, { merge: true }).catch(() => {});
    }
    s.delta = s.delta.slice(delta.length);
    s.evs = s.evs.slice(evs.length);
    s.flushedAt = Date.now();
    save();
    return true;
  } catch (e) {
    console.warn("[puan] yazılamadı", e?.code || e?.message);
    return false;
  }
}

export function scoreReport() {
  return report(load().sum);
}

// Ayarlar › Öğrenme › sıfırla: puanlar da silinir
export async function resetScore() {
  const s = load();
  cur = null;
  Object.assign(s, { sum: { pats: {}, weeks: {} }, delta: [], evs: [], recent: [], loadedAt: Date.now() });
  save();
  const uid = auth.currentUser?.uid;
  if (uid && s.org) await setDoc(doc(db, "orgs", s.org, "learnSum", uid), { pats: {}, weeks: {}, v: 1 }).catch(() => {});
}

export const subscribeScore = (f) => (listeners.add(f), () => listeners.delete(f));
