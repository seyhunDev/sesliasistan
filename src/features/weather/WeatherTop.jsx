"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useWindObs } from "./useWindObs";
import { useRainRadar } from "./useRainRadar";
import { RegionMap, pointName } from "./RegionMap";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { DayNav } from "./DayNav";
import { HourTable } from "./HourTable";
import { nextDay } from "./hourCols";
import { todayStr } from "@/lib/utils/format";
import { dayHours, dirDeg, getPlace, kn, nowOf, placeLabel, setPlace, sky, windName, compareLinks } from "./weather";

// Hava sayfası (Seyhun 2026-11-03 Windy görseli, örnek hava-sayfasi-ornek.png "Böyle yap"): lacivert üstte geri, yer, yenile, büyük sıcaklık ve şimdiki rüzgâr;
// altında gün satırı (DayNav: ‹ Dün · Bugün · Yarın ›, önceki 5 gün ve 7 gün ileri); açık zeminde saat saat tablo (HourTable, tone="light":
// 3 saatte bir sütun, geçmişte istasyon ölçümü açık mavi) ve altında BÖLGE haritası (tablonun altında sayfada, saat çubuğu ve Oynat ile; RegionMap: rüzgâr / yağış, −2 sa … +24,
// dokununca nokta taşınır, Geri al), MGM / Windy ve kaynak satırı. Aynı tablo ana sayfada, yarış havasında ve canlı ekranda kullanılır.
const nowHour = () => new Date().getHours();
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 2 ? "az önce" : m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} sa önce`;
};

export function WeatherTop({ w, refresh }) {
  const today = todayStr();
  const all = [{ date: w.today?.date, code: w.today?.code, min: w.today?.min, max: w.today?.max, wind: w.today?.wind, gust: w.today?.gust, mm: w.today?.mm }, ...(w.days || [])].filter((d) => d.date && d.date >= today);
  const [sel, setSel] = useState(all[0]?.date || today);
  const past = w.past || [];
  const navDays = [...past, ...all].map((d) => d.date); // önceki 5 gün kapalı sayılır: açılışta bugün, geri gidilebilir
  const rows = dayHours(w, sel) || [];
  const info = [...past, ...all].find((d) => d.date === sel) || all[0];
  const isToday = sel === all[0]?.date;
  const n = isToday ? nowOf(w) : null;
  const top = rows.length ? rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]) : null;
  const place = getPlace();
  const st = useWindObs(place, sel, today)?.station;
  const obToday = useWindObs(place, today, today);
  const radar = useRainRadar(place);
  const { profile } = useAuth();
  const toast = useToast();
  // Haritada dokunulan nokta seçilen yer olur (Ayarlar › Hava konumu gibi profile de yazılır); "Geri al" eski yeri geri koyar
  const save = (p) => {
    const saved = setPlace(p);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { weatherPlace: saved }).catch(() => {});
    return saved;
  };
  const movePoint = async (at) => {
    const prev = getPlace();
    const got = await pointName(at);
    const saved = save({ ...got, ...at });
    toast(`Nokta taşındı · ${saved.name}`, { duration: 8000, action: { label: "Geri al", onClick: () => save(prev) } });
  };
  const links = compareLinks(place);
  const v = n || (top && { t: info?.max, code: info?.code, day: true, wind: top.wind, gust: top.gust, dir: top.dir });
  return (
    <>
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Hava">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Hava durumu</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{placeLabel(place)}</p>
          </div>
          <button type="button" onClick={() => refresh(true)} aria-label="Yenile" data-press className="btn btn-round size-9">
            <Icon name="load" className="size-4" />
          </button>
        </header>
        {v && (
          <div className="mt-4 flex items-center gap-3">
            <span className="shrink-0 text-[2.5rem] font-bold leading-none tracking-[-.04em] tabular-nums">{v.t}°</span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[0.9375rem] font-semibold">{sky(v.code, v.day).label}</b>
              <small className="block truncate text-[0.8125rem] text-white/65 tabular-nums">
                {info ? `${info.min}° / ${info.max}°` : ""}
              </small>
            </span>
            <span className="shrink-0 text-right leading-tight">
              <small className="block text-[0.75rem] text-white/65">{windName(v.dir)[0]} {dirDeg(v.dir)} · {isToday ? "şimdi" : `en sert ${top.hh}:00`}</small>
              <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
                {kn(v.wind, v.gust)}
                <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
              </b>
            </span>
          </div>
        )}
        <div className="mt-4">
          <DayNav sel={sel} days={navDays} today={today} onStep={(k) => setSel(navDays[navDays.indexOf(sel) + k] || sel)} />
        </div>
      </section>
      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <section aria-label="Saat saat">
          {rows.length > 0 && <HourTable key={sel} rows={rows} next={dayHours(w, nextDay(sel))} date={sel} tone="light" />}
        </section>
        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">BÖLGE</h2>
            {st?.lat != null && <small className="truncate text-[0.75rem] text-mut">{st.name} istasyonu · {String(st.km).replace(".", ",")} km</small>}
          </div>
          <RegionMap place={place} station={obToday?.station || st} obs={obToday?.rows} onPick={movePoint} inline />
        </section>
        <div className="flex gap-2">
          <a href={links.mgm} target="_blank" rel="noopener noreferrer" data-press className="raised flex h-11 flex-1 items-center justify-center rounded-2xl text-[0.875rem] font-semibold">MGM</a>
          <a href={links.windy} target="_blank" rel="noopener noreferrer" data-press className="raised flex h-11 flex-1 items-center justify-center rounded-2xl text-[0.875rem] font-semibold">Windy</a>
        </div>
        <p className="px-1 text-[0.75rem] leading-snug text-mut">
          Kaynak: Open-Meteo · {ago(w.at)}
          {st?.near ? ` · Ölçüm: ${st.name} istasyonu, ${String(st.km).replace(".", ",")} km` : ""}
          {radar ? ` · Radar: ${radar.src || "RainViewer"}` : ""}
        </p>
      </div>
    </>
  );
}
