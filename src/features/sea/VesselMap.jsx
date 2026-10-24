"use client";

import { SEA_CENTER } from "@/lib/sea";

// MarineTraffic'in ücretsiz gömülü gemi haritası (Seyhun 2026-10-24: Dikili'deki demirli gemileri yalnız MarineTraffic
// gösterdi, "sadece MarineTraffic kullanalım"; önceki VesselFinder ve aisstream Dikili'yi göstermedi). Gemileri
// MarineTraffic kendi çizer ve yeniler; dokununca gemi adı, hızı çıkar. Sesli cevaplar bu veriyi okuyamaz (yalnız harita).
// center değişirse (Teknem) harita o noktada yeniden açılır. Kapsayıcısını tamamen doldurur (sayfada tam ekran).
const mtUrl = (c, z) => `https://www.marinetraffic.com/en/ais/embed/zoom:${z}/centery:${c.lat}/centerx:${c.lon}/maptype:4/shownames:false/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false`;

export function VesselMap({ center = SEA_CENTER, zoom = 10 }) {
  const src = mtUrl(center, zoom);
  return (
    <div className="h-full w-full overflow-hidden bg-[#e6ecef]">
      <iframe key={src} src={src} title="MarineTraffic gemi haritası" className="block h-full w-full border-0" />
    </div>
  );
}
