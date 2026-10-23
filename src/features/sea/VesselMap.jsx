"use client";

import { useEffect, useRef, useState } from "react";
import { SEA_CENTER } from "@/lib/sea";

// VesselFinder'ın ücretsiz gömülü haritası (Seyhun 2026-10-23: aisstream Dikili'den sinyal vermeyince "VesselFinder'ı
// kullanalım"). Gemileri VesselFinder kendi çizer ve yeniler; dokununca gemi adı, hızı, yönü çıkar. Bizim liste ve sesli
// cevaplar bu veriyi okuyamaz (yalnız harita). public/vf.html'i iframe'de açar; kutu boyu ölçülüp haritaya verilir.
// center değişirse (Teknem) harita o noktada yeniden açılır. small: ana sayfa kartı (dokunulmaz, kart sayfayı açar).
export function VesselMap({ center = SEA_CENTER, zoom = 10, small = false, tall = false, onTall }) {
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
    <div className="relative">
      <div ref={box} className={small ? "pointer-events-none h-[9.5rem] w-full overflow-hidden bg-[#e6ecef]" : `${tall ? "h-[68vh]" : "h-72"} w-full overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#e6ecef]`}>
        {src && <iframe key={src} src={src} title="VesselFinder gemi haritası" loading="lazy" className="block h-full w-full border-0" tabIndex={small ? -1 : 0} />}
      </div>
      {onTall && (
        <button type="button" onClick={onTall} className="absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1 text-[0.8125rem] font-semibold text-[#26282c] shadow-sm">
          {tall ? "Küçült" : "Büyüt"}
        </button>
      )}
    </div>
  );
}
