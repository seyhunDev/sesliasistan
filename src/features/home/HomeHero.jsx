"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { WeatherDetail } from "@/features/weather/DaySheet";
import { getPlace, sky, windName } from "@/features/weather/weather";

// Başlığın altındaki hava hapı: simge, sıcaklık, gökyüzü, rüzgâr ve ›; dokunulabildiği belli olsun diye çerçeveli.
// Dokununca bugünün özeti ve rüzgâr grafiği açılır.
export function HomeHero({ weather }) {
  const { w, err, refresh } = weather;
  const [open, setOpen] = useState(false);
  const s = w ? sky(w.now.code, w.now.day) : null;
  const place = getPlace();

  return (
    <>
      <button
        type="button"
        onClick={() => (w ? setOpen(true) : refresh(true))}
        aria-label="Bugünün hava ayrıntısı"
        className="mt-1 flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-2 pr-2.5 text-left text-[0.8125rem] text-mut"
      >
        {w ? (
          <>
            <Icon name={s.icon} className="size-4 shrink-0 text-acc" />
            <span className="truncate tabular-nums">
              <b className="font-semibold text-fg">{w.now.t}°</b> · {s.label} · {w.now.wind} kn {windName(w.now.dir)[1]}
            </span>
          </>
        ) : (
          <span className="truncate">{err ? "Hava durumu alınamadı · dokun, yenile" : `${place.name} havası yükleniyor…`}</span>
        )}
        <span aria-hidden className="shrink-0 text-[0.9375rem] leading-none text-mut">›</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}
