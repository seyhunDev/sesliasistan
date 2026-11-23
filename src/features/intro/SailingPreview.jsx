"use client";

import { useCallback, useRef } from "react";
import { CB, HULL, LOOP, MARK, PIN, ROUTES, VIEW, frame, stepAt } from "./sailScene";
import { useLoop } from "./useLoop";

// Velora Sailing kutusunun animasyonu (örnek A "açık deniz"): start → tramola → şamandıra; sol üstte o anki adım.
// Tekneler ref ile yerinde güncellenir (React yeniden çizmez); hareketi azalt açıksa tramola anında durur.
export function SailingPreview() {
  const box = useRef(null);
  const boats = useRef([]);
  const booms = useRef([]);
  const step = useRef(null);
  const tick = useCallback((t) => {
    frame(t).forEach((b, i) => {
      const g = boats.current[i];
      if (!g) return;
      g.setAttribute("transform", `translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${b.h.toFixed(1)})`);
      g.setAttribute("opacity", b.o.toFixed(2));
      booms.current[i]?.setAttribute("transform", `translate(0,-6) rotate(${b.boom.toFixed(1)}) translate(0,6)`);
    });
    const s = stepAt(t);
    const n = step.current;
    if (n && n.textContent !== s) {
      n.textContent = s;
      n.style.opacity = s ? "1" : "0";
    }
  }, []);
  useLoop(box, LOOP, tick, 4.2);
  return (
    <div ref={box} className="it-sea">
      <svg viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${-20 + i * 70},${30 + (i % 3) * 55} q12,-5 24,0 t24,0`} className="it-wave" />
        ))}
        <path d={`M${MARK.x},${MARK.y} l-150,150 M${MARK.x},${MARK.y} l150,150`} className="it-lay" />
        <line x1={PIN.x} y1={PIN.y} x2={CB.x} y2={CB.y} className="it-line" />
        <circle cx={PIN.x} cy={PIN.y} r="3.2" className="it-buoy" />
        <g transform={`translate(${CB.x + 8},${CB.y + 4})`}>
          <path d="M0,-13 C4,-10 5,-5 5,0 L5,10 L-5,10 L-5,0 C-5,-5 -4,-10 0,-13Z" className="it-hull" />
          <path d="M0,-14 v-8 l6,2.5 l-6,2.5" className="it-buoy" />
        </g>
        <circle cx={MARK.x} cy={MARK.y} r="4" className="it-buoy it-mark" />
        <path d="M332,16 v16 M328,27 L332,33 L336,27" className="it-wind" />
        {ROUTES.map((r, i) => (
          <g key={i} ref={(n) => (boats.current[i] = n)} opacity="0">
            <g transform="scale(.46)">
              <path d={HULL} className={r.me ? "it-hull it-me" : "it-hull"} />
              <line ref={(n) => (booms.current[i] = n)} x1="0" y1="-6" x2="0" y2="22" className={r.me ? "it-boom it-boom-me" : "it-boom"} />
            </g>
          </g>
        ))}
      </svg>
      <span ref={step} className="it-step" />
    </div>
  );
}
