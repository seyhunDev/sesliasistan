"use client";

// Tekne animasyonu (Seyhun 2026-11-03, tasarım project-files/tekne-animasyon/f1–f3.png): veri setinden (lib/boatPlay.js) teknelerin yeri,
// ilerleme yönüne dönen burun, rüzgâr açısına göre açılan yelken, yelken numarası, arkada grup renginde kısa iz. Kamera sabit:
// start hattı ve klipteki bütün konumlar ekrana sığar, parkur ekseni (rüzgâr) yukarıda. Yalnız seçili grubun tekneleri.
import { useEffect, useMemo, useRef, useState } from "react";
import { boomOf, clockText, frameOf, groupSet, poseAt, spanOf, tracksOf } from "@/lib/boatPlay";
import { groupColor } from "@/lib/roundScore";
import "./boatRace.css";

// ekranın oranına göre çizim alanı: yatayda 1600 birim, dar (telefon dik) ekranda 900 birim ve tekneler/yazılar büyür
const sizeOf = (w, h) => {
  const W = w && h && w / h < 1.2 ? 900 : 1600;
  return { W, H: Math.round(W * (h && w ? h / w : 9 / 16)) };
};
const TRAIL = 4000; // arkadaki iz (ms)
const PAUSE = 2500; // klip bitince bekleme, sonra baştan

// rasgele ama her çizimde aynı yağmur/dalga çizgileri
const RAIN = Array.from({ length: 160 }, (_, i) => [(i * 137.5) % 1600, (i * 89.3) % 2000]);

function Boat({ x, y, hdg, wind, up, col, sail, s = 1.6, label = true }) {
  const rot = hdg - up;
  const { b, side, luff } = boomOf(hdg, wind);
  const rad = (b * Math.PI) / 180;
  const L = 24;
  const bx = side * Math.sin(rad) * L;
  const by = -6 + Math.cos(rad) * L;
  const mx = 0;
  const my = -6;
  const dl = Math.hypot(bx - mx, by - my) || 1;
  let nx = -(by - my) / dl;
  let ny = (bx - mx) / dl;
  if (nx * side - ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = luff ? 6 : 17;
  const qx = (mx + bx) / 2 + nx * k;
  const qy = (my + by) / 2 + ny * k;
  return (
    <>
      <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s})`}>
        <ellipse cx="2" cy="4" rx="10" ry="21" fill="rgba(0,0,0,.25)" />
        <path d="M0 -21 C8 -13 10 3 8 19 Q0 22 -8 19 C-10 3 -8 -13 0 -21Z" fill="#fbfdff" />
        <path d="M0 -15 C5 -9 6.5 3 5 15 Q0 17 -5 15 C-6.5 3 -5 -9 0 -15Z" fill="#e6edf4" />
        <path d={`M${mx} ${my} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} L${mx} ${my}Z`} fill={col} fillOpacity=".92" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1={mx} y1={my} x2={bx.toFixed(1)} y2={by.toFixed(1)} stroke="#1d2b3a" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx={mx} cy={my} r="2.2" fill="#1d2b3a" />
      </g>
      {label ? (
        <g transform={`translate(${x.toFixed(1)},${(y - 30 * s).toFixed(1)}) scale(${(s / 1.6).toFixed(2)})`}>
          <rect x="-24" y="-13" width="48" height="22" rx="7" fill="rgba(6,24,43,.72)" stroke={col} strokeOpacity=".9" />
          <text x="0" y="3.5" textAnchor="middle" className="br-sail">
            {sail}
          </text>
        </g>
      ) : null}
    </>
  );
}

function Committee({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="22" rx="20" ry="6" fill="rgba(0,0,0,.25)" />
      <path d="M0 -26 C12 -14 14 6 12 22 L-12 22 C-14 6 -12 -14 0 -26Z" fill="#fff" />
      <rect x="-6" y="-2" width="12" height="12" rx="2" fill="#cdd6df" />
      <line x1="0" y1="-26" x2="0" y2="-62" stroke="#fff" strokeWidth="2" />
      <path d="M0 -62 L24 -55 L0 -48Z" fill="#ff7a1a" />
    </g>
  );
}
function Pin({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="10" rx="12" ry="4" fill="rgba(0,0,0,.25)" />
      <circle r="10" fill="#ff7a1a" />
      <circle cx="-3" cy="-3" r="3" fill="#ffb27a" />
    </g>
  );
}

// set: cleanSet; grp: gösterilen grup ("" = hepsi); loop: bitince baştan
// bare: yayının içinde (canlı ekranın kendi rüzgâr ve sayaç şeridi var): rüzgâr, şamandıra yazısı ve alttaki sayaç yerine üstte "CANLI KONUM" rozeti
export function BoatRace({ set, grp = "", loop = true, bare = false, tag = "CANLI KONUM" }) {
  const box = useRef(null);
  const [size, setSize] = useState(() => sizeOf(0, 0));
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setSize(sizeOf(el.clientWidth, el.clientHeight));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { W, H } = size;
  const s = W < 1600 ? 2.2 : 1.6;
  const view = useMemo(() => groupSet(set, grp), [set, grp]);
  const tracks = useMemo(() => tracksOf(view), [view]);
  const { t0, t1 } = useMemo(() => spanOf(view), [view]);
  const up = set.wind.dir;
  // kamera: start hattı + gruptaki bütün konumlar (şamandıra uzaksa kenarda okla gösterilir)
  const frame = useMemo(() => frameOf([set.marks.pin, set.marks.komite, ...view.fixes].filter(Boolean), { W, H, up, pad: W < 1600 ? 50 : 170 }), [set, view, up, W, H]);
  const [t, setT] = useState(t0);
  const raf = useRef(0);
  useEffect(() => {
    let begin = 0;
    const tick = (now) => {
      if (!begin) begin = now;
      const e = now - begin;
      const len = t1 - t0;
      if (e > len + PAUSE) {
        if (!loop) return setT(t1);
        begin = now;
      }
      setT(t0 + Math.min(e, len));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [t0, t1, loop]);

  if (!frame) return <div className="br" ref={box} />;
  const P = (p) => frame.at(p);
  const pin = set.marks.pin && P(set.marks.pin);
  const kom = set.marks.komite && P(set.marks.komite);
  const m1 = set.marks.m1 && P(set.marks.m1);
  const m1Off = m1 && (m1.y < 0 || m1.y > H || m1.x < 0 || m1.x > W);
  const m1Dist = m1Off && pin && kom ? Math.round(frame.m * Math.hypot(m1.x - (pin.x + kom.x) / 2, m1.y - (pin.y + kom.y) / 2)) : 0;
  const ck = clockText(t);
  const who = Object.fromEntries(view.boats.map((b) => [b.sail, b]));
  const rows = [...tracks.entries()]
    .map(([sail, list]) => {
      const p = poseAt(list, t);
      if (!p) return null;
      const q = P(p);
      const trail = list.filter((f) => f.t <= t && f.t >= t - TRAIL).map(P);
      return { sail, ...q, hdg: p.hdg, col: groupColor(who[sail]?.grp) || "#fff", trail: [...trail, q] };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  return (
    <div className="br" ref={box}>
      <svg className="br-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-label="Tekneler">
        {RAIN.map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 12} stroke="rgba(255,255,255,.07)" strokeWidth="1.4" />
        ))}
        {pin && kom ? (
          <>
            <line x1={pin.x} y1={pin.y} x2={kom.x} y2={kom.y} stroke={`rgba(255,255,255,${t < 0 ? 0.75 : 0.35})`} strokeWidth="2.5" strokeDasharray="10 8" />
            <Pin x={pin.x} y={pin.y} />
            <Committee x={kom.x + 10} y={kom.y} />
          </>
        ) : null}
        {m1 && !m1Off ? (
          <g transform={`translate(${m1.x},${m1.y})`}>
            <path d="M-12 12 L-11 -8 Q0 -18 11 -8 L12 12 Z" fill="#f5c518" />
            <text x="0" y="-26" textAnchor="middle" className="br-mk">
              1
            </text>
          </g>
        ) : null}
        {rows.map((r) => (r.trail.length > 1 ? <polyline key={`t${r.sail}`} points={r.trail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={r.col} strokeOpacity=".45" strokeWidth={2.5 * (s / 1.6)} strokeLinecap="round" strokeLinejoin="round" /> : null))}
        {rows.map((r) => (
          <Boat key={r.sail} x={r.x} y={r.y} hdg={r.hdg} wind={set.wind.dir} up={up} col={r.col} sail={r.sail} s={s} />
        ))}
      </svg>
      {bare ? (
        <div className="br-live">
          <b>{tag}</b>
          <span>{`${ck.label === "SÜRE" ? "START +" : "START'A "}${ck.n}`}</span>
        </div>
      ) : (
        <>
      <div className="br-wind">
        <svg width="34" height="60" viewBox="0 0 34 60" aria-hidden="true">
          <path d="M17 4v44M7 38l10 14 10-14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <b>{`${set.wind.dir}° · ${set.wind.kn} kn`}</b>
          <span>Rüzgâr</span>
        </div>
      </div>
      {m1Dist ? <div className="br-m1">{`1. şamandıra ↑ ${m1Dist} m`}</div> : null}
      <div className="br-clock">
        <div>{ck.label}</div>
        <div className="n">{ck.n}</div>
      </div>
        </>
      )}
    </div>
  );
}
