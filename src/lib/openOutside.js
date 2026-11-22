// Uygulamanın dışından gelen sayfa açma isteği: bildirime dokunma (iPhone/Android uygulaması ve web bildirimi),
// widget, kilit ekranındaki sayaç.
//
// Seyhun 2026-11-20: "mesaj bildirimine tıklayınca ekran dönüp kalıyor". Bildirime dokunulan an uygulama çoğu zaman
// uzun süre arkadaydı. O anda yapılan uygulama içi geçiş (router.push) üç yerde takılabiliyordu:
// - Sayfa verisi isteği cevapsız kalıyor: iPhone uygulamayı uyutunca eski bağlantı ölü kalabiliyor, Next'in isteğinin
//   süre sınırı yok; ortadaki yükleniyor çemberi döner, sayfa hiç değişmez.
// - Arada yeni sürüm yayınlandıysa eski kod sunucuda artık olmayan parçaları istiyor.
// - Sayfa henüz görünür olmadan başlayan geçiş animasyonu (görünüm geçişi) iPhone'da bekliyor.
// Artık: sayfa görünür olunca başlanır; yeni sürüm varsa sayfa baştan (tam yükleme) açılır; uygulama içi geçiş
// birkaç saniyede gerçekleşmezse yine tam yüklemeyle açılır. Ekran dönüp kalmaz.
import { checkVersion, newVersion } from "@/lib/newVersion";
import { savePlace } from "@/lib/place";
import { trailFullLoad } from "@/lib/navTrail";
import { dropPages } from "@/lib/crash";

export const NAV_WAIT = 4000; // uygulama içi geçiş bu sürede olmazsa tam yükleme
const VERSION_WAIT = 1500; // sürüm sorusu en çok bu kadar beklenir (ölü bağlantıda takılmasın)
const SHOW_WAIT = 1500; // sayfanın görünür olması en çok bu kadar beklenir

// Bildirimdeki adres → uygulama içi yol ("/messages?c=…"). Başka site, /api ya da bozuk adres: null
export function insidePath(url, base) {
  if (url == null || url === "") return "/";
  try {
    const u = new URL(String(url), base);
    const b = new URL(base);
    if (u.origin !== b.origin || u.pathname.startsWith("/api/")) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

// Gidilen yol şimdiki yerle aynı mı (karşılaştırmada #… sayılmaz)
export const samePlace = (to, here) => String(to).split("#")[0] === String(here).split("#")[0];

const pathOf = (u) => String(u).split(/[?#]/)[0];
// Geçiş gerçekleşti mi: adres hedefte ya da Next adresi hedef sayfaya çevirdi (sonra açılan sayfa adresi sadeleştirmiş olabilir:
// ana sayfa "/?open=…" kaydı açınca "/" yapar)
export const arrived = (to, here, went = []) => samePlace(to, here) || went.some((u) => pathOf(u) === pathOf(to));

const here = () => location.pathname + location.search;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function whenVisible() {
  if (document.visibilityState === "visible") return Promise.resolve();
  return new Promise((r) => {
    const done = () => (document.removeEventListener("visibilitychange", on), clearTimeout(t), r());
    const on = () => document.visibilityState === "visible" && done();
    const t = setTimeout(done, SHOW_WAIT);
    document.addEventListener("visibilitychange", on);
  });
}

// Adres değişiklikleri (Next'in pushState/replaceState'i) izlenir: geçişin gerçekleştiği buradan anlaşılır
let went = null;
function watchHistory() {
  const h = window.history;
  if (h.__saMoves) return;
  h.__saMoves = true;
  for (const k of ["pushState", "replaceState"]) {
    const orig = h[k];
    h[k] = function (...a) {
      try {
        if (went && a[2] != null) went.push(new URL(String(a[2]), location.href).pathname);
      } catch {}
      return orig.apply(this, a);
    };
  }
}

export function fullLoad(to) {
  savePlace(to.split("#")[0]); // ana sayfa yüklenirken eski sayfaya dönülmesin (lib/place.js)
  trailFullLoad(new URL(to, location.href).href);
  dropPages().then(() => location.assign(to));
}

let seq = 0;
export async function openOutside(router, url) {
  if (typeof window === "undefined") return;
  const to = insidePath(url, location.href);
  if (!to) return;
  const mine = ++seq;
  await whenVisible();
  if (mine !== seq) return; // arada daha yeni bir istek geldi
  if (samePlace(to, here())) return;
  // Yeni sürüm yayınlandıysa eski kodla geçiş yapılmaz: sayfa baştan açılır
  const v = newVersion() || (await Promise.race([checkVersion(true), sleep(VERSION_WAIT)]));
  if (mine !== seq) return;
  if (v) return fullLoad(to);
  watchHistory();
  const mark = (went = []);
  try {
    router.push(to);
  } catch {
    return fullLoad(to);
  }
  setTimeout(() => {
    if (mine !== seq || arrived(to, here(), mark)) return;
    fullLoad(to);
  }, NAV_WAIT);
}

// Web bildirimi: service worker açık sayfaya "şu adresi aç" der (public/sw.js notificationclick)
export function listenWorkerOpen(router) {
  const sw = navigator.serviceWorker;
  if (!sw) return () => {};
  const on = (e) => e.data?.sa === "open" && openOutside(router, e.data.url);
  sw.addEventListener("message", on);
  sw.startMessages?.();
  return () => sw.removeEventListener("message", on);
}
