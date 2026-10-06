"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navClick, navDone, navPhase, navSubscribe, wrapRouter } from "@/lib/navProgress";

// Sayfa geçişinde üstte ince ilerleme çizgisi (popüler uygulamalardaki gibi): dokunulan düğme ya da bağlantı
// başka sayfaya gidiyorsa hemen başlar, yeni sayfa açılınca dolup kaybolur; "gidiyor mu?" sorusu kalmaz.
// Bütün geçişler kapsanır: bağlantılar (tıklama yakalanır) ve router.push/replace/back (navProgress.js).
// Ayrıca iPhone'da :active (basılıyken koyulaşma, globals.css) her öğede çalışsın diye boş touchstart dinleyicisi.
const noop = () => {};

export function NavProgress() {
  const router = useRouter();
  const path = usePathname();
  const phase = useSyncExternalStore(navSubscribe, navPhase, () => "idle");

  useEffect(() => {
    wrapRouter(router);
    document.addEventListener("click", navClick, true);
    document.addEventListener("touchstart", noop, { passive: true });
    return () => {
      document.removeEventListener("click", navClick, true);
      document.removeEventListener("touchstart", noop);
    };
  }, [router]);

  // Yeni sayfa açıldı: çizgi dolar ve kaybolur
  useEffect(() => navDone(), [path]);

  if (phase === "idle") return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[calc(3px+env(safe-area-inset-top))]">
      <div className={`absolute inset-x-0 bottom-0 h-[3px] origin-left rounded-r-full bg-acc ${phase === "done" ? "navbar-done" : "navbar-run"}`} />
    </div>
  );
}
