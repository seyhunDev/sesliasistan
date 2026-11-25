"use client";

import { useRouter } from "next/navigation";
import { RegionMap } from "@/features/weather/RegionMap";
import { getPlace } from "@/features/weather/weather";

// Rüzgâr haritası (Seyhun 2026-11-03: tek harita): hava sayfasındaki bölge haritasının aynısı, şimdiden başlayıp tam ekran açılır; kapatınca geri döner.
// Eski ayrı WindMap kalktı. Veri Open-Meteo'dan, Firestore'a dokunmaz.
export default function WindPage() {
  const router = useRouter();
  return <RegionMap place={getPlace()} startOpen onClose={() => router.back()} />;
}
