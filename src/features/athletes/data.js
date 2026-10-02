"use client";

import { useCallback, useEffect, useState } from "react";
import { FieldPath, Timestamp, addDoc, collection, deleteField, doc, getDoc, getDocs, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { dikiliAuth, dikiliDb } from "./dikili";

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
export const DOC_FIELDS = ["studentSchoolAndClass", "studentSchool", "studentSchoolPlace", "studentNo", "studentClass", "licenseNo", "studentBirthPlace", "studentPhone", "motherName", "fatherName", "parentTc", "parentRelation"];

// Sınıf ve antrenör adları
async function names(db) {
  const [cls, coa] = await Promise.all([getDocs(collection(db, "sailing_classes")), getDocs(collection(db, "coaches"))]);
  const map = (snap) => snap.docs.map((d) => ({ id: d.id, name: d.data().name || "" }));
  return { classes: map(cls), coaches: map(coa) };
}

// Kayıtlı oturum geri yüklenmeden sorgu atılırsa kurallar reddeder; önce onu bekle
const ready = () => dikiliAuth().authStateReady();

export async function loadAthletes() {
  await ready();
  const db = dikiliDb();
  const [snap, n] = await Promise.all([getDocs(query(collection(db, "athletes"), orderBy("createdAt", "desc"))), names(db)]);
  const athletes = snap.docs.map((d) => {
    const a = d.data();
    return plain({
      id: d.id, studentName: a.studentName || "", studentTc: a.studentTc || "", status: a.status || "",
      currentClassId: a.currentClassId || "", currentCoachId: a.currentCoachId || "",
      parentName: a.parentName || "", parentPhone: a.parentPhone || "", parentEmail: a.parentEmail || "", studentBirthDate: a.studentBirthDate || null,
      // Yarış evrakı için (raceDocs.js)
      ...Object.fromEntries(DOC_FIELDS.map((k) => [k, a[k] || ""])),
      // Yoklama: { 2026: { "09-29": "present" } }
      att: Object.fromEntries(Object.entries(a).filter(([k]) => /^attendance_\d{4}$/.test(k)).map(([k, v]) => [k.slice(11), v || {}])),
    });
  });
  return { athletes, ...n };
}

// ---- Yazma (kulüp uygulamasıyla aynı yapı) ----
// Yoklama sporcunun belgesinde: attendance_YYYY.{"MM-DD"} = "present" | "absent" | "excused"
export const STATES = ["present", "absent", "excused"];
const dayKey = (date) => [date.slice(0, 4), date.slice(5, 10)]; // "2026-09-29" -> ["2026", "09-29"]

// changes: { sporcuId: durum | null } (null = işareti kaldır)
export async function saveAttendance(date, changes) {
  const [y, md] = dayKey(date);
  const db = dikiliDb();
  const ids = Object.keys(changes);
  for (let i = 0; i < ids.length; i += 400) {
    const b = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => {
      const v = changes[id];
      b.update(doc(db, "athletes", id), new FieldPath(`attendance_${y}`, md), STATES.includes(v) ? v : deleteField());
    });
    await b.commit();
  }
  forget();
}

// Sporcu bilgilerini güncelle. Sınıf, antrenör ya da durum değiştiyse geçmişe kayıt düşer (kulüp uygulaması gibi).
export async function updateAthlete(id, before, patch, names) {
  const db = dikiliDb();
  const ref = doc(db, "athletes", id);
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
  for (const l of logs) await addDoc(collection(db, "athletes", id, "history"), { ...l, date: new Date() });
  forget();
}

export async function loadAthlete(id) {
  await ready();
  const db = dikiliDb();
  const [d, hist, n] = await Promise.all([
    getDoc(doc(db, "athletes", id)),
    getDocs(query(collection(db, "athletes", id, "history"), orderBy("date", "desc"))),
    names(db),
  ]);
  if (!d.exists()) throw Object.assign(new Error("Sporcu bulunamadı."), { code: "not-found" });
  return { athlete: plain({ id: d.id, ...d.data() }), history: hist.docs.map((h) => plain({ id: h.id, ...h.data() })), ...n };
}

// Veri yalnızca bellekte tutulur (kişisel/sağlık bilgisi; cihaza kaydedilmez).
// Liste sayfasına geri dönünce yeniden indirilmesin diye oturum boyunca saklanır.
const memo = new Map(); // anahtar -> veri
export const forget = () => memo.clear();

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
