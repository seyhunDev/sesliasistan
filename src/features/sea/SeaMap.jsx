"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_ATTR, MAP_STYLE, loadMapLibre } from "@/lib/maplibre";
import { SEA_CENTER, SG_POST, shipLine } from "@/lib/sea";

// Deniz trafiği haritası (Velora Yemek takip haritasıyla aynı MapLibre): seyirdeki gemi yönüne dönmüş ok, demirdeki halka,
// limandaki kare, Sahil Güvenlik beyaz "SG", telefonun konumu (Teknem) camgöbeği nokta. Harita bir kez kurulur; her
// yenilemede yalnız işaretler yerinde güncellenir (karo yeniden inmez). Gemiye dokununca adı ve durumu üstte yazar.
const ACC = "#0b7f99", MUT = "#5f646b", WARN = "#a8742a", DEEP = "#0f2c45";
const ARROW = (c) => `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L18 20 L12 16 L6 20Z" fill="${c}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

function shipHtml(s) {
  const k = s.state.key;
  if (s.guard) return { html: `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:#fff;border:2px solid ${DEEP};color:${DEEP};font:700 10px system-ui">SG</span>`, rot: 0 };
  const c = s.state.warn ? WARN : ACC;
  if (["approach", "leave", "underway", "fishing"].includes(k)) return { html: ARROW(c), rot: s.cog ?? 0 };
  if (k === "moored") return { html: `<span style="display:block;width:10px;height:10px;background:${MUT};border:1.5px solid #fff"></span>`, rot: 0 };
  const ring = k === "ready" ? ACC : s.state.warn ? WARN : MUT;
  return { html: `<span style="display:block;width:12px;height:12px;border-radius:999px;border:2.5px solid ${ring};background:#fff"></span>`, rot: 0 };
}

const NOOP = () => {};

// small: ana sayfadaki küçük harita (dokunulmaz, kartın bağlantısı Deniz trafiği sayfasını açar)
export function SeaMap({ ships = [], me, focus, pick, onPick = NOOP, small = false }) {
  const box = useRef(null);
  const map = useRef(null);
  const marks = useRef(new Map());
  const meMark = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    let live = true;
    const all = marks.current;
    loadMapLibre()
      .then((ml) => {
        if (!live || !box.current) return;
        const touch = window.matchMedia?.("(pointer: coarse)").matches;
        const m = new ml.Map({
          container: box.current, style: MAP_STYLE, center: [SEA_CENTER.lon, SEA_CENTER.lat], zoom: small ? 9.9 : 10.6, interactive: !small,
          attributionControl: false, dragPan: !touch, dragRotate: false, touchPitch: false, pitchWithRotate: false, scrollZoom: false,
        });
        m.touchZoomRotate?.disableRotation();
        const sg = document.createElement("div");
        sg.innerHTML = `<span style="display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:${DEEP};color:#fff;font:700 10px system-ui">SG</span>`;
        sg.title = SG_POST.name;
        new ml.Marker({ element: sg }).setLngLat([SG_POST.lon, SG_POST.lat]).addTo(m);
        m.on("load", () => live && (map.current = m, setReady(true)));
        m.on("error", () => {});
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      all.clear();
      meMark.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gemiler: var olan işaret yerinde güncellenir, kaybolan silinir
  useEffect(() => {
    const m = map.current, ml = window.maplibregl;
    if (!ready || !m || !ml) return;
    const seen = new Set();
    for (const s of ships) {
      seen.add(s.m);
      const { html, rot } = shipHtml(s);
      let it = marks.current.get(s.m);
      if (!it) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", s.n);
        el.style.cssText = "background:none;border:0;padding:4px;cursor:pointer";
        const mk = new ml.Marker({ element: el, rotationAlignment: "map" }).setLngLat([s.lon, s.lat]).addTo(m);
        it = { el, mk, html: "" };
        marks.current.set(s.m, it);
      }
      moveMark(it, s, html, rot, onPick);
    }
    for (const [k, it] of marks.current) if (!seen.has(k)) (it.mk.remove(), marks.current.delete(k));
  }, [ready, ships, onPick]);

  // Teknem (telefonun konumu)
  useEffect(() => {
    const m = map.current, ml = window.maplibregl;
    if (!ready || !m || !ml || !me) return;
    if (!meMark.current) {
      const d = document.createElement("div");
      d.style.cssText = `width:18px;height:18px;border-radius:999px;background:#0ea5c4;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,44,69,.4)`;
      meMark.current = new ml.Marker({ element: d }).setLngLat([me.lon, me.lat]).addTo(m);
    } else meMark.current.setLngLat([me.lon, me.lat]);
  }, [ready, me?.lat, me?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dışarıdan odak (listede satıra ya da Teknem'e dokununca)
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !focus) return;
    m.easeTo({ center: [focus.lon, focus.lat], zoom: Math.max(m.getZoom(), 13), duration: 800 });
  }, [ready, focus]);

  if (err) return null;
  const sel = pick && ships.find((s) => s.m === pick);
  return (
    <div className="relative">
      <div ref={box} className={small ? "pointer-events-none h-[9.5rem] w-full overflow-hidden bg-[#e6ecef]" : "h-72 w-full overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#e6ecef]"} />
      {sel && (
        <button type="button" onClick={() => onPick(null)} className="absolute left-3 right-3 top-3 truncate rounded-full bg-white/95 px-3 py-1.5 text-left text-[0.8125rem] font-semibold text-[#26282c] shadow-sm">
          {sel.n} · {sel.state.label} · {shipLine(sel)}
        </button>
      )}
      <button type="button" onClick={(e) => (e.preventDefault(), setAbout(!about))} aria-label="Harita kaynağı" className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-white/85 text-[0.75rem] font-bold text-[#74777d]">i</button>
      {about && <p className="absolute bottom-2 right-10 rounded-lg bg-white/90 px-2 py-1 text-[0.6875rem] text-[#74777d]">{MAP_ATTR} · AIS: aisstream.io</p>}
    </div>
  );
}

// İşareti günceller: konum kayarak (1 sn), görünüş değiştiyse yeniden çizilir
function moveMark(it, s, html, rot, setPick) {
  if (it.html !== html) {
    it.el.innerHTML = html;
    it.html = html;
  }
  it.el.onclick = (e) => (e.stopPropagation(), setPick(s.m));
  it.mk.setRotation(rot || 0);
  const a = it.mk.getLngLat();
  if (Math.abs(a.lng - s.lon) < 1e-6 && Math.abs(a.lat - s.lat) < 1e-6) return;
  const t0 = performance.now();
  cancelAnimationFrame(it.raf);
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1000), e = k * (2 - k);
    it.mk.setLngLat([a.lng + (s.lon - a.lng) * e, a.lat + (s.lat - a.lat) * e]);
    if (k < 1) it.raf = requestAnimationFrame(step);
  };
  it.raf = requestAnimationFrame(step);
}
