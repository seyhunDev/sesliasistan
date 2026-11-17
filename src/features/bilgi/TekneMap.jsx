"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_STYLE, loadMapLibre } from "@/lib/maplibre";

// Yönet › Tekneler haritası (Seyhun 2026-11-15): bilgi ekranını açan her telefon kendi GPS noktasında, üstünde yelken no ve isim.
// 1 dk'dır konum gelmeyen soluk (gri). İlk tekneler gelince hepsi görünecek şekilde yaklaşır; sonra kullanıcı kaydırır.
// Simge (tekne şekli, yön) ileride.
const STALE = 90e3;
function markEl() {
  const d = document.createElement("div");
  d.className = "tkm";
  d.innerHTML = '<span class="tkm-l"><span class="tkm-t"></span><span class="bz-wave tkm-w"><i></i><i></i><i></i><i></i><i></i></span></span><i></i>';
  return d;
}

// talk: o an konuşan teknenin cihaz kimliği (Seyhun 2026-11-17 örnek C): işareti yeşil atar, adının yanında ses dalgası
export function TekneMap({ boats, course = null, full = false, talk = "" }) {
  const box = useRef(null);
  const map = useRef(null);
  const ml = useRef(null);
  const marks = useRef({});
  const fitted = useRef("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    loadMapLibre()
      .then((lib) => {
        if (!live || !box.current) return;
        ml.current = lib;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = new lib.Map({
          container: box.current,
          style: MAP_STYLE,
          center: [26.889, 39.071],
          zoom: 12,
          attributionControl: false,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          cooperativeGestures: !!touch && !full,
        });
        m.touchZoomRotate?.disableRotation();
        map.current = m;
        m.on("load", () => live && setReady(true));
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      marks.current = {};
    };
  }, [full]);

  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    const seen = new Set();
    const now = Date.now();
    for (const b of boats || []) {
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) continue;
      seen.add(b.id);
      let mk = marks.current[b.id];
      if (!mk) mk = marks.current[b.id] = new lib.Marker({ element: markEl(), anchor: "bottom" }).setLngLat([b.lon, b.lat]).addTo(m);
      mk.setLngLat([b.lon, b.lat]);
      const el = mk.getElement();
      el.querySelector(".tkm-t").textContent = [b.sail, b.name].filter(Boolean).join(" · ");
      el.classList.toggle("talk", !!talk && b.id === talk);
      el.classList.toggle("old", now - (b.t || 0) > STALE);
    }
    for (const id of Object.keys(marks.current))
      if (!seen.has(id)) {
        marks.current[id].remove();
        delete marks.current[id];
      }
  }, [boats, ready, talk]);

  // Sığdırma: tekneler + parkur. İlk veri gelince ve parkur değişince bir kez; arada kullanıcı kaydırır, dokunulmaz
  const live = (boats || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon)).length;
  const fitKey = `${JSON.stringify(course?.pts || [])}|${live > 0}`;
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib || fitted.current === fitKey) return;
    const pts = [...(boats || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon)), ...(course?.pts || [])];
    if (!pts.length) return;
    fitted.current = fitKey;
    if (pts.length === 1) m.jumpTo({ center: [pts[0].lon, pts[0].lat], zoom: 14 });
    else {
      const b = new lib.LngLatBounds();
      pts.forEach((p) => b.extend([p.lon, p.lat]));
      m.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
    }
  }, [fitKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parkur şamandıraları (Yönet › Parkur): turuncu nokta + numara, hakem botu ve pin mavi
  const cm = useRef([]);
  const ck = JSON.stringify(course?.pts || []);
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    cm.current.forEach((x) => x.remove());
    cm.current = JSON.parse(ck).map((p) => {
      const d = document.createElement("div");
      d.className = `tkm-mk ${p.kind}`;
      d.textContent = p.n || "";
      return new lib.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(m);
    });
    // Start hattı: hakem botu ile pin arası kesikli çizgi
    const pts = JSON.parse(ck);
    const k = pts.find((x) => x.kind === "komite");
    const pn = pts.find((x) => x.kind === "pin");
    const data = {
      type: "FeatureCollection",
      features:
        k && pn
          ? [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [k.lon, k.lat],
                    [pn.lon, pn.lat],
                  ],
                },
              },
            ]
          : [],
    };
    if (m.getSource("pk-line")) m.getSource("pk-line").setData(data);
    else {
      m.addSource("pk-line", { type: "geojson", data });
      m.addLayer({ id: "pk-line", type: "line", source: "pk-line", paint: { "line-color": "#1d4ed8", "line-width": 2, "line-dasharray": [2, 1.5] } });
    }
  }, [ck, ready]);

  if (err && !full) return null;
  return <div ref={box} className={`tkm-map${full ? " tkm-full" : ""}`} aria-label="Tekneler haritası" />;
}
