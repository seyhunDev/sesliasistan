"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_ATTR, MAP_STYLE, loadMapLibre } from "@/lib/maplibre";

// Yönetim › Kuryeler: kuryelerin yeri (müsait camgöbeği, siparişte lacivert) ve restoranlar (küçük gri nokta)
const dot = (c) => {
  const d = document.createElement("div");
  d.textContent = c.name.slice(0, 1).toLocaleUpperCase("tr");
  Object.assign(d.style, { width: "30px", height: "30px", borderRadius: "999px", border: "3px solid #fff", display: "grid", placeItems: "center", color: "#fff", font: "700 13px system-ui", background: c.busy ? "#0f2c45" : "#0b7f99", boxShadow: "0 3px 8px rgba(15,44,69,.35)" });
  return d;
};
const placeDot = () => {
  const d = document.createElement("div");
  Object.assign(d.style, { width: "10px", height: "10px", borderRadius: "999px", border: "2px solid #fff", background: "#74777d" });
  return d;
};

export function CourierMap({ couriers, places }) {
  const box = useRef(null);
  const map = useRef(null);
  const marks = useRef([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    let live = true;
    loadMapLibre()
      .then((ml) => {
        if (!live || !box.current) return;
        const m = new ml.Map({ container: box.current, style: MAP_STYLE, center: [26.8885, 39.0718], zoom: 14, attributionControl: false, dragRotate: false, touchPitch: false, pitchWithRotate: false, scrollZoom: false });
        m.touchZoomRotate?.disableRotation();
        places.forEach((p) => new ml.Marker({ element: placeDot() }).setLngLat([p.pos.lng, p.pos.lat]).addTo(m));
        m.on("error", () => {});
        map.current = m;
        setReady(true);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const key = couriers.map((c) => `${c.id}:${c.busy}:${c.pos?.lat},${c.pos?.lng}`).join("|");
  useEffect(() => {
    const m = map.current, ml = window.maplibregl;
    if (!ready || !m || !ml) return;
    marks.current.forEach((k) => k.remove());
    const at = couriers.filter((c) => c.pos);
    marks.current = at.map((c) => new ml.Marker({ element: dot(c) }).setLngLat([c.pos.lng, c.pos.lat]).addTo(m));
    if (at.length > 1) {
      const b = at.reduce((acc, c) => acc.extend([c.pos.lng, c.pos.lat]), new ml.LngLatBounds([at[0].pos.lng, at[0].pos.lat], [at[0].pos.lng, at[0].pos.lat]));
      m.fitBounds(b, { padding: 40, maxZoom: 16, duration: 0 });
    } else if (at.length) m.jumpTo({ center: [at[0].pos.lng, at[0].pos.lat], zoom: 15 });
  }, [ready, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return null;
  return (
    <div className="relative">
      <div ref={box} className="h-56 w-full overflow-hidden rounded-[1.25rem] border border-line bg-[#eef0ea]" />
      <button type="button" onClick={() => setAbout(!about)} aria-label="Harita kaynağı" className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-white/85 text-[0.75rem] font-bold text-[#74777d]">i</button>
      {about && <p className="absolute bottom-2 right-10 rounded-lg bg-white/90 px-2 py-1 text-[0.6875rem] text-[#74777d]">{MAP_ATTR}</p>}
    </div>
  );
}
