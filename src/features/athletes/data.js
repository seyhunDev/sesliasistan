"use client";

import { useCallback, useEffect, useState } from "react";
import { FieldPath, Timestamp, collection, deleteField, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { addDoc, deleteDoc, updateDoc, writeBatch } from "@/lib/firebase/write";
import { memDb, memReady } from "./veloraMem";
import { EXPIRY_KEYS } from "@/lib/expiry";
import { attTakenIn, markAttTaken } from "./attTaken";
import { todayStr } from "@/lib/utils/format";
import { addBody, cleanBody, dropBody } from "@/lib/athleteBody";

// Firestore değerlerini düz hale getirir (Timestamp -> ISO tarih)
function plain(v) {
  if (v == null) return v;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

// Yarış evrakında kullanılan ek alanlar (sporcu kartında saklanır, bir kez girilir)
export const DOC_FIELDS = ["studentSchoolAndClass", "studentSchool", "studentSchoolPlace", "studentNo", "studentClass", "licenseNo", "studentBirthPlace", "studentPhone", "motherName", "fatherName", "parentTc", "parentRelation", "tyfNo", "sailNo"];

// Sporcular Velora'nın kendi verisinde (Seyhun 2026-11-27; eski kulüp veritabanı dikili-c7cc8 artık kullanılmıyor, veri orada yedek):
// orgs/{ana hesap}/athletes (+ history), sailingClasses, coaches. Okuma ve yazma bellek önbellekli bağlantıdan (veloraMem.js).
async function src() {
  const org = await memReady();
  const db = memDb();
  return { db, col: (...p) => collection(db, "orgs", org, ...p), ref: (...p) => doc(db, "orgs", org, ...p), classes: "sailingClasses" };
}

// Sınıf ve antrenör adları
async function names(S) {
  const [cls, coa] = await Promise.all([getDocs(S.col(S.classes)), getDocs(S.col("coaches"))]);
  const map = (snap) => snap.docs.map((d) => ({ id: d.id, name: d.data().name || "" }));
  return { classes: map(cls), coaches: map(coa) };
}

// Sayfalar arası geçişte ve sesli komutlarda liste her seferinde yeniden indirilmesin (okuma tasarrufu): birkaç dakika bellekte.
// Yazınca (forget) silinir; Yenile düğmesi de taze okur.
const LIST_MS = 3 * 60e3;
let listMemo = null; // { at, p: Promise }

export function loadAthletes({ fresh = false } = {}) {
  if (!fresh && listMemo && Date.now() - listMemo.at < LIST_MS) return listMemo.p;
  const p = fetchAthletes();
  listMemo = { at: Date.now(), p };
  p.catch(() => listMemo?.p === p && (listMemo = null));
  return p;
}

async function fetchAthletes() {
  const S = await src();
  const [snap, n] = await Promise.all([getDocs(query(S.col("athletes"), orderBy("createdAt", "desc"))), names(S)]);
  const athletes = snap.docs.map((d) => {
    const a = d.data();
    return plain({
      id: d.id, studentName: a.studentName || "", studentTc: a.studentTc || "", status: a.status || "",
      currentClassId: a.currentClassId || "", currentCoachId: a.currentCoachId || "",
      parentName: a.parentName || "", parentPhone: a.parentPhone || "", parentEmail: a.parentEmail || "", studentGender: a.studentGender || "", studentBirthDate: a.studentBirthDate || null,
      // Yarış evrakı için (raceDocs.js)
      ...Object.fromEntries(DOC_FIELDS.map((k) => [k, a[k] || ""])),
      // Lisans vizesi, sağlık raporu, sigorta bitiş tarihleri (YYYY-MM-DD)
      ...Object.fromEntries(EXPIRY_KEYS.map((k) => [k, typeof a[k] === "string" ? a[k] : ""])),
      // Boy ve kilo ölçümleri [{ d, h, kg }] (sporcu sayfası, fitness programı)
      body: cleanBody(a.body),
      // Yoklama: { 2026: { "09-29": "present" } }
      att: Object.fromEntries(Object.entries(a).filter(([k]) => /^attendance_\d{4}$/.test(k)).map(([k, v]) => [k.slice(11), v || {}])),
    });
  });
  rememberNames(athletes);
  // Bugünün yoklaması başka cihazdan girildiyse de alındı sayılsın (yoklama hatırlatması gelmesin)
  if (attTakenIn(athletes, todayStr())) markAttTaken();
  return { athletes, ...n };
}

// Etkin sporcuların adları bu cihazda (asistanın ses çevirisine kelime listesi; ek okuma olmasın). Yalnız ad, başka bilgi yok
export const ATH_NAMES_KEY = "sa-ath-names";
function rememberNames(list) {
  try {
    const names = list.filter((a) => a.status === "active" && a.studentName).map((a) => a.studentName.trim()).slice(0, 80);
    localStorage.setItem(ATH_NAMES_KEY, JSON.stringify(names));
  } catch {}
}
export function athleteNames() {
  try {
    const l = JSON.parse(localStorage.getItem(ATH_NAMES_KEY) || "[]");
    return Array.isArray(l) ? l.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// ---- Yazma (eski kulüp uygulamasıyla aynı alanlar) ----
// Yoklama sporcunun belgesinde: attendance_YYYY.{"MM-DD"} = "present" | "absent" | "excused"
export const STATES = ["present", "absent", "excused"];
const dayKey = (date) => [date.slice(0, 4), date.slice(5, 10)]; // "2026-09-29" -> ["2026", "09-29"]

// changes: { sporcuId: durum | null } (null = işareti kaldır)
export async function saveAttendance(date, changes) {
  const [y, md] = dayKey(date);
  const S = await src();
  const ids = Object.keys(changes);
  for (let i = 0; i < ids.length; i += 400) {
    const b = writeBatch(S.db);
    ids.slice(i, i + 400).forEach((id) => {
      const v = changes[id];
      b.update(S.ref("athletes", id), new FieldPath(`attendance_${y}`, md), STATES.includes(v) ? v : deleteField());
    });
    await b.commit();
  }
  forget();
}

// Sporcu bilgilerini güncelle. Sınıf, antrenör ya da durum değiştiyse geçmişe kayıt düşer (kulüp uygulaması gibi).
export async function updateAthlete(id, before, patch, names) {
  const S = await src();
  const ref = S.ref("athletes", id);
  const data = { ...patch };
  if ("studentBirthDate" in data) {
    const d = data.studentBirthDate;
    data.studentBirthDate = d ? Timestamp.fromDate(new Date(`${d}T12:00:00`)) : null;
  }
  await updateDoc(ref, data);
  const nm = (list, v) => (list.find((x) => x.id === v)?.name || (v ? "?" : "Yok"));
  const logs = [];
  if ("currentClassId" in patch && patch.currentClassId !== (before.currentClassId || "")) {
    const from = nm(names.classes, before.currentClassId), to = nm(names.classes, patch.currentClassId);
    logs.push({ type: "class_change", from, to, note: `Sınıf değişti: ${from} → ${to}` });
  }
  if ("currentCoachId" in patch && patch.currentCoachId !== (before.currentCoachId || "")) {
    const from = nm(names.coaches, before.currentCoachId), to = nm(names.coaches, patch.currentCoachId);
    logs.push({ type: "coach_change", from, to, note: `Antrenör değişti: ${from} → ${to}` });
  }
  if ("status" in patch && patch.status !== (before.status || "")) {
    const lab = (v) => (v === "active" ? "Aktif" : "Pasif");
    logs.push({ type: "status_change", from: lab(before.status), to: lab(patch.status), note: `Durum: ${lab(before.status)} → ${lab(patch.status)}` });
  }
  for (const l of logs) await addDoc(S.col("athletes", id, "history"), { ...l, date: new Date() });
  forget();
}

// Boy / kilo ölçümü ekle (m: { d, h, kg }) ya da sil (drop: tarih). Güncel liste sunucudan okunup yazılır.
export async function saveBody(id, m, drop = "") {
  const S = await src();
  const ref = S.ref("athletes", id);
  const snap = await getDoc(ref);
  const cur = snap.exists() ? snap.data().body : [];
  const body = drop ? dropBody(cur, drop) : addBody(cur, m);
  await updateDoc(ref, { body });
  forget();
  return body;
}

// Yeni sporcu (Velora, eski kulüp uygulamasıyla aynı alanlar). Liste createdAt'e göre sıralandığı için createdAt şart.
// Dönüş: yeni sporcunun kimliği
// Sporcu sunucudan eklenir (/api/sporcu-ekle; paket sınırı lib/paket.js). Hak dolduysa hata code "paket-dolu" (count, limit).
export async function createAthlete(fields) {
  const { authFetch } = await import("@/lib/authFetch");
  const res = await authFetch("/api/sporcu-ekle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fields }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error || "Sporcu eklenemedi."), { code: j.full ? "paket-dolu" : res.status === 403 ? "permission-denied" : "server", count: j.count, limit: j.limit });
  forget();
  return j.id;
}

// Arşiv: "Pasif" durumu (listede gizlenir, yoklama ve aidat listesine girmez; geçmişi kalır)
export const setArchived = (a, on, names) => updateAthlete(a.id, a, { status: on ? "passive" : "active" }, names);

// Sporcuyu tamamen siler (geçmiş kayıtları dahil). Geri alınamaz.
export async function deleteAthlete(id) {
  const S = await src();
  const hist = await getDocs(S.col("athletes", id, "history"));
  for (const h of hist.docs) await deleteDoc(h.ref);
  await deleteDoc(S.ref("athletes", id));
  forget();
}

export async function loadAthlete(id) {
  const S = await src();
  const [d, hist, n] = await Promise.all([
    getDoc(S.ref("athletes", id)),
    getDocs(query(S.col("athletes", id, "history"), orderBy("date", "desc"))),
    names(S),
  ]);
  if (!d.exists()) throw Object.assign(new Error("Sporcu bulunamadı."), { code: "not-found" });
  return { athlete: plain({ id: d.id, ...d.data() }), history: hist.docs.map((h) => plain({ id: h.id, ...h.data() })), ...n };
}

// Veri yalnızca bellekte tutulur (kişisel/sağlık bilgisi; cihaza kaydedilmez).
// Liste sayfasına geri dönünce yeniden indirilmesin diye oturum boyunca saklanır.
const memo = new Map(); // anahtar -> veri
export const forget = () => {
  memo.clear();
  listMemo = null;
};

export const message = (e) =>
  e?.code === "permission-denied"
    ? "Bu hesabın sporcuları görme izni yok."
    : e?.code === "unavailable"
      ? "Bağlantı yok. İnternetini kontrol et."
      : e?.message || "Sporcular alınamadı.";

// key: önbellek anahtarı, fn: veriyi getiren fonksiyon. err.code "permission-denied" ise giriş gerekir.
export function useDikili(key, fn) {
  const [data, setData] = useState(() => memo.get(key) || null);
  const [err, setErr] = useState(null);
  const run = useCallback(
    () =>
      fn().then(
        (d) => {
          memo.set(key, d);
          return { d };
        },
        (e) => ({ e: { code: e?.code || "", text: message(e) } }),
      ),
    [key, fn],
  );
  const reload = useCallback(() => {
    listMemo = null; // Yenile: önbelleği atla
    setErr(null);
    run().then(({ d, e }) => (e ? setErr(e) : setData(d)));
  }, [run]);
  useEffect(() => {
    let alive = true;
    run().then(({ d, e }) => alive && (e ? setErr(e) : setData(d)));
    return () => {
      alive = false;
    };
  }, [run]);
  return { data, err, reload };
}

// id -> ad eşlemesi
export const byId = (list) => Object.fromEntries((list || []).map((x) => [x.id, x.name]));

export const isActive = (a) => a.status === "active";

export function fmtDate(iso, opts = { day: "numeric", month: "long", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("tr-TR", opts);
}

export function age(iso) {
  if (!iso) return null;
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}
