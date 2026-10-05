"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { movementsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { filedMoves, mergeMoves, rangeOf } from "@/lib/dues";

// Aidat verisi (yalnız ana hesap; kurallar ana hesaba orgs altındaki her koleksiyonu açıyor). Okuma sayfa açılınca bir kez.
const dues = (orgId, id) => doc(db, "orgs", orgId, "dues", id);
const clean = (x) => JSON.parse(JSON.stringify(x ?? {}));

export async function loadDues(orgId, ym) {
  const [c, m] = await Promise.all([getDoc(dues(orgId, "settings")), getDoc(dues(orgId, ym))]);
  return { cfg: c.data() || {}, month: m.data() || {} };
}
export const saveCfg = (orgId, cfg) => setDoc(dues(orgId, "settings"), clean(cfg));
// Sunucunun maildeki ödemeleri eşleştirebilmesi için etkin sporcuların adları (duesAuto.js); diğer ayarlara dokunmaz
export const saveRoster = (orgId, roster) => setDoc(dues(orgId, "settings"), { roster: clean(roster) }, { merge: true });
export const saveMonth = (orgId, ym, month) => setDoc(dues(orgId, ym), clean(month));

// Ayın banka hareketleri: o ay ve sonraki ayın ilk 5 günü gelen hesap özeti mailleri (ayın son günleri sonraki özette olabilir)
// + elle yüklenen banka Excel'leri (orgs/{uid}/bankFiles; o ayı kapsayanlar). Aynı hareket bir kez sayılır.
export async function loadMovements(uid, ym) {
  const [y, mo] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - 1, 1) - 3 * 3600e3).toISOString();
  const to = new Date(Date.UTC(y, mo, 6)).toISOString();
  const [snap, files] = await Promise.all([
    getDocs(query(collection(db, "orgs", uid, "mails"), where("at", ">=", from), where("at", "<", to), orderBy("at", "desc"), limit(80))),
    getDocs(query(collection(db, "orgs", uid, "bankFiles"), where("to", ">=", `${ym}-01`))).catch(() => null),
  ]);
  const mails = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Excel'i henüz okunmamış mail varsa burada okunur (kaydedilmez; Mailler sayfası kaydeder)
  if (mails.some((m) => m.raw?.length && !m.sheets)) {
    const XLSX = xlsxOf(await import("xlsx"));
    for (const m of mails) if (m.raw?.length && !m.sheets) m.sheets = sheetsFromRaw(m.raw, XLSX);
  }
  const fileList = (files?.docs || []).map((d) => ({ id: d.id, ...d.data() })).filter((f) => (f.from || "") <= `${ym}-31`);
  return { movements: mergeMoves(movementsOf(mails), fileList.flatMap((f) => f.moves || [])), mails: mails.length + fileList.length };
}

// Banka Excel'i yükle (telefonda okunur): yalnız gelen TL hareketler saklanır → { id, name, from, to, count }
export async function uploadStatement(uid, file) {
  if (!/\.(xlsx?|csv)$/i.test(file.name)) throw new Error("Excel (.xls, .xlsx) ya da CSV dosyası seç");
  if (file.size > 5_000_000) throw new Error("Dosya çok büyük (en çok 5 MB)");
  const XLSX = xlsxOf(await import("xlsx"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const sheets = sheetsFromRaw([{ name: file.name, data: btoa(bin) }], XLSX, 5000);
  const moves = filedMoves(movementsOf([{ at: new Date().toISOString(), sheets }]));
  if (!moves.length) throw new Error("Dosyada gelen para hareketi bulunamadı (hesap özeti mi?)");
  const r = rangeOf(moves);
  const rec = { name: file.name.slice(0, 120), at: new Date().toISOString(), ...r, count: moves.length, moves };
  if (JSON.stringify(rec).length > 900_000) throw new Error("Dosyada çok fazla hareket var; daha kısa bir dönemi (ör. 3 ay) indirip yükle");
  const ref = await addDoc(collection(db, "orgs", uid, "bankFiles"), rec);
  return { id: ref.id, name: rec.name, ...r, count: rec.count };
}
export async function loadStatements(uid) {
  const snap = await getDocs(query(collection(db, "orgs", uid, "bankFiles"), orderBy("at", "desc"), limit(20)));
  return snap.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, from: x.from, to: x.to, count: x.count, at: x.at }; });
}
export const deleteStatement = (uid, id) => deleteDoc(doc(db, "orgs", uid, "bankFiles", id));

// Birden çok ay (tablo): ayar + her ayın kaydı tek seferde
export async function loadDuesRange(orgId, yms) {
  const [c, ...ms] = await Promise.all([getDoc(dues(orgId, "settings")), ...yms.map((ym) => getDoc(dues(orgId, ym)))]);
  return { cfg: c.data() || {}, months: Object.fromEntries(yms.map((ym, i) => [ym, ms[i].data() || {}])) };
}
// Aralığın banka hareketleri (ilk ayın başı … son ayın sonu + 5 gün): mailler + yüklenen Excel'ler
export async function loadMovementsRange(uid, fromYm, toYm) {
  const [y1, m1] = fromYm.split("-").map(Number);
  const [y2, m2] = toYm.split("-").map(Number);
  const from = new Date(Date.UTC(y1, m1 - 1, 1) - 3 * 3600e3).toISOString();
  const to = new Date(Date.UTC(y2, m2, 6)).toISOString();
  const [snap, files] = await Promise.all([
    getDocs(query(collection(db, "orgs", uid, "mails"), where("at", ">=", from), where("at", "<", to), orderBy("at", "desc"), limit(250))),
    getDocs(query(collection(db, "orgs", uid, "bankFiles"), where("to", ">=", `${fromYm}-01`))).catch(() => null),
  ]);
  const mails = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (mails.some((m) => m.raw?.length && !m.sheets)) {
    const XLSX = xlsxOf(await import("xlsx"));
    for (const m of mails) if (m.raw?.length && !m.sheets) m.sheets = sheetsFromRaw(m.raw, XLSX);
  }
  const fileList = (files?.docs || []).map((d) => d.data()).filter((f) => (f.from || "") <= `${toYm}-31`);
  return { movements: mergeMoves(movementsOf(mails), fileList.flatMap((f) => f.moves || [])), sources: mails.length + fileList.length, mails: mails.length, files: fileList.length };
}
