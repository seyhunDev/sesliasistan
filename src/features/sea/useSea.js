"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Deniz trafiği verisi (/api/sea, aisstream): yalnız sesli asistan sorar (sayfa VesselFinder haritası, ana sayfa kartı
// 2026-10-23'te kalktı).

// Sesli asistanın isteği (isler/deniz.js)
export async function fetchSea() {
  const r = await authFetch("/api/sea");
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return { error: "fail", why: j.error || `sunucu ${r.status}` };
  }
  return r.json();
}

// Telefonun konumu ("Teknem"): yalnız sayfa açıkken izlenir
export function useMyPos() {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, sog: Math.max(0, (p.coords.speed || 0) * 1.944) }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return pos;
}
