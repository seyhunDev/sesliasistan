// Uygulama içi geçmiş: tarayıcı geçmişindeki kayıtların bu oturumdaki kopyası.
// Sayfa başlığındaki geri düğmesi gelinen sayfaya döner (router.back); uygulama o sayfada
// açıldıysa (önceki kayıt yoksa) sayfanın üst sayfasına gider. Böylece ana sayfadan
// Yarışlar'a gelen kişi geri basınca Sporcular'a değil ana sayfaya döner.

const KEY = "sa-nav-trail";
const MAX = 50;

// Saf hâli (test edilir): iz bir adres dizisi, her hareket yeni bir iz döndürür
export function stepTrail(trail, kind, url) {
  const t = trail.length ? trail.slice() : [url];
  const top = t[t.length - 1];
  if (kind === "push") {
    if (url !== top) t.push(url);
  } else if (kind === "replace") {
    t[t.length - 1] = url;
  } else if (kind === "pop") {
    // Geri (ya da ileri) gidildi: izde varsa oraya kadar kısalır, yoksa yeni iz başlar
    const i = t.lastIndexOf(url);
    if (i < 0) return [url];
    t.length = i + 1;
  }
  return t.length > MAX ? t.slice(t.length - MAX) : t;
}

let trail = [];
let installed = false;

const here = () => window.location.pathname + window.location.search;
function keyOf(url) {
  try {
    const u = new URL(url, window.location.href);
    return u.pathname + u.search;
  } catch {
    return here();
  }
}
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(trail)); } catch {}
}

// (app) düzeni açılınca bir kez kurulur; history.pushState/replaceState ve geri/ileri izlenir
export function installTrail() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const cur = here();
  // Sayfa yenilendiyse (iPhone uygulamayı yeniden yükleyebilir) iz oturumdan geri gelir
  try {
    const old = JSON.parse(sessionStorage.getItem(KEY) || "[]");
    if (Array.isArray(old) && old[old.length - 1] === cur) trail = old;
  } catch {}
  if (!trail.length) trail = [cur];
  save();
  const h = window.history;
  const push = h.pushState;
  const replace = h.replaceState;
  h.pushState = function (data, unused, url) {
    const r = push.call(this, data, unused, url);
    if (url != null) { trail = stepTrail(trail, "push", keyOf(url)); save(); }
    return r;
  };
  h.replaceState = function (data, unused, url) {
    const r = replace.call(this, data, unused, url);
    if (url != null) { trail = stepTrail(trail, "replace", keyOf(url)); save(); }
    return r;
  };
  window.addEventListener("popstate", () => { trail = stepTrail(trail, "pop", here()); save(); });
}

// Uygulama içinde dönülecek önceki sayfa var mı
export const canGoBack = () => trail.length > 1;

// Önceki sayfaya dön; yoksa verilen sayfaya git (silinen kayıttan çıkarken de). Gidilen sayfa
// bu sayfanın yerine geçer (replace), push olsaydı oradan geri basınca buraya dönülür, döngü olurdu.
export function goBack(router, href = "/") {
  if (canGoBack()) router.back();
  else router.replace(href);
}
