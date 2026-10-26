"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { CockpitWind } from "@/features/home/CockpitWind";
import { WindArrow } from "@/features/weather/parts";
import { kn, sky, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";
import { cleanSpot, forecastFrom, lastForecastDay, loadRaceDay, raceDays } from "./raceWeather";

// Yarışın havası, hava sayfasıyla aynı tasarım (Seyhun 2026-10-26: "bizim hava durumu sayfamızda kullandığımız tasarımın aynısı"):
// üstte sıcaklık, gök, rüzgâr; altında aynı büyük grafik (CockpitWind; yarış yerinin ölçümüyle). Veri loadRaceDay (Multimedya › Hava ile ortak).

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

// Yarış günü: Multimedya'nın altında bugünün havası (veri yoksa hiçbir şey)
export function RaceDayWx({ r, day }) {
  const d = useDay(r, day);
  if (d.loading) return <div className="ck-glass mt-3 h-[12rem] animate-pulse rounded-2xl" aria-label="Hava yükleniyor" />;
  if (!d.rows?.length) return null;
  return (
    <div className="mt-4">
      <DayChart rows={d.rows} day={day} at={d.at} />
    </div>
  );
}

// Hava sekmesi: yarış günleri gün gün (güne dokununca grafik o güne geçer), altında saat saat liste
export function RaceWxTab({ r }) {
  const today = todayStr();
  const days = raceDays(r);
  const first = days.find((d) => d >= today) || days[days.length - 1] || "";
  const [sel, setSel] = useState(first);
  const [tick, setTick] = useState(0);
  const late = sel && sel > lastForecastDay(today);
  const d = useDay(r, late ? "" : sel, tick);
  const sp = cleanSpot(r.spot);
  if (!days.length) return <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-6 text-center text-[0.875rem] text-mut">Yarışın tarihi yazılınca hava burada görünür.</p>;
  return (
    <>
      <section className="ck mt-4 rounded-[1.75rem] px-4 pb-4 pt-4" aria-label="Yarış havası">
        <div className="mb-3 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/65">{d.place || sp?.name || r.district || r.city}</span>
          <button type="button" onClick={() => setTick((n) => n + 1)} aria-label="Yenile" data-press className="btn btn-round size-8">
            <Icon name="load" className="size-4" />
          </button>
        </div>
        {late ? (
          <p className="py-8 text-center text-[0.875rem] text-white/70">Tahmin {new Date(`${forecastFrom(sel)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinden sonra çıkar.</p>
        ) : d.rows?.length ? (
          <DayChart rows={d.rows} day={sel} at={d.at} />
        ) : d.err ? (
          <p className="py-8 text-center text-[0.875rem] text-white/70">{d.err}</p>
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
      {d.rows?.length > 0 && !late && (
        <section className="mt-5">
          <ListHead title="Saat saat" />
          <RowList>
            {d.rows
              .filter((h) => sel !== today || +h.hh >= +nowHH())
              .map((h) => (
                <Row
                  key={h.time}
                  lead={<b className="w-9 text-[0.9375rem] font-semibold tabular-nums">{h.hh}</b>}
                  title={
                    <span className="flex items-center gap-2">
                      {h.code != null && <Icon name={sky(h.code, h.day).icon} className="size-5 text-acc" />}
                      {h.t != null && <span className="tabular-nums">{Math.round(h.t)}°</span>}
                      {h.rain >= 30 && <span className="text-[0.8125rem] font-normal text-mut tabular-nums">%{h.rain}</span>}
                      <span className="flex items-center gap-1 text-[0.8125rem] font-normal text-mut">
                        <WindArrow deg={h.dir} className="size-3" />
                        {windName(h.dir)[0]}
                      </span>
                    </span>
                  }
                  right={
                    <b className={`text-[0.9375rem] font-semibold tabular-nums ${h.wind >= 17 ? "text-warn" : ""}`}>
                      {kn(Math.round(h.wind), Math.round(h.gust))}
                      <span className="text-[0.75rem] font-normal text-mut"> kn</span>
                    </b>
                  }
                />
              ))}
          </RowList>
        </section>
      )}
    </>
  );
}
