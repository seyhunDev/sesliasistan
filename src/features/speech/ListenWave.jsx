"use client";

import { useEffect, useRef } from "react";
import { readMeter } from "@/lib/speech/meter";
import { waveBars } from "@/lib/speech/waveBars";

// Dinlerken ses dalgası: çubuklar ortada sabit durur, boyları sesin o anki gücüyle yükselip alçalır (kaymaz).
// Çizim canvas'ta, ekran karesi başına (React yeniden çizimi yok); ses useSpeech'in analizcisinden (meter.js).
// round: kürenin içinde (canvas küreyi kaplar), boştaki dalgayla aynı yerde ve aynı çubuk ölçüsünde.
// Aynı karede kürenin ve kubbenin --lvl değişkeni de yazılır (küre hafifçe büyür, hale ve kubbe ışığı güçlenir);
// önceden bu değer saniyede 10 kez React'ten geliyordu, büyük asistan bileşeni her seferinde yeniden çiziliyor ve
// geçişler 100 ms'de bir yeniden başladığı için hareket takılıyordu.
// line: konuşma kutusundaki noktalı çizgi (Seyhun'un örneği, 2026-10-09): genişliği dolduran küçük noktalar, ses gelince
// ortadakiler kısa çubuklara uzar. Nokta sayısı genişlikten hesaplanır.
export function ListenWave({ className = "", round = false, line = false, count = round ? 5 : 9, bar = round ? 4.5 : line ? 3 : 3, gap = round ? 4 : line ? 4 : 3 }) {
  const cv = useRef(null);

  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext?.("2d");
    if (!ctx) return;
    const orb = c.closest("[data-orb]");
    const dome = c.closest("[data-dome]");
    let w = 0, h = 0, raf = 0;
    let peak = 0.2; // kendiliğinden kazanç: kısık seste de dalga görünsün, bağırınca taşmasın
    let lvl = 0; // yumuşatılmış seviye (çabuk yükselir, yavaş iner)
    let sent = -1;
    let n = count;
    let hs = Array(n).fill(0);
    const color = getComputedStyle(c).color || "#fff";

    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (line) {
        n = Math.max(9, Math.floor((w + gap) / (bar + gap)));
        hs = Array(n).fill(0);
      }
    };
    size();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
    ro?.observe(c);

    const frame = (now) => {
      const v = readMeter();
      peak = Math.max(0.2, v, peak * 0.995);
      const g = Math.min(1, Math.pow(v / peak, 0.8));
      lvl += (g - lvl) * (g > lvl ? 0.45 : 0.12);
      const want = waveBars(lvl, now / 1000, n);
      hs = hs.map((x, i) => x + (want[i] - x) * (want[i] > x ? 0.5 : 0.18));

      // Küre ve kubbe ışığı: yalnız değer gözle görülür değişince yazılır (stil hesabı az olsun)
      const q = Math.round(lvl * 50) / 50;
      if (q !== sent) {
        sent = q;
        orb?.style.setProperty("--lvl", q);
        dome?.style.setProperty("--lvl", q);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      const total = n * bar + (n - 1) * gap;
      const x0 = (w - total) / 2;
      const mid = h / 2;
      const top = round ? h * 0.52 : h;
      for (let i = 0; i < n; i++) {
        // Noktalı çizgide sessizlikte hepsi nokta: en kısa boy (WAVE_MIN) noktaya iner
        const bh = Math.max(bar, (line ? Math.max(0, hs[i] - 0.12) / 0.88 : hs[i]) * top);
        const x = x0 + i * (bar + gap);
        ctx.globalAlpha = 0.75 + Math.min(1, hs[i]) * 0.25;
        if (line) ctx.globalAlpha *= 1 - 0.55 * Math.pow(Math.abs(i - (n - 1) / 2) / ((n - 1) / 2 || 1), 6); // uçlar silik
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, mid - bh / 2, bar, bh, bar / 2);
        else ctx.rect(x, mid - bh / 2, bar, bh);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      orb?.style.removeProperty("--lvl");
      dome?.style.removeProperty("--lvl");
    };
  }, [round, line, count, bar, gap]);

  if (line) return <canvas ref={cv} aria-hidden="true" className={`block h-7 min-w-0 flex-1 ${className}`} />;
  if (round) return <canvas ref={cv} aria-hidden="true" className={`vl-live ${className}`} />;
  return <canvas ref={cv} aria-hidden="true" className={`block h-7 w-full max-w-[13rem] text-[#ffb3a8] ${className}`} />;
}
