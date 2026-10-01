"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { cached, dayHours, getPlace, loadWeather, samePlace, setPlace } from "./weather";

// Seçili konumun (varsayılan Dikili) hava durumu: önbellekten hemen, sonra 15 dakikada bir ve uygulamaya dönünce yenilenir.
// Konum profilde (users.weatherPlace) de saklanır; başka cihazda seçildiyse bu cihaza da uygulanır.
export function useWeather() {
  const { profile } = useAuth();
  const saved = profile?.weatherPlace;
  useEffect(() => {
    if (saved?.lat != null && !samePlace(saved, getPlace())) setPlace(saved);
  }, [saved]);
  const [w, setW] = useState(() => (typeof window === "undefined" ? null : cached()));
  const [err, setErr] = useState(false);
  const refresh = useCallback(async (force) => {
    try {
      setW(await loadWeather(force));
      setErr(false);
    } catch {
      setErr(true);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    const run = () => alive && refresh(false);
    run();
    const t = setInterval(run, 15 * 60e3);
    const onVis = () => document.visibilityState === "visible" && run();
    const onPlace = () => {
      setW(null);
      if (alive) refresh(true);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("sa-place", onPlace);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("sa-place", onPlace);
    };
  }, [refresh]);
  return { w, err, refresh };
}

// Belirli gün ve saatteki rüzgâr (plan saati için): { wind, gust, dir } ya da null
export function windAt(w, date, time) {
  if (!w || !date || !time) return null;
  const hh = time.slice(0, 2);
  const row = (dayHours(w, date) || []).find((h) => h.hh === hh);
  return row ? { wind: row.wind, gust: row.gust, dir: row.dir } : null;
}

// Varsayılan rüzgâr sınırı (kn): üstündeyse "Senin için"de uyarı çıkar. Ayarlardan değiştirilebilir (users.windLimit).
export const WIND_LIMIT = 15;
