"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { PICKS } from "@/lib/raceCourse";
import { compassReader, angDiff, meanDeg } from "@/lib/compass";
import { hasCompass, startCompass } from "@/lib/nativeIos";

// Pusula ile ölçüm (Seyhun 2026-10-28, örnek yaris-tasarim/parkur/parkur-3-pusula.png): arka kamera açılır, ortada nişangâh,
// üstte telefonun pusulası: kameranın baktığı yön (lib/compass.js; manyetik, elde tutulan pusulayla aynı; dik tutulunca da doğru). Hedefe nişan alıp "Al"a basınca
// 10 sn ölçülür, ortalama derece donar, "Bu açı ne?" seçilir, Ekle. Kamera açılmazsa yalnız derece görünür.
const dirName = (d) => ["K", "KD", "D", "GD", "G", "GB", "B", "KB"][Math.round(d / 45) % 8];

// iPhone'da pusula izni dokunuşla istenir (Pusula düğmesinin onClick'inde çağrılır)
export async function askCompass() {
  try {
    const D = typeof window !== "undefined" ? window.DeviceOrientationEvent : null;
    if (hasCompass()) return true;
    if (D && typeof D.requestPermission === "function") return (await D.requestPermission()) === "granted";
    return !!D;
  } catch {
    return false;
  }
}

export function CompassSight({ open, onClose, onAdd, place = "" }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<Body onClose={onClose} onAdd={onAdd} place={place} />, document.body);
}

function Body({ onClose, onAdd, place }) {
  const video = useRef(null);
  const [deg, setDeg] = useState(null);
  const [held, setHeld] = useState(null); // alınan derece
  const [left, setLeft] = useState(0); // Al: 10 sn ölçüm, kalan saniye (Seyhun 2026-10-29 "10 sn ortalama")
  const [spread, setSpread] = useState(null);
  const samples = useRef([]);
  const [pick, setPick] = useState(0);
  const [cam, setCam] = useState(true);

  useEffect(() => {
    let stream = null;
    let on = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (!on) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => on && setCam(false));
    // iPhone uygulamasında telefonun kendi pusulası (gerçek kuzey, Pusula uygulamasıyla aynı); tarayıcıda deviceorientation
    let last = null;
    const stopNative = startCompass((e) => {
      const h = e.true >= 0 ? e.true : e.mag;
      if (typeof h !== "number") return;
      last = last === null ? h : (((last + angDiff(h, last) * 0.35) % 360) + 360) % 360;
      setDeg(Math.round(last) % 360);
    });
    const read = compassReader();
    const f = (e) => {
      const h = read(e);
      if (h !== null) setDeg(Math.round(h) % 360);
    };
    if (!stopNative) {
      window.addEventListener("deviceorientation", f, true);
      window.addEventListener("deviceorientationabsolute", f, true);
    }
    return () => {
      on = false;
      stream?.getTracks().forEach((t) => t.stop());
      stopNative?.();
      window.removeEventListener("deviceorientation", f, true);
      window.removeEventListener("deviceorientationabsolute", f, true);
    };
  }, []);

  useEffect(() => {
    if (left > 0 && deg !== null) samples.current.push(deg);
  }, [deg, left]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => {
      if (left > 1) return setLeft(left - 1);
      setLeft(0);
      const m = meanDeg(samples.current);
      if (m) (setHeld(m.deg), setSpread(m.spread));
    }, 1000);
    return () => clearTimeout(t);
  }, [left]);
  const take = () => ((samples.current = deg === null ? [] : [deg]), setSpread(null), setLeft(10));

  const shown = held ?? deg;
  const ticks = shown === null ? [] : [-20, -10, 0, 10, 20].map((k) => ({ k, v: (((Math.round(shown / 10) * 10 + k) % 360) + 360) % 360 }));
  return (
    <div className="fixed inset-0 z-[60] bg-[#0b1626] text-white">
      {cam && <video ref={video} autoPlay playsInline muted className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#11203a]/80 to-transparent px-5 pb-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-center">
        <button type="button" onClick={onClose} aria-label="Kapat" className="absolute left-5 top-[calc(env(safe-area-inset-top)+0.75rem)] grid size-10 place-items-center rounded-full bg-white/20 active:bg-white/30">
          <Icon name="x" className="size-5" />
        </button>
        <b className="block text-[4rem] font-bold leading-none tracking-[-.03em] tabular-nums [text-shadow:0_2px_8px_rgba(0,0,0,.3)]">{shown === null ? "–" : `${shown}°`}</b>
        <span className="mt-1.5 block text-[0.9375rem] font-semibold text-white/85">{shown === null ? "Telefonu bir an düz tut" : `${dirName(shown)}${held !== null ? ` · 10 sn ortalama${spread ? ` (±${spread}°)` : ""}` : left > 0 ? " · ölçüyor" : ""}`}</span>
        {shown !== null && (
          <div className="relative mx-auto mt-2.5 h-7 w-64 overflow-hidden rounded-lg bg-[#11203a]/40">
            {ticks.map((t) => (
              <span key={t.k} className="absolute top-1.5 -translate-x-1/2 text-[0.6875rem] font-semibold text-white/80" style={{ left: `${50 + (t.k - (shown - Math.round(shown / 10) * 10)) * 2.2}%` }}>{t.v}</span>
            ))}
            <span className="absolute inset-y-0 left-1/2 w-0.5 bg-[#67e8f9]" />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[42%] size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90">
        <span className="absolute -inset-x-4 top-1/2 h-0.5 -translate-y-px bg-white" />
        <span className="absolute -inset-y-4 left-1/2 w-0.5 -translate-x-px bg-white" />
      </div>
      <div className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 text-fg">
        {held === null ? (
          <>
            {place && <p className="mb-3 text-center text-[0.9375rem] text-mut">{place}</p>}
            <Button full className="h-14" disabled={deg === null || left > 0} onClick={take}>{left > 0 ? `Ölçüyor · ${left} sn` : "Al"}</Button>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <b className="text-[1.1875rem] font-semibold">Bu açı ne?</b>
              {place && <span className="truncate pl-3 text-[0.8125rem] text-mut">{place}</span>}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {PICKS.map(([k, r, l], i) => (
                <button key={l} type="button" aria-pressed={pick === i} onClick={() => setPick(i)} className={`h-11 rounded-xl text-[0.875rem] font-medium active:scale-[.98] ${pick === i ? "bg-acc font-semibold text-white" : "bg-bg"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-3.5 grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="secondary" onClick={() => (setHeld(null), setSpread(null))}>Yeniden</Button>
              <Button onClick={() => onAdd({ kind: PICKS[pick][0], ref: PICKS[pick][1], deg: held })}>Ekle</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
