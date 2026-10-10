// Sayfa geçişi ilerleme çizgisinin durumu (NavProgress.jsx çizer): idle | run | done.
// Bağlantı tıklaması ve router.push/replace/back geçişi başlatır, yeni sayfa açılınca biter.

let phase = "idle";
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
  }
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
};

// Sayfa geçişinin yönü (app/(app)/template.jsx): "back" (geri), "tab" (alt sekmeler arası), "fwd" (ileri), "" (ilk açılış)
const TAB_ROOTS = ["/", "/calendar", "/messages", "/tasks"];
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
