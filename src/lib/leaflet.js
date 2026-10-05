"use client";

// Leaflet (ücretsiz harita) ilk açılışta unpkg'den yüklenir; paket eklenmez, harita açılmayan sayfalara yük getirmez.
const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/leaflet";
const CSS_SRI = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const JS_SRI = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
let loading = null;
export function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.L) return Promise.resolve(window.L);
  loading ||= new Promise((ok, fail) => {
    const css = document.createElement("link");
    Object.assign(css, { rel: "stylesheet", href: `${LEAFLET}.css`, integrity: CSS_SRI, crossOrigin: "" });
    document.head.appendChild(css);
    const js = document.createElement("script");
    Object.assign(js, { src: `${LEAFLET}.js`, integrity: JS_SRI, crossOrigin: "", async: true });
    js.onload = () => (window.L ? ok(window.L) : fail(new Error("leaflet")));
    js.onerror = () => {
      loading = null;
      js.remove();
      fail(new Error("leaflet"));
    };
    document.head.appendChild(js);
  });
  return loading;
}

// OpenStreetMap katmanı (ücretsiz)
export const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
