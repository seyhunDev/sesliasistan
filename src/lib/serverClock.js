// Sunucu saati (Seyhun 2026-11-26 "iPad evdeydi, açınca deneme diye söylediğimi duydum"): anlık sesler yalnız gönderildiği anda
// çalar. Gönderen ve dinleyen telefonların saati farklı olabilir; ikisi de "at"ı sunucu saatine göre yazar/karşılaştırır.
// Fark /api/saat'ten ölçülür (10 dk'da bir en çok); ölçülemezse cihaz saati kullanılır.
let offset = 0;
let pending = null;
let at = 0;
export function syncClock() {
  if (typeof window === "undefined" || typeof fetch === "undefined") return Promise.resolve(0);
  if (pending && Date.now() - at < 10 * 60e3) return pending;
  at = Date.now();
  pending = (async () => {
    try {
      const t0 = Date.now();
      const r = await fetch(`/api/saat?t=${t0}`, { cache: "no-store" });
      const t1 = Date.now();
      const { t } = await r.json();
      if (Number.isFinite(t) && t1 - t0 < 5000) offset = t - (t0 + t1) / 2;
    } catch {}
    return offset;
  })();
  return pending;
}
export const serverNow = () => Date.now() + offset;
// Anlık ses/mesajın sesli çalınma süresi: bundan eskisi çalınmaz (yalnız yazılı günlükte durur)
export const LIVE_SES_MS = 20e3;
export const isLive = (t, ms = LIVE_SES_MS) => !!t && Math.abs(serverNow() - t) < ms;
