"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Gerçekleşen rüzgâr (/api/wind-obs): yalnız bugün ve geçmiş günler için sorulur; aynı yer ve gün 10 dk telefonda saklanır.
// Dönen: null (sorulmadı / alınamadı) ya da { station: { name, km, near }, rows: [{ hh, wind, gust, dir, at }] }
const MEM = new Map();
const TTL = 10 * 60e3;

export function useWindObs(at, date, today) {
  const key = at && date && date <= today ? `${(+at.lat).toFixed(3)},${(+at.lon).toFixed(3)}|${date}` : "";
  const [got, setGot] = useState(() => ({ key, v: MEM.get(key)?.v ?? null }));
  useEffect(() => {
    if (!key) return;
    const hit = MEM.get(key);
    if (hit && Date.now() - hit.t < TTL) return;
    let on = true;
    const q = new URLSearchParams({ lat: String(at.lat), lon: String(at.lon), date });
    authFetch(`/api/wind-obs?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (!v?.station) return;
        MEM.set(key, { t: Date.now(), v });
        if (on) setGot({ key, v });
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return got.key === key ? got.v : MEM.get(key)?.v ?? null;
}
