"use client";

import { collection, deleteDoc, doc, getDocs, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { STARTERS, brief, cleanInv, freshInv } from "./invModel";

// Envanterler: orgs/{orgId}/inventories/{id} (yalnız ana hesap; mevcut kural ana hesaba orgs altındaki her koleksiyonu açıyor).
// Ürünler belgenin içinde: tüm envanterler tek sorguda okunur, 3 dakika bellekte kalır (sayfa ve asistan paylaşır).
const col = (orgId) => collection(db, "orgs", orgId, "inventories");
const TTL = 3 * 60_000;
let cache = { org: "", at: 0, list: null };
const LAST = "sa-inv-last";

const sorted = (list) => [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "tr"));
const put = (orgId, inv) => {
  if (cache.org !== orgId || !cache.list) return;
  cache.list = sorted([...cache.list.filter((x) => x.id !== inv.id), inv]);
};
// Sayfa ve asistan birbirinin değişikliğini görsün
const told = (id) => window.dispatchEvent(new CustomEvent("sa-inv-saved", { detail: { id } }));

export async function loadInventories(orgId, { force = false } = {}) {
  if (!force && cache.org === orgId && cache.list && Date.now() - cache.at < TTL) return cache.list;
  const snap = await getDocs(col(orgId));
  let list = snap.docs.map((d) => ({ id: d.id, ...cleanInv(d.data()) }));
  // İlk açılış: "Yelken Kulübü" ve "Normal" hazır gelir
  if (!list.length) list = await Promise.all(STARTERS.map((s, i) => createInventory(orgId, s.name, s.kind, i, false)));
  cache = { org: orgId, at: Date.now(), list: sorted(list) };
  return cache.list;
}

export async function createInventory(orgId, name, kind, order = 0, notify = true) {
  const ref = doc(col(orgId));
  const inv = freshInv(name, kind, order);
  await setDoc(ref, { ...inv, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const out = { id: ref.id, ...inv };
  if (notify) {
    put(orgId, out);
    told(out.id);
  }
  return out;
}

// Değişiklik: belgenin güncel hâli okunur, fn uygulanır, yazılır (iki cihaz aynı anda yazarsa biri kaybolmasın).
// İnternet yoksa bellekteki hâle uygulanır, Firestore sıraya alır.
export async function changeInventory(orgId, id, fn) {
  const ref = doc(col(orgId), id);
  let out;
  try {
    out = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw Object.assign(new Error("Envanter bulunamadı"), { code: "not-found" });
      const next = cleanInv(fn(cleanInv(snap.data())));
      tx.set(ref, { ...next, updatedAt: serverTimestamp() }, { merge: true });
      return next;
    });
  } catch (e) {
    const cur = cache.org === orgId && cache.list?.find((x) => x.id === id);
    if (e?.code === "not-found" || !cur || !/unavailable|failed-precondition|offline/i.test(`${e?.code} ${e?.message}`)) throw e;
    out = cleanInv(fn(cur));
    setDoc(ref, { ...out, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }
  const inv = { id, ...out };
  put(orgId, inv);
  told(id);
  return inv;
}

export async function deleteInventory(orgId, id) {
  await deleteDoc(doc(col(orgId), id));
  if (cache.org === orgId && cache.list) cache.list = cache.list.filter((x) => x.id !== id);
  told(id);
}

export const lastInv = () => {
  try {
    return localStorage.getItem(LAST) || "";
  } catch {
    return "";
  }
};
export const setLastInv = (id) => {
  try {
    localStorage.setItem(LAST, id);
  } catch {}
};

// Yapay zeka: cümleden envanter işlemleri ({ ops, message, newInv })
// files: [{ mimeType, data (base64) }] fotoğraf ya da belge (yapay zeka okur)
export async function askInventory(text, inv, others = [], files = []) {
  const res = await authFetch("/api/inventory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, today: todayStr(), inv: { name: inv.name, kind: inv.kind, cats: inv.cats, items: brief(inv) }, others, files }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Envanter işlenemedi");
  return p;
}
