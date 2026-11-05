"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { edgeStart, swipeAxis, swipeDone } from "@/lib/swipeBack";

// Canlı ekran uygulama içinde (Seyhun 2026-11-05 "Ekrana aç uygulama içinde açılsın; soldan sağa kaydırınca geri gitmeli"):
// Yayın'dan "Ekrana aç" ile gelindiyse /canli sol üstte geri düğmesi gösterir, sol kenardan sağa çekince Yayın'a döner.
// Link ile (Safari, TV) açılan herkese açık ekranda hiçbiri görünmez. Safari'nin kendi kenar hareketi varken kaydırma dinlenmez.
const KEY = "canli-geri";

export function openInApp(router, href) {
  try {
    sessionStorage.setItem(KEY, window.location.pathname + window.location.search);
  } catch {}
  router.push(href);
}

const ownSwipe = () => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const alone = navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && (alone || window.Capacitor?.getPlatform?.() === "ios");
};

export function InAppBack() {
  const router = useRouter();
  const [back, setBack] = useState("");

  useEffect(() => {
    let b = "";
    try {
      b = sessionStorage.getItem(KEY) || "";
    } catch {}
    const t = setTimeout(() => setBack(b), 0);
    return () => clearTimeout(t);
  }, []);
  // sol üstteki sayaç kartı düğmenin altında kalmasın (liveScreen.css html[data-inapp])
  useEffect(() => {
    if (!back) return;
    document.documentElement.dataset.inapp = "1";
    return () => delete document.documentElement.dataset.inapp;
  }, [back]);

  useEffect(() => {
    if (!back || !ownSwipe()) return;
    let g = null;
    const root = () => document.querySelector(".canli-root");
    const move = (dx, anim) => {
      const el = root();
      if (!el) return;
      el.style.transition = anim ? "transform .2s cubic-bezier(.22,.8,.24,1)" : "none";
      el.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
    };
    const start = (e) => {
      g = null;
      if (e.touches.length !== 1) return;
      const p = e.touches[0];
      if (edgeStart(p.clientX, window.location.pathname)) g = { x: p.clientX, y: p.clientY, t: Date.now(), axis: "", dx: 0 };
    };
    const drag = (e) => {
      if (!g) return;
      const p = e.touches[0];
      const dx = p.clientX - g.x;
      if (!g.axis) {
        g.axis = swipeAxis(dx, p.clientY - g.y);
        if (g.axis === "scroll") return (g = null);
        if (!g.axis) return;
      }
      e.preventDefault();
      g.dx = Math.max(0, dx);
      move(g.dx, false);
    };
    const end = () => {
      if (!g || g.axis !== "swipe") return (g = null);
      const { dx, t } = g;
      g = null;
      if (!swipeDone(dx, Date.now() - t, window.innerWidth)) return move(0, true);
      move(window.innerWidth, true);
      setTimeout(go, 160);
    };
    const cancel = () => (g ? move(0, true) : null, (g = null));
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", drag);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [back]);

  function go() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    if (window.history.length > 1) router.back();
    else router.replace(back);
  }

  if (!back) return null;
  return (
    <div className="navy fixed z-[80] !bg-transparent !p-0" style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)", left: "calc(env(safe-area-inset-left, 0px) + 0.75rem)" }}>
      <BackButton onClick={go} className="btn-sm" />
    </div>
  );
}
