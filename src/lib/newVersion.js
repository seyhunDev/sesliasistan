// Yeni sürüm denetimi: /api/version (son yayın) ile bu telefondaki sürüm (BUILD.sha) karşılaştırılır.
// Uygulama açılınca, uygulamaya dönünce ve açıkken 5 dakikada bir bakılır. Farklıysa "Yeni sürüm var · Güncelle"
// (NewVersionBar) ve asistanda "uygulamayı güncelle". Güncelle: service worker yenilenir, sayfa yeniden yüklenir.
// Uygun anda (arkaya gidiş, sayfa geçişi) kendiliğinden de yenilenir: canAutoUpdate.
import { BUILD } from "@/lib/buildInfo";
import { trailFullLoad } from "@/lib/navTrail";

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

// Kendiliğinden güncelleme (Seyhun 2026-11-04: "her güncellemeden sonra yüklenemedi diyor, kapatıp açınca düzeliyor"):
// yayından sonra açık kalan eski sürüm, sunucuda artık olmayan eski kod parçalarını ve sayfa verisini istiyor, sayfalar
// yüklenemiyordu. Yeni sürüm görülünce uygulama ilk uygun anda kendini yeniler: arkadan dönünce ya da başka sayfaya geçerken.
// İş sürerken (kayıt, sayaç, arama: ekran açık tutuluyor), yazı yazarken ya da pencere açıkken yenilenmez; o zaman alttaki
// "Yeni sürüm var · Güncelle" kartı kalır. Aynı sürüm için bir kez denenir (yenileme döngüsü olmasın).
const AUTO_KEY = "sa-auto-update";
let locks = 0; // kodun istediği, henüz bırakmadığı ekran kilitleri (telefon arkaya gidince sistem bırakır, o sayılmaz)

export function canAutoUpdate({ busy = 0, typing = false, dialog = false, tried = "" } = {}, sha = latest?.sha) {
  return !!sha && tried !== sha && !busy && !typing && !dialog;
}

function pageState() {
  const a = document.activeElement;
  const b = document.body.dataset;
  const typing = !!b.typing || (!!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)));
  // Asistan ya da ekranda açık pencere (kapalı pencereler ekranın dışında bekler; SwipeBack ile aynı ölçü)
  const dialog = !!b.asst || [...document.querySelectorAll('[role="dialog"]')].some((d) => {
    const r = d.getBoundingClientRect();
    return r.height && r.top < window.innerHeight - 4 && r.bottom > 4;
  });
  let tried = "";
  try {
    tried = sessionStorage.getItem(AUTO_KEY) || "";
  } catch {
    tried = latest?.sha || ""; // saklanamıyorsa kendiliğinden yenileme yok (döngü olmasın)
  }
  return { busy: locks, typing, dialog, tried };
}

function markTried() {
  try {
    sessionStorage.setItem(AUTO_KEY, latest.sha);
  } catch {}
}

// Ekran kilidi isteklerini say: kayıt, sayaç, arama, takip sürerken kendiliğinden yenileme olmaz
function countWakeLocks() {
  const wl = navigator.wakeLock;
  if (!wl?.request || wl.__saCount) return;
  const req = wl.request.bind(wl);
  wl.__saCount = true;
  wl.request = async (...a) => {
    const s = await req(...a);
    locks++;
    const rel = s.release.bind(s);
    let done = false;
    s.release = (...b) => {
      if (!done) (done = true), (locks = Math.max(0, locks - 1));
      return rel(...b);
    };
    return s;
  };
}

// Arkadan dönüş: yalnız sürüm sorulur. Yenileme göz önünde yapılmaz (Seyhun 2026-11-04 "uygulamalar arası geçişte benimki
// beyaz ekranla açılıyor": uygulamaya dönünce sayfa baştan yükleniyor, bir an boş ekran kalıyordu). Yeni sürüm bir sonraki
// arkaya gidişte (görünmeden) ya da bir sonraki sayfa geçişinde alınır.
async function onResume(away) {
  await checkVersion(away > 15e3);
}

// Uygulama arkaya gidince: yeni sürüm biliniyorsa ve uygunsa, kullanıcı görmeden yenilenir (kısa bir an sonra hâlâ arkadaysa)
let hideTimer = 0;
function onHide() {
  clearTimeout(hideTimer);
  if (!latest) return;
  hideTimer = setTimeout(() => {
    if (document.visibilityState === "hidden" && latest && canAutoUpdate(pageState())) (markTried(), location.reload());
  }, 400);
}

// Uygulama içi bağlantıya dokunuş: yeni sürüm varsa sayfa geçişi tam yükleme olur (eski kod parçası istenmez)
function onClick(e) {
  if (!latest || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target?.closest?.("a[href]");
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  // Geri düğmesi tam yükleme olmaz: gelinen sayfaya döner (BackLink). Önceden yeni sürüm varken geri düğmesi
  // üst sayfanın adresini (Yarışlar'da Sporcular) baştan açıyordu.
  if (a.hasAttribute("data-back")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname === location.pathname && url.search === location.search) return;
  if (!canAutoUpdate({ ...pageState(), typing: false, dialog: false })) return;
  e.preventDefault();
  e.stopPropagation(); // Next'in kendi geçişi başlamasın
  markTried();
  trailFullLoad(url.href);
  location.assign(url.href);
}

export function watchVersion() {
  checkVersion(true);
  countWakeLocks();
  let hiddenAt = 0;
  const vis = () => {
    if (document.visibilityState === "hidden") return void ((hiddenAt = Date.now()), onHide());
    clearTimeout(hideTimer);
    onResume(hiddenAt ? Date.now() - hiddenAt : 0);
  };
  const shown = (e) => e.persisted && onResume(60e3);
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("pageshow", shown);
  document.addEventListener("click", onClick, true);
  const t = setInterval(() => document.visibilityState === "visible" && checkVersion(), 5 * 60e3);
  return () => (
    document.removeEventListener("visibilitychange", vis),
    window.removeEventListener("pageshow", shown),
    document.removeEventListener("click", onClick, true),
    clearInterval(t),
    clearTimeout(hideTimer)
  );
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
