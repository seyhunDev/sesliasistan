// Uygulama içi geçmiş: tarayıcı geçmişindeki kayıtların bu oturumdaki kopyası.
// Sayfa başlığındaki geri düğmesi gelinen sayfaya döner (router.back); uygulama o sayfada
// açıldıysa (önceki kayıt yoksa) sayfanın üst sayfasına gider. Böylece ana sayfadan
// Yarışlar'a gelen kişi geri basınca Sporcular'a değil ana sayfaya döner.
import { scoreBack } from "@/lib/brain/scoreStore";

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

// Sayfa baştan yüklenince (yeni sürüm geçişi tam yükleme yapar: newVersion.js, yenileme, geri/ileri) oturumdaki iz
// nasıl devam eder (test edilir). Önceden yalnız izin sonu bu adresse devam ediyordu; yeni sürüm varken bir bağlantıya
// dokunulunca açılan sayfa izde olmadığından iz sıfırlanıyor, geri düğmesi üst sayfaya (Yarışlar'dan Sporcular'a) gidiyordu.
export function restoreTrail(old, cur, navType = "") {
  if (!Array.isArray(old) || !old.length) return [cur];
  if (old[old.length - 1] === cur) return old;
  // Tarayıcının geri/ileri düğmesiyle önceki bir tam yüklemeye dönüldü: iz oraya kadar kısalır
  if (navType === "back_forward" && old.includes(cur)) return stepTrail(old, "pop", cur);
  return [cur];
}

let trail = [];
let installed = false;
let docBase = 0; // bu sayfa yüklemesinin izdeki ilk kaydı; öncekiler önceki tam yüklemelerden

const here = () => (typeof window === "undefined" ? "" : window.location.pathname + window.location.search);
function keyOf(url) {
  try {
    const u = new URL(url, window.location.href);
    return u.pathname + u.search;
  } catch {
    return here();
  }
}
const navType = () => {
  try {
    return performance.getEntriesByType("navigation")[0]?.type || "";
  } catch {
    return "";
  }
};
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(trail)); } catch {}
}

// (app) düzeni açılınca bir kez kurulur; history.pushState/replaceState ve geri/ileri izlenir
export function installTrail() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const cur = here();
  // Sayfa yenilendiyse (iPhone uygulamayı yeniden yükleyebilir) ya da yeni sürüme geçerken tam yüklendiyse iz oturumdan geri gelir
  let old = [];
  try {
    old = JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {}
  trail = restoreTrail(old, cur, navType());
  docBase = trail.length - 1;
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
  window.addEventListener("popstate", () => {
    trail = stepTrail(trail, "pop", here());
    save();
    // Geri gerçekleşti: kilit hemen kalkar, yeni sayfadaki geri düğmesi beklemeden çalışır
    if (pending) (pending = 0), clearTimeout(timer);
    docBase = Math.min(docBase, trail.length - 1);
  });
  // Önceki tam yüklemeye geri dönülüp sayfa tarayıcının belleğinden açıldıysa (popstate gelmez) iz buraya kısalır
  window.addEventListener("pageshow", (e) => {
    if (!e?.persisted) return;
    trail = stepTrail(trail, "pop", here());
    docBase = Math.min(docBase, trail.length - 1);
    save();
  });
}

// Bağlantı tam sayfa yüklemesiyle açılacak (yeni sürüm, newVersion.js): gidilen adres ize önceden yazılır,
// yeni sayfa açılınca iz oradan devam eder; geri düğmesi gelinen sayfaya döner.
export function trailFullLoad(url) {
  if (typeof window === "undefined") return;
  trail = stepTrail(trail.length ? trail : [here()], "push", keyOf(url));
  save();
}

// Uygulama içinde dönülecek önceki sayfa var mı
export const canGoBack = () => trail.length > 1;

// Önceki sayfaya dön; yoksa verilen sayfaya git (silinen kayıttan çıkarken de). Gidilen sayfa
// bu sayfanın yerine geçer (replace), push olsaydı oradan geri basınca buraya dönülür, döngü olurdu.
// Arka arkaya basışlar tek geri sayılır (ikinci basış iki sayfa geri götürmesin); kilit geri
// gerçekleşince (popstate) hemen kalkar. Önceden 0,6 sn hep kilitli kalıyordu: geri dönülen sayfada
// hemen yeniden geri basınca hiçbir şey olmuyordu. Geri gidilemediyse (iz tarayıcı geçmişiyle
// uyuşmuyor: iPhone uygulamayı yeniden açınca geçmiş boş olabilir) kısa süre sonra adres hâlâ
// aynıysa üst sayfaya gidilir; böylece düğme hiçbir zaman "tepkisiz" kalmaz.
const WAIT = 600;
const WAIT_DOC = 3000; // önceki kayıt başka bir tam yüklemeden: tarayıcı o sayfayı yeniden yükler, daha uzun sürebilir
let pending = 0;
let pendingWait = 0;
let timer = 0;
export function goBack(router, href = "/") {
  if (typeof window === "undefined") return;
  scoreBack(); // puanlama: asistanın açtığı sayfadan hemen geri dönüldüyse
  if (pending && Date.now() - pending < (pendingWait || WAIT)) return;
  if (!canGoBack()) {
    router.replace(href);
    return;
  }
  pending = Date.now();
  const from = here();
  const wait = (pendingWait = trail.length - 2 < docBase ? WAIT_DOC : WAIT);
  router.back();
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = 0;
    if (typeof window === "undefined" || here() !== from) return; // sayfa kapandıysa (ya da testte pencere kalktıysa) bir şey yapma
    trail = [from];
    docBase = 0;
    save();
    router.replace(href);
  }, wait);
}
