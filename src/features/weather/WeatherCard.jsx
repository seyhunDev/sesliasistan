"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { PLACE, cached, dayHours, loadWeather, sky, windLevel, windName } from "./weather";
import { Col, WindArrow } from "./parts";
import { DayDetail } from "./DaySheet";
import { Loading } from "@/components/ui/Loader";

const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: PLACE.tz });
const dayName = (s) => DAY.format(new Date(`${s}T12:00:00`)).replace(".", "");
const LONG = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: PLACE.tz });

// Ana sayfada Dikili, açılır kart. Kapalıyken tek satır: gökyüzü, sıcaklık, yer, rüzgâr (knot).
// Dokununca açılır: sonraki saatler (3 saatte bir) ve sonraki 5 gün; güne (ya da saatler satırına = bugün) dokununca
// o günün detayı ve saatlik rüzgâr grafiği açılır. Açık/kapalı tercihi bu cihazda hatırlanır.
const OPEN_KEY = "sa-wx-open";
export function WeatherCard() {
  const [w, setW] = useState(() => (typeof window === "undefined" ? null : cached()));
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(null); // açık günün tarihi
  const [more, setMore] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setMore((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });

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
      <button onClick={() => refresh(true)} className="w-full rounded-2xl bg-card px-4 py-3 text-left text-[0.875rem] text-mut shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        {err ? "Hava durumu alınamadı · tekrar dene" : `${PLACE.name} hava durumu yükleniyor…`}
      </button>
    );
  }

  const n = w.now;
  const s = sky(n.code, n.day);
  const lvl = windLevel(n.wind);
  const [wn] = windName(n.dir);
  const hours = w.hours.filter((_, i) => i % 3 === 0).slice(0, 5); // 5 sütun: +1, +4, +7, +10, +13 saat
  const today = w.today?.date || w.hours[0]?.time.slice(0, 10);
  const rows = open ? dayHours(w, open) : null;
  const show = (date) => {
    setOpen(date);
    if (!w.hourly) refresh(true); // eski önbellekte saatlik gün verisi yok
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]" aria-label="Hava durumu">
      {/* Özet (tek satır): dokununca detay açılır/kapanır */}
      <button type="button" onClick={toggle} aria-expanded={more} className="flex h-14 w-full items-center gap-2.5 px-4 text-left active:bg-bg">
        <Icon name={s.icon} className="size-6 shrink-0 text-acc" />
        <span className="text-[1.25rem] font-semibold leading-none tracking-tight tabular-nums">{n.t}°</span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[0.8125rem] font-semibold">{PLACE.name}</b>
          <small className="block truncate text-[0.75rem] text-mut">{s.label}</small>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[0.8125rem] font-semibold tabular-nums ${lvl.tone}`}>
          <WindArrow deg={n.dir} className="size-3.5" />
          {wn} {n.wind}
          <span className="font-normal text-mut">/{n.gust} kn</span>
        </span>
        <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${more ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {/* Detay: sonraki saatler | sonraki 5 gün */}
      {more && (
        <div className="fade-in px-4 pb-3">
          <button onClick={() => show(today)} aria-label="Bugünün detayı" className="grid w-full grid-cols-5 gap-1 border-t border-line pt-2.5 transition active:opacity-60">
            {hours.map((h) => (
              <Col key={h.time} label={`${h.hh}:00`} icon={sky(h.code, h.day).icon} temp={h.t} wind={h.wind} dir={h.dir} />
            ))}
          </button>
          <div className="mt-2 grid grid-cols-5 gap-1 border-t border-line pt-2.5">
            {w.days.map((d) => (
              <button key={d.date} onClick={() => show(d.date)} aria-label={`${LONG.format(new Date(`${d.date}T12:00:00`))} detayı`} className="rounded-xl py-0.5 transition active:scale-95 active:bg-bg">
                <Col label={dayName(d.date)} strong icon={sky(d.code).icon} temp={d.max} wind={d.wind} dir={d.dir} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => refresh(true)} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[0.75rem] font-semibold text-mut active:bg-bg">
            <Icon name="load" className="size-3.5" /> Yenile
          </button>
        </div>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? LONG.format(new Date(`${open}T12:00:00`)) : ""}>
        {rows?.length ? (
          <DayDetail key={open} date={open} rows={rows} info={open === today ? w.today : w.days.find((d) => d.date === open)} />
        ) : err ? (
          <p className="py-8 text-center text-[0.875rem] text-mut">Hava durumu alınamadı</p>
        ) : (
          <Loading className="py-8" />
        )}
      </Sheet>
    </section>
  );
}
