"use client";

import { useEffect, useRef, useState } from "react";
import { SEA_CENTER } from "@/lib/sea";

// VesselFinder'ın ücretsiz gömülü haritası (Seyhun 2026-10-23: aisstream Dikili'den sinyal vermeyince "VesselFinder'ı
// kullanalım"). Gemileri VesselFinder kendi çizer ve yeniler; dokununca gemi adı, hızı, yönü çıkar. Bizim liste ve sesli
// cevaplar bu veriyi okuyamaz (yalnız harita). public/vf.html'i iframe'de açar; kutu boyu ölçülüp haritaya verilir.
// center değişirse (Teknem) harita o noktada yeniden açılır. Kapsayıcısını tamamen doldurur (sayfada tam ekran).
export function VesselMap({ center = SEA_CENTER, zoom = 10 }) {
  const box = useRef(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(Math.round(el.clientHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const src = h ? `/vf.html?lat=${center.lat}&lon=${center.lon}&z=${zoom}&h=${h}` : "";
  return (
    <div ref={box} className="h-full w-full overflow-hidden bg-[#e6ecef]">
      {src && <iframe key={src} src={src} title="VesselFinder gemi haritası" className="block h-full w-full border-0" />}
    </div>
  );
}
