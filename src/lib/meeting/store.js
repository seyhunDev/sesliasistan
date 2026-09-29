// Bekleyen toplantılar bu cihazda (IndexedDB) saklanır: yapay zeka yokken kayıt kaybolmasın.
// Kayıt: { id, startedAt, sec, parts: [{ text: string|null, blob: Blob|null }], status: "stt" | "sum" }
//   status "stt": bazı parçalar yazıya çevrilemedi (ses saklanıyor), "sum": metin hazır, özet yapılamadı.
// Firebase'e yazılmaz (ses dosyası büyük; 15 dk kayıt birkaç MB).
const DB = "sa-meetings";
const STORE = "m";

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

export const saveMeeting = (m) => tx("readwrite", (s) => s.put(m));
export const deleteMeeting = (id) => tx("readwrite", (s) => s.delete(id));
export const getMeeting = (id) => tx("readonly", (s) => s.get(id));
export async function listMeetings() {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) || [];
    return all.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}
