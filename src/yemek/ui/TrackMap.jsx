"use client";

import { useEffect, useRef, useState } from "react";
import { OSM, OSM_ATTR, loadLeaflet } from "@/lib/leaflet";

// Takip haritası: restoran (lacivert halka), adres (camgöbeği), kurye (lacivert dolu nokta, canlı). Harita bir kez kurulur,
// kurye değişince yalnız işaret yer değiştirir. Telefonda tek parmak sayfayı kaydırır.
const dot = (L, html) => L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html });
const RING = '<span style="display:block;width:22px;height:22px;border-radius:999px;background:#fff;border:4px solid #0f2c45"></span>';
const HOME = '<span style="display:block;width:22px;height:22px;border-radius:999px;background:#0b7f99;box-shadow:inset 0 0 0 5px #0b7f99,inset 0 0 0 11px #fff"></span>';
const BIKE = '<span style="display:block;width:22px;height:22px;border-radius:999px;background:#0f2c45;border:3px solid #fff;box-shadow:0 0 0 6px rgba(11,127,153,.25)"></span>';

export function TrackMap({ from, to, courier }) {
  const box = useRef(null);
  const map = useRef(null);
  const bike = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = L.map(box.current, { zoomControl: false, attributionControl: true, dragging: !touch, scrollWheelZoom: false, tap: false });
        L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
        const pts = [from, to].filter(Boolean).map((p) => [p.lat, p.lng]);
        if (from) L.marker([from.lat, from.lng], { icon: dot(L, RING) }).addTo(m);
        if (to) L.marker([to.lat, to.lng], { icon: dot(L, HOME) }).addTo(m);
        if (pts.length === 2) L.polyline(pts, { color: "#0b7f99", weight: 4, opacity: 0.7, dashArray: "2 8", lineCap: "round" }).addTo(m);
        if (pts.length > 1) m.fitBounds(pts, { padding: [36, 36], maxZoom: 17 });
        else if (pts.length) m.setView(pts[0], 15);
        map.current = m;
        setReady(true);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      bike.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const L = typeof window !== "undefined" ? window.L : null;
    if (!ready || !L || !map.current) return;
    if (!courier) return void (bike.current?.remove(), (bike.current = null));
    const at = [courier.lat, courier.lng];
    if (bike.current) bike.current.setLatLng(at);
    else bike.current = L.marker(at, { icon: dot(L, BIKE), zIndexOffset: 1000 }).addTo(map.current);
  }, [ready, courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return null;
  return <div ref={box} className="h-64 w-full overflow-hidden rounded-[1.25rem] border border-line bg-line" />;
}
