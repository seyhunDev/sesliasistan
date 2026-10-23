"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Deniz trafiği verisi (/api/sea, aisstream): ana sayfa kartı every sn'de bir sorar; arka planda / ekran kapalıyken durur
// (pil ve data). Sayfa artık yalnız VesselFinder haritası (2026-10-23), bu veriyi kullanmaz.

// Asistan ve sayfa aynı isteği kullanır
export async function fetchSea() {
  const r = await authFetch("/api/sea");
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return { error: "fail", why: j.error || `sunucu ${r.status}` };
  }
  return r.json();
}

export function useSea(every) {
  const [data, setData] = useState(null);
  const [fail, setFail] = useState(false);
  const busy = useRef(false);
  const load = useCallback(async () => {
    if (busy.current || document.hidden) return;
    busy.current = true;
    try {
      const v = await fetchSea();
      // Hata olursa son gemiler kalır; hiç gemi gelmediyse hata gösterilir (sayfa "yükleniyor"da takılmaz)
      setData((d) => (v.ships || !d?.ships ? v : d));
      setFail(!!v.error && v.error !== "nokey");
    } catch (e) {
      setData((d) => d || { error: "fail", why: e?.message || "bağlantı yok" });
      setFail(true);
    } finally {
      busy.current = false;
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, every * 1000);
    const vis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [every, load]);
  return { data, fail, reload: load };
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
