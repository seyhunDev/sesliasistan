"use client";

import { useEffect, useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Loading } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { DayDetail } from "@/features/weather/DaySheet";
import { windLevel } from "@/features/weather/weather";
import { loadRaceDay } from "@/features/athletes/raceWeather";
import { addWind, saveWind } from "@/features/athletes/raceLiveStore";
import { Bar } from "@/features/training/Countdown";
import { DIRS, atOf, dayOf, dirShort, hm, marksFor, windOn } from "@/lib/raceLive";

// Hava: yarış yerinin o günkü saatlik tahmini, hava sayfasındaki grafiğin aynısı (DayDetail); elle yazılan rüzgâr grafikte içi boş nokta.
// "Rüzgar yaz": yön + şiddet, saat kendiliğinden (değiştirilebilir). Satıra dokununca kayıt silinir (sorar).
export function WeatherTab({ orgId, race, day, live, onChange }) {
  const [wx, setWx] = useState({ day: "", rows: null, err: "" });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let on = true;
    loadRaceDay(race, day).then(
      (d) => on && setWx({ day, rows: d.rows, place: d.place, err: "" }),
      (e) => on && setWx({ day, rows: null, err: e?.message || "Hava tahmini alınamadı" }),
    );
    return () => {
      on = false;
    };
  }, [race, day]);

  const list = windOn(live.wind, day);
  const rows = wx.day === day ? wx.rows : null;
  const marks = rows ? marksFor(rows, list) : [];
  const drop = (w) => {
    if (!confirm(`${hm(w.at)} rüzgâr kaydı silinsin mi?`)) return;
    const next = live.wind.filter((x) => x !== w);
    onChange({ wind: next }, () => saveWind(orgId, race.id, next));
  };

  return (
    <>
      <section className={`${card} mt-3 px-4 pb-3 pt-4`}>
        {rows ? (
          <DayDetail date={day} rows={rows} marks={marks} />
        ) : wx.day === day && wx.err ? (
          <p className="py-6 text-center text-[0.875rem] text-mut">{wx.err}</p>
        ) : (
          <Loading label="Hava yükleniyor" className="py-8" />
        )}
      </section>
      {wx.place && rows && <p className="mt-1.5 px-1 text-right text-[0.6875rem] text-mut">{wx.place} · Open-Meteo</p>}

      {list.length > 0 && (
        <>
          <Label right={list.length}>Ölçülen</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {[...list].reverse().map((w) => (
              <li key={w.at + w.src}>
                <button type="button" onClick={() => drop(w)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                  <span className="flex-1 text-[0.9375rem] font-medium tabular-nums">{hm(w.at)}</span>
                  <span className="text-[0.875rem] text-mut tabular-nums">
                    {dirShort(w.dir)} · <b className={`font-semibold ${windLevel(w.kn).tone}`}>{w.kn} kn</b>
                    {w.gust ? ` · sağanak ${w.gust}` : ""}
                    {w.src !== "elle" ? ` · ${w.src}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <WindSheet
        open={open}
        onClose={() => setOpen(false)}
        day={day}
        last={list[list.length - 1]}
        onSave={(w) => {
          setOpen(false);
          onChange((l) => ({ wind: [...l.wind, w] }), () => addWind(orgId, race.id, w));
        }}
      />
      <Bar>
        <button type="button" onClick={() => setOpen(true)} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">
          Rüzgar yaz
        </button>
      </Bar>
    </>
  );
}

// Rüzgâr kaydı: nereden esiyor (8 yön), knot, saat (şimdi), sağanak (isteğe bağlı)
const GRID = ["KB", "K", "KD", "B", "", "D", "GB", "G", "GD"];
export function WindSheet({ open, onClose, day, last, onSave }) {
  return (
    <Sheet open={open} onClose={onClose} title="Rüzgar">
      {open && <WindForm day={day} last={last} onSave={onSave} />}
    </Sheet>
  );
}
function WindForm({ day, last, onSave }) {
  const now = new Date().toISOString();
  const [dir, setDir] = useState(last?.dir ?? null);
  const [kn, setKn] = useState(last?.kn ?? 10);
  const [gust, setGust] = useState(0);
  const [time, setTime] = useState(dayOf(now) === day ? hm(now) : "12:00");
  const deg = Object.fromEntries(DIRS);
  const step = "grid size-12 place-items-center rounded-full bg-bg text-[1.5rem] text-fg2 active:scale-95";
  return (
    <div className="pb-2">
      <p className="mb-2 text-[0.875rem] font-semibold text-fg2">Nereden esiyor</p>
      <div className="mx-auto grid w-[13.5rem] grid-cols-3 gap-2">
        {GRID.map((d, i) =>
          d ? (
            <button key={d} type="button" onClick={() => setDir(deg[d])} aria-pressed={dir === deg[d]} className={`h-14 rounded-2xl text-[1rem] font-semibold active:scale-95 ${dir === deg[d] ? "bg-acc text-white" : "bg-bg text-fg2"}`}>
              {d}
            </button>
          ) : (
            <span key={i} className="grid place-items-center text-[0.75rem] text-mut">{last ? `son ${dirShort(last.dir)}` : ""}</span>
          ),
        )}
      </div>
      <p className="mb-2 mt-5 text-[0.875rem] font-semibold text-fg2">Şiddet</p>
      <div className="flex items-center justify-center gap-5">
        <button type="button" aria-label="Azalt" onClick={() => setKn((v) => Math.max(0, v - 1))} className={step}>−</button>
        <b className="min-w-[6.5rem] text-center text-[2.75rem] font-semibold tabular-nums">
          {kn}
          <small className="ml-1 text-[1.0625rem] font-medium text-mut">kn</small>
        </b>
        <button type="button" aria-label="Artır" onClick={() => setKn((v) => Math.min(60, v + 1))} className={step}>+</button>
      </div>
      <div className="mt-5 divide-y divide-line border-y border-line">
        <label className="flex items-center justify-between py-3 text-[0.9375rem]">
          <span className="text-mut">Saat</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent text-right font-semibold tabular-nums outline-none" />
        </label>
        <div className="flex items-center justify-between py-2 text-[0.9375rem]">
          <span className="text-mut">Sağanak</span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label="Sağanak azalt" onClick={() => setGust((v) => (v <= kn + 1 ? 0 : v - 1))} className="grid size-9 place-items-center rounded-full bg-bg text-fg2">−</button>
            <b className="w-14 text-center font-semibold tabular-nums">{gust ? `${gust} kn` : "yok"}</b>
            <button type="button" aria-label="Sağanak artır" onClick={() => setGust((v) => Math.min(80, Math.max(v + 1, kn + 2)))} className="grid size-9 place-items-center rounded-full bg-bg text-fg2">+</button>
          </span>
        </div>
      </div>
      <button
        type="button"
        disabled={dir === null}
        onClick={() => onSave({ at: atOf(day, time), dir, kn, gust: gust || null, src: "elle" })}
        className="mt-5 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px disabled:opacity-40"
      >
        Kaydet
      </button>
    </div>
  );
}
