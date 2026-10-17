"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { TodayWind, WeatherDetail } from "@/features/weather/DaySheet";
import { dayHours, getPlace, nowOf, sky, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";

// Başlığın altındaki hava: solda havaya göre simge (güneş, ay, bulut, yağmur…; kendi renginde), büyük sıcaklık, yanında durum ve
// "Karayel 11 kn · 9° / 22°" (rüzgârın adı ve hızı, günün en düşük/en yüksek sıcaklığı) ve yeşil ›; çerçevesiz. Değerler nowOf ile bu saatin.
// Dokununca bugünün özeti ve rüzgâr grafiği açılır.
const SKY_TONE = { sun: "text-[#d39a2c]", moon: "text-[#7f8daa]", cloudSun: "text-[#c9953a]", cloud: "text-[#8a9099]", fog: "text-[#8a9099]", rain: "text-[#4f7fae]", storm: "text-[#5d6f9e]", snow: "text-[#7fa6c9]" };
export function HomeHero({ weather }) {
  const { w, err, refresh } = weather;
  const [open, setOpen] = useState(false);
  const n = nowOf(w);
  const s = n ? sky(n.code, n.day) : null;
  const place = getPlace();
  const today = todayStr();
  const day = w?.today?.date === today ? w.today : w?.days?.find((d) => d.date === today);

  return (
    <>
      <button
        type="button"
        onClick={() => (w ? setOpen(true) : refresh(true))}
        aria-label="Bugünün hava ayrıntısı"
        className="-ml-0.5 mt-1.5 flex max-w-full items-center gap-2.5 py-0.5 text-left"
      >
        {n ? (
          <>
            <Icon name={s.icon} className={`size-8 shrink-0 ${SKY_TONE[s.icon] || "text-acc"}`} />
            <span className="shrink-0 text-[1.875rem] font-semibold leading-none tracking-[-.02em] tabular-nums text-fg">{n.t}°</span>
            <span className="min-w-0 text-[0.84375rem] leading-tight">
              <b className="block truncate font-semibold text-fg">{s.label}</b>
              <span className="block truncate tabular-nums text-mut">
                {windName(n.dir)[0]} {n.wind} kn{day ? ` · ${day.min}° / ${day.max}°` : ""}
              </span>
            </span>
          </>
        ) : (
          <span className="truncate text-[0.8125rem] text-mut">{err ? "Hava durumu alınamadı · dokun, yenile" : `${place.name} havası yükleniyor…`}</span>
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
