"use client";

// Borçlar tek belgede: orgs/{orgId}/debts/book = { items, updatedAt } (yalnız ana hesap; mevcut kural ana hesaba orgs altını açıyor).
// Okuma sayfa açılınca bir kez (1 okuma), 3 dakika bellekte; değişiklik okuma + yazma işlemiyle (iki cihaz aynı anda yazsa da kaybolmaz).
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { cleanBook } from "@/lib/debts";

const ref = (orgId) => doc(db, "orgs", orgId, "debts", "book");
const KEEP = 3 * 60 * 1000;
let cache = null; // { orgId, items, at }

export async function loadDebts(orgId, { fresh = false } = {}) {
  if (!fresh && cache?.orgId === orgId && Date.now() - cache.at < KEEP) return cache.items;
  const snap = await getDoc(ref(orgId));
  const items = cleanBook(snap.exists() ? snap.data().items : []);
  cache = { orgId, items, at: Date.now() };
  return items;
}

// fn(items) → yeni liste; kaydedilen listeyi döndürür
// İnternet yoksa işlem yapılamaz: bellekteki listeye uygulanır, cihazda yazılır, bağlantı gelince gider.
export async function updateDebts(orgId, fn) {
  if (typeof navigator !== "undefined" && navigator.onLine === false && cache?.orgId === orgId) {
    const next = cleanBook(fn(cache.items));
    setDoc(ref(orgId), { items: next, updatedAt: new Date().toISOString() }).catch(() => {});
    cache = { orgId, items: next, at: Date.now() };
    window.dispatchEvent(new Event("sa-debts-saved"));
    return next;
  }
  const items = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(orgId));
    const next = cleanBook(fn(cleanBook(snap.exists() ? snap.data().items : [])));
    tx.set(ref(orgId), { items: next, updatedAt: new Date().toISOString() });
    return next;
  });
  cache = { orgId, items, at: Date.now() };
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sa-debts-saved"));
  return items;
}
