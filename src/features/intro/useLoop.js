"use client";

import { useEffect } from "react";

// Tanıtım önizlemeleri için tek saat: yalnız kutu ekranda görünürken ve sekme açıkken çalışır; "hareketi azalt" açıksa
// durağan kare (still) gösterilir. onTick(t) her karede çağrılır (t: döngü içindeki saniye). Ekran yalnız ref ile güncellenir, React yeniden çizilmez.
export function useLoop(ref, loop, onTick, still) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let raf = 0, seen = false, t0 = 0, last = 0;
    const tick = (now) => {
      if (!t0) t0 = now - last * 1000;
      last = ((now - t0) / 1000) % loop;
      onTick(last);
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      t0 = 0;
      if (mq?.matches) {
        onTick(still);
        return;
      }
      if (seen && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => ((seen = e.isIntersecting), sync())) : null;
    if (io) io.observe(node);
    else seen = true;
    onTick(still);
    sync();
    document.addEventListener("visibilitychange", sync);
    mq?.addEventListener?.("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      mq?.removeEventListener?.("change", sync);
    };
  }, [ref, loop, onTick, still]);
}
