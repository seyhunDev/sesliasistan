"use client";

import { useEffect, useState } from "react";
import { onSync } from "@/lib/syncLine";

const SHOW = 1200; // çizginin ekranda kalma süresi (ms); art arda gelen farklar süreyi uzatır

// Anında açılışta (lib/warmStart.js) sunucudan değişiklik gelince ekranın en üstünde ince, akan cyan çizgi: "yenileri alındı".
// Yazı ya da açılış ekranı yok; ekran kopyayla zaten açık, değişiklik geldiği an işlenir.
export function SyncLine() {
  const [on, setOn] = useState(0);
  useEffect(() => {
    let t = 0;
    const off = onSync((at) => {
      setOn(at);
      clearTimeout(t);
      t = setTimeout(() => setOn(0), SHOW);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  if (!on) return null;
  return <div aria-hidden="true" className="sync-line" />;
}
