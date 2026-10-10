"use client";

import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { FIT_CAT, cleanProfile, cleanProgram, planDrafts } from "@/lib/fitness/model";

// Fitness programları: orgs/{orgId}/fitPrograms/{id} (yalnız ana hesap; kural ana hesaba orgs altını zaten açıyor).
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
  return list;
}
// Etkin program: en son güncellenen etkin program
export const activeOf = (list) => list?.find((p) => p.active) || null;

export async function saveProgram(orgId, uid, prog) {
  const ref = prog.id ? doc(col(orgId), prog.id) : doc(col(orgId));
  const now = new Date().toISOString();
  const clean = cleanProgram(prog);
  const rec = { ...clean, uid, active: prog.active !== false, plansAt: prog.plansAt || "", createdAt: prog.createdAt || now, updatedAt: now };
  // Yeni etkin program: öncekiler etkin olmaktan çıkar (planları silinmez)
  const others = (cache.org === orgId && cache.list ? cache.list : []).filter((p) => p.id !== ref.id && p.active);
  await Promise.all([setDoc(ref, rec), ...(rec.active ? others.map((p) => updateDoc(doc(col(orgId), p.id), { active: false })) : [])]);
  const out = { id: ref.id, ...rec };
  if (cache.org === orgId && cache.list) cache.list = [out, ...cache.list.filter((p) => p.id !== out.id).map((p) => (rec.active ? { ...p, active: false } : p))].sort(byNew);
  told();
  return out;
}

export async function deleteProgram(orgId, id) {
  await deleteDoc(doc(col(orgId), id));
  if (cache.org === orgId && cache.list) cache.list = cache.list.filter((p) => p.id !== id);
  told();
}

const tzName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

// Programı takvime yazar: bu programın bugünden sonraki, yapılmamış planları silinir, programın günleri yeniden yazılır
// (geçmişteki ve sonucu yazılmış antrenmanlara dokunulmaz). plans: cihazdaki planlar (useData). Dönüş: { added, removed }
export async function syncPlans(orgId, uid, prog, plans, by = {}) {
  const today = todayStr();
  const old = (plans || []).filter((p) => p.fit?.prog === prog.id && p.date >= today && !p.fit?.res?.st);
  const keep = new Set((plans || []).filter((p) => p.fit?.prog === prog.id && p.date >= today && p.fit?.res?.st).map((p) => p.date));
  const drafts = planDrafts(prog, today).filter((d) => !keep.has(d.date));
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
          ownerId: orgId, cat: FIT_CAT, src: "fitness", createdBy: by, createdAt: now, createdByUid: uid, assignees: [], people: [uid],
          title: v.title, date: v.date, endDate: "", time: timed ? v.time : "", allDay: !timed, durationMin: v.min || 45, tz,
          timeSource: timed ? "user" : "none", place: "", status: "planned", fit: v.fit,
        });
      }
    }
    await b.commit();
  }
  await updateDoc(doc(col(orgId), prog.id), { plansAt: now }).catch(() => {});
  if (cache.org === orgId && cache.list) cache.list = cache.list.map((p) => (p.id === prog.id ? { ...p, plansAt: now } : p));
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
  if (cache.org === orgId && cache.list) cache.list = cache.list.map((p) => (p.id === prog.id ? { ...p, plansAt: "" } : p));
  told();
  return old.length;
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
