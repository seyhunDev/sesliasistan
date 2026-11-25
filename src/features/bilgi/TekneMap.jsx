"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { loadMapLibre } from "@/lib/maplibre";

// Yönet Sahne (Seyhun 2026-11-25): koyu harita, parkur çizgisi limon
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

// Yönet › Tekneler haritası (Seyhun 2026-11-15): bilgi ekranını açan her telefon kendi GPS noktasında, üstünde yelken no ve isim.
// 1 dk'dır konum gelmeyen soluk (gri). İlk tekneler gelince hepsi görünecek şekilde yaklaşır; sonra kullanıcı kaydırır.
// Simge (tekne şekli, yön) ileride.
const STALE = 90e3;
// Tam ekranda kenar payı: solda araç sırası, sağda harita düğmeleri, altta panel (dikey telefonda), üstte geri
function pad(m) {
  const c = m.getContainer();
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (w < 600 && h > w) return { top: 80, left: 92, right: 72, bottom: Math.min(340, h * 0.42) };
  if (h < 600 || w < 1000) return { top: 60, left: 92, right: Math.min(420, w * 0.45), bottom: 40 };
  return { top: 70, left: 100, right: 440, bottom: 60 };
}
function fitTo(m, lib, pts, duration) {
  const full = m.getContainer().classList.contains("tkm-full");
  const p = full ? pad(m) : 48;
  if (pts.length === 1) return m.easeTo({ center: [pts[0].lon, pts[0].lat], zoom: 14, padding: full ? p : 0, duration });
  const b = new lib.LngLatBounds();
  pts.forEach((x) => b.extend([x.lon, x.lat]));
  try {
    m.fitBounds(b, { padding: p, maxZoom: 15, duration });
  } catch {
    m.fitBounds(b, { padding: 24, maxZoom: 15, duration });
  }
}
function markEl() {
  const d = document.createElement("div");
  d.className = "tkm";
  d.innerHTML = '<span class="tkm-l"><span class="tkm-t"></span><b class="tkm-pen"></b><span class="bz-wave tkm-w"><i></i><i></i><i></i><i></i><i></i></span></span><i></i>';
  return d;
}

// talk: o an konuşan teknenin cihaz kimliği (Seyhun 2026-11-17 örnek C): işareti yeşil atar, adının yanında ses dalgası
// tracks: geri oynatmada izler [{ id, color, line: [[boylam, enlem], …] }]; boat.color verilirse nokta o renkte
// api (Yönet harita düzeni, Seyhun 2026-11-22): sağdaki düğmeler için { zoom(+1/-1), fit() }. Tam ekranda sığdırma alt paneli ve yan
// sıraları hesaba katar (tekneler panelin altında kalmasın).
export function TekneMap({ boats, course = null, full = false, talk = "", tracks = null, api = null }) {
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
          style: DARK_STYLE,
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
  // Kutu boyu değişince (Yönet paneli büyüyüp küçülünce) harita yeniden çizilir
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      // Ceza rozeti (360° / 720° / FD): adın yanında, nokta da renklenir
      const pen = el.querySelector(".tkm-pen");
      pen.textContent = b.pen || "";
      el.dataset.pen = b.penK || "";
      el.style.setProperty("--c", b.color || "");
      el.classList.toggle("old", !b.keep && now - (b.t || 0) > STALE);
    }
    for (const id of Object.keys(marks.current))
      if (!seen.has(id)) {
        marks.current[id].remove();
        delete marks.current[id];
      }
  }, [boats, ready, talk]);

  // Sığdırma: tekneler + parkur. İlk veri gelince ve parkur değişince bir kez; arada kullanıcı kaydırır, dokunulmaz
  const live = (boats || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon)).length;
  const tk = (tracks || []).map((x) => `${x.id}:${x.line.length}`).join(",");
  const fitKey = `${JSON.stringify(course?.pts || [])}|${live > 0}|${tk ? tracks.map((x) => x.id).join(",") : ""}`;
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib || fitted.current === fitKey) return;
    const pts = [
      ...(boats || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon)),
      ...(course?.pts || []),
      ...(tracks || []).flatMap((x) => x.line.map(([lon, lat]) => ({ lon, lat }))),
    ];
    if (!pts.length) return;
    fitted.current = fitKey;
    fitTo(m, lib, pts, 0);
  }, [fitKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const allPts = useRef([]);
  useEffect(() => {
    allPts.current = [
      ...(boats || []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon)),
      ...(course?.pts || []),
      ...(tracks || []).flatMap((x) => x.line.map(([lon, lat]) => ({ lon, lat }))),
    ];
  });
  useImperativeHandle(
    api,
    () => ({
      zoom: (d) => map.current?.easeTo({ zoom: map.current.getZoom() + d, duration: 250 }),
      fit: () => map.current && ml.current && allPts.current.length && fitTo(map.current, ml.current, allPts.current, 400),
    }),
    [],
  );

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
      m.addLayer({ id: "pk-line", type: "line", source: "pk-line", paint: { "line-color": "#d4ff3a", "line-width": 2, "line-dasharray": [2, 1.5] } });
    }
  }, [ck, ready]);

  // İzler (geri oynatma): her tekne kendi renginde çizgi
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const data = {
      type: "FeatureCollection",
      features: (tracks || []).filter((x) => x.line.length > 1).map((x) => ({ type: "Feature", properties: { c: x.color }, geometry: { type: "LineString", coordinates: x.line } })),
    };
    if (m.getSource("iz")) m.getSource("iz").setData(data);
    else {
      m.addSource("iz", { type: "geojson", data });
      m.addLayer({ id: "iz", type: "line", source: "iz", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["get", "c"], "line-width": 2.5, "line-opacity": 0.85 } });
    }
  }, [tk, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err && !full) return null;
  return <div ref={box} className={`tkm-map${full ? " tkm-full" : ""}`} aria-label="Tekneler haritası" />;
}
