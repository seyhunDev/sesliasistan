// Açılış süresi (Seyhun 2026-11-13: "uygulamam daha hızlı açılsın"; Ayarlar › Hesap › Açılış süresi): uygulama baştan yüklenince
// sayfanın verilerle çizildiği an ölçülür (sayfanın yüklenmeye başladığı andan, ms). Son 10 açılış yalnız bu cihazda saklanır.
// Arkada başlayan ya da çok uzun süren açılış (telefon kilitli, uygulama arkada açıldı) sayılmaz.
const KEY = "sa-open-ms";
const MAX = 10;
const TOO_LONG = 60e3;
let done = false;

export function readOpens() {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(l) ? l.filter((x) => Number.isFinite(x?.ms)) : [];
  } catch {
    return [];
  }
}

// Ekranın verilerle ilk çizildiği an bir kez çağrılır (OpenTimer)
export function markOpen(ms = performance.now()) {
  if (done) return;
  done = true;
  if (document.visibilityState === "hidden" || !(ms > 0) || ms > TOO_LONG) return;
  try {
    const next = [{ ms: Math.round(ms), at: Date.now() }, ...readOpens()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

const sec = (ms) => `${(ms / 1000).toFixed(1).replace(".", ",")} sn`;

// "Son 0,8 sn · ort. 1,1 sn" (açılış yoksa "")
export function openText(list) {
  if (!list.length) return "";
  const avg = list.reduce((a, x) => a + x.ms, 0) / list.length;
  return list.length > 1 ? `Son ${sec(list[0].ms)} · ort. ${sec(avg)}` : `Son ${sec(list[0].ms)}`;
}
