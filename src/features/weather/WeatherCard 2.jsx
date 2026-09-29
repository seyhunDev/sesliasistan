"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PLACE, cached, loadWeather, sky, windLevel, windName } from "./weather";

const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: PLACE.tz });
const dayName = (s) => DAY.format(new Date(`${s}T12:00:00`)).replace(".", "");

// Rüzgârın estiği yönü gösteren ok (meteoroloji "geldiği yön" verir, ok 180° çevrilir)
function WindArrow({ deg, className = "size-3" }) {
  return (
    <span className="inline-grid place-items-center" style={{ transform: `rotate(${deg + 180}deg)` }} aria-hidden>
      <Icon name="arrow" className={`${className} [stroke-width:2.75]`} />
    </span>
  );
}

// Tek sütun: üstte etiket, ortada simge + sıcaklık, altta rüzgâr (kn)
function Col({ label, icon, temp, wind, dir, strong }) {
  const l = windLevel(wind);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[11px] ${strong ? "font-semibold text-fg" : "text-mut"}`}>{label}</span>
      <Icon name={icon} className="my-0.5 size-[18px] text-fg/75" />
      <span className="text-[13px] font-medium tabular-nums">{temp}°</span>
      <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${l.tone}`}>
        <WindArrow deg={dir} />
        {wind}
      </span>
    </div>
  );
}

// Ana sayfada Dikili: şimdi + rüzgâr, sonraki saatler (3 saatte bir), sonraki 5 gün. Rüzgâr knot.
export function WeatherCard() {
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
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  if (!w) {
    return (
      <button onClick={() => refresh(true)} className="w-full rounded-2xl bg-card px-4 py-3 text-left text-[14px] text-mut shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        {err ? "Hava durumu alınamadı · tekrar dene" : `${PLACE.name} hava durumu yükleniyor…`}
      </button>
    );
  }

  const n = w.now;
  const s = sky(n.code, n.day);
  const lvl = windLevel(n.wind);
  const [wn] = windName(n.dir);
  const hours = w.hours.filter((_, i) => i % 3 === 0).slice(0, 5); // 5 sütun: +1, +4, +7, +10, +13 saat

  return (
    <section className="rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      {/* Şimdi: sıcaklık solda, rüzgâr sağda */}
      <button onClick={() => refresh(true)} className="flex w-full items-center gap-2.5 text-left" aria-label="Hava durumunu yenile">
        <Icon name={s.icon} className="size-7 shrink-0 text-acc" />
        <span className="text-[24px] font-semibold leading-none tracking-tight tabular-nums">{n.t}°</span>
        <span className="min-w-0 truncate text-[13px] text-mut" title={s.label}>
          {PLACE.name}
        </span>
        <span className={`ml-auto flex shrink-0 items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[13px] font-semibold tabular-nums ${lvl.tone}`}>
          <WindArrow deg={n.dir} className="size-3.5" />
          {wn} {n.wind}
          <span className="font-normal text-mut">/{n.gust} kn</span>
        </span>
      </button>

      {/* Sonraki saatler | sonraki 5 gün */}
      <div className="mt-3 grid grid-cols-5 gap-1 border-t border-line pt-2.5">
        {hours.map((h) => (
          <Col key={h.time} label={`${h.hh}:00`} icon={sky(h.code, h.day).icon} temp={h.t} wind={h.wind} dir={h.dir} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 border-t border-line pt-2.5">
        {w.days.map((d) => (
          <Col key={d.date} label={dayName(d.date)} strong icon={sky(d.code).icon} temp={d.max} wind={d.wind} dir={d.dir} />
        ))}
      </div>
    </section>
  );
}
