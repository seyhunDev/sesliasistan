"use client";

import { useEffect } from "react";

// Basma hissi (Seyhun: "tıklandığında app'lerdeki gibi bir tıklanma duygusu"): kök içindeki [data-press] öğelerine parmak
// 70 ms durunca data-pressed eklenir (CSS küçültür); parmak 10 px kayarsa ya da sayfa kayarsa iptal, kaydırırken hiçbir şey
// değişmez. Hızlı dokunuşta 110 ms kısa bir basma gösterilir. Kök verilmezse bütün sayfa (PressFeedback, kök düzende);
// [data-press] taşımayan öğelerde dokunma vurgusu yok kuralı (globals.css) sürer.
export function usePress(ref) {
  useEffect(() => {
    const root = ref ? ref.current : document;
    if (!root) return;
    let el = null;
    let x = 0;
    let y = 0;
    let t = 0;
    let shown = false;
    const off = (n) => n?.removeAttribute("data-pressed");
    const cancel = () => {
      clearTimeout(t);
      off(el);
      el = null;
    };
    const down = (e) => {
      if (e.button > 0) return;
      cancel();
      el = e.target.closest?.("[data-press]");
      if (!el || !root.contains(el)) return (el = null);
      x = e.clientX;
      y = e.clientY;
      shown = false;
      t = setTimeout(() => {
        if (el) {
          el.setAttribute("data-pressed", "");
          shown = true;
        }
      }, 70);
    };
    const move = (e) => {
      if (el && Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel();
    };
    const up = () => {
      if (!el) return;
      clearTimeout(t);
      const n = el;
      el = null;
      if (!shown) n.setAttribute("data-pressed", "");
      setTimeout(() => off(n), shown ? 60 : 110);
    };
    root.addEventListener("pointerdown", down, { passive: true });
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerup", up, { passive: true });
    root.addEventListener("pointercancel", cancel, { passive: true });
    window.addEventListener("scroll", cancel, { passive: true, capture: true });
    return () => {
      cancel();
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", cancel);
      window.removeEventListener("scroll", cancel, { capture: true });
    };
  }, [ref]);
}
