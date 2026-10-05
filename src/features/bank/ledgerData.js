"use client";

import { collection, deleteField, doc, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { movementsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { ledgerAdd, ledgerList, monthsBetween, onlyNew } from "@/lib/bankLedger";

// Banka defteri (bankLedger.js): orgs/{uid}/bank/{YYYY-MM} + meta. Yalnız ana hesap (kurallar orgs altını ana hesaba açık).
// İlk açılışta eldeki bütün hesap özeti mailleri ve önceden yüklenen Excel'ler bir kez deftere yazılır (seeded).
// Sonra her okumada yalnız son eşitlemeden sonra kaydedilen mailler okunup eklenir (mailAt); gerisi ay belgelerinden gelir.
const bank = (uid, id) => doc(db, "orgs", uid, "bank", id);
const mailsOf = (uid) => collection(db, "orgs", uid, "mails");

async function withSheets(snap) {
  const mails = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (mails.some((m) => m.raw?.length && !m.sheets)) {
    const XLSX = xlsxOf(await import("xlsx"));
    for (const m of mails) if (m.raw?.length && !m.sheets) m.sheets = sheetsFromRaw(m.raw, XLSX);
  }
  return mails;
}
// Ay ay yazar (iç içe alanlar birleşir; başka cihazın eklediği hareketler silinmez)
async function write(uid, add) {
  await Promise.all(Object.entries(add).map(([ym, moves]) => setDoc(bank(uid, ym), { moves }, { merge: true })));
}
const lastAt = (mails, prev = "") => mails.reduce((a, m) => (String(m.at || "") > a ? String(m.at) : a), prev);

// İlk kurulum: bütün mailler (sayfa sayfa) + önceden yüklenen Excel'ler (eski kayıtta hareketler dosya belgesindeydi)
async function seed(uid) {
  let mails = [];
  let last = null;
  for (let i = 0; i < 10; i++) {
    const q = last ? query(mailsOf(uid), orderBy("at", "desc"), startAfter(last), limit(200)) : query(mailsOf(uid), orderBy("at", "desc"), limit(200));
    const snap = await getDocs(q);
    mails = mails.concat(await withSheets(snap));
    if (snap.docs.length < 200) break;
    last = snap.docs.at(-1);
  }
  const files = await getDocs(collection(db, "orgs", uid, "bankFiles")).catch(() => null);
  const fromMails = ledgerAdd(movementsOf(mails));
  await write(uid, fromMails);
  for (const f of files?.docs || []) {
    const moves = f.data().moves || [];
    if (!moves.length) continue;
    const add = ledgerAdd(moves, f.id);
    const existing = Object.fromEntries(await Promise.all(Object.keys(add).map(async (ym) => [ym, (await getDoc(bank(uid, ym))).data()?.moves || {}])));
    await write(uid, onlyNew(add, existing));
  }
  const meta = { seeded: new Date().toISOString(), mailAt: lastAt(mails) };
  await setDoc(bank(uid, "meta"), meta, { merge: true });
  return meta;
}

// Defteri günceller: kurulmadıysa kurar, kurulduysa yeni mailleri ekler
export async function syncLedger(uid) {
  const meta = (await getDoc(bank(uid, "meta"))).data();
  if (!meta?.seeded) return seed(uid);
  const snap = await getDocs(query(mailsOf(uid), where("at", ">", meta.mailAt || ""), orderBy("at", "desc"), limit(200)));
  if (!snap.docs.length) return meta;
  const mails = await withSheets(snap);
  await write(uid, ledgerAdd(movementsOf(mails)));
  const mailAt = lastAt(mails, meta.mailAt || "");
  await setDoc(bank(uid, "meta"), { mailAt }, { merge: true });
  return { ...meta, mailAt };
}

// Defteri yeniden kurar ("Yenile"): bütün mailler yeniden okunur (yeni bilgiler, ör. gönderen adı, eklenir); Excel'den
// gelenler kalır. Silinen bir şey olmaz; aynı hareket aynı anahtarla üstüne yazılır.
export async function rebuildLedger(uid) {
  await setDoc(bank(uid, "meta"), { seeded: null }, { merge: true });
  return seed(uid);
}

// Aralığın hareketleri (ilk ayın başı … son ay) → { movements, sources (hareket sayısı), fromFiles (Excel'den gelen) }
export async function loadLedger(uid, fromYm, toYm) {
  await syncLedger(uid);
  const yms = monthsBetween(fromYm, toYm);
  const docs = await Promise.all(yms.map((ym) => getDoc(bank(uid, ym))));
  const months = Object.fromEntries(yms.map((ym, i) => [ym, docs[i].data() || {}]));
  const movements = ledgerList(months);
  const fromFiles = movements.filter((m) => m.f).length;
  return { movements, sources: movements.length, fromFiles };
}

// Yüklenen Excel'in hareketleri (gelen ve giden) deftere; mailden gelmiş olanların üstüne yazılmaz → eklenen sayısı
export async function addFileMoves(uid, fileId, moves) {
  await syncLedger(uid);
  const add = ledgerAdd(moves, fileId);
  const existing = Object.fromEntries(await Promise.all(Object.keys(add).map(async (ym) => [ym, (await getDoc(bank(uid, ym))).data()?.moves || {}])));
  const fresh = onlyNew(add, existing);
  await write(uid, fresh);
  return Object.values(fresh).reduce((n, x) => n + Object.keys(x).length, 0);
}

// Dosya silinince yalnız onun getirdiği hareketler silinir (mailde de olanlar zaten mailin kaydıdır)
export async function dropFileMoves(uid, fileId, fromYm, toYm) {
  for (const ym of monthsBetween(fromYm, toYm)) {
    const moves = (await getDoc(bank(uid, ym))).data()?.moves || {};
    const keys = Object.entries(moves).filter(([, m]) => m.f === fileId).map(([k]) => k);
    if (keys.length) await updateDoc(bank(uid, ym), Object.fromEntries(keys.map((k) => [`moves.${k}`, deleteField()])));
  }
}
