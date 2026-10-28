"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Radardan yağış (/api/rain-radar): seçilen noktada son 2 saat, 10 dakikada bir şiddet (0 yok, 1 hafif, 2 orta, 3 kuvvetli).
// Aynı nokta 10 dk telefonda saklanır. Dönen: null (alınamadı) ya da { src, frames: [{ at, level }] }
const MEM = new Map();
const TTL = 10 * 60e3;

export function useRainRadar(at) {
  const key = at?.lat != null ? `${(+at.lat).toFixed(3)},${(+at.lon).toFixed(3)}` : "";
  const [got, setGot] = useState(() => ({ key, v: MEM.get(key)?.v ?? null }));
  useEffect(() => {
    if (!key) return;
    const hit = MEM.get(key);
    if (hit && Date.now() - hit.t < TTL) return;
    let on = true;
    authFetch(`/api/rain-radar?${new URLSearchParams({ lat: String(at.lat), lon: String(at.lon) })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (!v?.frames?.length) return;
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

// Saat saat en şiddetli radar değeri: { "14": 2, "15": 0, … } (yerel saat)
export function radarByHour(v, tz = "Europe/Istanbul") {
  const hr = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz });
  const out = {};
  for (const f of v?.frames || []) {
    const h = hr.format(new Date(f.at));
    out[h] = Math.max(out[h] ?? 0, f.level);
  }
  return out;
}
