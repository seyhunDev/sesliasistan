"use client";

import { useEffect, useRef } from "react";
import { readMeter } from "@/lib/speech/meter";

// Dinlerken ses dalgası: ince çubuklar sağdan girer, sola akar, boyu sesin o anki gücü.
// Çizim canvas'ta, ekran karesi başına (React yeniden çizimi yok); ses useSpeech'in analizcisinden (meter.js).
// round: kürenin içinde (canvas küreyi kaplar); çubuklar dairenin içinde kalır, kenara yaklaştıkça kısalır.
const EVERY = 55; // ms: her çubuk bu kadar sürenin en yüksek sesi

export function ListenWave({ className = "", round = false, bar = round ? 2.5 : 3, gap = round ? 2.5 : 3 }) {
  const cv = useRef(null);

  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext?.("2d");
    if (!ctx) return;
    const BAR = bar, STEP = bar + gap;
    let w = 0, h = 0, n = 0, raf = 0;
    let hist = [];
    let acc = 0, cur = 0, last = performance.now();
    let peak = 0.2; // kendiliğinden kazanç: kısık seste de dalga görünsün, bağırınca taşmasın
    const color = getComputedStyle(c).color || "#ffb3a8";

    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      n = Math.ceil(w / STEP) + 2;
      hist = Array(Math.max(0, n - hist.length)).fill(0).concat(hist).slice(-n);
    };
    size();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
    ro?.observe(c);

    const frame = (now) => {
      const dt = Math.min(200, now - last);
      last = now;
      const v = readMeter();
      cur = Math.max(cur, v);
      acc += dt;
      while (acc >= EVERY) {
        acc -= EVERY;
        peak = Math.max(0.2, cur, peak * 0.985);
        hist.push(cur / peak);
        cur = 0;
        if (hist.length > n) hist.shift();
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      const shift = (acc / EVERY) * STEP;
      const mid = h / 2;
      for (let i = hist.length - 1, k = 0; i >= 0; i--, k++) {
        const x = (round ? w * 0.86 : w) - BAR - k * STEP - shift;
        if (x < -BAR) break;
        const a = Math.min(1, Math.pow(hist[i], 0.8));
        let top = h;
        if (round) {
          // dairenin o noktadaki yüksekliği (kiriş), içeride pay bırakarak; kenardaki çubuk hiç çizilmez
          const r = w / 2, dx = x + BAR / 2 - r, ch = r * r - dx * dx;
          if (ch <= 0) continue;
          top = Math.min(h * 0.56, Math.sqrt(ch) * 2 * 0.62);
          if (top < BAR * 1.5) continue;
        }
        const bh = Math.max(BAR, a * top);
        ctx.globalAlpha = 0.55 + a * 0.45;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, mid - bh / 2, BAR, bh, BAR / 2);
        else ctx.rect(x, mid - bh / 2, BAR, bh);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [round, bar, gap]);

  if (round) return <canvas ref={cv} aria-hidden="true" className={`vl-live ${className}`} />;
  return (
    <canvas
      ref={cv}
      aria-hidden="true"
      className={`block h-7 w-full max-w-[13rem] text-[#ffb3a8] [mask-image:linear-gradient(to_right,transparent,#000_35%)] ${className}`}
    />
  );
}
