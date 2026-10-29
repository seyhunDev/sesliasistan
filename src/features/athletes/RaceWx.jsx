"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { CockpitWind } from "@/features/home/CockpitWind";
import { useWindObs } from "@/features/weather/useWindObs";
import { RegionMap } from "@/features/weather/RegionMap";
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
export function DayChart({ rows, day, at, fill = false }) {
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
      <div className={`mt-2 ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}>
        <CockpitWind key={day} rows={rows} date={day} place={at} far fill={fill} />
      </div>
    </>
  );
}

// Yüklenirken: DayChart'ın biçiminde (sıcaklık satırı + grafik) yanıp sönen yer tutucu
export function Wait() {
  return (
    <div className="animate-pulse" role="status" aria-label="Hava yükleniyor">
      <div className="flex h-[2.6875rem] items-center gap-3">
        <span className="h-9 w-16 rounded-xl bg-white/12" />
        <span className="flex-1 space-y-1.5">
          <span className="block h-3.5 w-28 rounded-full bg-white/12" />
          <span className="block h-3 w-16 rounded-full bg-white/10" />
        </span>
        <span className="h-7 w-20 rounded-xl bg-white/12" />
      </div>
      <div className="ck-glass mt-2 h-[13.4375rem] rounded-2xl" />
    </div>
  );
}

// Yarış sayfasının üstünde (lacivert) tek hava yeri (Seyhun 2026-10-26: "hava durumunu birçok yerde gösteriyoruz… günlere göre
// seçebiliyoruz ya, o çok güzel"): yarış günleri gün gün, güne dokununca grafik o güne geçer. Ayrı Hava sekmesi ve Multimedya'daki
// Hava kalktı. Tahmin henüz çıkmadıysa (ilk gün 16 günden ileride) hiç görünmez.
// day: açılışta seçili gün (yarış günü akşamı yarın, RaceDayTop)
export function RaceWx({ r, day = "", mini = false }) {
  const today = todayStr();
  const days = raceDays(r);
  const first = days.find((d) => d >= today) || days[days.length - 1] || "";
  const [sel, setSel] = useState(days.includes(day) ? day : first);
  const [tick, setTick] = useState(0);
  const [pick, setPick] = useState(false);
  const late = sel && sel > lastForecastDay(today);
  const d = useDay(r, late ? "" : sel, tick);
  const sp = cleanSpot(r.spot);
  // Gerçekleşen rüzgâr en yakın istasyondan (grafikle aynı istek, önbellekten): hangi istasyon ve uzaklığı başlıkta yazar
  const ob = useWindObs(d.at, late ? "" : sel, today, true);
  const st = ob?.rows?.length ? ob.station : null;
  if (!first || first > lastForecastDay(today)) return null;
  return (
    <section className={`mt-4 ${mini ? "flex flex-1 flex-col" : ""}`} aria-label="Yarış havası">
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/65">
          Hava · {d.place || sp?.name || r.district || r.city}
          {st && ` · ölçüm ${st.name} ${String(st.km).replace(".", ",")} km`}
        </span>
        {/* gün seçimi üstte tek düğme (Seyhun 2026-10-29: multimedyadaki gibi; alttaki gün şeridi kalktı) */}
        {days.length > 1 && (
          <button type="button" data-cur={sel} onClick={() => setPick(true)} data-press className="raised flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[0.8125rem] font-semibold tabular-nums">
            {sel === today ? "Bugün" : new Date(`${sel}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
            <span aria-hidden="true" className="text-[0.6875rem] opacity-70">▾</span>
          </button>
        )}
        <button type="button" onClick={() => setTick((n) => n + 1)} aria-label="Yenile" data-press className="btn btn-round size-8">
          <Icon name="load" className="size-4" />
        </button>
      </div>
      {/* Seyhun 2026-10-26: gün değişince yüklenirken alan küçülüp sayfa zıplıyordu; her durumda grafikle aynı yükseklik */}
      <div className="flex min-h-[16.625rem] flex-col">
        {late ? (
          <p className="m-auto text-center text-[0.875rem] text-white/70">Tahmin {new Date(`${forecastFrom(sel)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinden sonra çıkar.</p>
        ) : d.rows?.length ? (
          <DayChart rows={d.rows} day={sel} at={d.at} />
        ) : d.err ? (
          <p className="m-auto text-center text-[0.875rem] text-white/70">Hava tahmini alınamadı.</p>
        ) : (
          <Wait />
        )}
      </div>
      <Sheet open={pick} onClose={() => setPick(false)} title="Gün">
        <ul className="divide-y divide-line border-y border-line">
          {days.map((x, i) => (
            <li key={x}>
              <button type="button" data-day={x} aria-pressed={x === sel} onClick={() => (setSel(x), setPick(false))} data-press="row" className="flex w-full items-center gap-3 py-3 text-left">
                <b className="w-16 shrink-0 text-[0.9375rem] font-semibold tabular-nums">{new Date(`${x}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</b>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{i + 1}. gün{x === today ? " · Bugün" : ""}</span>
                {x === sel && <span className="size-2.5 shrink-0 rounded-full bg-acc" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      {/* Bölge haritası (Seyhun 2026-10-28: "yarışların havasında da aynı haritayı görmek istiyorum"): yarış yerinin çevresi, rüzgâr / yağış,
          −2 sa … +12 kaydırıcı. Dokunmak yarışın yerini değiştirmez. */}
      {d.at && (
        <div className={mini ? "mt-3 flex min-h-[4.5rem] flex-1 flex-col" : "mt-3"}>
          {mini ? (
            <RegionMap mini className="min-h-[4.5rem] flex-1" place={d.at} station={ob?.station?.km <= 30 ? ob.station : null} obs={sel === today && ob?.station?.km <= 30 ? ob?.rows : null} />
          ) : (
            <RegionMap place={d.at} station={ob?.station?.km <= 30 ? ob.station : null} obs={sel === today && ob?.station?.km <= 30 ? ob?.rows : null} />
          )}
        </div>
      )}
    </section>
  );
}
