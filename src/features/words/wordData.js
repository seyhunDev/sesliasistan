"use client";

// İngilizce kelime destesi tek belgede: orgs/{orgId}/english/deck = { words, gaps, seedV, updatedAt } (yalnız ana hesap;
// mevcut kural ana hesaba orgs altını açıyor). İlk açılışta gömülü listeyle dolar (englishWords.js seedDeck).
// Okuma kart açılınca bir kez (1 okuma), 3 dakika bellekte; her okuma/yazma cihazdaki kopyaya da yazılır (widget ve çevrimdışı).
// orgId boşsa (çalışan, aile): deste yalnız bu cihazda (localStorage).
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { cachedDeck, cleanDeck, keepDeck, seedDeck } from "@/lib/englishWords";

const ref = (orgId) => doc(db, "orgs", orgId, "english", "deck");
const KEEP = 3 * 60 * 1000;
let cache = null; // { orgId, deck, at }
const put = (orgId, deck) => {
  cache = { orgId, deck, at: Date.now() };
  keepDeck(deck);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sa-words-saved"));
  return deck;
};
const body = (deck) => ({ ...cleanDeck(deck), updatedAt: new Date().toISOString() });

export async function loadDeck(orgId, { fresh = false } = {}) {
  if (!orgId) return cachedDeck();
  if (!fresh && cache?.orgId === orgId && Date.now() - cache.at < KEEP) return cache.deck;
  const snap = await getDoc(ref(orgId));
  const { deck, changed } = seedDeck(snap.exists() ? snap.data() : null);
  // İlk açılış ya da gömülü liste büyüdü: belge yazılır (bir kez)
  if (changed) setDoc(ref(orgId), body(deck)).catch(() => {});
  return put(orgId, deck);
}

// fn(deck) → yeni deste; kaydedilen desteyi döndürür
// İnternet yoksa işlem yapılamaz: bellekteki desteye uygulanır, cihazda yazılır, bağlantı gelince gider.
export async function updateDeck(orgId, fn) {
  if (!orgId) return put("", cleanDeck(fn(cachedDeck())));
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const next = cleanDeck(fn(cache?.orgId === orgId ? cache.deck : cachedDeck()));
    setDoc(ref(orgId), body(next)).catch(() => {});
    return put(orgId, next);
  }
  const deck = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref(orgId));
    const next = cleanDeck(fn(seedDeck(snap.exists() ? snap.data() : null).deck));
    tx.set(ref(orgId), body(next));
    return next;
  });
  return put(orgId, deck);
}

// Söylenen/yazılan kelimenin ya da cümlenin kartı (yapay zeka, /api/word): { en, type, tr, ex, exTr } (+ kind, topic). Kaydetmez.
export async function askWord(word, kind = "word") {
  const res = await authFetch("/api/word", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ word, kind }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.word) throw new Error(data.error || "Hazırlayamadım, tekrar dene.");
  return kind === "phrase" ? { ...data.word, kind: "phrase", topic: "Eklediklerim" } : data.word;
}
