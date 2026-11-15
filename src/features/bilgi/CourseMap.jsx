"use client";

import { useEffect, useRef, useState } from "react";
import { project } from "@/lib/bilgi";
import { dist } from "@/lib/raceCourse";
import { MAP_STYLE, loadMapLibre } from "@/lib/maplibre";

// Sade parkur haritası (Seyhun 2026-11-15, örnek "Rüzgâr ve parkur"): kara, yol yok; yalnız ızgara, ölçek, şamandıralar, start hattı,
// teknenin kendisi (yönüyle) ve son 10 dk izi. Parkur varsa rüzgâr hep yukarıdan (parkur ekseni), yoksa kuzey yukarı ve tekne ortada.
// Bilgi ekranında ve Yönet › Parkur önizlemesinde aynı bileşen. boats: Yönet'te diğer tekneler (yelken no ile).
const STEPS = [50, 100, 200, 250, 500, 1000, 2000, 5000];

function useSize() {
  const ref = useRef(null);
  const [s, setS] = useState({ w: 300, h: 300 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 10 && height > 10) setS({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s];
}

// Gerçek harita zemini (Seyhun 2026-11-15: "konum var ama harita yok, karada da denizde de yerimi göreyim"). Yönet › Tekneler'deki
// MapLibre + OpenFreeMap (anahtarsız); dokunulmaz, yalnız arka plan. Çizimler SVG'de kalır: merkez, ölçek ve dönüş (rüzgâr yukarı)
// buradaki kameraya aynen verilir, yerel izdüşüm Mercator ile birkaç km'de piksel altı örtüşür. Karo yüklenemezse (denizde
// internet yok) zemin düz renk kalır, konum yine çizilir. Gece: aynı karo ters çevrilip lacivertleştirilir (CSS).
function zoomOf(lat, scale) {
  return Math.log2((40075016.686 * Math.cos((lat * Math.PI) / 180) * scale) / 512);
}
function MapBase({ c, scale, up, w, h, onReady }) {
  const box = useRef(null);
  const map = useRef(null);
  const [ok, setOk] = useState(false);
  const z = zoomOf(c.lat, scale);
  useEffect(() => {
    let live = true;
    loadMapLibre()
      .then((lib) => {
        if (!live || !box.current) return;
        const m = new lib.Map({ container: box.current, style: MAP_STYLE, center: [26.889, 39.071], zoom: 12, interactive: false, attributionControl: false, fadeDuration: 0 });
        map.current = m;
        m.on("load", () => {
          if (!live) return;
          setOk(true);
          onReady?.(true);
        });
      })
      .catch(() => {});
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ok || !Number.isFinite(z)) return;
    m.resize();
    m.jumpTo({ center: [c.lon, c.lat], zoom: z, bearing: up });
  }, [c.lat, c.lon, z, up, w, h, ok]);
  return <div ref={box} className={`bzm-base${ok ? " on" : ""}`} aria-hidden="true" />;
}

export function CourseMap({ course, me = null, head = null, trail = [], boats = [], className = "", note = "" }) {
  const [ref, { w, h }] = useSize();
  const [tiles, setTiles] = useState(false);
  const marks = course?.has ? course.pts : [];
  const up = course?.has ? course.up || 0 : 0;
  const base = marks.length ? marks : me ? [me] : boats.filter((b) => Number.isFinite(b.lat));
  // Parkur uzaktaysa (hakem botu başka yerde girilmiş) sporcu yine haritada; altta parkura uzaklık yazılır
  const c1 = marks.length ? { lat: marks.reduce((a, p) => a + p.lat, 0) / marks.length, lon: marks.reduce((a, p) => a + p.lon, 0) / marks.length } : null;
  const far = me && c1 ? dist(c1, me) : 0;
  const farTxt = far > 2000 ? `Parkura ${(far / 1000).toFixed(1).replace(".", ",")} km` : "";
  const msg = note || farTxt ? <div className="bzm-note">{note || farTxt}</div> : null;
  if (!base.length)
    return (
      <div ref={ref} className={`bzm ${className}`}>
        {msg}
      </div>
    );
  // Merkez: parkurun ortası (ya da tekne). Tekne her zaman sığdırılır (Seyhun 2026-11-15 iPhone'da konum vardı ama parkur
  // 5 km'den uzakta girildiği için tekne ekran dışında kalıyordu); 5 km'den uzaksa merkez tekne ile parkurun ortası olur.
  const fit = [...base];
  if (me && marks.length) fit.push(me);
  const cs = me && marks.length && far > 5000 ? [c1, me] : base;
  const c0 = { lat: cs.reduce((a, p) => a + p.lat, 0) / cs.length, lon: cs.reduce((a, p) => a + p.lon, 0) / cs.length };
  if (!marks.length) fit.push(...trail);
  const P = fit.map((p) => project(p, c0, up));
  const pad = 28;
  const ax = Math.max(200, ...P.map((p) => Math.abs(p.x) * 2));
  const ay = Math.max(200, ...P.map((p) => Math.abs(p.y) * 2));
  const scale = Math.min((w - pad * 2) / ax, (h - pad * 2) / ay);
  const xy = (p) => {
    const q = project(p, c0, up);
    return [w / 2 + q.x * scale, h / 2 + q.y * scale];
  };
  const step = STEPS.find((m) => m * scale > w / 5) || 5000;
  const grid = [];
  for (let x = (w / 2) % (step * scale); x < w; x += step * scale) grid.push(`M${x.toFixed(1)} 0V${h}`);
  for (let y = (h / 2) % (step * scale); y < h; y += step * scale) grid.push(`M0 ${y.toFixed(1)}H${w}`);
  const kom = marks.find((m) => m.kind === "komite");
  const pin = marks.find((m) => m.kind === "pin");
  const tr =
    trail.length > 1
      ? trail
          .map(
            (p, i) =>
              `${i ? "L" : "M"}${xy(p)
                .map((v) => v.toFixed(1))
                .join(" ")}`,
          )
          .join("")
      : "";
  return (
    <div ref={ref} className={`bzm ${className}`}>
      <MapBase c={c0} scale={scale} up={up} w={w} h={h} onReady={setTiles} />
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-label="Parkur haritası">
        {!tiles && <path d={grid.join("")} className="bzm-grid" />}
        {tiles && (
          <text x="8" y={h - 8} className="bzm-at">
            © OpenStreetMap
          </text>
        )}
        {kom && pin && <line x1={xy(kom)[0]} y1={xy(kom)[1]} x2={xy(pin)[0]} y2={xy(pin)[1]} className="bzm-line" />}
        {kom && <rect x={xy(kom)[0] - 6} y={xy(kom)[1] - 6} width="12" height="12" rx="2" className="bzm-kom" />}
        {pin && <circle cx={xy(pin)[0]} cy={xy(pin)[1]} r="4.5" className="bzm-kom" />}
        {marks
          .filter((m) => m.kind === "mark")
          .map((m) => {
            const [x, y] = xy(m);
            return (
              <g key={m.k}>
                <circle cx={x} cy={y} r="7" className="bzm-mark" />
                <text x={x} y={y - 11} className="bzm-n">
                  {m.n}
                </text>
              </g>
            );
          })}
        {tr && <path d={tr} className="bzm-trail" />}
        {boats
          .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon))
          .map((b) => {
            const [x, y] = xy(b);
            return (
              <g key={b.id} className={b.old ? "bzm-old" : ""}>
                <circle cx={x} cy={y} r="5" className="bzm-boat" />
                <text x={x + 8} y={y - 6} className="bzm-bn">
                  {b.sail || b.name}
                </text>
              </g>
            );
          })}
        {me &&
          (() => {
            const [x, y] = xy(me);
            return head == null ? (
              <circle cx={x} cy={y} r="6" className="bzm-me" />
            ) : (
              <path d="M0 -12 L7.5 9 L0 4.5 L-7.5 9 Z" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(head - up).toFixed(0)})`} className="bzm-me" />
            );
          })()}
        <text x={w - 8} y={h - 8} className="bzm-sc">
          {step >= 1000 ? `${step / 1000} km` : `${step} m`}
        </text>
      </svg>
      {msg}
    </div>
  );
}
