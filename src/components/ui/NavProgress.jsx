"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navArrived, navClick, navDone, navPhase, navPopped, navSubscribe, wrapRouter } from "@/lib/navProgress";

// Sayfa geçişinde üstte ince ilerleme çizgisi (popüler uygulamalardaki gibi): dokunulan düğme ya da bağlantı
// başka sayfaya gidiyorsa hemen başlar, yeni sayfa açılınca dolup kaybolur; "gidiyor mu?" sorusu kalmaz.
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
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[calc(3px+env(safe-area-inset-top))]">
      <div className={`absolute inset-x-0 bottom-0 h-[3px] origin-left rounded-r-full bg-acc ${phase === "done" ? "navbar-done" : "navbar-run"}`} />
    </div>
  );
}
