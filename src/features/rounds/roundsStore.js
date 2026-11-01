"use client";

// Sesle şamandıra dönüşü (lib/roundSay.js): yarışın kayıt listesi ve yapay zeka çağrıları.
// Kayıt listesi orgs/{org}/raceLive/{yarış}/entries/list belgesinde { rows: [{ sail, name, club, cls }], at } (yalnız ana hesap; kural değişmedi).
// Dönüşlerin kendisi canlı ekranın kaydında (raceLiveStore.saveRounds, lib/raceRounds.js).
import { doc } from "firebase/firestore";
import { readServer } from "@/lib/firebase/fastRead";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { cleanEntries, cleanOps } from "@/lib/roundSay";
import { cleanGroups } from "@/lib/roundScore";
import { kindOf } from "@/features/athletes/raceNotice";

const ref = (orgId, id) => doc(db, "orgs", orgId, "raceLive", id, "entries", "list");
// { rows: kayıt listesi, groups: { gün: [[yelken, grup]] } } (grup listesi günü günü; lib/roundScore.js)
export async function loadEntryDoc(orgId, id) {
  const snap = await readServer(ref(orgId, id));
  const d = snap.exists() ? snap.data() : {};
  return { rows: cleanEntries(d.rows), groups: cleanGroups(d.groups) };
}
export const loadEntries = (orgId, id) => loadEntryDoc(orgId, id).then((d) => d.rows);
export const saveEntries = (orgId, id, rows) => setDoc(ref(orgId, id), { rows: cleanEntries(rows).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "grp"))), at: new Date().toISOString() }, { merge: true });
// Günün grup listesi (dizi olduğu için o günün eskisi tümüyle değişir)
export const saveGroups = (orgId, id, day, list) => setDoc(ref(orgId, id), { groups: cleanGroups({ [day]: list }) }, { merge: true });

const MAX = 4 * 1024 * 1024;
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(file);
  });
const isSheet = (f) => /\.(xlsx?|csv|ods)$/i.test(f?.name || "") || /spreadsheet|excel|csv/.test(f?.type || "");

async function askEntries(body) {
  const res = await authFetch("/api/race-entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), timeout: 65000 });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Liste okunamadı, tekrar dene.");
  return cleanEntries(p.rows);
}
// PDF, fotoğraf ya da Excel → kayıt listesi satırları (yapay zeka okur)
export async function readEntryFile(file) {
  if (isSheet(file)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const text = wb.SheetNames.map((n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n").slice(0, 60000);
    return askEntries({ text });
  }
  const kind = await kindOf(file);
  if (kind === "pdf") {
    if (file.size > MAX) throw new Error("PDF 4 MB'tan büyük. Liste sayfalarını ayrı PDF yap ya da fotoğrafını yükle.");
    return askEntries({ mimeType: "application/pdf", data: await toBase64(file) });
  }
  if (kind === "image") {
    const img = await compressImage(file, 2400, 0.85);
    return askEntries({ mimeType: img.mimeType, data: img.base64 });
  }
  if (kind === "text") return askEntries({ text: (await file.text()).slice(0, 60000) });
  throw new Error("PDF, fotoğraf ya da Excel seç.");
}
// Yazılan ya da söylenen satırlar ("1234 Ali Kaya Dikili") → kayıt listesi satırları
export const readEntryText = (text) => askEntries({ text: String(text || "").slice(0, 60000) });

// Söylenen → komutlar (lib/roundSay.js applySay uygular)
export async function sayOps({ text, leg, known, route, k }) {
  const res = await authFetch("/api/round-say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, leg, known, route, k }), timeout: 20000 });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(p.error || "Anlaşılamadı");
    e.status = res.status;
    throw e;
  }
  return cleanOps(p.ops);
}
