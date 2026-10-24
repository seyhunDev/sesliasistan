"use client";

// MapLibre GL (ücretsiz vektör harita; akıcı yakınlaşma ve kamera) ilk açılışta unpkg'den yüklenir; paket eklenmez.
// Harita verisi OpenFreeMap (anahtarsız, ücretsiz). Kaynak yazısı lisans gereği haritadaki küçük "i" içinde.
const BASE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl";
const JS_SRI = "sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj";
const CSS_SRI = "sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V";
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export const MAP_ATTR = "OpenFreeMap · © OpenMapTiles · © OpenStreetMap katkıcıları";

let loading = null;
export function loadMapLibre() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  loading ||= new Promise((ok, fail) => {
    const css = document.createElement("link");
    Object.assign(css, { rel: "stylesheet", href: `${BASE}.css`, integrity: CSS_SRI, crossOrigin: "" });
    document.head.appendChild(css);
    const js = document.createElement("script");
    Object.assign(js, { src: `${BASE}.js`, integrity: JS_SRI, crossOrigin: "", async: true });
    js.onload = () => (window.maplibregl ? ok(window.maplibregl) : fail(new Error("maplibre")));
    js.onerror = () => {
      loading = null;
      js.remove();
      fail(new Error("maplibre"));
    };
    document.head.appendChild(js);
  });
  return loading;
}
