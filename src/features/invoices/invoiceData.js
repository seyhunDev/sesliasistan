"use client";

// Faturalar: Firestore okuma/yazma (mantık src/lib/invoices.js). Yalnız ana hesap (kural değişikliği yok: ana hesap orgs
// altındaki her koleksiyona yazabiliyor). Liste tek okumada gelir ve 3 dakika bellekte kalır.
// Dosya (PDF/fotoğraf) parçalı: orgs/{org}/invoiceFiles/{id}/parts/{000..}; yalnız açılınca okunur, sonra cihazda kalır.
import { Bytes, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch, jsonOf } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { peopleFor } from "@/lib/people";
import { prepFile } from "@/features/inventory/invFiles";
import { dropRaceFile, getRaceFile, saveRaceFile } from "@/features/athletes/raceFiles";
import { loadMovementsRange } from "@/features/dues/duesData";
import { primeOpen } from "./openInvoices";
import { bankMatches, isoDay, openIndex, paidMovOf, taskInvoice, taskTitle } from "@/lib/invoices";

const PART = 900_000;
const col = (orgId) => collection(db, "orgs", orgId, "invoices");
const fileCol = (orgId) => collection(db, "orgs", orgId, "invoiceFiles");
const cacheKey = (id) => `invc:${id}`;
const LIST_MS = 3 * 60e3;
let memo = null; // { org, at, list }

export { prepFile };

export async function loadInvoices(orgId, { fresh = false } = {}) {
  if (!fresh && memo?.org === orgId && Date.now() - memo.at < LIST_MS) return memo.list;
  const snap = await getDocs(col(orgId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return remember(orgId, list);
}
const remember = (orgId, list) => {
  memo = { org: orgId, at: Date.now(), list };
  primeOpen(orgId, list); // ana sayfadaki fatura kartı da güncellensin
  return list;
};
// Bellekteki tam liste (yoksa okunur): sunucunun açık fatura listesi eksik yazılmasın
const current = async (orgId) => (memo?.org === orgId ? memo.list : loadInvoices(orgId));
const notifyAssign = (id) => authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "task", id }) }).catch(() => {});

// Sunucunun banka mailinde baktığı açık faturalar listesi (tek belge)
export const syncIndex = (orgId, list) => setDoc(doc(db, "orgs", orgId, "invoiceIndex", "open"), { list: openIndex(list), at: new Date().toISOString() }).catch(() => {});

// Yapay zeka faturayı okur → { seller, taxId, no, date, due, amount, currency, iban, desc, cat }
export async function readInvoice(prepared) {
  const res = await authFetch("/api/invoice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mimeType: prepared.type, data: prepared.base64, today: todayStr() }),
  });
  const p = await jsonOf(res);
  if (!res.ok) throw new Error(p.error || "Fatura okunamadı");
  return p;
}

async function saveFile(orgId, f) {
  const bytes = new Uint8Array(await f.blob.arrayBuffer());
  const ref = doc(fileCol(orgId));
  const parts = Math.max(1, Math.ceil(bytes.length / PART));
  for (let i = 0; i < parts; i += 8) {
    const batch = writeBatch(db);
    for (let j = i; j < Math.min(parts, i + 8); j++) batch.set(doc(ref, "parts", String(j).padStart(3, "0")), { data: Bytes.fromUint8Array(bytes.subarray(j * PART, (j + 1) * PART)) });
    await batch.commit();
  }
  const meta = { id: ref.id, name: String(f.name || "fatura").slice(0, 120), type: f.type, size: bytes.length, parts, at: todayStr() };
  await setDoc(ref, { name: meta.name, type: meta.type, size: meta.size, parts, createdAt: serverTimestamp() });
  await saveRaceFile({ id: cacheKey(ref.id), blob: f.blob, name: meta.name });
  return meta;
}

async function loadFile(orgId, meta) {
  const hit = await getRaceFile(cacheKey(meta.id));
  if (hit?.blob) return hit.blob;
  const snap = await getDocs(collection(db, "orgs", orgId, "invoiceFiles", meta.id, "parts"));
  const list = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map((d) => d.data().data?.toUint8Array?.());
  if (!list.length || list.length < (meta.parts || 1) || list.some((x) => !x)) throw new Error("Fatura dosyası bulunamadı");
  const blob = new Blob(list, { type: meta.type || "application/pdf" });
  saveRaceFile({ id: cacheKey(meta.id), blob, name: meta.name });
  return blob;
}

// Dosyayı açar (yeni sekmede; iPhone'da önizleme)
export async function openInvoiceFile(orgId, meta) {
  const win = window.open("", "_blank");
  const blob = await loadFile(orgId, meta);
  const url = URL.createObjectURL(blob);
  if (win) win.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function shareInvoiceFile(orgId, meta) {
  const blob = await loadFile(orgId, meta);
  const file = new File([blob], meta.name || "fatura.pdf", { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: meta.name });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
}

async function dropFile(orgId, meta) {
  if (!meta?.id) return;
  try {
    const ref = doc(fileCol(orgId), meta.id);
    const batch = writeBatch(db);
    for (let j = 0; j < (meta.parts || 1); j++) batch.delete(doc(ref, "parts", String(j).padStart(3, "0")));
    await batch.commit();
    await deleteDoc(ref);
  } catch {}
  dropRaceFile(cacheKey(meta.id));
}

// Yeni fatura: dosya + kayıt + "Fatura öde" görevi (görevli seçildiyse ona bildirim). me: { uid, name }
export async function createInvoice(orgId, fields, prepared, me, assignee = "") {
  const file = prepared ? await saveFile(orgId, prepared) : null;
  const ref = doc(col(orgId));
  const taskRef = doc(collection(db, "orgs", orgId, "tasks"));
  const now = new Date().toISOString();
  const inv = { ...fields, id: ref.id, status: "open", taskId: taskRef.id, ...(file ? { file } : {}), createdAt: now, createdBy: me.name || "" };
  const assignees = assignee ? [assignee] : [];
  const task = {
    ownerId: orgId,
    cat: "Genel",
    src: "invoice",
    createdBy: me.name || "",
    createdAt: now,
    createdByUid: me.uid,
    assignees,
    people: peopleFor(me.uid, assignees),
    title: taskTitle(inv),
    due: inv.due || null,
    done: false,
    doneAt: null,
    planId: null,
    invoice: taskInvoice(inv),
  };
  const batch = writeBatch(db);
  const { id, ...rec } = inv;
  batch.set(ref, rec);
  batch.set(taskRef, task);
  await batch.commit();
  if (assignee) notifyAssign(taskRef.id);
  const list = remember(orgId, [inv, ...(await current(orgId)).filter((x) => x.id !== inv.id)]);
  syncIndex(orgId, list);
  return inv;
}

// Alanları değiştirir; görevdeki fatura özeti, başlık ve son gün de güncellenir
export async function updateInvoice(orgId, inv, patch) {
  const next = { ...inv, ...patch, updatedAt: new Date().toISOString() };
  const { id, ...rec } = next;
  await updateDoc(doc(col(orgId), inv.id), { ...patch, updatedAt: rec.updatedAt });
  if (inv.taskId && ["seller", "amount", "currency", "no", "iban", "due"].some((k) => k in patch))
    await updateDoc(doc(db, "orgs", orgId, "tasks", inv.taskId), { title: taskTitle(next), due: next.due || null, invoice: taskInvoice(next) }).catch(() => {});
  const list = remember(orgId, (await current(orgId)).map((x) => (x.id === inv.id ? next : x)));
  syncIndex(orgId, list);
  return next;
}

// Ödendi / ödenmedi. via: hand | bank | task; mov: banka hareketi. Görev de tamamlanır / yeniden açılır (task'tan gelmiyorsa).
export async function setPaid(orgId, inv, paid, via = "hand", mov = null) {
  const patch = paid
    ? { status: "paid", paidAt: mov ? isoDay(mov) : todayStr(), paidVia: via, paidMov: mov ? paidMovOf(mov) : null }
    : { status: "open", paidAt: null, paidVia: null, paidMov: null };
  const next = await updateInvoice(orgId, inv, patch);
  if (inv.taskId && via !== "task") {
    const now = new Date().toISOString();
    await updateDoc(doc(db, "orgs", orgId, "tasks", inv.taskId), paid ? { done: true, doneAt: now } : { done: false, doneAt: null }).catch(() => {});
  }
  return next;
}

// Görevi silinmiş faturaya yeniden görev açar (görevli atamak için)
export async function ensureTask(orgId, inv, me) {
  const taskRef = doc(collection(db, "orgs", orgId, "tasks"));
  await setDoc(taskRef, {
    ownerId: orgId, cat: "Genel", src: "invoice", createdBy: me.name || "", createdAt: new Date().toISOString(), createdByUid: me.uid,
    assignees: [], people: peopleFor(me.uid, []), title: taskTitle(inv), due: inv.due || null, done: inv.status === "paid", doneAt: null, planId: null, invoice: taskInvoice(inv),
  });
  return updateInvoice(orgId, inv, { taskId: taskRef.id });
}

export async function deleteInvoice(orgId, inv) {
  await deleteDoc(doc(col(orgId), inv.id));
  if (inv.taskId) await deleteDoc(doc(db, "orgs", orgId, "tasks", inv.taskId)).catch(() => {});
  dropFile(orgId, inv.file);
  const list = remember(orgId, (await current(orgId)).filter((x) => x.id !== inv.id));
  syncIndex(orgId, list);
}

// Faturaya sonradan dosya ekler / değiştirir
export async function replaceFile(orgId, inv, prepared) {
  const file = await saveFile(orgId, prepared);
  dropFile(orgId, inv.file);
  return updateInvoice(orgId, inv, { file });
}

// Banka maillerinde açık faturaları arar: emin olanları ödendi yazar, gerisini öneri olarak döndürür
// → { paid [inv], guesses [{ inv, m, why }], sources }
export async function bankCheck(orgId, list) {
  const open = list.filter((x) => x.status !== "paid" && x.amount > 0);
  if (!open.length) return { paid: [], guesses: [], sources: 0 };
  const now = todayStr().slice(0, 7);
  const first = open.map((x) => (x.date || todayStr()).slice(0, 7)).sort()[0];
  const [y, m] = now.split("-").map(Number);
  const floor = new Date(Date.UTC(y, m - 7, 15)).toISOString().slice(0, 7); // en çok 6 ay geriye
  const { movements, sources } = await loadMovementsRange(orgId, first < floor ? floor : first, now);
  const found = bankMatches(movements.filter((x) => x.amount < 0), open);
  const paid = [];
  for (const c of found.filter((x) => x.sure)) paid.push(await setPaid(orgId, c.inv, true, "bank", c.m));
  return { paid, guesses: found.filter((x) => !x.sure).map(({ inv, m, why }) => ({ inv, m, why })), sources };
}
