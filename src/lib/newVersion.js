// Yeni sürüm denetimi: /api/version (son yayın) ile bu telefondaki sürüm (BUILD.sha) karşılaştırılır.
// Uygulama açılınca, uygulamaya dönünce ve açıkken 5 dakikada bir bakılır. Farklıysa "Yeni sürüm var · Güncelle"
// (NewVersionBar) ve asistanda "uygulamayı güncelle". Güncelle: service worker yenilenir, sayfa yeniden yüklenir.
import { BUILD } from "@/lib/buildInfo";

let latest = null; // { sha, at, msg } yayındaki sürüm farklıysa
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const subscribeVersion = (f) => (subs.add(f), () => subs.delete(f));
export const newVersion = () => latest;

// Yayındaki sürüm bu sürümden farklı mı (ikisi de biliniyorsa)
export const isNewer = (remote, mine = BUILD.sha) => !!(remote?.sha && mine && remote.sha !== mine);

let last = 0;
export async function checkVersion(force = false) {
  if (!BUILD.sha || typeof fetch !== "function") return null;
  if (!force && Date.now() - last < 60e3) return latest;
  last = Date.now();
  try {
    const r = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
    const j = r.ok ? await r.json() : null;
    const next = isNewer(j) ? j : null;
    if (next?.sha !== latest?.sha) {
      latest = next;
      emit();
    }
  } catch {}
  return latest;
}

export function watchVersion() {
  checkVersion(true);
  const vis = () => document.visibilityState === "visible" && checkVersion();
  document.addEventListener("visibilitychange", vis);
  const t = setInterval(() => document.visibilityState === "visible" && checkVersion(), 5 * 60e3);
  return () => (document.removeEventListener("visibilitychange", vis), clearInterval(t));
}

// Yeni sürümü kullanmaya başla: service worker yeni sw.js'i alır (en çok 3 sn beklenir), sayfa sunucudan yeniden yüklenir
export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) await Promise.race([reg.update(), new Promise((r) => setTimeout(r, 3000))]);
  } catch {}
  location.reload();
}

// "uygulamayı güncelle", "güncellemeyi yükle", "yeni sürüme geç", "sayfayı yenile"
const ASK = /((uygulama|sayfa|sürüm)\S* (güncelle|yenile)\S*|güncellemeyi (yükle|yap|al|kur)\S*|yeni sürüm(e|ü) (geç|yükle|al|kur)\S*|güncelle(r misin|yebilir misin|me yap)?$)/;
export function updateAsk(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?]+/g, " ").replace(/\s+/g, " ").trim();
  return t.split(" ").length <= 6 && ASK.test(t) && !/ m[iıuü](\s|$)| ne(\s|$)|güncellendi/.test(t) && !/(plan|görev|not|yarış|envanter|fatura|gönderi|ders)/.test(t);
}
