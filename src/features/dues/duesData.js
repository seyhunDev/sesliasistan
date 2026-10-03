"use client";

import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { movementsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";

// Aidat verisi (yalnız ana hesap; kurallar ana hesaba orgs altındaki her koleksiyonu açıyor). Okuma sayfa açılınca bir kez.
const dues = (orgId, id) => doc(db, "orgs", orgId, "dues", id);
const clean = (x) => JSON.parse(JSON.stringify(x ?? {}));

export async function loadDues(orgId, ym) {
  const [c, m] = await Promise.all([getDoc(dues(orgId, "settings")), getDoc(dues(orgId, ym))]);
  return { cfg: c.data() || {}, month: m.data() || {} };
}
export const saveCfg = (orgId, cfg) => setDoc(dues(orgId, "settings"), clean(cfg));
export const saveMonth = (orgId, ym, month) => setDoc(dues(orgId, ym), clean(month));

// Ayın banka hareketleri: o ay ve sonraki ayın ilk 5 günü gelen hesap özeti mailleri (ayın son günleri sonraki özette olabilir)
export async function loadMovements(uid, ym) {
  const [y, mo] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - 1, 1) - 3 * 3600e3).toISOString();
  const to = new Date(Date.UTC(y, mo, 6)).toISOString();
  const snap = await getDocs(query(collection(db, "orgs", uid, "mails"), where("at", ">=", from), where("at", "<", to), orderBy("at", "desc"), limit(80)));
  const mails = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Excel'i henüz okunmamış mail varsa burada okunur (kaydedilmez; Mailler sayfası kaydeder)
  if (mails.some((m) => m.raw?.length && !m.sheets)) {
    const XLSX = xlsxOf(await import("xlsx"));
    for (const m of mails) if (m.raw?.length && !m.sheets) m.sheets = sheetsFromRaw(m.raw, XLSX);
  }
  return { movements: movementsOf(mails), mails: mails.length };
}
