"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { nextNo } from "./raceDocs";
import { cleanBudget } from "./budget";
import { rememberRaceNames } from "./raceNames";

// Yarışlar: orgs/{orgId}/races. Yalnızca yarış bilgisi ve sporcu kimlikleri tutulur;
// T.C., veli gibi kişisel bilgiler kopyalanmaz, belge üretilirken sporcu kartından okunur.
export const RACE_FIELDS = [
  "name", "federation", "city", "district", "startDate", "endDate", "leaveStart", "leaveEnd", "letterDate",
  "signer", "signerTitle", "travel", "vehicle", "drivers", "athleteIds", "note", "checks", "planAdded",
  // Kulüp izin yazısı (boş olanlar yarıştan gelir; bkz. raceDocs clubInfo)
  "clubNo", "clubDate", "clubFrom", "clubTo", "clubEvent", "clubPlace", "clubSigner", "clubTitle",
  // Yarış talimatından okunanlar (program, son tarihler, ücretler, oteller, iletişim; raceNotice.js)
  "notice",
  // Elle eklenen işler [{ title, date }]
  "todos",
  // Bütçe (budget.js)
  "budget",
];

const NOTICE_KEYS = ["organizer", "venue", "classes", "schedule", "deadlines", "tasks", "fees", "hotels", "contacts", "notes", "summary", "at", "planned"];

// Talimat bilgisi: kayıtta yalnız bilinen alanlar kalır
export function cleanNotice(n) {
  if (!n || typeof n !== "object") return null;
  const out = {};
  for (const k of NOTICE_KEYS) {
    const v = n[k];
    if (Array.isArray(v)) out[k] = v.filter((x) => (x && typeof x === "object") || typeof x === "string").slice(0, 40);
    else if (typeof v === "boolean") out[k] = v;
    else out[k] = String(v ?? "");
  }
  return out;
}

// Yarış öncesi yapılacaklar. Her iş: { key, label, date?, detail?, group }; işaretlenenler checks[key].
// Evrak işleri (kulüp tarafı) her yarışta aynı. Kayıt/ödeme/konaklama işleri talimattan gelir (talimat yüklenince);
// her yarışa elle iş de eklenir (todos). Hazır standart liste yok.
export const DOC_STEPS = [
  ["docs", "Evraklar hazırlandı"],
  ["parents", "Veliler imzaladı"],
  ["schools", "Okullara verildi"],
  ["gsim", "GSİM'e verildi (il dışı çıkış oluru)"],
];
const slug = (s, p = "t:") =>
  p + String(s || "").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40);

// Talimattaki işler; eski talimatlarda (tasks yoksa) son tarihlerden, ücretten ve otelden çıkarılır
export function noticeTasks(n) {
  if (!n) return [];
  let list = (n.tasks || []).filter((t) => t?.title);
  if (!list.length) {
    list = (n.deadlines || []).map((d) => ({ title: d.title, date: d.date, detail: d.detail }));
    if (n.fees?.length && !list.some((t) => /ücret|ödeme/i.test(t.title))) list.push({ title: "Kayıt ücretini öde", detail: n.fees[0].amount });
    if (n.hotels?.length) list.push({ title: "Konaklamayı ayarla", detail: n.hotels[0].name });
  }
  const seen = new Set();
  return list
    .map((t) => ({ key: slug(t.title), label: t.title, date: t.date || "", detail: t.detail || "", group: "notice" }))
    .filter((t) => t.key.length > 2 && !seen.has(t.key) && seen.add(t.key));
}

// Elle eklenen işler
export const cleanTodos = (a) =>
  (Array.isArray(a) ? a : [])
    .map((t) => ({ title: String(t?.title || "").replace(/\s+/g, " ").trim().slice(0, 100), date: /^\d{4}-\d{2}-\d{2}$/.test(t?.date || "") ? t.date : "" }))
    .filter((t) => t.title)
    .slice(0, 30);
export const todoKey = (title) => slug(title, "m:");

export function stepsOf(r) {
  const seen = new Set();
  const own = cleanTodos(r?.todos)
    .map((t) => ({ key: todoKey(t.title), label: t.title, date: t.date, detail: "", group: "own" }))
    .filter((t) => t.key.length > 2 && !seen.has(t.key) && seen.add(t.key));
  return [...noticeTasks(r?.notice), ...own, ...DOC_STEPS.map(([key, label]) => ({ key, label, group: "docs" }))];
}
export const doneCount = (r) => stepsOf(r).filter((s) => r.checks?.[s.key]).length;

const col = (orgId) => collection(db, "orgs", orgId, "races");
const clean = (r) =>
  Object.fromEntries(
    RACE_FIELDS.map((k) => [
      k,
      k === "athleteIds"
        ? r[k] || []
        : k === "checks"
          ? Object.fromEntries(Object.entries(r.checks || {}).filter(([c, v]) => typeof v === "boolean" && /^[\p{L}\p{N}:-]{1,48}$/u.test(c)).slice(0, 60))
          : k === "planAdded"
            ? !!r[k]
            : k === "notice"
              ? cleanNotice(r[k])
            : k === "todos"
              ? cleanTodos(r[k])
            : k === "budget"
              ? cleanBudget(r[k])
            : String(r[k] || "").trim(),
    ]),
  );

// Yeni yarışın boş hali: yetkili, il, federasyon gibi bilgiler son yarıştan gelir.
// Kulüp izin yazısının sayısı son yarışın son sayısından devam eder.
export function freshRace(last = {}, today = "") {
  return {
    name: "", federation: last.federation || "Yelken", city: last.city || "İzmir", district: "",
    startDate: "", endDate: "", leaveStart: "", leaveEnd: "", letterDate: today,
    signer: last.signer || "", signerTitle: last.signerTitle || "Başkan",
    travel: last.travel || "Kendi İmkanları İle", vehicle: "-", drivers: "-", athleteIds: [], note: "", checks: {}, planAdded: false,
    clubNo: last.clubNo ? nextNo(last.clubNo, Math.max(1, last.athleteIds?.length || 0)) : "", clubDate: "", clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "",
    clubSigner: last.clubSigner || "", clubTitle: last.clubTitle || "Antrenör", notice: null, todos: [], budget: null,
  };
}

// Yarışı planlara yazar (tüm gün, çok günlü, "Yarış" kategorisi). saveDrafts: DataProvider'dan.
export async function addRacePlan(saveDrafts, r, by) {
  const res = await saveDrafts(
    [{ type: "plan", title: r.name.trim(), date: r.startDate, endDate: r.endDate && r.endDate !== r.startDate ? r.endDate : "", time: "", place: [r.district, r.city].filter(Boolean).join(", "), cat: "Yarış", assignees: [] }],
    { source: "manual", by },
  );
  return !res.error && res.plans > 0;
}

export async function loadRaces(orgId) {
  const snap = await getDocs(col(orgId));
  const list = snap.docs.map((d) => ({ id: d.id, ...clean(d.data()) })).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  rememberRaceNames(list.map((r) => r.name));
  return list;
}

// Yeni yarışı ekler ya da var olanı günceller; kimliği döndürür
export async function saveRace(orgId, uid, r) {
  const data = { ...clean(r), updatedAt: serverTimestamp() };
  rememberRaceNames([data.name]);
  if (r.id) {
    await updateDoc(doc(col(orgId), r.id), data);
    return r.id;
  }
  const ref = await addDoc(col(orgId), { ...data, createdByUid: uid, createdAt: serverTimestamp() });
  return ref.id;
}

export const deleteRace = (orgId, id) => deleteDoc(doc(col(orgId), id));

// Gün ekle: "2026-10-07", -1 → "2026-10-06"
export function shiftDay(s, n) {
  if (!s) return "";
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
