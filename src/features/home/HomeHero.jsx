"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { TodayWind, WeatherDetail } from "@/features/weather/DaySheet";
import { dayHours, dirDeg, getPlace, nowOf, sky, skyTone, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";

// Hava kartının üstü (OwnerHome): solda havaya göre simge (güneş, ay, bulut, yağmur…; kendi renginde, skyTone), büyük sıcaklık, yanında durum ve
// "Karayel 11 kn · 9° / 22°" (rüzgârın adı ve hızı, günün en düşük/en yüksek sıcaklığı); çerçevesiz, ok yok (Seyhun: "o oku da kaldır"). Değerler nowOf ile bu saatin.
// Dokununca bugünün özeti ve rüzgâr grafiği açılır.
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
        className="flex max-w-full items-center gap-3 text-left"
      >
        {n ? (
          <>
            <Icon name={s.icon} className={`size-9 shrink-0 ${skyTone(s.icon)}`} />
            <span className="shrink-0 text-[2.5rem] font-light leading-none tracking-[-.02em] tabular-nums text-fg">{n.t}°</span>
            <span className="min-w-0 text-[0.875rem] leading-snug">
              <b className="block truncate font-semibold text-fg">{s.label}</b>
              <span className="block truncate tabular-nums text-mut">
                {windName(n.dir)[0]} {dirDeg(n.dir)} · {n.wind} kn{day ? ` · ${day.min}° / ${day.max}°` : ""}
              </span>
            </span>
          </>
        ) : (
          <span className="truncate text-[0.8125rem] text-mut">{err ? "Hava durumu alınamadı · dokun, yenile" : `${place.name} havası yükleniyor…`}</span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}

// Başlığın altında bugünün rüzgâr grafiği (Seyhun: "ana sayfadaki hava alanında o grafik, hangi saatteysek orada nokta").
// Çerçevesiz, başlığın hemen altında, üstünde yazı yok (Seyhun: "bir tane buton olması lazım"; hava penceresini hava satırı ya da grafiğe dokunmak açar).
// Grafiğe dokununca da aynı pencere açılır. Hava gelmediyse çizilmez.
export function HomeWind({ weather }) {
  const { w, refresh } = weather;
  const [open, setOpen] = useState(false);
  const rows = dayHours(w, todayStr());
  if (!rows?.length) return null;
  const place = getPlace();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Bugünün rüzgârı, ayrıntı" className="mt-2 block w-full overflow-hidden text-left">
        <TodayWind rows={rows} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </>
  );
}
