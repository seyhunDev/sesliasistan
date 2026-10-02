"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { WeatherDetail } from "@/features/weather/DaySheet";
import { getPlace, sky, windLevel, windName } from "@/features/weather/weather";

// Başlığın altındaki tek satır hava: simge, sıcaklık, gökyüzü, rüzgâr. Dokununca bugünün saat saat ayrıntısı açılır.
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
        className="-mx-1 flex max-w-full items-center gap-1.5 rounded-full px-1 py-0.5 text-left text-[0.875rem] text-mut transition active:bg-card"
      >
        {w ? (
          <>
            <Icon name={s.icon} className="size-[1.125rem] shrink-0 text-acc" />
            <b className="font-semibold tabular-nums text-fg">{w.now.t}°</b>
            <span className="truncate">
              {s.label} · {w.now.wind} kn {windName(w.now.dir)[0]} · <span className={lv.tone}>{lv.label.toLocaleLowerCase("tr-TR")}</span>
            </span>
          </>
        ) : (
          <span className="truncate">{err ? "Hava durumu alınamadı · dokun, yenile" : `${place.name} havası yükleniyor…`}</span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}
