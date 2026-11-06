// Sayfa geçişi ilerleme çizgisinin durumu (NavProgress.jsx çizer): idle | run | done.
// Bağlantı tıklaması ve router.push/replace/back geçişi başlatır, yeni sayfa açılınca biter.

// Alt sekme sayfaları (Ana sayfa, Takvim, Mesajlar, Görevler): aralarında geçiş kaymaz, yumuşakça değişir
const TAB_ROOTS = ["/", "/calendar", "/messages", "/tasks"];

let phase = "idle";
let startedAt = 0; // son navStart anı (geri düğmesi mi, iPhone'un kenardan kaydırması mı: navPopped)
let timer = 0;
const subs = new Set();
const set = (p) => {
  phase = p;
  subs.forEach((f) => f());
};

export const navPhase = () => phase;
export const navSubscribe = (f) => (subs.add(f), () => subs.delete(f));

const pathOf = (href) => {
  if (href == null || typeof window === "undefined") return null;
  try {
    const u = new URL(String(href), window.location.href);
    return u.origin === window.location.origin ? u.pathname : null;
  } catch {
    return null;
  }
};

// target: gidilen adres (aynı sayfaysa ya da dışarıysa başlamaz); verilmezse (geri) her zaman başlar
export function navStart(href, back = false) {
  if (!back) {
    const p = pathOf(href);
    if (!p || p === window.location.pathname) return;
    setNavKind(TAB_ROOTS.includes(p) && TAB_ROOTS.includes(window.location.pathname) ? "tab" : "fwd");
  } else setNavKind("back");
  startedAt = Date.now();
  clearTimeout(timer);
  set("run");
  timer = setTimeout(navDone, 10000); // en kötü durumda kendiliğinden biter
}
export function navDone() {
  if (phase !== "run") return;
  clearTimeout(timer);
  set("done");
  timer = setTimeout(() => set("idle"), 350);
}

// Ortak yönlendirici nesnesi (her sayfada aynı) bir kez sarılır
export function wrapRouter(router) {
  if (!router || router.__saNav) return;
  const { push, replace, back } = router;
  router.push = (href, ...a) => (navStart(href), push.call(router, href, ...a));
  router.replace = (href, ...a) => (navStart(href), replace.call(router, href, ...a));
  router.back = (...a) => (navStart(null, true), back.apply(router, a));
  router.__saNav = true;
}

// Bağlantıya dokunuş (yakalama aşamasında: Next bağlantısı olayı durdurmadan önce)
export function navClick(e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target?.closest?.("a[href]");
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
  navStart(a.getAttribute("href"));
}

// Yeni sayfa en üstten başlar; geri/ileri (tarayıcı geçmişi) ile dönülen sayfada tarayıcı eski konumu korur.
// Önceden önceki sayfanın kaydırma konumu yeni sayfaya taşınıyordu (sayfa üstü kesik açılıyordu).
let popped = false;
export const navPopped = () => {
  popped = true;
  // Geri düğmesi önce navStart'ı çağırır (router.back). Öncesinde navStart yoksa geri iPhone'un kenardan kaydırmasıdır
  // (VeloraViewController allowsBackForwardNavigationGestures): sayfa zaten kaydı, geçiş animasyonu ikinci kez oynamaz.
  setNavKind(Date.now() - startedAt < 1000 ? "back" : "none");
};

// Sayfa geçişi animasyonunun türü (globals.css › SAYFA GEÇİŞİ, app/(app)/template.jsx ViewTransition): <html data-nav>
// fwd (yeni sayfa sağdan gelir), back (geri: önceki sayfa soldan döner), tab (alt sekmeler arası yumuşak geçiş),
// none (kenardan kaydırarak geri: sayfa zaten parmakla kaydı, ikinci kez kaymasın). none kısa bir süre değişmez,
// çünkü ardından gelen geri (router.back, popstate) onu "back" yapmaya çalışır.
let kindHeld = 0;
export function setNavKind(kind, hold = 0) {
  if (typeof document === "undefined") return;
  if (!hold && Date.now() < kindHeld) return;
  kindHeld = hold ? Date.now() + hold : 0;
  document.documentElement.dataset.nav = kind;
}

// Sayfa geçişinin yönü (app/(app)/template.jsx): "back" (geri), "tab" (alt sekmeler arası), "fwd" (ileri), "" (ilk açılış)
let lastPath = "";
let lastDir = "";
export function pageDir() {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  if (path === lastPath) return lastDir; // aynı geçişte ikinci çağrı (React geliştirme kipi) aynı yönü alır
  const prev = lastPath;
  lastPath = path;
  lastDir = !prev ? "" : popped ? "back" : TAB_ROOTS.includes(prev) && TAB_ROOTS.includes(path) ? "tab" : "fwd";
  return lastDir;
}
export function navArrived() {
  const back = popped;
  popped = false;
  if (!back && typeof window !== "undefined" && window.scrollY) window.scrollTo(0, 0);
}
