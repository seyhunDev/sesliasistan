// Hızlı okuma (Seyhun 2026-10-31: "güncellemeden sonra yarış yükleniyor diyor, hiç yüklenmiyor"): getDoc/getDocs internet
// varken sunucuyu bekler; iPhone'da uygulama yenilenince ya da arkadan dönünce Firestore bağlantısı asılı kalırsa bu bekleme
// hiç bitmiyordu. Burada önce telefondaki kopya (Firestore önbelleği) hemen verilir, sunucu cevabı arkadan gelir;
// sunucu WAIT içinde cevap vermezse bağlantı bir kez yenilenir (kick) ve yeniden sorulur, en sonunda hata döner (sonsuz bekleme yok).
import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from "firebase/firestore";
import { kickNet } from "@/features/pwa/netWatch";

const WAIT = 6000;
const isQuery = (ref) => ref?.type === "query" || ref?.type === "collection";
const late = (ms, err) => new Promise((ok, no) => setTimeout(() => (err ? no(Object.assign(new Error("Sunucu cevap vermedi"), { code: "timeout" })) : ok(LATE)), ms));
const LATE = Symbol("late");

// Telefondaki kopya: yoksa (hiç okunmamış) null
export function readCache(ref) {
  return (isQuery(ref) ? getDocsFromCache(ref) : getDocFromCache(ref)).catch(() => null);
}

// Sunucu cevabı (asılı bağlantı yenilenir); toplam en çok ~3×WAIT bekler
export async function readServer(ref, ms = WAIT) {
  const get = () => (isQuery(ref) ? getDocs(ref) : getDoc(ref));
  const first = get();
  const r = await Promise.race([first, late(ms)]);
  if (r !== LATE) return r;
  kickNet();
  return Promise.race([first, late(400).then(get), late(ms * 2, true)]);
}
