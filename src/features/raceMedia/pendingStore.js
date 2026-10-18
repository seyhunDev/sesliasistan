"use client";

// Çekilen fotoğraf/video önce bu cihazda (IndexedDB) saklanır, sonra Storage'a yüklenir; yüklenince silinir.
// Yükleme olmazsa (internet yok, Storage kuralı yayınlanmamış) kayıt kaybolmaz: Medya sekmesinde "telefonda bekliyor" görünür,
// sayfa açılınca ve internet gelince yeniden denenir. Kayıt: { id, raceId, at, kind, type, blob, mom, err }
const DB = "sa-race-media";
const STORE = "q";

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

export const putPending = (x) => tx("readwrite", (s) => s.put(x)).catch(() => {});
export const dropPending = (id) => tx("readwrite", (s) => s.delete(id)).catch(() => {});
export async function listPending(raceId) {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) || [];
    return all.filter((x) => x.raceId === raceId).sort((a, b) => a.at.localeCompare(b.at));
  } catch {
    return [];
  }
}
