// Firestore yazmaları (istemci): firebase/firestore'daki setDoc, updateDoc, addDoc, deleteDoc ve writeBatch ile aynı kullanım.
// Fark: yazma telefondaki sıraya (IndexedDB, clientApp.js persistentLocalCache) girer girmez söz biter; sunucu onayı en çok
// 2,5 sn (internet yokken 0,3 sn) beklenir. Firestore'un kendi sözü onay gelene kadar bitmez: internetsiz "await setDoc" sonsuza
// kadar bekler, kaydet düğmesi takılı kalırdı. Onaydan önce gelen hata (geçersiz veri, kural reddi) yine fırlatılır; sonradan
// gelen ret "sa-save-failed" olayıyla ekranda uyarı olur (lib/soon.js). Bekleyen yazma üstteki şeridi uyandırır (netWatch.js).
import { doc, setDoc as fsSet, updateDoc as fsUpdate, deleteDoc as fsDelete, waitForPendingWrites, writeBatch as fsBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { settle } from "@/lib/soon";

export const setDoc = (...a) => settle(fsSet(...a));
export const updateDoc = (...a) => settle(fsUpdate(...a));
export const deleteDoc = (...a) => settle(fsDelete(...a));
// Kimlik telefonda üretilir (Firestore'un addDoc'u da böyle yapar); onay beklenmeden belge adresi döner
export function addDoc(col, data) {
  const ref = doc(col);
  return settle(fsSet(ref, data)).then(() => ref);
}
export function writeBatch(db) {
  const b = fsBatch(db);
  const commit = b.commit.bind(b);
  b.commit = () => settle(commit());
  return b;
}

// Sunucu kaydı okuyacaksa (bildirim): telefondaki bekleyen yazmalar sunucuya ulaşınca çalışır (internet yokken bağlantı gelince).
// ms verilirse en çok o kadar beklenir (hesap açma gibi hemen sonuç isteyen işler; internetsizken fn hemen hata verir)
export function afterSent(fn, ms = 0) {
  const sent = waitForPendingWrites(db).catch(() => {});
  return (ms ? Promise.race([sent, new Promise((r) => setTimeout(r, ms))]) : sent).then(fn);
}
