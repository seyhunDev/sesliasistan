"use client";

// Hazırlanan yarış evrakı bu cihazda (IndexedDB) saklanır: sayfaya dönünce yeniden hazırlamak gerekmez.
// Kayıt: { id (yarış), blob, name, docs, pages, at, mailText }. Firebase'e yazılmaz: PDF'te T.C., veli gibi
// kişisel bilgiler var; bunlar yalnız sporcu kartında durur, başka yere kopyalanmaz.
// Belgeyi değiştiren bir bilgi değişince kayıt silinir (RaceEditor › dropFile).
const DB = "sa-race-docs";
const STORE = "d";

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
  });
}

const quiet = (p) => p.catch(() => undefined);
export const saveRaceFile = (f) => quiet(tx("readwrite", (s) => s.put(f)));
export const getRaceFile = (id) => (id ? quiet(tx("readonly", (s) => s.get(id))) : Promise.resolve(undefined));
export const dropRaceFile = (id) => (id ? quiet(tx("readwrite", (s) => s.delete(id))) : Promise.resolve());
