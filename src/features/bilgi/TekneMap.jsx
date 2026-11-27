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
  d.innerHTML = '<span class="tkm-l"><span class="tkm-t"></span><b class="tkm-pen"></b><span class="bz-wave tkm-w"><i></i><i></i><i></i><i></i><i></i></span></span><i></i><span class="tkm-b"></span>';
  return d;
}

// Tekne çizimi (Seyhun 2026-11-27 örnek MMDJDf6thqn7VwVuhefoLg): Velora Sailing'in Optimist çizimi (public/tanitim/engine.js + boat-draw.js,
// tanıtım sayfasıyla ortak) bir kez yüklenir; yüklenemezse eski nokta kalır. Tekne gittiği yöne (hdg) döner, yön yoksa son bilinen yön.
let bdLoad = null;
function loadBoatDraw() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.BoatDraw && window.SailEngine) return Promise.resolve();
  bdLoad ||= ["/tanitim/engine.js", "/tanitim/boat-draw.js"]
    .reduce(
      (p, src) =>
        p.then(
          () =>
            new Promise((ok, no) => {
              const sc = document.createElement("script");
              sc.src = src;
              sc.onload = ok;
              sc.onerror = no;
              document.head.appendChild(sc);
            }),
        ),
      Promise.resolve(),
    )
    .then(() => {
      if (!window.BoatDraw || !window.SailEngine) throw new Error("boat-draw");
    })
    .catch((e) => {
      bdLoad = null;
      throw e;
    });
  return bdLoad;
}
const NS = "http://www.w3.org/2000/svg";
// Renk: veride yoksa tekne kimliğine göre sabit, birbirinden ayrı renkler
const BOAT_COLS = ["#ffd60a", "#5b8cff", "#ff6b5e", "#3ddc97", "#ff8fd0", "#f59e0b", "#a78bfa", "#2dd4bf"];
function boatCol(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BOAT_COLS[h % BOAT_COLS.length];
}
// Yelkenin hangi tarafta durduğu rüzgâra göre; rüzgâr bilinmiyorsa orsa (rüzgâr baştan 45° sancaktan) sayılır
function boatSvg(color, hdg, wind, id) {
  const E = window.SailEngine;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-32 -32 64 64");
  const g = document.createElementNS(NS, "g");
  svg.appendChild(g);
  const seed = E.seedOf(String(id));
  const w = Number.isFinite(wind) ? wind : hdg + 45;
  window.BoatDraw.draw(g, "optimist", { color, pose: E.sailPose(hdg, w, { v: 55, base: 55, t: 0, seed }), t: 0, seed, heading: hdg, speed: 0, rich: false });
  return svg;
}
// Antrenör botu (sen): beyaz şişme bot, baş yukarı
const RIB =
  '<svg viewBox="-24 -42 48 90" aria-hidden="true"><path d="M0,-35 C10,-30 15,-18 16,-4 L16,30 C16,34 13,36 9,36 L-9,36 C-13,36 -16,34 -16,30 L-16,-4 C-15,-18 -10,-30 0,-35 Z" fill="#e9eef5" stroke="#0b111a" stroke-width="1.5"/><path d="M0,-27 C6,-23 9,-14 10,-4 L10,29 L-10,29 L-10,-4 C-9,-14 -6,-23 0,-27 Z" fill="#9fb0c4"/><rect x="-6" y="2" width="12" height="9" rx="2" fill="#1b2a3e"/><rect x="-6" y="14" width="12" height="5" rx="1.5" fill="#5b6f86"/><rect x="-5" y="36" width="10" height="7" rx="2" fill="#1b2a3e"/><path d="M0,-31 L0,-20" stroke="#2f7dff" stroke-width="3" stroke-linecap="round"/></svg>';
// Uzaklaşınca (yakınlık 14'ün altı) tekne çizimi yönlü küçük oka döner
const SMALL_Z = 14;

// talk: o an konuşan teknenin cihaz kimliği (Seyhun 2026-11-17 örnek C): işareti yeşil atar, adının yanında ses dalgası
// tracks: geri oynatmada izler [{ id, color, line: [[boylam, enlem], …] }]; boat.color verilirse nokta o renkte
// api (Yönet harita düzeni, Seyhun 2026-11-22): sağdaki düğmeler için { zoom(+1/-1), fit() }. Tam ekranda sığdırma alt paneli ve yan
// sıraları hesaba katar (tekneler panelin altında kalmasın).
// onPen(id): ceza rozetine dokununca (Yönet: cezayı tek dokunuşla kaldır, Seyhun 2026-11-25)
// me (Seyhun 2026-11-27): bu telefonun konumu büyük antrenör botu olarak; yalnız bu ekranda, hiçbir yere yazılmaz
// wind: rüzgârın geldiği yön (parkurdan), yelken tarafı için
export function TekneMap({ boats, course = null, full = false, talk = "", tracks = null, api = null, onPen = null, me = false, wind = null }) {
  const penCb = useRef(onPen);
  useEffect(() => {
    penCb.current = onPen;
  });
  const box = useRef(null);
  const map = useRef(null);
  const ml = useRef(null);
  const marks = useRef({});
  const fitted = useRef("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [bd, setBd] = useState(false);
  const [small, setSmall] = useState(false);
  const [mePos, setMePos] = useState(null);
  const meMk = useRef(null);
  useEffect(() => {
    let live = true;
    loadBoatDraw()
      .then(() => live && setBd(true))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  // Kendi konumun: harita açıkken izlenir (izin bir kez sorulur; reddedilirse bot görünmez)
  useEffect(() => {
    if (!me || typeof navigator === "undefined" || !navigator.geolocation) return undefined;
    let id = null;
    try {
      id = navigator.geolocation.watchPosition(
        (p) =>
          setMePos((o) => ({
            lat: p.coords.latitude,
            lon: p.coords.longitude,
            hdg: Number.isFinite(p.coords.heading) && (p.coords.speed ?? 1) > 0.3 ? p.coords.heading : (o?.hdg ?? 0),
          })),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
      );
    } catch {}
    return () => id != null && navigator.geolocation.clearWatch(id);
  }, [me]);

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
        const z = () => live && setSmall(m.getZoom() < SMALL_Z);
        m.on("zoomend", z);
        m.on("load", z);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      marks.current = {};
      meMk.current = null;
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
      if (!mk) {
        const elm = markEl();
        const id = b.id;
        elm.querySelector(".tkm-pen").addEventListener("click", (e) => {
          e.stopPropagation();
          penCb.current?.(id);
        });
        mk = marks.current[b.id] = new lib.Marker({ element: elm, anchor: "bottom" }).setLngLat([b.lon, b.lat]).addTo(m);
      }
      // Tekne çizimi: yön 10°'lik adımla yeniden çizilir (yelken tarafı değişir), döndürme her konumda
      const bx = mk.getElement().querySelector(".tkm-b");
      if (Number.isFinite(b.hdg)) bx.dataset.h = String(b.hdg);
      const h = +(bx.dataset.h || 0);
      const col = b.color || boatCol(b.id);
      if (bd) {
        const key = `${col}|${Math.round(h / 10)}|${wind ?? ""}`;
        if (bx.dataset.k !== key) {
          bx.dataset.k = key;
          bx.replaceChildren(boatSvg(col, h, wind, b.id));
        }
        bx.style.transform = `rotate(${Math.round(h)}deg)`;
        bx.style.setProperty("--bc", col);
      }
      mk.setLngLat([b.lon, b.lat]);
      const el = mk.getElement();
      el.querySelector(".tkm-t").textContent = [b.sail, b.name].filter(Boolean).join(" · ");
      el.classList.toggle("talk", !!talk && b.id === talk);
      // Ceza rozeti (360° / 720° / FD): adın yanında, nokta da renklenir
      const pen = el.querySelector(".tkm-pen");
      pen.textContent = b.pen ? `${b.pen} ✕` : "";
      pen.setAttribute("role", "button");
      pen.setAttribute("aria-label", b.pen ? `${b.name || "Sporcu"}: cezayı kaldır` : "");
      el.dataset.pen = b.penK || "";
      el.style.setProperty("--c", b.color || "");
      el.classList.toggle("old", !b.keep && now - (b.t || 0) > STALE);
      el.classList.toggle("boat", bd);
      el.classList.toggle("sm", bd && small);
    }
    for (const id of Object.keys(marks.current))
      if (!seen.has(id)) {
        marks.current[id].remove();
        delete marks.current[id];
      }
  }, [boats, ready, talk, bd, small, wind]);

  // Sen: büyük beyaz bot, mavi halka, üstünde "Sen"
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    if (!me || !mePos) {
      meMk.current?.remove();
      meMk.current = null;
      return;
    }
    if (!meMk.current) {
      const d = document.createElement("div");
      d.className = "tkm-me";
      d.innerHTML = `<span class="tkm-l">Sen</span><span class="tkm-mr"><span class="tkm-mb">${RIB}</span></span>`;
      meMk.current = new lib.Marker({ element: d, anchor: "bottom" }).setLngLat([mePos.lon, mePos.lat]).addTo(m);
    }
    meMk.current.setLngLat([mePos.lon, mePos.lat]);
    const el = meMk.current.getElement();
    el.querySelector(".tkm-mb").style.transform = `rotate(${Math.round(mePos.hdg || 0)}deg)`;
    el.classList.toggle("sm", small);
  }, [me, mePos, ready, small]);

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
