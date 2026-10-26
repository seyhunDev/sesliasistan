"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CockpitWind } from "@/features/home/CockpitWind";
import { kn, sky, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";
import { cleanSpot, forecastFrom, lastForecastDay, loadRaceDay, raceDays } from "./raceWeather";

// Yarışın havası, hava sayfasıyla aynı tasarım (Seyhun 2026-10-26: "bizim hava durumu sayfamızda kullandığımız tasarımın aynısı"):
// üstte sıcaklık, gök, rüzgâr; altında aynı büyük grafik (CockpitWind; yarış yerinin ölçümüyle). Veri loadRaceDay (antrenman günü › Hava ile ortak).

function useDay(r, day, tick = 0) {
  const [got, setGot] = useState({ key: "", rows: null, place: "", err: "" });
  const key = `${r.id}|${day}|${tick}|${r.spot?.lat ?? ""}`;
  useEffect(() => {
    if (!day) return;
    let on = true;
    loadRaceDay(r, day, tick > 0).then(
      (d) => on && setGot({ key, rows: d.rows, place: d.place, at: d.lat != null ? { lat: d.lat, lon: d.lon } : null, err: "" }),
      (e) => on && setGot({ key, rows: null, place: "", err: e?.message || "Hava tahmini alınamadı" }),
    );
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return got.key === key ? got : { rows: null, err: "", loading: true };
}

const nowHH = () => String(new Date().getHours()).padStart(2, "0");

// Sıcaklık · gök · rüzgâr satırı ve grafik (lacivert zeminde)
function DayChart({ rows, day, at }) {
  const today = todayStr();
  const isToday = day === today;
  const top = rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]);
  const v = (isToday && rows.find((h) => h.hh === nowHH())) || top;
  const ts = rows.map((h) => h.t).filter((t) => t != null);
  return (
    <>
      <div className="flex items-center gap-3">
        {v.t != null && <span className="shrink-0 text-[2.25rem] font-bold leading-none tracking-[-.04em] tabular-nums">{Math.round(v.t)}°</span>}
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[0.9375rem] font-semibold">{v.code != null ? sky(v.code, v.day).label : ""}</b>
          {ts.length > 0 && <small className="block truncate text-[0.8125rem] tabular-nums text-white/65">{Math.round(Math.min(...ts))}° / {Math.round(Math.max(...ts))}°</small>}
        </span>
        <span className="shrink-0 text-right leading-tight">
          <small className="block text-[0.75rem] text-white/65">
            {windName(v.dir)[0]} · {isToday && v !== top ? "şimdi" : `en sert ${top.hh}:00`}
          </small>
          <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
            {kn(Math.round(v.wind), Math.round(v.gust))}
            <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
          </b>
        </span>
      </div>
      <div className="mt-2">
        <CockpitWind key={day} rows={rows} date={day} place={at} />
      </div>
    </>
  );
}

// Yarış sayfasının üstünde (lacivert) tek hava yeri (Seyhun 2026-10-26: "hava durumunu birçok yerde gösteriyoruz… günlere göre
// seçebiliyoruz ya, o çok güzel"): yarış günleri gün gün, güne dokununca grafik o güne geçer. Ayrı Hava sekmesi ve Multimedya'daki
// Hava kalktı. Tahmin henüz çıkmadıysa (ilk gün 16 günden ileride) hiç görünmez.
export function RaceWx({ r }) {
  const today = todayStr();
  const days = raceDays(r);
  const first = days.find((d) => d >= today) || days[days.length - 1] || "";
  const [sel, setSel] = useState(first);
  const [tick, setTick] = useState(0);
  const late = sel && sel > lastForecastDay(today);
  const d = useDay(r, late ? "" : sel, tick);
  const sp = cleanSpot(r.spot);
  if (!first || first > lastForecastDay(today)) return null;
  return (
    <section className="mt-4" aria-label="Yarış havası">
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/65">Hava · {d.place || sp?.name || r.district || r.city}</span>
        <button type="button" onClick={() => setTick((n) => n + 1)} aria-label="Yenile" data-press className="btn btn-round size-8">
          <Icon name="load" className="size-4" />
        </button>
      </div>
      {late ? (
        <p className="py-8 text-center text-[0.875rem] text-white/70">Tahmin {new Date(`${forecastFrom(sel)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinden sonra çıkar.</p>
      ) : d.rows?.length ? (
        <DayChart rows={d.rows} day={sel} at={d.at} />
      ) : d.err ? (
        <p className="py-8 text-center text-[0.875rem] text-white/70">Hava tahmini alınamadı.</p>
      ) : (
        <div className="ck-glass h-[12rem] animate-pulse rounded-2xl" aria-label="Hava yükleniyor" />
      )}
      {days.length > 1 && (
        <nav aria-label="Günler" className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 6)}, minmax(0, 1fr))` }}>
          {days.slice(0, 6).map((x) => {
            const on = x === sel;
            const dt = new Date(`${x}T12:00:00`);
            return (
              <button key={x} type="button" data-press aria-pressed={on} onClick={() => setSel(x)} className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 ${on ? "bg-white text-[#11203a]" : ""}`}>
                <small className={`text-[0.75rem] font-semibold capitalize ${on ? "" : "text-white/60"}`}>{x === today ? "Bugün" : dt.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")}</small>
                <b className="text-[1.5rem] font-bold leading-none tracking-[-.03em] tabular-nums">{dt.getDate()}</b>
              </button>
            );
          })}
        </nav>
      )}
    </section>
  );
}
