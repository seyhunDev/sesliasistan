"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useWindObs } from "./useWindObs";
import { useRainRadar } from "./useRainRadar";
import { PointMap, pointName } from "./PointMap";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { CockpitWind } from "@/features/home/CockpitWind";
import { todayStr } from "@/lib/utils/format";
import { dayHours, getPlace, kn, nowOf, placeLabel, setPlace, sky, windName, compareLinks } from "./weather";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { WindArrow } from "./parts";

// Hava sayfası (Seyhun 2026-10-21: "hava durumu sayfasını da ana sayfayla uyumlu yapalım"): üstte ana sayfadaki lacivert kokpit gibi
// (geri, yer, yenile, büyük sıcaklık, şimdiki rüzgâr, aynı büyük grafik CockpitWind), altında büyük gün seçici; güne dokununca grafik o güne geçer
// (başka günde sağda o günün en sert rüzgârı). Açık zeminde Nokta haritası (2026-10-28; PointMap: seçilen yer, tahmin alanı, istasyon; dokununca
// nokta taşınır, Geri al), "Saat saat" listesi (bugün şimdiden sonrası), MGM / Windy ve kaynak satırı.
const nowHour = () => new Date().getHours();
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 2 ? "az önce" : m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} sa önce`;
};

export function WeatherTop({ w, refresh }) {
  const today = todayStr();
  const all = [{ date: w.today?.date, code: w.today?.code, min: w.today?.min, max: w.today?.max, wind: w.today?.wind, gust: w.today?.gust }, ...(w.days || [])].filter((d) => d.date && d.date >= today);
  const [sel, setSel] = useState(all[0]?.date || today);
  const rows = dayHours(w, sel) || [];
  const info = all.find((d) => d.date === sel) || all[0];
  const isToday = sel === all[0]?.date;
  const n = isToday ? nowOf(w) : null;
  const top = rows.length ? rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]) : null;
  const place = getPlace();
  const st = useWindObs(place, sel, today)?.station;
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
              <small className="block text-[0.75rem] text-white/65">{windName(v.dir)[0]} · {isToday ? "şimdi" : `en sert ${top.hh}:00`}</small>
              <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
                {kn(v.wind, v.gust)}
                <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
              </b>
            </span>
          </div>
        )}
        <div className="mt-2">{rows.length > 0 && <CockpitWind key={sel} rows={rows} date={sel} />}</div>
        <nav aria-label="Günler" className="mt-4 grid grid-cols-6 gap-1">
          {all.slice(0, 6).map((d, i) => {
            const on = d.date === sel;
            const dt = new Date(`${d.date}T12:00:00`);
            return (
              <button key={d.date} type="button" data-press aria-pressed={on} onClick={() => setSel(d.date)} className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 ${on ? "bg-white text-[#11203a]" : ""}`}>
                <small className={`text-[0.75rem] font-semibold capitalize ${on ? "" : "text-white/60"}`}>{i === 0 ? "Bugün" : dt.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")}</small>
                <b className="text-[1.5rem] font-bold leading-none tracking-[-.03em] tabular-nums">{dt.getDate()}</b>
                <Icon name={sky(d.code).icon} className="mt-0.5 size-4" />
                <span className={`text-[0.75rem] font-semibold tabular-nums ${on ? "" : "text-white/80"}`}>{d.wind} kn</span>
              </button>
            );
          })}
        </nav>
      </section>
      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">NOKTA</h2>
            {st?.lat != null && <small className="truncate text-[0.75rem] text-mut">{st.name} istasyonu · {String(st.km).replace(".", ",")} km</small>}
          </div>
          <div className="rounded-[1.125rem] border border-line bg-card p-2">
            <PointMap place={place} model={w.model} station={st} onPick={movePoint} />
            <p className="mt-2 flex flex-nowrap gap-3 whitespace-nowrap px-1 text-[0.75rem] text-mut" aria-label="Harita açıklaması">
              <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full bg-[#0ea5c4]" />Seçilen yer</span>
              {w.model?.lat != null && <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 border border-dashed border-mut" />Tahmin alanı</span>}
              {st?.lat != null && <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full border border-mut bg-white" />Ölçüm</span>}
            </p>
          </div>
        </section>
        <section>
          <ListHead title="Saat saat" />
          <RowList>
            {rows
              .filter((h) => !n || +h.hh >= +nowHour(w))
              .map((h) => (
                <Row
                  key={h.time}
                  lead={<b className="w-9 text-[0.9375rem] font-semibold tabular-nums">{h.hh}</b>}
                  title={
                    <span className="flex items-center gap-2">
                      <Icon name={sky(h.code, h.day).icon} className="size-5 text-acc" />
                      <span className="tabular-nums">{h.t}°</span>
                      {h.rain >= 30 && <span className="text-[0.8125rem] font-normal text-mut tabular-nums">%{h.rain}</span>}
                      <span className="flex items-center gap-1 text-[0.8125rem] font-normal text-mut">
                        <WindArrow deg={h.dir} className="size-3" />
                        {windName(h.dir)[0]}
                      </span>
                    </span>
                  }
                  right={
                    <b className={`text-[0.9375rem] font-semibold tabular-nums ${h.wind >= 17 ? "text-warn" : ""}`}>
                      {kn(h.wind, h.gust)}
                      <span className="text-[0.75rem] font-normal text-mut"> kn</span>
                    </b>
                  }
                />
              ))}
          </RowList>
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
