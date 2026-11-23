"use client";

import { useCallback, useRef } from "react";
import { useLoop } from "./useLoop";

// Tekne Ekranı kutusunun önizlemesi (örnek B): geri sayan start sayacı ve hafif sallanan pusula; ekranın ne yaptığını gösterir.
const LOOP = 11;
export function TeknePreview() {
  const box = useRef(null);
  const cd = useRef(null);
  const nd = useRef(null);
  const tick = useCallback((t) => {
    const left = Math.max(0, Math.ceil(60 - (t / LOOP) * 66));
    const n = cd.current;
    if (n) {
      const txt = left ? `0:${String(left).padStart(2, "0")}` : "Start";
      if (n.textContent !== txt) n.textContent = txt;
      n.classList.toggle("it-go-on", !left);
    }
    nd.current?.setAttribute("transform", `rotate(${(Math.sin(t * 0.9) * 14).toFixed(1)})`);
  }, []);
  useLoop(box, LOOP, tick, 0);
  return (
    <div ref={box} className="it-te">
      <span className="it-te-l">
        <span ref={cd} className="it-cd num">
          1:00
        </span>
        <small>Start</small>
      </span>
      <svg viewBox="-30 -30 60 60" className="it-cmp">
        <circle r="27" className="it-cmp-r" />
        <text y="-17" textAnchor="middle" className="it-cmp-k">
          K
        </text>
        <g ref={nd}>
          <path d="M0,-21 L4,0 L0,-3 L-4,0Z" className="it-cmp-n" />
          <path d="M0,21 L4,0 L0,3 L-4,0Z" className="it-cmp-s" />
        </g>
        <circle r="2" className="it-cmp-c" />
      </svg>
    </div>
  );
}
