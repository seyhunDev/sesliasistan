"use client";

// Çekilen fotoğraf/video önce bu cihazda (IndexedDB) saklanır, sonra Storage'a yüklenir; yüklenince silinir.
// Yükleme olmazsa (internet yok, Storage kuralı yayınlanmamış) kayıt kaybolmaz: Medya sekmesinde "telefonda bekliyor" görünür,
// sayfa açılınca ve internet gelince yeniden denenir. Kayıt: { id, raceId, at, kind, type, blob, mom, err }
// Yüklenen dosya 7 gün daha telefonda kalır ("kept", Seyhun 2026-10-22: "bağlantı zayıfsa telefondakini kullanalım, bir hafta sonra
// kaldırılsın"): izlerken beklemeden oynar; 7 gün dolunca ya da Medya › ⋯ › Telefondan sil ile silinir, Firebase'deki kalır.
// iPhone yer darlığında bunu kendisi de silebilir; o zaman video Firebase'den oynar. Kayıt: { id: künye no, raceId, kind, size, blob, savedAt }
const DB = "sa-race-media";
const STORE = "q";
const KEPT = "kept";
export const KEEP_DAYS = 7;

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(KEPT)) db.createObjectStore(KEPT, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn, store = STORE) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
  });
}

export const putPending = (x) => tx("readwrite", (s) => s.put(x)).catch(() => {});
export const dropPending = (id) => tx("readwrite", (s) => s.delete(id)).catch(() => {});
// Yüklenmeyi bekleyen hepsi (Ayarlar › Telefondaki veriler)
export async function listAllPending() {
  try {
    return (await tx("readonly", (s) => s.getAll())) || [];
  } catch {
    return [];
  }
}
export async function listPending(raceId) {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) || [];
    return all.filter((x) => x.raceId === raceId).sort((a, b) => a.at.localeCompare(b.at));
  } catch {
    return [];
  }
}

// Yüklenen dosyayı telefonda tut (iPhone kendiliğinden silmesin diye kalıcı depolama istenir)
export function keepLocal(x) {
  navigator.storage?.persist?.().catch(() => {});
  return tx("readwrite", (s) => s.put({ ...x, savedAt: Date.now() }), KEPT).catch(() => {});
}
// 7 günü geçenler silinir, kalanlar döner (hepsi; raceId ile süzülür)
export async function listKept(now = Date.now()) {
  try {
    const all = (await tx("readonly", (s) => s.getAll(), KEPT)) || [];
    const old = all.filter((x) => now - x.savedAt > KEEP_DAYS * 864e5);
    if (old.length) await tx("readwrite", (s) => old.forEach((x) => s.delete(x.id)), KEPT);
    return all.filter((x) => !old.includes(x));
  } catch {
    return [];
  }
}
export const dropKept = (id) => tx("readwrite", (s) => s.delete(id), KEPT).catch(() => {});
export const clearKept = () => tx("readwrite", (s) => s.clear(), KEPT).catch(() => {});
