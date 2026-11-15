"use client";

import { useEffect, useRef, useState } from "react";
import { project } from "@/lib/bilgi";
import { dist } from "@/lib/raceCourse";

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

export function CourseMap({ course, me = null, head = null, trail = [], boats = [], className = "" }) {
  const [ref, { w, h }] = useSize();
  const marks = course?.has ? course.pts : [];
  const up = course?.has ? course.up || 0 : 0;
  const base = marks.length ? marks : me ? [me] : boats.filter((b) => Number.isFinite(b.lat));
  if (!base.length) return <div ref={ref} className={`bzm ${className}`} />;
  // Merkez: parkurun ortası (ya da tekne); tekne parkura 5 km'den yakınsa sığdırılır
  const c0 = { lat: base.reduce((a, p) => a + p.lat, 0) / base.length, lon: base.reduce((a, p) => a + p.lon, 0) / base.length };
  const fit = [...base];
  if (me && marks.length && dist(c0, me) < 5000) fit.push(me);
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
  for (let x = w / 2 % (step * scale); x < w; x += step * scale) grid.push(`M${x.toFixed(1)} 0V${h}`);
  for (let y = h / 2 % (step * scale); y < h; y += step * scale) grid.push(`M0 ${y.toFixed(1)}H${w}`);
  const kom = marks.find((m) => m.kind === "komite");
  const pin = marks.find((m) => m.kind === "pin");
  const tr = trail.length > 1 ? trail.map((p, i) => `${i ? "L" : "M"}${xy(p).map((v) => v.toFixed(1)).join(" ")}`).join("") : "";
  return (
    <div ref={ref} className={`bzm ${className}`}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-label="Parkur haritası">
        <path d={grid.join("")} className="bzm-grid" />
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
            if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return null;
            return head == null ? <circle cx={x} cy={y} r="6" className="bzm-me" /> : <path d="M0 -12 L7.5 9 L0 4.5 L-7.5 9 Z" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(head - up).toFixed(0)})`} className="bzm-me" />;
          })()}
        <text x={w - 8} y={h - 8} className="bzm-sc">
          {step >= 1000 ? `${step / 1000} km` : `${step} m`}
        </text>
      </svg>
    </div>
  );
}
