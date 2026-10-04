"use client";

import { cleanResults } from "@/lib/raceResults";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { nextNo } from "./raceDocs";
import { cleanBudget } from "./budget";
import { rememberRaceNames } from "./raceNames";
import { cleanAround } from "./raceAround";
import { cleanWeather } from "./raceWeather";

// Yarışlar: orgs/{orgId}/races. Yalnızca yarış bilgisi ve sporcu kimlikleri tutulur;
// T.C., veli gibi kişisel bilgiler kopyalanmaz, belge üretilirken sporcu kartından okunur.
export const RACE_FIELDS = [
  // abroad: yurt dışı yarışı (city = ülke, district = şehir; Türkiye'de yapılacaklar listesi açılır), skips: listeden çıkarılan hazır işler
  "abroad", "skips",
  "name", "federation", "city", "district", "startDate", "endDate", "leaveStart", "leaveEnd", "letterDate", "docsAt",
  "signer", "signerTitle", "travel", "vehicle", "drivers", "athleteIds", "note", "checks", "planAdded",
  // Kulüp izin yazısı (boş olanlar yarıştan gelir; bkz. raceDocs clubInfo)
  "clubNo", "clubDate", "clubFrom", "clubTo", "clubEvent", "clubPlace", "clubSigner", "clubTitle",
  // Otel konaklama izni (otel adı boşsa belgede elle yazılacak yer kalır)
  "hotelName", "hotelFrom", "hotelTo",
  // TYF antrenör ve katılım formlarında sınıf (boşsa sporcuların sınıfına göre ayrı formlar)
  "entryClass",
  // Yarış talimatından okunanlar (program, son tarihler, ücretler, oteller, iletişim; raceNotice.js)
  "notice",
  // Talimatın kendisi (PDF) noticeFiles'ta; burada künyesi { id, name, size, parts, at } (noticeFile.js)
  "noticeFile",
  // Elle eklenen işler [{ title, date }]
  "todos",
  // Bütçe (budget.js)
  "budget",
  // Çevre: yarış alanı/otel konumu, yol, yakındaki yerler, gezilecek yerler (raceAround.js)
  "around",
  // Yarış günlerinin hava tahmini, rüzgâr önde (raceWeather.js)
  "weather",
  // Sonuçlar { fleet, rows: { sporcuId: { place, note } } } (raceResults.js)
  "results",
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

export const cleanNoticeFile = (f) =>
  f && typeof f === "object" && /^[\w-]{1,40}$/.test(f.id || "")
    ? { id: f.id, name: String(f.name || "talimat.pdf").slice(0, 120), size: Number(f.size) || 0, parts: Math.max(1, Number(f.parts) || 1), at: String(f.at || "") }
    : null;

// Yarış öncesi yapılacaklar. Her iş: { key, label, date?, detail?, group }; işaretlenenler checks[key].
// Evrak işleri (kulüp tarafı) her yarışta aynı. Kayıt/ödeme/konaklama işleri talimattan gelir (talimat yüklenince);
// her yarışa elle iş de eklenir (todos). Hazır standart liste yok.
export const DOC_STEPS = [
  ["docs", "Evraklar hazırlandı"],
  ["parents", "Veliler imzaladı"],
  ["schools", "Okullara verildi"],
  ["gsim", "GSİM'e verildi (il dışı çıkış oluru)"],
];
// Yurt dışı yarışta Türkiye'de yapılacaklar (hazır liste; gerekmeyen × ile çıkarılır, skips). Talimattaki ve elle işler ayrıca eklenir.
export const ABROAD_STEPS = [
  ["a:pasaport", "Pasaportları kontrol et", "Dönüşten sonra en az 6 ay geçerli olmalı; yoksa erkenden randevu al"],
  ["a:davet", "Davet ve kayıt onay mektubunu al", "Organizasyondan, sporcu ve antrenör adlarıyla (vize için)"],
  ["a:vize", "Vize başvurusunu yap", "Gerekiyorsa; Schengen için en az 1-2 ay önce"],
  ["a:federasyon", "Federasyondan yurt dışı yarış izni al", "TYF'ye kafile listesiyle başvur"],
  ["a:gsim", "Gençlik ve Spor İl Müdürlüğünden yurt dışı görev oluru al", "Kafile onayı, yurt dışı çıkış"],
  ["a:veli", "Velilerden noter onaylı yurt dışı çıkış izni al", "18 yaş altı, velisi yanında olmayan sporcular için"],
  ["a:sigorta", "Seyahat sağlık sigortası yaptır", "Yarış süresini ve yolculuğu kapsasın"],
  ["a:wsid", "World Sailing Sailor ID'leri hazırla", "Kayıtta istenir"],
  ["a:nakliye", "Tekne ve ekipman nakliyesini ayarla", "Ya da yerinde kiralık tekne (charter) ayır; gümrük belgelerini sor"],
  ["a:ucus", "Uçak biletlerini al", "Ekipman ve fazla bagaj hakkını kontrol et"],
  ["a:konaklama", "Konaklamayı ayarla", ""],
  ["a:ulasim", "Havalimanı ve yarış alanı ulaşımını ayarla", ""],
  ["a:doviz", "Kayıt ücretini döviz olarak öde", "Kart ya da havale; dekontu sakla"],
  ["a:harc", "Yurt dışı çıkış harcını kontrol et", "Antrenör ve 18 yaş üstü için; muafiyetlere bak"],
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
export const cleanSkips = (a) => [...new Set((Array.isArray(a) ? a : []).filter((k) => typeof k === "string" && /^a:[a-z]{1,20}$/.test(k)))].slice(0, 30);

export function stepsOf(r) {
  const seen = new Set();
  const own = cleanTodos(r?.todos)
    .map((t) => ({ key: todoKey(t.title), label: t.title, date: t.date, detail: "", group: "own" }))
    .filter((t) => t.key.length > 2 && !seen.has(t.key) && seen.add(t.key));
  const skip = new Set(cleanSkips(r?.skips));
  const abroad = r?.abroad ? ABROAD_STEPS.filter(([key]) => !skip.has(key)).map(([key, label, detail]) => ({ key, label, detail, date: "", group: "abroad" })) : [];
  const docs = DOC_STEPS.filter(([key]) => !(r?.abroad && key === "gsim")).map(([key, label]) => ({ key, label, group: "docs" }));
  return [...noticeTasks(r?.notice), ...own, ...abroad, ...docs];
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
          : k === "planAdded" || k === "abroad"
            ? !!r[k]
            : k === "notice"
              ? cleanNotice(r[k])
            : k === "noticeFile"
              ? cleanNoticeFile(r[k])
            : k === "skips"
              ? cleanSkips(r[k])
            : k === "todos"
              ? cleanTodos(r[k])
            : k === "budget"
              ? cleanBudget(r[k])
            : k === "around"
              ? cleanAround(r[k])
            : k === "weather"
              ? cleanWeather(r[k])
            : k === "results"
              ? cleanResults(r[k])
            : String(r[k] || "").trim(),
    ]),
  );

// Yeni yarışın boş hali (evrak tarihi boş: belgeler ilk hazırlanınca o gün yazılır, sonra değişmez): yetkili, il, federasyon gibi bilgiler son yarıştan gelir.
// Kulüp izin yazısının sayısı son yarışın son sayısından devam eder.
export function freshRace(last = {}, today = "") {
  return {
    abroad: false, skips: [],
    name: "", federation: last.federation || "Yelken", city: last.city || "İzmir", district: "",
    startDate: "", endDate: "", leaveStart: "", leaveEnd: "", letterDate: "", docsAt: "",
    signer: last.signer || "", signerTitle: last.signerTitle || "Başkan",
    travel: last.travel || "Kendi İmkanları İle", vehicle: "-", drivers: "-", athleteIds: [], note: "", checks: {}, planAdded: false,
    clubNo: last.clubNo ? nextNo(last.clubNo, Math.max(1, last.athleteIds?.length || 0)) : "", clubDate: "", clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "",
    clubSigner: last.clubSigner || "", clubTitle: last.clubTitle || "Antrenör", hotelName: "", hotelFrom: "", hotelTo: "", entryClass: "", notice: null, noticeFile: null, todos: [], budget: null, around: null, weather: null, results: null,
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
