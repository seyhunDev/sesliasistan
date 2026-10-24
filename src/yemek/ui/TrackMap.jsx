"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_ATTR, MAP_STYLE, loadMapLibre } from "@/lib/maplibre";
import { fetchRoute, lineOf } from "../route";

// Takip haritası (Seyhun 2026-10-23: tek, akıcı, göze hoş harita): vektör harita, restorandan adrese yollardan rota
// (çizilerek gelir), restoran fotoğraflı yuvarlak, ev camgöbeği, kurye aracına göre simge (motor / araba / bisiklet)
// ve yumuşak kayarak ilerler; yolun alınan kısmı soluk. Telefonda tek parmak sayfayı kaydırır, iki parmak yakınlaştırır.
// small: ana sayfadaki yemek kartının üstündeki küçük harita (çerçevesiz, dokunulmaz; dokunuş kartın bağlantısına gider); onFail: harita yüklenemedi.
const ACC = "#0b7f99", DEEP = "#0f2c45";
const ICONS = {
  motor: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h4l3-7h3M14.5 10 13 6h-2.5M8 14h5"/>',
  araba: '<path d="M4 16v-3.5L6 8h12l2 4.5V16z"/><path d="M4 12.5h16"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>',
  bisiklet: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="m5.5 16.5 3.5-7h6l3.5 7M9 9.5l3.5 7 2.5-7M13.5 6.5h2.5"/>',
  home: '<path d="M4 11.5 12 5l8 6.5M6.5 10v8.5h11V10"/>',
};
const svg = (k, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.motor}</svg>`;

function el(html, style) {
  const d = document.createElement("div");
  d.innerHTML = html;
  Object.assign(d.style, style);
  return d;
}
const placeEl = (photo) => el("", { width: "40px", height: "40px", borderRadius: "999px", border: "3px solid #fff", background: DEEP, backgroundImage: photo ? `url(${photo})` : "none", backgroundSize: "cover", backgroundPosition: "center", boxShadow: "0 3px 10px rgba(15,44,69,.35)" });
const homeEl = () => el(svg("home", 16), { width: "32px", height: "32px", borderRadius: "999px", border: "3px solid #fff", background: ACC, display: "grid", placeItems: "center", boxShadow: "0 3px 10px rgba(11,127,153,.4)" });
function courierEl(vehicle) {
  const d = el(svg(vehicle, 22), { width: "44px", height: "44px", borderRadius: "999px", border: "3px solid #fff", background: DEEP, display: "grid", placeItems: "center", boxShadow: "0 4px 12px rgba(15,44,69,.4)" });
  d.animate?.([{ boxShadow: "0 0 0 0 rgba(11,127,153,.55), 0 4px 12px rgba(15,44,69,.4)" }, { boxShadow: "0 0 0 16px rgba(11,127,153,0), 0 4px 12px rgba(15,44,69,.4)" }], { duration: 1800, iterations: Infinity });
  return d;
}
const lineData = (coords) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords.length > 1 ? coords : [] } });

// Rota: siparişte yoksa (eski sipariş) burada bir kez alınır; alınamazsa düz çizgi
const fetched = new Map();
function useLine(route, from, to) {
  const given = lineOf(route);
  const key = from && to ? `${from.lat},${from.lng};${to.lat},${to.lng}` : "";
  const [got, setGot] = useState(() => fetched.get(key) || null);
  useEffect(() => {
    if (given || !key || fetched.has(key)) return;
    let live = true;
    fetchRoute(from, to).then((r) => {
      const line = lineOf(r) || [[from.lng, from.lat], [to.lng, to.lat]];
      fetched.set(key, line);
      if (live) setGot(line);
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return given || got || null;
}

export function TrackMap({ from, to, courier, route, photo, f = 0, info, tall, small, onFail }) {
  const box = useRef(null);
  const map = useRef(null);
  const marks = useRef({});
  const anim = useRef(0);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [about, setAbout] = useState(false);
  const line = useLine(route, from, to);

  // Harita bir kez kurulur; restoran ve ev işaretleri, rota katmanları
  useEffect(() => {
    let live = true;
    loadMapLibre()
      .then((ml) => {
        if (!live || !box.current) return;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = new ml.Map({
          container: box.current, style: MAP_STYLE, center: from ? [from.lng, from.lat] : [26.889, 39.071], zoom: 13,
          attributionControl: false, dragPan: !touch, dragRotate: false, touchPitch: false, pitchWithRotate: false, scrollZoom: false,
        });
        m.touchZoomRotate?.disableRotation();
        if (from) marks.current.place = new ml.Marker({ element: placeEl(photo) }).setLngLat([from.lng, from.lat]).addTo(m);
        if (to) marks.current.home = new ml.Marker({ element: homeEl() }).setLngLat([to.lng, to.lat]).addTo(m);
        m.on("load", () => {
          if (!live) return;
          m.addSource("r", { type: "geojson", data: lineData([]) });
          m.addSource("d", { type: "geojson", data: lineData([]) });
          const round = { "line-cap": "round", "line-join": "round" };
          m.addLayer({ id: "r-case", type: "line", source: "r", layout: round, paint: { "line-color": "#fff", "line-width": 10 } });
          m.addLayer({ id: "r-line", type: "line", source: "r", layout: round, paint: { "line-color": ACC, "line-width": 5 } });
          m.addLayer({ id: "d-line", type: "line", source: "d", layout: round, paint: { "line-color": "#a7b6c2", "line-width": 5 } });
          map.current = m;
          setReady(true);
        });
        m.on("error", () => {}); // tek karo hatası haritayı düşürmesin
      })
      .catch(() => live && (setErr(true), onFail?.()));
    return () => {
      live = false;
      cancelAnimationFrame(anim.current);
      map.current?.remove();
      map.current = null;
      marks.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rota çizilerek gelir, kamera rotaya uçar
  const drawn = useRef("");
  useEffect(() => {
    const m = map.current, ml = window.maplibregl;
    if (!ready || !m || !ml || !line?.length) return;
    const key = `${line.length}:${line[0]}:${line[line.length - 1]}`;
    if (drawn.current === key) return;
    drawn.current = key;
    const pts = [...line, ...(courier?.pos ? [[courier.pos.lng, courier.pos.lat]] : [])];
    const b = pts.reduce((acc, p) => acc.extend(p), new ml.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, { padding: small ? { top: 34, bottom: 18, left: 30, right: 30 } : { top: 70, bottom: 50, left: 50, right: 50 }, maxZoom: 16.5, duration: 1400 });
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      const n = Math.max(2, Math.ceil(line.length * (1 - (1 - k) ** 3)));
      m.getSource("r")?.setData(lineData(line.slice(0, n)));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [ready, line]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yolun alınan kısmı (soluk)
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !line?.length) return;
    const n = Math.round(f * (line.length - 1));
    m.getSource("d")?.setData(lineData(f > 0 ? line.slice(0, n + 1) : []));
  }, [ready, line, f]);

  // Kurye: yeni konuma 1,2 sn'de kayarak gider
  const vehicle = courier?.vehicle || "motor";
  useEffect(() => {
    const m = map.current, ml = window.maplibregl;
    if (!ready || !m || !ml) return;
    const pos = courier?.pos;
    let mk = marks.current.courier;
    if (!pos) {
      mk?.remove();
      marks.current.courier = null;
      return;
    }
    if (mk && marks.current.vehicle !== vehicle) {
      mk.remove();
      mk = null;
    }
    if (!mk) {
      marks.current.courier = new ml.Marker({ element: courierEl(vehicle) }).setLngLat([pos.lng, pos.lat]).addTo(m);
      marks.current.vehicle = vehicle;
      return;
    }
    const a = mk.getLngLat(), t0 = performance.now();
    let raf = 0;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1200), e = k * (2 - k);
      mk.setLngLat([a.lng + (pos.lng - a.lng) * e, a.lat + (pos.lat - a.lat) * e]);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, courier?.pos?.lat, courier?.pos?.lng, vehicle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return null;
  return (
    <div className="relative">
      <div ref={box} className={small ? "pointer-events-none h-[9.5rem] w-full overflow-hidden bg-[#eef0ea]" : `${tall ? "h-[26rem]" : "h-72"} w-full overflow-hidden rounded-[1.25rem] border border-line bg-[#eef0ea]`} />
      {info && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[0.8125rem] font-semibold text-[#26282c] shadow-sm">{info}</span>}
      <button type="button" onClick={(e) => (e.preventDefault(), setAbout(!about))} aria-label="Harita kaynağı" className={`absolute right-2 ${small ? "top-2" : "bottom-2"} grid size-6 place-items-center rounded-full bg-white/85 text-[0.75rem] font-bold text-[#74777d]`}>i</button>
      {about && <p className={`absolute right-10 ${small ? "top-2" : "bottom-2"} rounded-lg bg-white/90 px-2 py-1 text-[0.6875rem] text-[#74777d]`}>{MAP_ATTR}</p>}
    </div>
  );
}
