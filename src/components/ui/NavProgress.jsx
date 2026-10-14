"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navArrived, navClick, navDone, navPhase, navPopped, navSubscribe, wrapRouter } from "@/lib/navProgress";

// Sayfa geçişinde ekranın ortasında sade yükleniyor çemberi (Seyhun'un isteği, 2026-10-14; önce üstte ince çizgiydi):
// dokunulan düğme ya da bağlantı başka sayfaya gidiyorsa başlar, yeni sayfa açılınca kaybolur; "gidiyor mu?" sorusu kalmaz.
// Bütün geçişler kapsanır: bağlantılar (tıklama yakalanır) ve router.push/replace/back (navProgress.js).
// Yeni açılan sayfa en üstten başlar (geri dönülen sayfa eski yerinde kalır).
// Dokunma vurgusu yok: iPhone'da :active yalnız touchstart dinleyicisi varken çalıştığı için boş dinleyici eklenmez
// (kaydırırken parmağın değdiği satır koyulaşıyordu).

export function NavProgress() {
  const router = useRouter();
  const path = usePathname();
  const phase = useSyncExternalStore(navSubscribe, navPhase, () => "idle");

  useEffect(() => {
    wrapRouter(router);
    document.addEventListener("click", navClick, true);
    window.addEventListener("popstate", navPopped);
    return () => {
      window.removeEventListener("popstate", navPopped);
      document.removeEventListener("click", navClick, true);
    };
  }, [router]);

  // Yeni sayfa açıldı: çizgi dolar ve kaybolur; ileri gidişte sayfa en üstten başlar
  const first = useRef(true);
  useEffect(() => {
    navDone();
    if (first.current) first.current = false;
    else navArrived();
  }, [path]);

  if (phase === "idle") return null;
  // Sayfa hemen açılırsa hiçbir şey görünmez: çember yalnız geçiş 0,35 sn'yi aşınca yumuşakça belirir (globals.css › navspin)
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] grid place-items-center">
      <span className={`navspin ${phase === "done" ? "navspin-done" : ""}`} />
    </div>
  );
}
