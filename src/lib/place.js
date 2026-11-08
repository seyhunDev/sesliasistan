// Kalınan sayfa (Seyhun 2026-11-08: "arka plana atıp açınca ana sayfaya gidiyor; nerede kaldıysam o sayfa kalmalı, yalnız
// uygulamadan tamamen çıkarsam ana sayfadan açılsın"). iPhone arkadaki uygulamanın web sürecini kapatınca uygulama dönüşte
// siteyi baştan, ana sayfadan açıyordu. Açık sayfa sessionStorage'da tutulur: aynı pencere yeniden yüklenince kalır,
// uygulama tamamen kapanınca silinir. Sayfa ana sayfadan (adres yalnız "/") yükleniyorsa ve kayıtlı yer başka bir sayfaysa
// ilk çizimden önce oraya geçilir (kök düzendeki PLACE_SCRIPT). Giriş sayfaları kaydedilmez; çıkışta silinir.
export const PLACE_KEY = "sa-place";
const SKIP = /^\/(login|register|api)(\/|$)/;

export const keepable = (path) => typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !SKIP.test(path);

// Ana sayfa yüklenirken dönülecek sayfa (yoksa null)
export function restoreTo({ pathname, search = "", hash = "" }, saved) {
  if (pathname !== "/" || search || hash) return null;
  return keepable(saved) && saved !== "/" ? saved : null;
}

export function savePlace(path) {
  if (!keepable(path)) return;
  try {
    sessionStorage.setItem(PLACE_KEY, path);
  } catch {}
}

export function clearPlace() {
  try {
    sessionStorage.removeItem(PLACE_KEY);
  } catch {}
}

// restoreTo'nun satır içi hâli (Next yüklenmeden, ilk çizimden önce çalışır)
export const PLACE_SCRIPT = `try{var l=location;if(l.pathname==="/"&&!l.search&&!l.hash){var p=sessionStorage.getItem("${PLACE_KEY}");if(p&&p!=="/"&&p.charAt(0)==="/"&&p.charAt(1)!=="/"&&!/^\\/(login|register|api)(\\/|$)/.test(p))l.replace(p)}}catch(e){}`;
