"use client";

import { useEffect, useRef, useState } from "react";
import { DayNav } from "@/features/weather/DayNav";
import { HourTable } from "@/features/weather/HourTable";
import { WindRibbon } from "@/features/weather/WindRibbon";
import { useWindObs } from "@/features/weather/useWindObs";
import { RegionMap } from "@/features/weather/RegionMap";
import { NowRain } from "@/features/weather/NowRain";
import { useRainRadar } from "@/features/weather/useRainRadar";
import { radarRows } from "@/features/weather/rainLine";
import { dirDeg, kn, sky, windName } from "@/features/weather/weather";
import { todayStr } from "@/lib/utils/format";
import { forecastFrom, lastForecastDay, loadRaceDay, raceDays, wxDays } from "./raceWeather";
import { Fold, RaceGo, RaceStats } from "./raceUi";

// Yarışın havası, hava sayfasıyla aynı tasarım (Seyhun 2026-10-26: "bizim hava durumu sayfamızda kullandığımız tasarımın aynısı"):
// üstte sıcaklık, gök, rüzgâr; altında aynı saat saat tablo (HourTable; yarış yerinin ölçümüyle; Seyhun 2026-11-03 "her yerde ortak tasarım"). Veri loadRaceDay (antrenman günü › Hava ile ortak).

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
export function DayChart({ rows: fcRows, day, at, marks = [] }) {
  const today = todayStr();
  const isToday = day === today;
  // Bugün: radar yarışın yerinde yağış görmüyorsa şu anki ve son saatlerin yağmuru gösterilmez (ana sayfa ile aynı); altında turuncu "Şu an" satırı
  const radar = useRainRadar(isToday ? at : null);
  const rows = isToday ? radarRows(fcRows, radar) : fcRows;
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
            {windName(v.dir)[0]} {dirDeg(v.dir)} · {isToday && v !== top ? "şimdi" : `en sert ${top.hh}:00`}
          </small>
          <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
            {kn(Math.round(v.wind), Math.round(v.gust))}
            <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
          </b>
        </span>
      </div>
      <HourTable key={day} rows={rows} date={day} place={at} far marks={marks} className="mt-2.5" />
      {isToday && at && <NowRain place={at} rows={fcRows} radar={radar} />}
    </>
  );
}

// Yüklenirken: DayChart'ın bütün biçimi tek parça (Seyhun 2026-10-31 "hepsi bir bütün olarak loading olmalı… veri gelince o alan büyüyor,
// öyle olmasın"): sıcaklık satırı ve saat saat tablo aynı yerde
// soluk kutular; üstlerinden ince ışık geçer (.ck-shim). Bir gün açıldıktan sonra başka güne geçerken alan son yüksekliğini korur.
export function Wait() {
  return (
    <div role="status" aria-label="Hava yükleniyor">
      <div className="flex h-[2.6875rem] items-center gap-3">
        <span className="ck-shim h-9 w-16 rounded-xl" />
        <span className="flex-1 space-y-1.5">
          <span className="ck-shim block h-3.5 w-28 rounded-full" />
          <span className="ck-shim block h-3 w-16 rounded-full" />
        </span>
        <span className="ck-shim h-7 w-20 rounded-xl" />
      </div>
      <div className="ck-shim mt-2.5 h-[12.875rem] w-full rounded-[1.125rem]" />
    </div>
  );
}

// Yarış sayfasının üstünde (lacivert) tek hava yeri (Seyhun 2026-10-26: "hava durumunu birçok yerde gösteriyoruz… günlere göre
// seçebiliyoruz ya, o çok güzel"): yarış günleri gün gün, güne dokununca grafik o güne geçer. Ayrı Hava sekmesi ve Multimedya'daki
// Hava kalktı. Tahmin henüz çıkmadıysa (ilk gün 16 günden ileride) hiç görünmez.
// day: açılışta seçili gün (yarış günü akşamı yarın, RaceDayTop)
// pinned: gün dışarıdan seçilir (Saha, üstteki tek Bugün ▾; Seyhun 2026-10-30); kendi gün düğmesi çizilmez, kaydırınca onDay(±1)
// Gün ‹ Dün · Bugün · Yarın › satırıyla değişir (DayNav; Seyhun 2026-11-04: kaydırmayla gün değişmez, tablo yalnız yana kayar); yarıştan önceki 5 gün de gezilir (wxDays)
// fill: yarış günü sayfası (RaceDayTop) tek ekran; bölge haritası düğme yerine açık önizleme olarak kalan yeri doldurur, dokununca tam ekran
// (Seyhun 2026-11-03: "harita butonunu daha açık kullanalım, sayfa sığsın")
export function RaceWx({ r, day = "", mini = false, pinned = "", onDay = null, marks = [], fill = false }) {
  const today = todayStr();
  const race = raceDays(r);
  const days = wxDays(r, today);
  const first = pinned || race.find((d) => d >= today) || race[race.length - 1] || "";
  const [own, setSel] = useState(race.includes(day) ? day : first);
  const sel = pinned || own;
  // Son açılan günün alan yüksekliği: başka gün yüklenirken alan küçülüp büyümesin (sayfa zıplamasın)
  const area = useRef(null);
  const [tall, setTall] = useState(0);
  // gün değişmeden hemen önce (kaydırma, gün listesi) açık günün yüksekliği alınır; ResizeObserver grafiğin kendi ölçümüyle döngüye giriyordu
  const keep = () => area.current?.dataset.ready === "1" && setTall(Math.round(area.current.offsetHeight));
  const step = (k) => {
    keep();
    if (pinned) return onDay?.(k);
    const i = days.indexOf(sel) + k;
    if (i >= 0 && i < days.length) setSel(days[i]);
  };
  const late = sel && sel > lastForecastDay(today);
  const d = useDay(r, late ? "" : sel);
  // Gerçekleşen rüzgâr en yakın istasyondan (grafikle aynı istek, önbellekten): hangi istasyon ve uzaklığı başlıkta yazar
  const ob = useWindObs(d.at, late ? "" : sel, today, true);
  if (!first || first > lastForecastDay(today)) return null;
  return (
    <section className={fill ? "mt-4 flex flex-1 flex-col" : "mt-4"} aria-label="Yarış havası">
      {/* Gün değiştirme (Seyhun 2026-11-04 "bugün seçili, yarın / sonraki gün ileri geri"): tek satır ‹ Dün · Bugün · Yarın ›; kaydırmayla gün değişmez, tablo yalnız yana kayar.
          pinned: gün dışarıdan seçilir (Saha), satır çizilmez */}
      {!pinned && days.length > 1 && <DayNav sel={sel} days={days} today={today} onStep={step} />}
      {/* Seyhun 2026-10-26: gün değişince yüklenirken alan küçülüp sayfa zıplıyordu; her durumda grafikle aynı yükseklik */}
      <div ref={area} data-ready={d.rows?.length && !late ? "1" : "0"} className="flex min-h-[16.25rem] flex-col" style={!d.rows?.length && tall ? { minHeight: tall } : undefined}>
        {late ? (
          <p className="m-auto text-center text-[0.875rem] text-white/70">Tahmin {new Date(`${forecastFrom(sel)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinden sonra çıkar.</p>
        ) : d.rows?.length ? (
          <DayChart rows={d.rows} day={sel} at={d.at} marks={marks} />
        ) : d.err ? (
          <p className="m-auto text-center text-[0.875rem] text-white/70">Hava tahmini alınamadı.</p>
        ) : (
          <Wait />
        )}
      </div>
      {/* Bölge haritası (Seyhun 2026-10-28: "yarışların havasında da aynı haritayı görmek istiyorum"): yarış yerinin çevresi, rüzgâr / yağış,
          −2 sa … +24 kaydırıcı ve Oynat, sayfada tablonun altında (inline; tek parmak sayfayı kaydırır). Dokunmak yarışın yerini değiştirmez. */}
      {fill && !late && !d.err && (
        <div className="relative mt-3 flex min-h-[7rem] flex-1 flex-col">
          {d.at ? (
            <RegionMap inline className="flex-1" place={d.at} day={sel} station={ob?.station?.km <= 30 ? ob.station : null} obs={sel === today && ob?.station?.km <= 30 ? ob?.rows : null} />
          ) : (
            <div className="ck-shim flex-1 rounded-[1.125rem]" aria-hidden="true" />
          )}
        </div>
      )}
      {!fill && !d.at && !mini && !late && !d.err && <div className="ck-shim mt-3 h-[18rem] rounded-[1.125rem]" aria-hidden="true" />}
      {!fill && d.at && (
        <div className="mt-3">
          <RegionMap place={d.at} day={sel} station={ob?.station?.km <= 30 ? ob.station : null} obs={sel === today && ob?.station?.km <= 30 ? ob?.rows : null} inline />
        </div>
      )}
    </section>
  );
}

// Yeni yarış görünümü (Seyhun 2026-11-06 "hava durumu özet olsun, isterse tıklayıp detayı görsün; harita da başta kapalı olsun"):
// "Hava" tek satır (sıcaklık · rüzgâr adı · kn), dokununca gün satırı ve saat saat tablo (açık renk) yerinde açılır; "Harita" satırı
// dokununca bölge haritası açılır. day: açılışta seçili gün (yarış günü akşamı yarın). Tahmin henüz çıkmadıysa Hava satırı yazıyla kalır.
// lead: Hava'nın üstünde aynı kartta duran satır (yarış günü "Şimdi", RaceDayTop)
// stats (yarış günü, Seyhun 2026-11-09 Takip yeni tasarım "profesyonel, modern, minimal"): Hava ayrı satır değil, bilgi şeridinin son hücresi
// (dokununca altında saat saat hava açılır); altında Canlı ekran · Yayın · Harita (go: ana hesap; değilse yalnız Harita), Harita dokununca açılır.
export function RaceWxRows({ r, day = "", lead = null, stats = null, go = false }) {
  const today = todayStr();
  const race = raceDays(r);
  const days = wxDays(r, today);
  const first = race.find((x) => x >= today) || race[race.length - 1] || "";
  const [sel, setSel] = useState(race.includes(day) ? day : first);
  const [open, setOpen] = useState({ wx: false, map: false }); // ikisi ayrı açılır
  const late = !sel || sel > lastForecastDay(today);
  const d = useDay(r, late ? "" : sel);
  const ob = useWindObs(open.map || (stats && open.wx) ? d.at : null, late ? "" : sel, today, true);
  const isToday = sel === today;
  const radar = useRainRadar(isToday && open.wx ? d.at : null);
  if (!first) return stats ? <Strip stats={stats} go={go} id={r.id} /> : lead;
  const rows = d.rows?.length ? (isToday && open.wx ? radarRows(d.rows, radar) : d.rows) : null;
  const top = rows ? rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]) : null;
  const v = rows ? (isToday && rows.find((h) => h.hh === nowHH())) || top : null;
  const value = late ? (
    `${new Date(`${forecastFrom(sel)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} sonra çıkar`
  ) : v ? (
    <>
      {v.t != null && <b>{Math.round(v.t)}°</b>}
      {v.t != null && " · "}
      {windName(v.dir)[0]} {kn(Math.round(v.wind), Math.round(v.gust))} kn
    </>
  ) : d.err ? (
    "Alınamadı"
  ) : (
    <span className="rz-shim" aria-label="Hava yükleniyor" />
  );
  const step = (k) => {
    const i = days.indexOf(sel) + k;
    if (i >= 0 && i < days.length) setSel(days[i]);
  };
  const flip = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const wxBody = (
    <>
      {days.length > 1 && <DayNav light sel={sel} days={days} today={today} onStep={step} />}
      {rows && <WindRibbon rows={rows} nowH={isToday ? +nowHH() : -1} radar={isToday ? radar : null} tone="light" win={d.win || null} h={92} className="mt-3" />}
      {rows && <HourTable key={sel} rows={rows} date={sel} place={d.at} far tone="light" className="mt-3" />}
      {isToday && d.at && <NowRain place={d.at} rows={d.rows} radar={radar} />}
    </>
  );
  const mapBody = <RegionMap place={d.at} day={sel} station={ob?.station?.km <= 30 ? ob.station : null} obs={isToday && ob?.station?.km <= 30 ? ob?.rows : null} inline />;
  if (stats) {
    // kısa hava: 16° 6–13 kn (yön açılınca tabloda)
    const short = late ? "–" : v ? (v.t != null ? `${Math.round(v.t)}°` : `${Math.round(v.wind)}`) : d.err ? "–" : <span className="rz-shim" aria-label="Hava yükleniyor" />;
    const sub = !late && v ? (v.t != null ? `${kn(Math.round(v.wind), Math.round(v.gust))} kn` : "kn") : "";
    const canWx = !late && !!rows;
    // Harita düğmesi kalktı (Seyhun 2026-11-09 "hava durumuna tıklanınca altta harita gösterilebilir"): Hava açılınca altında harita da
    const canMap = !d.err && !!d.at;
    return (
      <section aria-label="Yarış havası">
        <RaceStats items={[...stats, ["Hava", short, sub, canWx ? () => flip("wx") : null, open.wx]]} />
        {go && <RaceGo id={r.id} className="mt-3" />}
        {open.wx && canWx && (
          <div className="rz-list rz-wx-open mt-3">
            <div className="rz-open">
              {wxBody}
              {canMap && <div className="mt-3">{mapBody}</div>}
            </div>
          </div>
        )}
      </section>
    );
  }
  return (
    <section aria-label="Yarış havası">
      {lead}
      <Fold label="Hava" value={value} open={open.wx && !late && !!rows} onToggle={() => !late && rows && flip("wx")}>
        {wxBody}
      </Fold>
      {!late && !d.err && (
        <Fold label="Harita" open={open.map && !!d.at} onToggle={() => d.at && flip("map")}>
          {mapBody}
        </Fold>
      )}
    </section>
  );
}

// Hava günü yoksa (yarış günleri yazılmamış) yalnız bilgi şeridi ve düğmeler
function Strip({ stats, go, id }) {
  return (
    <section>
      <RaceStats items={stats} />
      {go && <RaceGo id={id} className="mt-3" />}
    </section>
  );
}
