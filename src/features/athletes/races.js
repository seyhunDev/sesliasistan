"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { nextNo } from "./raceDocs";
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
];

const NOTICE_KEYS = ["organizer", "venue", "classes", "schedule", "deadlines", "fees", "hotels", "contacts", "notes", "summary", "at", "planned"];

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

// Yarış öncesi yapılacaklar (her yarışta aynı liste; işaretlenenler checks içinde)
export const STEPS = [
  ["docs", "Evraklar hazırlandı"],
  ["parents", "Veliler imzaladı"],
  ["schools", "Okullara verildi"],
  ["gsim", "GSİM'e verildi"],
  ["entry", "Yarış kayıt formu yapıldı"],
];
export const doneCount = (r) => STEPS.filter(([k]) => r.checks?.[k]).length;

const col = (orgId) => collection(db, "orgs", orgId, "races");
const clean = (r) =>
  Object.fromEntries(
    RACE_FIELDS.map((k) => [
      k,
      k === "athleteIds"
        ? r[k] || []
        : k === "checks"
          ? Object.fromEntries(STEPS.map(([s]) => [s, !!r.checks?.[s]]))
          : k === "planAdded"
            ? !!r[k]
            : k === "notice"
              ? cleanNotice(r[k])
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
    clubSigner: last.clubSigner || "", clubTitle: last.clubTitle || "Antrenör", notice: null,
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
