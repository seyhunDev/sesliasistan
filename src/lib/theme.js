// Görünüm: "" (otomatik: telefonun ayarı), "light" (açık), "dark" (koyu). Yalnız bu cihazda tutulur (sa-theme);
// sayfa çizilmeden önce <html data-theme> olarak uygulanır (bkz. app/layout.jsx THEME_SCRIPT), Firestore'a gitmez.
export const THEMES = [
  ["", "Otomatik"],
  ["light", "Açık"],
  ["dark", "Koyu"],
];
export const cleanTheme = (v) => (v === "light" || v === "dark" ? v : "");

// Durum çubuğu / tarayıcı rengi (globals.css'teki --bg ile aynı)
export const THEME_BG = { light: "#f4f3ef", dark: "#121416" };

// Seçimden ekranda kullanılacak tema: otomatikte telefonun açık/koyu ayarı
export const resolveTheme = (v, prefersDark) => cleanTheme(v) || (prefersDark ? "dark" : "light");

export function readTheme() {
  try {
    return cleanTheme(localStorage.getItem("sa-theme"));
  } catch {
    return "";
  }
}

function paint(v) {
  if (typeof document === "undefined") return;
  const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  const t = resolveTheme(v, dark);
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_BG[t]));
}

// Seçimi uygula ve cihazda hatırla
export function applyTheme(v) {
  const t = cleanTheme(v);
  try {
    if (t) localStorage.setItem("sa-theme", t);
    else localStorage.removeItem("sa-theme");
  } catch {}
  paint(t);
}

// Otomatikteyken telefon gece/gündüz değiştirince uygulama da değişir (uygulama açılınca bir kez kurulur)
export function watchTheme() {
  if (typeof matchMedia !== "function") return () => {};
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const on = () => paint(readTheme());
  mq.addEventListener?.("change", on);
  return () => mq.removeEventListener?.("change", on);
}

// layout.jsx'te <head> içinde, ilk çizimden önce çalışan kod (aynı kural, React'sız)
export const THEME_SCRIPT = `try{var t=localStorage.getItem("sa-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
