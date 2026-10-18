// Sayfa çökmeleri: hata ekranları (app/error.jsx, app/(app)/error.jsx, app/global-error.jsx) ve genel dinleyici kullanır.
// Yeni yayından sonra eski sayfanın istediği kod parçası sunucuda artık yoktur (Netlify eski dosyaları tutmaz):
// bu "yükleme hatası"nda sayfa kendiliğinden bir kez yenilenir, kullanıcı hata ekranı görmez.
// Son hatalar bu telefonda saklanır (sa-crash), hata ekranında "Ayrıntı" altında görünür.

const KEY = "sa-crash";
const RELOAD_KEY = "sa-crash-reload";

// Kod parçası yüklenemedi (Chrome/Android: ChunkLoadError, iPhone Safari: "Importing a module script failed")
export function isChunkError(e) {
  const s = `${e?.name || ""} ${e?.message || e || ""}`;
  return /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load chunk/i.test(s);
}

// Bir dakika içinde bir kez yenilenir (sonsuz yenileme döngüsü olmasın)
export function canReload(now = Date.now()) {
  try {
    return now - Number(sessionStorage.getItem(RELOAD_KEY) || 0) >= 60e3;
  } catch {
    return false;
  }
}

// Yenilediyse true
export function reloadOnce(now = Date.now()) {
  if (!canReload(now)) return false;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

export function logCrash(e, where = "") {
  try {
    const list = readCrashes();
    const msg = String(e?.message || e || "Bilinmeyen hata").slice(0, 300);
    list.unshift({ at: new Date().toISOString(), path: location.pathname, where, msg, digest: e?.digest || "" });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {}
}

export function readCrashes() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Bir hatayı ele al: yükleme hatasıysa yenile (true döner), değilse kaydet
export function handleCrash(e, where) {
  logCrash(e, where);
  return isChunkError(e) && reloadOnce();
}

// Olay düğmelerindeki import() gibi yakalanmayan yükleme hataları da sayfayı yeniler
export function watchChunkErrors() {
  const on = (ev) => {
    const e = ev?.reason ?? ev?.error ?? ev?.message;
    if (isChunkError(e)) handleCrash(e, "dinleyici");
  };
  window.addEventListener("unhandledrejection", on);
  window.addEventListener("error", on);
  return () => (window.removeEventListener("unhandledrejection", on), window.removeEventListener("error", on));
}
