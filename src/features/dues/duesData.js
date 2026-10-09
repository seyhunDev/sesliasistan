"use client";

import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { movementsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { cashMoves, filedMoves, incomeMoves, rangeOf } from "@/lib/dues";
import { addFileMoves, dropFileMoves, loadLedger } from "@/features/bank/ledgerData";

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

// Ayın banka hareketleri (banka defterinden; ledgerData.js)
export async function loadMovements(uid, ym) {
  const r = await loadLedger(uid, ym, ym);
  return { movements: r.movements, mails: r.sources };
}

// Banka Excel'ini telefonda okur → { name, all (bütün hareketler), holder (hesap sahibi), from, to } (kaydetmez; Mailler sayfası önce inceletir)
export async function readStatement(file) {
  if (!/\.(xlsx?|csv)$/i.test(file.name)) throw new Error("Excel (.xls, .xlsx) ya da CSV dosyası seç");
  if (file.size > 5_000_000) throw new Error("Dosya çok büyük (en çok 5 MB)");
  const XLSX = xlsxOf(await import("xlsx"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const sheets = sheetsFromRaw([{ name: file.name, data: btoa(bin) }], XLSX, 5000);
  const all = movementsOf([{ at: new Date().toISOString(), sheets }]);
  if (!all.length) throw new Error("Dosyada hesap hareketi bulunamadı (hesap özeti mi?)");
  const holder = sheets.map((x) => x.meta?.["Hesap sahibi"]).find(Boolean) || "";
  return { name: file.name.slice(0, 120), all, holder, ...rangeOf(all) };
}
// Okunan Excel'i kaydeder: dosya kaydında yalnız bilgi, hareketler banka defterine (gelen ve giden, mailde olanlar bir kez)
// → { id, name, from, to, count, added }
export async function saveStatement(uid, read, extra = {}) {
  const { name, all, from, to } = read;
  const count = filedMoves(all).length;
  const rec = { name, at: new Date().toISOString(), from, to, count, total: all.length, ledger: true, ...extra };
  const ref = await addDoc(collection(db, "orgs", uid, "bankFiles"), rec);
  const added = await addFileMoves(uid, ref.id, all);
  return { id: ref.id, name, from, to, count, added };
}
// Banka Excel'i yükle (Aidatlar ayarı; incelemesiz)
export const uploadStatement = async (uid, file) => saveStatement(uid, await readStatement(file));
export async function loadStatements(uid) {
  const snap = await getDocs(query(collection(db, "orgs", uid, "bankFiles"), orderBy("at", "desc"), limit(20)));
  return snap.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, from: x.from, to: x.to, count: x.count, total: x.total, at: x.at, ai: !!x.ai }; });
}
export async function deleteStatement(uid, f) {
  if (f.from && f.to) await dropFileMoves(uid, f.id, f.from.slice(0, 7), f.to.slice(0, 7));
  await deleteDoc(doc(db, "orgs", uid, "bankFiles", f.id));
}

// Birden çok ay (tablo): ayar + her ayın kaydı tek seferde
export async function loadDuesRange(orgId, yms) {
  const [c, ...ms] = await Promise.all([getDoc(dues(orgId, "settings")), ...yms.map((ym) => getDoc(dues(orgId, ym)))]);
  return { cfg: c.data() || {}, months: Object.fromEntries(yms.map((ym, i) => [ym, ms[i].data() || {}])) };
}
// Hesaplar'daki nakit gelirler: Aidatlar'da yazılan nakit aidatlar + elle girilen gelirler (incomes).
// Aidat kayıtları ve gelirler iki sorguda (belge sayısı kadar okuma) → { moves, roster, cfg }
export async function loadCash(orgId) {
  const [snap, inc] = await Promise.all([getDocs(collection(db, "orgs", orgId, "dues")), getDocs(collection(db, "orgs", orgId, "incomes")).catch(() => null)]);
  const all = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  const cfg = all.settings || {};
  const moves = [...cashMoves(all, cfg.roster || []), ...incomeMoves((inc?.docs || []).map((d) => ({ id: d.id, ...d.data() })))].sort((a, b) => b.ts - a.ts);
  return { moves, roster: cfg.roster || [], cfg };
}
export const loadCashMoves = (orgId) => loadCash(orgId).then((r) => r.moves);

// Hesaplar › Gelir ekle. Aidat: o ayın aidat kaydına nakit ödeme olarak (Aidatlar'da o ay ödendi görünür);
// diğer türler: incomes koleksiyonuna.
export async function addIncome(orgId, { cat, who, athleteId, ym, amount, date, note }) {
  const at = new Date().toISOString();
  if (cat === "Aidat" && athleteId && ym) {
    const entry = { amt: amount, via: "cash", date, at, by: "hesaplar", ...(note ? { desc: note } : {}) };
    return setDoc(dues(orgId, ym), { paid: { [athleteId]: arrayUnion(entry) } }, { merge: true });
  }
  return addDoc(collection(db, "orgs", orgId, "incomes"), clean({ cat, who, amount, date, note, at }));
}
export const deleteIncome = (orgId, id) => deleteDoc(doc(db, "orgs", orgId, "incomes", id));

// Aralığın banka hareketleri (banka defterinden): Excel'in getirdikleri + günlük mailler, aynı hareket bir kez
export const loadMovementsRange = (uid, fromYm, toYm) => loadLedger(uid, fromYm, toYm);
