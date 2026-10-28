"use client";

import { useEffect, useRef, useState } from "react";
import { DARK, DARK_ATTR, loadLeaflet } from "@/lib/leaflet";

// Nokta haritası (Seyhun 2026-10-28 "Evet, böyle yap": yan yana koylarda hava farklı, hangi noktaya bakıldığı görünsün).
// Mavi nokta seçilen yer, kesikli kare tahminin hesaplandığı model hücresi (~9 km), beyaz nokta ölçüm istasyonu.
// Haritaya dokununca onPick({ lat, lon }); telefonda tek parmak sayfayı kaydırır (harita sürüklenmez), dokunuş yine nokta seçer.
const dot = (L, bg, size, ring) =>
  L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:100%;height:100%;border-radius:999px;background:${bg};box-shadow:0 0 0 ${ring}px ${bg === "#fff" ? "#1b2a3d" : "#fff"},0 2px 6px rgba(0,0,0,.4)"></span>`,
  });
const CELL = 0.04; // model hücresinin yarısı (derece, ~4,5 km)

export function PointMap({ place, model, station, onPick }) {
  const box = useRef(null);
  const map = useRef(null);
  const pick = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = L.map(box.current, { zoomControl: false, attributionControl: true, dragging: !touch, scrollWheelZoom: false, tap: false });
        m.attributionControl.setPrefix(false);
        L.tileLayer(DARK, { maxZoom: 16, attribution: DARK_ATTR }).addTo(m);
        m.on("click", (e) => pick.current?.({ lat: +e.latlng.lat.toFixed(4), lon: +e.latlng.lng.toFixed(4) }));
        map.current = m;
        setReady(true);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const key = `${place?.lat},${place?.lon},${model?.lat},${model?.lon},${station?.lat},${station?.lon}`;
  useEffect(() => {
    const m = map.current;
    const L = typeof window !== "undefined" ? window.L : null;
    if (!m || !L || place?.lat == null) return;
    const layer = L.layerGroup().addTo(m);
    const pts = [[place.lat, place.lon]];
    if (model?.lat != null) {
      const dl = CELL / Math.cos((model.lat * Math.PI) / 180);
      const b = [[model.lat - CELL, model.lon - dl], [model.lat + CELL, model.lon + dl]];
      L.rectangle(b, { color: "#fff", weight: 1.2, opacity: 0.75, dashArray: "4 3", fillColor: "#fff", fillOpacity: 0.04, interactive: false }).addTo(layer);
      pts.push(...b);
    }
    if (station?.lat != null) {
      L.marker([station.lat, station.lon], { icon: dot(L, "#fff", 12, 3), interactive: false, keyboard: false }).addTo(layer);
      pts.push([station.lat, station.lon]);
    }
    L.marker([place.lat, place.lon], { icon: dot(L, "#0ea5c4", 18, 3), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(layer);
    m.fitBounds(pts, { padding: [22, 22], maxZoom: 12 });
    return () => layer.remove();
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return null;
  return <div ref={box} aria-label="Nokta haritası" className="isolate h-48 w-full overflow-hidden rounded-[0.875rem] bg-[#1b2a3d]" />;
}

// Dokunulan noktanın adı (OpenStreetMap): köy / mahalle / ilçe; bulunamazsa "Seçilen nokta"
export async function pointName({ lat, lon }) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=tr&lat=${lat}&lon=${lon}`);
    const j = r.ok ? await r.json() : null;
    const a = j?.address || {};
    const name = a.village || a.suburb || a.neighbourhood || a.town || a.hamlet || a.city_district || a.county || a.city || "";
    return { name: name || "Seçilen nokta", region: a.province || a.state || "" };
  } catch {
    return { name: "Seçilen nokta", region: "" };
  }
}
