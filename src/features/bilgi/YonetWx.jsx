"use client";

import "@/features/home/sporcu.css";
import { useCallback, useEffect, useState } from "react";
import { liveHead } from "@/features/liveScreen/fonts";
import { SkyIcon, WindArrow, WindChart, rainText, useObsRows } from "@/features/weather/WxPanel";
import { dayHours, dirDeg, loadWeatherAt, nowOf, windName } from "@/features/weather/weather";
import { dayWeather } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";

// Yönet › Hava (Seyhun 2026-11-25 "yeni tasarım hava durumumuz var ya, onu göster"): Sahne ana sayfasının Hava kutusu ile aynı görünüm
// (sporcu.css .sh-wxp: dev rüzgâr, ölçülen limon çizgi, tahmin beyaz kesik, tek satır yağış) ve altında 7 günlük şerit.
// Yer: yarış günü yarışın yeri, değilse seçili hava konumu (at: { name, lat, lon }).
const shift = (date, k) => {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + k);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function YonetWx({ at }) {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [got, setGot] = useState({ key: "", w: null, err: false });
  const key = at ? `${(+at.lat).toFixed(3)},${(+at.lon).toFixed(3)}` : "";
  const refresh = useCallback(
    (force) => {
      if (!at) return;
      loadWeatherAt(at, !!force).then(
        (w) => setGot({ key, w, err: false }),
        () => setGot((g) => ({ ...g, key, err: true })),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useEffect(() => refresh(false), [refresh]);
  const w = got.key === key ? got.w : null;
  const err = got.key === key && got.err;
  const isToday = date === today;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const rows = dayHours(w, date) || [];
  const n = nowOf(w);
  const dw = dayWeather(w, rows, date);
  const nowObs = useObsRows(today, today, at);
  const day = useObsRows(date, today, at);
  const last = nowObs.rows.at(-1);
  const real = isToday && last && now.getHours() - +last.hh <= 2 ? last : null;
  // Başka gün seçiliyse o günün öğlen tahmini
  const noon = !isToday && rows.find((r) => r.hh === "13");
  const base = isToday ? n : noon && { ...noon, day: true };
  const cur = base && (real ? { ...base, wind: Math.round(real.wind), gust: real.gust != null ? Math.round(real.gust) : base.gust, dir: real.dir ?? base.dir } : base);
  const rain = rainText(rows, isToday ? nowH : -1, null);
  const days = Array.from({ length: 7 }, (_, i) => shift(today, i)).filter((d) => dayHours(w, d)?.length);
  const dname = isToday ? "" : new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" });
  return (
    <div className={`bzy-wx ${liveHead.variable}`}>
      <section className="sh-wxp" aria-label="Hava">
        <button type="button" onClick={() => refresh(true)} className="sh-wx-now" aria-label="Havayı yenile">
          {cur ? (
            <>
              <span className="sh-wx-live">
                {real ? <i /> : null}
                {real ? `ÖLÇÜLEN ${real.hh}:00` : isToday ? "TAHMİN" : "TAHMİN · 13:00"}
                {dname ? ` · ${dname}` : ""}
                {at?.name ? ` · ${at.name}` : ""}
              </span>
              <span className="sh-wx-row">
                <WindArrow dir={cur.dir} size={34} color="var(--sh-lime)" className="sh-wx-ar" />
                <b className="sh-c sh-wx-big">
                  {Math.round(cur.wind ?? 0)}
                  <small>KN</small>
                </b>
                <span className="sh-wx-info">
                  <b>
                    {windName(cur.dir)?.[0] || ""} {dirDeg(cur.dir)}
                  </b>
                  <span>sağanak {Math.round(cur.gust ?? cur.wind ?? 0)}</span>
                </span>
                <span className="sh-wx-t">
                  <b className="num">{Math.round(cur.t ?? 0)}°</b>
                  <small className="num">
                    <SkyIcon code={cur.code} day={cur.day} size="size-4" />
                    {dw ? `${dw.min}° / ${dw.max}°` : ""}
                  </small>
                </span>
              </span>
            </>
          ) : (
            <span className="sh-wx-wait">{err ? "Hava alınamadı · dokun, yenile" : "Hava yükleniyor…"}</span>
          )}
        </button>
        <WindChart rows={rows} nowH={isToday ? nowH : null} obs={day.rows} />
        {rain && <p className="sh-wx-rain">Yağış · {rain}</p>}
      </section>
      {days.length > 0 && (
        <div className="sh-days" role="tablist" aria-label="Günler">
          {days.map((d) => {
            const rs = (dayHours(w, d) || []).filter((r) => r.hh >= "06" && r.hh <= "21");
            const ws = rs.map((r) => r.wind ?? 0);
            const bars = [6, 10, 14, 18].map((h) => Math.max(0, ...rs.filter((r) => +r.hh >= h && +r.hh < h + 4).map((r) => r.wind ?? 0)));
            const top = Math.max(15, ...bars);
            const x = new Date(`${d}T12:00`);
            return (
              <button key={d} type="button" role="tab" aria-selected={d === date} data-press onClick={() => setDate(d)} className={`sh-day ${d === date ? "sh-day-on" : ""}`}>
                {d === today ? "BUGÜN" : x.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "").toLocaleUpperCase("tr-TR")}
                <b>{x.getDate()}</b>
                {rs.length > 0 && (
                  <span className="sh-day-w" aria-hidden="true">
                    {bars.map((v, i) => (
                      <i key={i} style={{ height: `${Math.max(12, (v / top) * 100)}%` }} />
                    ))}
                  </span>
                )}
                <span className="num">{ws.length ? `${Math.round(Math.min(...ws))}–${Math.round(Math.max(...ws))} kn` : "—"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
