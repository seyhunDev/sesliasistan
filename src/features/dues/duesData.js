"use client";

import { arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { addDoc, deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { movementsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { cashMoves, filedMoves, incomeMoves, rangeOf } from "@/lib/dues";
import { bookOf, convIncome, convSet } from "@/lib/cashbook";
import { whoIn } from "@/lib/payee";
import { addFileMoves, dropFileMoves, loadLedger } from "@/features/bank/ledgerData";
import { todayStr } from "@/lib/utils/format";

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
// Asistandan: aidat başlangıç ayı ve "bu ay sayılmasın" (yalnız o alan yazılır, diğerlerine dokunmaz)
export const saveStart = (orgId, id, ym) => setDoc(dues(orgId, "settings"), { start: { [id]: ym } }, { merge: true });
// Asistandan: burslu (hiç aidat ödemez); burslu yapılınca özel tutar silinir
export const saveBurs = (orgId, id, on) => setDoc(dues(orgId, "settings"), { burs: { [id]: on ? true : deleteField() }, ...(on ? { fees: { [id]: deleteField() } } : {}) }, { merge: true });
export const saveFree = (orgId, ym, id, on) => setDoc(dues(orgId, ym), { free: { [id]: on ? true : deleteField() } }, { merge: true });

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
// Hesaplar'daki nakitler: Aidatlar'da yazılan nakit aidatlar + elle girilen giriş/çıkışlar (incomes) + kasa ayarı (cash/meta).
// Kasa ayarı ilk açılışta yazılır (from = şimdi): ondan önce girilen nakitler kasaya kendiliğinden sayılmaz.
// → { moves (kulüp), personal (kişisel defter), meta, roster, cfg }
export async function loadCash(orgId) {
  const metaRef = doc(db, "orgs", orgId, "cash", "meta");
  const [snap, inc, m] = await Promise.all([getDocs(collection(db, "orgs", orgId, "dues")), getDocs(collection(db, "orgs", orgId, "incomes")).catch(() => null), getDoc(metaRef).catch(() => null)]);
  const all = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  const cfg = all.settings || {};
  let meta = m?.data() || null;
  if (m && !meta) {
    meta = { from: new Date().toISOString(), add: [], skip: [] };
    setDoc(metaRef, meta).catch(() => {});
  }
  const mine = incomeMoves((inc?.docs || []).map((d) => ({ id: d.id, ...d.data() })));
  const moves = [...cashMoves(all, cfg.roster || []), ...mine.filter((x) => bookOf(x) === "club")].sort((a, b) => b.ts - a.ts);
  return { moves, personal: mine.filter((x) => bookOf(x) === "personal"), meta: meta || {}, roster: cfg.roster || [], cfg };
}
export const loadCashMoves = (orgId) => loadCash(orgId).then((r) => r.moves);
// Eski nakit girişi kasaya ekle (on) ya da kasadan çıkar
export const setInKasa = (orgId, key, on) =>
  setDoc(doc(db, "orgs", orgId, "cash", "meta"), on ? { add: arrayUnion(key), skip: arrayRemove(key) } : { add: arrayRemove(key), skip: arrayUnion(key) }, { merge: true });

// Eski nakit girişlerini arşivle (kullanıldı, kasada değil) ya da arşivden geri al (yine "önceki girişler"de görünür)
export const archiveCash = (orgId, keys) => setDoc(doc(db, "orgs", orgId, "cash", "meta"), { skip: arrayUnion(...keys), add: arrayRemove(...keys) }, { merge: true });
export const unarchiveCash = (orgId, keys) => setDoc(doc(db, "orgs", orgId, "cash", "meta"), { skip: arrayRemove(...keys) }, { merge: true });

// Hesaplar › "+". Kulüp nakit girişi: Aidat o ayın aidat kaydına nakit ödeme olarak (Aidatlar'da o ay ödendi görünür), diğer
// türler incomes'a. Kulüp nakit çıkışı ve kişisel gelir/gider/borç: incomes'a (book, dir).
export async function addIncome(orgId, { book = "club", dir = "in", cat, who, athleteId, ym, amount, date, note }) {
  const at = new Date().toISOString();
  if (book === "club" && dir === "in" && cat === "Aidat" && athleteId && ym) {
    const entry = { amt: amount, via: "cash", date, at, by: "hesaplar", ...(note ? { desc: note } : {}) };
    return setDoc(dues(orgId, ym), { paid: { [athleteId]: arrayUnion(entry) } }, { merge: true });
  }
  return addDoc(collection(db, "orgs", orgId, "incomes"), clean({ ...(book === "personal" ? { book } : {}), ...(dir !== "in" ? { dir } : {}), cat, who, amount, date, note, at }));
}
// Elle yazılan nakit/kişisel kaydı düzelt (ad, tür, tutar, tarih, not, giriş/çıkış)
export const updateIncome = (orgId, id, { dir = "in", cat, who, amount, date, note }) =>
  updateDoc(doc(db, "orgs", orgId, "incomes", id), { dir: dir === "in" ? deleteField() : dir, cat, who: who || "", amount, date, note: note || "", editedAt: new Date().toISOString() });
export const deleteIncome = (orgId, id) => deleteDoc(doc(db, "orgs", orgId, "incomes", id));
// Banka hareketini nakite çevir: kulüp kasasına nakit giriş + cash/meta.conv (kişisel hesapta artık sayılmaz; cashbook.js)
export async function convertToCash(orgId, m) {
  const inc = convIncome(m, whoIn);
  await Promise.all([addDoc(collection(db, "orgs", orgId, "incomes"), { ...inc, at: new Date().toISOString() }), setDoc(doc(db, "orgs", orgId, "cash", "meta"), { conv: arrayUnion(m.id) }, { merge: true })]);
}
// Geri al: kasadaki girişi siler, banka hareketi yine kişisel hesapta sayılır
export async function undoConvert(orgId, movId) {
  const q = await getDocs(query(collection(db, "orgs", orgId, "incomes"), where("conv", "==", movId)));
  await Promise.all([...q.docs.map((d) => deleteDoc(d.ref)), setDoc(doc(db, "orgs", orgId, "cash", "meta"), { conv: arrayRemove(movId) }, { merge: true })]);
}
// Yalnız nakite çevrilenlerin anahtarları (tek okuma; Gelen ödemeler ve asistan)
export const loadConv = (orgId) =>
  getDoc(doc(db, "orgs", orgId, "cash", "meta"))
    .then((d) => convSet(d.data()))
    .catch(() => new Set());
// Kişisel borç ödendi / geri al
export const setDebtPaid = (orgId, id, paid) => setDoc(doc(db, "orgs", orgId, "incomes", id), paid ? { paid: true, paidAt: new Date().toISOString() } : { paid: false, paidAt: deleteField() }, { merge: true });

// Aralığın banka hareketleri (banka defterinden): Excel'in getirdikleri + günlük mailler, aynı hareket bir kez
export const loadMovementsRange = (uid, fromYm, toYm) => loadLedger(uid, fromYm, toYm);
// Kasa "Kime verildi" için elle yazılan adlar (sonraki seferde seçenek olur, silinebilir)
export const saveCashName = (orgId, name) => setDoc(doc(db, "orgs", orgId, "cash", "meta"), { names: arrayUnion(name) }, { merge: true });
export const dropCashName = (orgId, name) => setDoc(doc(db, "orgs", orgId, "cash", "meta"), { names: arrayRemove(name) }, { merge: true });
// Hesaplar › Bakiye'de gösterilecek hesaplar (hesap anahtarları)
export const saveShownAccts = (orgId, keys) => setDoc(doc(db, "orgs", orgId, "cash", "meta"), { accts: keys }, { merge: true });
// Fiş ya da fatura nakit ödenince kulüp kasasından çıkış (src: "rc:<fiş>" | "inv:<fatura>"); ödeme geri alınınca silinir
// Fiş/fatura nakit ödemesinden gelen kasa kayıtları değişince açık Hesaplar sayfası yeniden okur
const cashChanged = () => typeof window !== "undefined" && window.dispatchEvent(new Event("sa-cash-saved"));
export const cashOutFor = (orgId, { src, cat, who, amount, note, date, book }) =>
  addDoc(collection(db, "orgs", orgId, "incomes"), clean({ ...(book === "personal" ? { book } : {}), dir: "out", cat, who, amount, note, date: date || todayStr(), src, at: new Date().toISOString() })).then((r) => (cashChanged(), r));
// Fişsiz nakit çıkışa sonradan eklenen fiş: çıkış o fişe bağlanır (tutar fişten), ikinci çıkış yazılmaz
export const linkCashTo = (orgId, incomeId, { src, amount, who }) =>
  updateDoc(doc(db, "orgs", orgId, "incomes", incomeId), clean({ src, amount, cat: "Fiş", ...(who ? { who } : {}) })).then(() => cashChanged());
// Bağlı kasa çıkışını günceller (fişin tutarı ya da defteri değişince)
export async function setCashFor(orgId, src, patch) {
  const q = await getDocs(query(collection(db, "orgs", orgId, "incomes"), where("src", "==", src)));
  await Promise.all(q.docs.map((d) => updateDoc(d.ref, patch)));
  cashChanged();
}
export async function dropCashFor(orgId, src) {
  const q = await getDocs(query(collection(db, "orgs", orgId, "incomes"), where("src", "==", src)));
  await Promise.all(q.docs.map((d) => deleteDoc(d.ref)));
  cashChanged();
}
