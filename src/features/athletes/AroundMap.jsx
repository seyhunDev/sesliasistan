"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { KINDS, linePoints, placeLink } from "./raceAround";
import { OSM, OSM_ATTR, loadLeaflet } from "@/lib/leaflet";

const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pin = (L, tone, letter, big) =>
  L.divIcon({
    className: "",
    iconSize: big ? [30, 30] : [24, 24],
    iconAnchor: big ? [15, 15] : [12, 12],
    popupAnchor: [0, big ? -14 : -11],
    html: `<span style="display:grid;place-items:center;width:100%;height:100%;border-radius:999px;background:${tone};color:#fff;font:700 ${big ? 13 : 11}px/1 system-ui;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.35)">${letter}</span>`,
  });

// Harita: yarış alanı (Y), otel (O), aradaki yol, yerler. focus: listede dokunulan yerin kimliği.
// Telefonda tek parmak sayfayı kaydırır (harita yakalamaz); büyütünce harita tek parmakla da kaydırılır.
export function AroundMap({ a, places, focus }) {
  const box = useRef(null);
  const map = useRef(null);
  const marks = useRef(new Map());
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = L.map(box.current, { zoomControl: true, attributionControl: true, dragging: !touch, scrollWheelZoom: false, tap: false });
        L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
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

  // İşaretler (yerler değişince yeniden çizilir)
  const key = `${a.venue.lat},${a.hotel?.lat},${places.map((p) => p.id).join()}`;
  useEffect(() => {
    const m = map.current;
    const L = typeof window !== "undefined" ? window.L : null;
    if (!m || !L) return;
    const layer = L.layerGroup().addTo(m);
    marks.current = new Map();
    const pts = [];
    const add = (p, icon, html, id) => {
      const mk = L.marker([p.lat, p.lon], { icon }).bindPopup(html).addTo(layer);
      if (id) marks.current.set(id, mk);
      pts.push([p.lat, p.lon]);
    };
    if (a.route?.line?.length > 3) L.polyline(linePoints(a.route.line), { color: "#0f766e", weight: 4, opacity: 0.8 }).addTo(layer);
    for (const p of places) {
      const k = KINDS[p.kind];
      add(p, pin(L, k.tone, k.letter), `<b>${esc(p.name)}</b><br>${esc(p.sub || k.label)}<br><a href="${placeLink(p)}" target="_blank" rel="noreferrer">Haritada aç</a>`, p.id);
    }
    if (a.hotel) add(a.hotel, pin(L, "#2563eb", "O", true), `<b>Otel</b><br>${esc(a.hotel.q)}`, "hotel");
    add(a.venue, pin(L, "#0f766e", "Y", true), `<b>Yarış alanı</b><br>${esc(a.venue.q)}`, "venue");
    if (pts.length > 1) m.fitBounds(pts, { padding: [28, 28], maxZoom: 16 });
    else m.setView(pts[0], 15);
    return () => layer.remove();
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mk = focus && marks.current.get(focus);
    if (!mk || !map.current) return;
    map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 16));
    mk.openPopup();
  }, [focus]);

  // Büyüt/küçült: tam ekranda tek parmakla kaydırma açılır
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (full || !touch) m.dragging.enable();
    else m.dragging.disable();
    setTimeout(() => m.invalidateSize(), 60);
  }, [full, ready]);

  if (err)
    return (
      <div className="grid h-24 place-items-center rounded-2xl bg-bg px-4 text-center text-[0.8125rem] text-mut">Harita yüklenemedi. Liste aşağıda; yerlere dokununca harita uygulaması açılır.</div>
    );
  return (
    <div className={full ? "fixed inset-0 isolate z-[60] bg-bg pt-[env(safe-area-inset-top)]" : "relative isolate"}>
      <div ref={box} className={`${full ? "h-full" : "h-72 rounded-2xl"} w-full overflow-hidden bg-line/40`} />
      <button
        type="button"
        onClick={() => setFull((f) => !f)}
        aria-label={full ? "Haritayı küçült" : "Haritayı büyüt"}
        className={`absolute right-2.5 z-[500] grid size-9 place-items-center rounded-full bg-card text-fg shadow ${full ? "top-[calc(0.75rem+env(safe-area-inset-top))]" : "top-2.5"}`}
      >
        <Icon name={full ? "x" : "scan"} className="size-[1.125rem]" />
      </button>
    </div>
  );
}
