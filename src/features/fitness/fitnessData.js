"use client";

import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { FIT_CAT, cleanProfile, cleanProgram, planDrafts } from "@/lib/fitness/model";
import { introKey } from "@/lib/fitness/forecast";
import { dropAllMedia, dropMedia } from "./fitMedia";

// Fitness programları: orgs/{orgId}/fitPrograms/{id} (yalnız ana hesap; kural ana hesaba orgs altını zaten açıyor).
// Sporcuya hazırlanan programda for = sporcunun hesabı, forName = adı (boşsa ana hesabın kendi programı). Sporcu programını
// okumaz; antrenmanları kendi planları olarak gelir (people: [sporcu]).
// Programlar tek sorguda okunur, 3 dakika bellekte kalır (sayfa ve asistan paylaşır). Antrenmanlar plan kaydıdır.
const col = (orgId) => collection(db, "orgs", orgId, "fitPrograms");
const TTL = 3 * 60_000;
let cache = { org: "", at: 0, list: null };
export const FIT_SAVED = "sa-fit-saved";
const told = () => window.dispatchEvent(new CustomEvent(FIT_SAVED));

const byNew = (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
export async function loadPrograms(orgId, { force = false } = {}) {
  if (!force && cache.org === orgId && cache.list && Date.now() - cache.at < TTL) return cache.list;
  const snap = await getDocs(col(orgId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), ...cleanProgram(d.data()) })).sort(byNew);
  cache = { org: orgId, at: Date.now(), list };
  keep(orgId, list);
  return list;
}

// Son okunan program listesi bu cihazda da saklanır: sayfa açılınca hemen çizilir (önce boş sonra dolu,
// ya da önce tanıtım sonra program gibi zıplama olmaz); okuma bitince güncellenir. Ek okuma yok.
const LS = (orgId) => `sa-fit-progs:${orgId}`;
function keep(orgId, list) {
  try {
    localStorage.setItem(LS(orgId), JSON.stringify(list));
  } catch {}
}
export function peekPrograms(orgId) {
  if (cache.org === orgId && cache.list) return cache.list;
  try {
    const v = JSON.parse(localStorage.getItem(LS(orgId)) || "null");
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
// Etkin program: en son güncellenen etkin program
export const activeOf = (list) => list?.find((p) => p.active) || null;

export async function saveProgram(orgId, uid, prog) {
  const ref = prog.id ? doc(col(orgId), prog.id) : doc(col(orgId));
  const now = new Date().toISOString();
  const clean = cleanProgram(prog);
  const rec = { ...clean, uid, for: prog.for || "", forName: prog.for ? String(prog.forName || "").slice(0, 80) : "", active: prog.active !== false, plansAt: prog.plansAt || "", createdAt: prog.createdAt || now, updatedAt: now };
  // Yeni etkin program: aynı kişinin önceki programları etkin olmaktan çıkar (planları silinmez)
  const others = (cache.org === orgId && cache.list ? cache.list : []).filter((p) => p.id !== ref.id && p.active && (p.for || "") === rec.for);
  // merge: sunucunun yazdığı notifiedAt (sporcuya bildirim gitti) silinmesin
  await Promise.all([setDoc(ref, rec, { merge: true }), ...(rec.active ? others.map((p) => updateDoc(doc(col(orgId), p.id), { active: false })) : [])]);
  const out = { id: ref.id, ...rec };
  if (cache.org === orgId && cache.list) {
    cache.list = [out, ...cache.list.filter((p) => p.id !== out.id).map((p) => (rec.active ? { ...p, active: false } : p))].sort(byNew);
    keep(orgId, cache.list);
  }
  told();
  return out;
}

// Planları 400'erli toplu silme (Firestore sınırı 500)
async function dropPlans(orgId, ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const b = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => b.delete(doc(db, "orgs", orgId, "plans", id)));
    await b.commit();
  }
}
const mediaOf = (prog) => (prog?.days || []).flatMap((d) => (d.items || []).flatMap((it) => it.media || []));

// Programı tamamen siler: bütün antrenmanları (geçmiş, yapılan, atlanan dahil; tek sorgu), programın fotoğraf ve videoları
// (başka programda da kullanılmıyorsa) ve programın kendisi. Dönüş: silinen antrenman sayısı
export async function deleteProgram(orgId, id) {
  const snap = await getDocs(query(collection(db, "orgs", orgId, "plans"), where("fit.prog", "==", id)));
  await dropPlans(orgId, snap.docs.map((d) => d.id));
  const list = cache.org === orgId && cache.list ? cache.list : [];
  const prog = list.find((p) => p.id === id);
  const others = new Set(list.filter((p) => p.id !== id).flatMap(mediaOf).map((m) => m.id));
  await Promise.all(mediaOf(prog).filter((m) => !others.has(m.id)).map((m) => dropMedia(orgId, m)));
  await deleteDoc(doc(col(orgId), id));
  if (cache.org === orgId && cache.list) {
    cache.list = cache.list.filter((p) => p.id !== id);
    keep(orgId, cache.list);
  }
  told();
  return snap.size;
}

// Fitness'ı sıfırla: bütün programlar (kendi ve sporcuların), bütün fitness antrenmanları (yapılanlar dahil) ve bütün
// fotoğraf/videolar silinir. Profil (boy, kilo) ve beslenme kalır. Dönüş: { progs, plans, media }
export async function resetFitness(orgId) {
  const [progs, plans] = await Promise.all([getDocs(col(orgId)), getDocs(query(collection(db, "orgs", orgId, "plans"), where("src", "==", "fitness")))]);
  await dropPlans(orgId, plans.docs.map((d) => d.id));
  const media = await dropAllMedia(orgId);
  for (let i = 0; i < progs.docs.length; i += 400) {
    const b = writeBatch(db);
    progs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  cache = { org: orgId, at: Date.now(), list: [] };
  keep(orgId, []);
  told();
  return { progs: progs.size, plans: plans.size, media };
}

const tzName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

// Programı takvime yazar: bu programın bugünden sonraki, yapılmamış planları silinir, programın günleri yeniden yazılır
// (geçmişteki ve sonucu yazılmış antrenmanlara dokunulmaz). plans: cihazdaki planlar (useData; sporcu programında fitOthers).
// Sporcu programında planlar sporcunun (people: [sporcu], fit.for); ana hesabın takviminde görünmez. Dönüş: { added, removed }
export async function syncPlans(orgId, uid, prog, plans, by = {}) {
  const today = todayStr();
  const old = (plans || []).filter((p) => p.fit?.prog === prog.id && p.date >= today && !p.fit?.res?.st);
  const keep = new Set((plans || []).filter((p) => p.fit?.prog === prog.id && p.date >= today && p.fit?.res?.st).map((p) => p.date));
  const drafts = planDrafts(prog, today).filter((d) => !keep.has(d.date));
  const who = prog.for || uid;
  const now = new Date().toISOString();
  const tz = tzName();
  // Firestore toplu yazma sınırı 500: parça parça
  const ops = [...old.map((p) => ["del", p.id]), ...drafts.map((d) => ["set", d])];
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    for (const [k, v] of ops.slice(i, i + 400)) {
      if (k === "del") b.delete(doc(db, "orgs", orgId, "plans", v));
      else {
        const ref = doc(collection(db, "orgs", orgId, "plans"));
        const timed = !!v.time;
        b.set(ref, {
          ownerId: orgId, cat: FIT_CAT, src: "fitness", createdBy: by, createdAt: now, createdByUid: uid, assignees: [], people: [who],
          title: v.title, date: v.date, endDate: "", time: timed ? v.time : "", allDay: !timed, durationMin: v.min || 45, tz,
          timeSource: timed ? "user" : "none", place: "", status: "planned", fit: prog.for ? { ...v.fit, for: prog.for } : v.fit,
        });
      }
    }
    await b.commit();
  }
  await updateDoc(doc(col(orgId), prog.id), { plansAt: now }).catch(() => {});
  if (cache.org === orgId && cache.list) {
    cache.list = cache.list.map((p) => (p.id === prog.id ? { ...p, plansAt: now } : p));
    keep(orgId, cache.list);
  }
  told();
  return { added: drafts.length, removed: old.length };
}

// Programın gelecekteki, yapılmamış planlarını takvimden kaldırır
export async function removePlans(orgId, prog, plans) {
  const today = todayStr();
  const old = (plans || []).filter((p) => p.fit?.prog === prog.id && p.date >= today && !p.fit?.res?.st);
  for (let i = 0; i < old.length; i += 400) {
    const b = writeBatch(db);
    old.slice(i, i + 400).forEach((p) => b.delete(doc(db, "orgs", orgId, "plans", p.id)));
    await b.commit();
  }
  await updateDoc(doc(col(orgId), prog.id), { plansAt: "" }).catch(() => {});
  if (cache.org === orgId && cache.list) {
    cache.list = cache.list.map((p) => (p.id === prog.id ? { ...p, plansAt: "" } : p));
    keep(orgId, cache.list);
  }
  told();
  return old.length;
}

// Sporcuya "Yeni fitness programın hazır" bildirimi (sunucu programdan okur, bir program için bir kez gönderir)
export async function notifyProgram(id) {
  try {
    await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "fitProgram", id }) });
  } catch {}
}

// Tek seferlik antrenman (programsız gün: "bugün 30 dakika koştum")
export async function addSession(orgId, uid, { date, title = "Fitness", fit }, by = {}) {
  const ref = doc(collection(db, "orgs", orgId, "plans"));
  await setDoc(ref, {
    ownerId: orgId, cat: FIT_CAT, src: "fitness", createdBy: by, createdAt: new Date().toISOString(), createdByUid: uid, assignees: [], people: [uid],
    title, date, endDate: "", time: "", allDay: true, durationMin: fit?.res?.min || 45, tz: tzName(), timeSource: "none", place: "", status: "planned", fit,
  });
  return ref.id;
}

// Profil: users/{uid}.fit (kendi belgesi)
export async function saveProfile(uid, fit) {
  const clean = cleanProfile(fit);
  await updateDoc(doc(db, "users", uid), { fit: clean });
  return clean;
}

// Yapay zeka (/api/fitness): { op, program?, log?, profile?, message }
export async function askFitness(payload) {
  const res = await authFetch("/api/fitness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ today: todayStr(), ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fitness isteği işlenemedi");
  return data;
}

// Asistanın hazırladığı program Fitness sayfasındaki önizlemede açılır (sayfa kapalıysa oturumda bekler)
export const FIT_PREVIEW = "sa-fit-preview";
export function showProgram(prog) {
  try {
    sessionStorage.setItem(FIT_PREVIEW, JSON.stringify(prog));
  } catch {}
  window.dispatchEvent(new CustomEvent(FIT_PREVIEW, { detail: prog }));
}
export function peekProgram() {
  try {
    const raw = sessionStorage.getItem(FIT_PREVIEW);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function takeProgram() {
  try {
    const raw = sessionStorage.getItem(FIT_PREVIEW);
    sessionStorage.removeItem(FIT_PREVIEW);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Tanıtım kartları (/api/fitness-intro): kişiye özel; bu cihazda aynı bilgilerle saklanır, yeniden istenmez.
// Yapay zekaya ulaşılamazsa null (kartlar yerel hesapla gösterilir).
const INTRO = "sa-fit-intro";
export async function askIntro(profile) {
  const key = introKey(profile);
  try {
    const c = JSON.parse(localStorage.getItem(INTRO) || "null");
    if (c?.key === key && c.data?.cards?.length) return c.data;
  } catch {}
  try {
    const res = await authFetch("/api/fitness-intro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile }), timeout: 25000 });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.cards?.length) return null;
    try {
      localStorage.setItem(INTRO, JSON.stringify({ key, data }));
    } catch {}
    return data;
  } catch {
    return null;
  }
}
