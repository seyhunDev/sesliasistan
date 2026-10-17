"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { TodayWind, WeatherDetail } from "@/features/weather/DaySheet";
import { dayHours, getPlace, nowOf, sky, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";

// Başlığın altındaki hava satırı: simge, sıcaklık, gökyüzü, rüzgâr ve yeşil ›; çerçevesiz (Seyhun: "kenarlık gerek yok"), dokunulabildiği yeşil oktan belli.
// Dokununca bugünün özeti ve rüzgâr grafiği açılır.
export function HomeHero({ weather }) {
  const { w, err, refresh } = weather;
  const [open, setOpen] = useState(false);
  const n = nowOf(w);
  const s = n ? sky(n.code, n.day) : null;
  const place = getPlace();

  return (
    <>
      <button
        type="button"
        onClick={() => (w ? setOpen(true) : refresh(true))}
        aria-label="Bugünün hava ayrıntısı"
        className="-ml-0.5 mt-0.5 flex max-w-full items-center gap-1.5 py-0.5 text-left text-[0.8125rem] text-mut"
      >
        {n ? (
          <>
            <Icon name={s.icon} className="size-4 shrink-0 text-acc" />
            <span className="truncate tabular-nums">
              <b className="font-semibold text-fg">{n.t}°</b> · {s.label} · {n.wind} kn {windName(n.dir)[1]}
            </span>
          </>
        ) : (
          <span className="truncate">{err ? "Hava durumu alınamadı · dokun, yenile" : `${place.name} havası yükleniyor…`}</span>
        )}
        <span aria-hidden className="shrink-0 text-[1rem] font-semibold leading-none text-acc">›</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}

// Başlığın altında bugünün rüzgâr grafiği (Seyhun: "ana sayfadaki hava alanında o grafik, hangi saatteysek orada nokta").
// Çerçevesiz, başlığın hemen altında; dokununca hava penceresi açılır ("Ayrıntı ›"). Hava gelmediyse çizilmez.
export function HomeWind({ weather }) {
  const { w, refresh } = weather;
  const [open, setOpen] = useState(false);
  const rows = dayHours(w, todayStr());
  if (!rows?.length) return null;
  const place = getPlace();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Bugünün rüzgârı, ayrıntı" className="mt-1 block w-full overflow-hidden text-left">
        <span className="flex items-center justify-between px-1 text-[0.8125rem] text-mut">
          <span><b className="font-semibold text-fg">Rüzgâr</b> · bugün, kn</span>
          <span className="font-medium text-acc">Ayrıntı <span aria-hidden className="text-[1rem] leading-none">›</span></span>
        </span>
        <TodayWind rows={rows} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}
