"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canGoBack, goBack } from "@/lib/navTrail";
import { edgeStart, swipeAxis, swipeDone } from "@/lib/swipeBack";

// Kenardan kaydırarak geri (iPhone uygulamaları gibi): ana ekrana eklenen uygulamada (Safari çubuğu yokken)
// ekranın sol kenarından sağa çekince sayfa parmağı izler, bırakınca önceki sayfaya dönülür. Safari'de ve
// Android'de telefonun kendi geri hareketi olduğu için yalnız iPhone/iPad ana ekran uygulamasında çalışır.
// Alt sekme sayfalarında, açık pencere (alttan açılan pencere, asistan) varken ve geri gidilecek yer yokken çalışmaz.
const standaloneIos = () => {
  if (typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const alone = navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && alone && !window.Capacitor?.isNativePlatform?.();
};

// Asistan açık, klavye açık ya da ekranda açık bir pencere var (kapalı pencereler ekranın altında bekler)
const blocked = () => {
  const b = document.body.dataset;
  if (b.asst || b.typing) return true;
  for (const d of document.querySelectorAll('[role="dialog"]')) {
    const r = d.getBoundingClientRect();
    if (r.height && r.top < window.innerHeight - 4 && r.bottom > 4) return true;
  }
  return false;
};

export function SwipeBack() {
  const router = useRouter();

  useEffect(() => {
    if (!standaloneIos()) return;
    let g = null; // süren hareket: { x, y, t, axis, el, href, dx }

    const page = () => {
      const all = document.querySelectorAll(".page-in");
      return all[all.length - 1] || null;
    };
    const move = (el, dx, anim) => {
      if (!el) return;
      el.style.transition = anim ? "transform .2s cubic-bezier(.22,.8,.24,1)" : "none";
      el.style.transform = dx ? `translate3d(${dx}px,0,0)` : "";
      el.style.boxShadow = dx ? "-8px 0 24px rgba(0,0,0,.08)" : "";
    };
    const clear = (el) => {
      if (!el) return;
      el.style.transition = el.style.transform = el.style.boxShadow = "";
    };

    const start = (e) => {
      g = null;
      if (e.touches.length !== 1) return;
      const p = e.touches[0];
      if (!edgeStart(p.clientX, window.location.pathname) || blocked()) return;
      const link = document.querySelector("[data-back]");
      if (!link && !canGoBack()) return;
      g = { x: p.clientX, y: p.clientY, t: Date.now(), axis: "", el: null, href: link?.getAttribute("href") || "/", dx: 0 };
    };
    const drag = (e) => {
      if (!g) return;
      const p = e.touches[0];
      const dx = p.clientX - g.x;
      const dy = p.clientY - g.y;
      if (!g.axis) {
        g.axis = swipeAxis(dx, dy);
        if (g.axis === "scroll") return (g = null);
        if (!g.axis) return;
        g.el = page();
      }
      e.preventDefault(); // sayfa aşağı-yukarı kaymasın, parmağı izlesin
      g.dx = Math.max(0, dx);
      move(g.el, g.dx, false);
    };
    const end = () => {
      if (!g || g.axis !== "swipe") return (g = null);
      const { el, dx, t, href } = g;
      g = null;
      if (!swipeDone(dx, Date.now() - t, window.innerWidth)) return move(el, 0, true);
      move(el, window.innerWidth, true);
      setTimeout(() => {
        goBack(router, href);
        // Yeni sayfa açılınca bu öğe kalkar; açılmazsa (aynı sayfada kalındıysa) yerine döner
        setTimeout(() => el?.isConnected && clear(el), 900);
      }, 160);
    };
    const cancel = () => {
      if (g?.el) move(g.el, 0, true);
      g = null;
    };

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
  }, [router]);

  return null;
}
