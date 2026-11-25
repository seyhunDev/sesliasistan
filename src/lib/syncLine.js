// Arkadan gelen değişiklik işareti (anında açılış, lib/warmStart.js): telefondaki kopyayla açılan ekrana sunucudan farklı
// bilgi gelince pulseSync() çağrılır; SyncLine üstte ince bir çizgiyle kısa süre gösterir, değişiklik ekrana zaten işlenmiştir.
const subs = new Set();
let at = 0;

export function pulseSync() {
  at = Date.now();
  subs.forEach((f) => f(at));
}

export function onSync(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
