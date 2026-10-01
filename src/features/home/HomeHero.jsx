"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { WeatherDetail } from "@/features/weather/DaySheet";
import { getPlace, sky, windLevel, windName } from "@/features/weather/weather";

// Ana sayfanın tek içeriği: sade hava satırı (simge, sıcaklık, gökyüzü · yer, en yüksek/en düşük, rüzgâr).
// Dokununca bugünün saat saat ayrıntısı (rüzgâr göstergesi, gün şeridi) açılır.
export function HomeHero({ weather }) {
  const { w, err, refresh } = weather;
  const [open, setOpen] = useState(false);
  const s = w ? sky(w.now.code, w.now.day) : null;
  const place = getPlace();
  const lv = w ? windLevel(w.now.wind) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (w ? setOpen(true) : refresh(true))}
        aria-label="Bugünün hava ayrıntısı"
        className="flex w-full items-center gap-3 rounded-[1.25rem] bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)] transition active:scale-[.99]"
      >
        {w ? (
          <>
            <Icon name={s.icon} className="size-7 shrink-0 text-acc [stroke-width:1.5]" />
            <span className="text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">{w.now.t}°</span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[0.875rem] font-semibold">{s.label}</b>
              <small className="block truncate text-[0.75rem] text-mut">
                {place.name}
                {w.today ? ` · ${w.today.max}° / ${w.today.min}°` : ""}
              </small>
            </span>
            <span className="shrink-0 text-right leading-tight">
              <b className="flex items-center justify-end gap-1 text-[0.875rem] font-semibold tabular-nums">
                <Icon name="wind" className="size-4 text-acc" />
                {w.now.wind} kn
              </b>
              <small className={`block text-[0.75rem] ${lv.tone}`}>
                {windName(w.now.dir)[0]} · {lv.label.toLocaleLowerCase("tr-TR")}
              </small>
            </span>
          </>
        ) : (
          <span className="py-1 text-[0.875rem] text-mut">{err ? "Hava durumu alınamadı · tekrar dene" : `${place.name} hava durumu yükleniyor…`}</span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}
