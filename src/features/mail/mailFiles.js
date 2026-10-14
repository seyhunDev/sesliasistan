"use client";

// Banka maillerinin Excel ekleri Firebase Storage'da: orgs/{uid}/mailFiles/{mail id}_{sıra}_{ad} (kural storage.rules: yalnız ana hesap).
// Gmail betiği ekleri yine ham (base64, `raw`) yazar; sunucu bildirim için onlardan tabloyu (`sheets`) okur.
// Uygulama ham ekleri Storage'a taşır: mailde `rawFiles [{ name, path, url, size }]` kalır, `raw` silinir (Firestore'da yer kaplamasın).
// Eski maillerin ekleri de ilk açılışta / Ayarlar › Telefondaki veriyi taşı ile taşınır.
import { collection, deleteField, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";

const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3;
  s.maxOperationRetryTime = 30e3;
  return s;
};
const safe = (s) => String(s || "ek").replace(/[^\w.-]+/g, "_").slice(0, 80);
const typeOf = (name) => (/\.xlsx$/i.test(name) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : /\.xls$/i.test(name) ? "application/vnd.ms-excel" : "application/octet-stream");
const bytesOf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let XLSX = null;
let lastErr = "";
export const mailMoveErr = () => lastErr;
const busy = new Set();

// Tek mailin eklerini taşır. true: taşındı (ya da taşınacak bir şey yoktu)
export async function moveMailFiles(uid, m) {
  if (!m?.raw?.length || busy.has(m.id)) return !m?.raw?.length;
  busy.add(m.id);
  try {
    const patch = {};
    if (!m.sheets) {
      XLSX ||= xlsxOf(await import("xlsx"));
      patch.sheets = sheetsFromRaw(m.raw, XLSX);
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

// Ekleri hâlâ mailde duran bütün mailleri taşır (50'şer). Dönüş { moved, left }
export async function moveAllMailFiles(uid, onProg) {
  let moved = 0;
  let left = 0;
  for (let round = 0; round < 40; round++) {
    onProg?.(moved, "ara");
    const snap = await getDocs(query(collection(db, "orgs", uid, "mails"), where("raw", "!=", null), limit(50)));
    const todo = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.raw?.length);
    if (!todo.length) break;
    let ok = 0;
    for (const m of todo) {
      if (await moveMailFiles(uid, m)) ok += 1;
      onProg?.(moved + ok);
    }
    moved += ok;
    if (ok < todo.length) {
      left = todo.length - ok;
      break;
    }
  }
  return { moved, left };
}

// Ek dosyasının baytları: Storage'dan ya da (taşınmamış mailde) mailin içinden
export async function mailFileBytes(f) {
  if (f.data) return bytesOf(f.data);
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}
