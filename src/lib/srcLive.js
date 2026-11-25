// Kaynak yayında mı (Seyhun 2026-11-06 "Start kamerası gibi sabit kaynaklar; canlı yayın başladığında yayının başladığını gösteririz"):
// raceLive.srcLive = { <kaynak id>: son görülme (ms) }. Yazan: ana hesabın açık Yayın sayfası (BroadcastPage, /api/yayin-durum 45 sn'de
// bir); yalnız yayında olan kaynaklar listede. Okuyan herkes (Ekran seçicisi, Yayın masası, /canli) srcIsLive ile bakar: yazan sayfa
// kapanırsa kayıt eskir ve kaynak 6 dakika sonra kendiliğinden "yayın yok" sayılır.
export const SRC_LIVE_TTL = 6 * 60e3;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

export const cleanSrcLive = (m) =>
  Object.fromEntries(
    Object.entries(m && typeof m === "object" ? m : {})
      .filter(([k, v]) => ID.test(k) && Number.isFinite(v) && v > 0)
      .slice(0, 8)
  );

export const srcIsLive = (srcLive, id, now = Date.now()) => {
  const t = srcLive?.[id];
  return Number.isFinite(t) && now - t < SRC_LIVE_TTL;
};

// Yazılacak yeni kayıt ya da null (yazmaya gerek yok): yayında olanlar değiştiyse ya da en eski görülme 4 dakikayı geçtiyse
export function nextSrcLive(prev, liveIds, now = Date.now()) {
  const p = cleanSrcLive(prev);
  const want = [...new Set(liveIds)].filter((id) => ID.test(id)).sort();
  const had = Object.keys(p).filter((id) => srcIsLive(p, id, now)).sort();
  const same = want.join() === had.join();
  const stale = want.some((id) => now - p[id] > 4 * 60e3);
  if (same && !stale && Object.keys(p).length === had.length) return null;
  return Object.fromEntries(want.map((id) => [id, now]));
}
