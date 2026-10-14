"use client";

// Banka maillerinin Excel ekleri. Gmail betiği ekleri ham (base64, `raw`) yazar; içindeki tablo (`sheets`) maile yazılır.
// Bakiye, aidat, fatura ve banka defteri yalnız tabloyu kullanır, orijinal dosya Gmail'de durur.
// Bu yüzden tablo tam okunduysa (rawDone, mailParse.js) ham ek silinir. Okunamayan ek (başka biçim, tablo bulunamadı)
// silinmez, Storage'a konur: orgs/{uid}/mailFiles/{mail id}_{sıra}_{ad}; mailde `rawFiles [{ name, path, url, size }]`.
// Önceden Storage'a taşınan ekler de (cleanStoredMail) yeniden okunur, tablo tamsa Storage'dan silinir.
import { collection, deleteField, doc, getDocs, limit, query, startAfter, updateDoc, where } from "firebase/firestore";
import { deleteObject, getBytes, getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { MAIL_ROWS, rawDone, sheetsFromRaw, xlsxOf } from "@/lib/mailParse";

const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3;
  s.maxOperationRetryTime = 30e3;
  return s;
};
const safe = (s) => String(s || "ek").replace(/[^\w.-]+/g, "_").slice(0, 80);
const typeOf = (name) => (/\.xlsx$/i.test(name) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : /\.xls$/i.test(name) ? "application/vnd.ms-excel" : "application/octet-stream");
const bytesOf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function b64Of(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

let XLSX = null;
let lastErr = "";
export const mailMoveErr = () => lastErr;
const busy = new Set();

// Tek mailin eklerini temizler. true: ek silindi ya da Storage'a kondu (ya da yapılacak bir şey yoktu)
export async function moveMailFiles(uid, m) {
  if (!m?.raw?.length || busy.has(m.id)) return !m?.raw?.length;
  busy.add(m.id);
  try {
    XLSX ||= xlsxOf(await import("xlsx"));
    const read = sheetsFromRaw(m.raw, XLSX, MAIL_ROWS);
    const patch = read.length || !m.sheets ? { sheets: read } : {};
    // Tablo tam: yalnız tablo kalır, ham ek silinir
    if (rawDone(m.raw, read)) {
      await updateDoc(doc(db, "orgs", uid, "mails", m.id), { ...patch, raw: deleteField() });
      return true;
    }
    const files = [];
    for (const [i, f] of m.raw.entries()) {
      if (!f?.data) continue;
      const path = `orgs/${uid}/mailFiles/${m.id}_${i}_${safe(f.name)}`;
      const r = sref(store(), path);
      const data = bytesOf(f.data);
      await uploadBytes(r, data, { contentType: typeOf(f.name), cacheControl: "private, max-age=31536000" });
      files.push({ name: String(f.name || "ek").slice(0, 120), path, url: await getDownloadURL(r), size: data.length });
    }
    await updateDoc(doc(db, "orgs", uid, "mails", m.id), { ...patch, rawFiles: files, raw: deleteField() });
    return true;
  } catch (e) {
    console.warn("[mailFiles] taşınamadı", m.id, e?.code || e);
    lastErr = e?.code || e?.message || "hata";
    return false;
  } finally {
    busy.delete(m.id);
  }
}

// Önceden Storage'a taşınmış ekler: dosya indirilip yeniden okunur, tablo tamsa maile yazılır, sonra Storage'dan silinir.
// true: temizlendi, false: okunamadı (dosya Storage'da kalır)
export async function cleanStoredMail(uid, m) {
  if (!m?.rawFiles?.length) return true;
  try {
    const raw = [];
    for (const f of m.rawFiles) raw.push({ name: f.name, data: b64Of(new Uint8Array(await getBytes(sref(store(), f.path)))) });
    XLSX ||= xlsxOf(await import("xlsx"));
    const read = sheetsFromRaw(raw, XLSX, MAIL_ROWS);
    if (!rawDone(raw, read)) return false;
    await updateDoc(doc(db, "orgs", uid, "mails", m.id), { sheets: read, rawFiles: deleteField() });
    for (const f of m.rawFiles) await deleteObject(sref(store(), f.path)).catch(() => {});
    return true;
  } catch (e) {
    console.warn("[mailFiles] Storage eki okunamadı", m.id, e?.code || e);
    lastErr = e?.code || e?.message || "hata";
    return false;
  }
}

// Ekleri hâlâ mailde duran bütün mailleri temizler. Mailler ekiyle büyük olduğu için 5'er okunur
// (50'si birden telefonda dakikalarca inebiliyordu). Okuma 60 sn'de gelmezse durur. Dönüş { moved, left, kept }
const BATCH = 5;
const late = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("zaman aşımı"), { code: "zaman aşımı" })), ms))]);
export async function moveAllMailFiles(uid, onProg) {
  let moved = 0;
  let left = 0;
  for (let round = 0; round < 400; round++) {
    onProg?.(moved, "ara");
    const snap = await late(getDocs(query(collection(db, "orgs", uid, "mails"), where("raw", "!=", null), limit(BATCH))), 60e3);
    const todo = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.raw?.length);
    if (!todo.length) break;
    let ok = 0;
    for (const m of todo) {
      onProg?.(moved + ok);
      if (await late(moveMailFiles(uid, m), 90e3).catch(() => false)) ok += 1;
    }
    moved += ok;
    onProg?.(moved);
    if (ok < todo.length) {
      left = todo.length - ok;
      break;
    }
  }
  if (left) return { moved, left, kept: 0 };
  // Storage'daki eski ekler; okunamayanlar orada kalır (kept), sonraki sayfaya geçilir
  let kept = 0;
  let after = null;
  for (let round = 0; round < 400; round++) {
    onProg?.(moved, "ara");
    const q = [collection(db, "orgs", uid, "mails"), where("rawFiles", "!=", null), ...(after ? [startAfter(after)] : []), limit(BATCH)];
    const snap = await late(getDocs(query(...q)), 60e3);
    if (!snap.docs.length) break;
    after = snap.docs[snap.docs.length - 1];
    for (const d of snap.docs) {
      onProg?.(moved);
      if (await late(cleanStoredMail(uid, { id: d.id, ...d.data() }), 90e3).catch(() => false)) moved += 1;
      else kept += 1;
    }
  }
  return { moved, left, kept };
}

// Ek dosyasının baytları: Storage'dan ya da (taşınmamış mailde) mailin içinden
export async function mailFileBytes(f) {
  if (f.data) return bytesOf(f.data);
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}
