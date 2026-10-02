"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { PLACE, compareLinks, dayHours, getPlace, placeLabel, sailWindows, sky, windLevel, windName } from "./weather";
import { Col, WindArrow } from "./parts";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });

// Saatlik rüzgâr grafiği: dolu alan = rüzgâr, kesikli = sağanak; 7/17/22 kn çizgileri yelken eşikleri.
// Parmakla sürükleyince seçilen saatin değerleri üstte yazar.
function WindChart({ rows, sel, onSel, nowIdx }) {
  const W = 340, H = 150, L = 22, R = 6, T = 8, B = 18;
  const n = rows.length;
  const top = Math.max(15, Math.ceil((Math.max(...rows.map((h) => h.gust)) + 2) / 5) * 5);
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const line = (k) => rows.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h[k]).toFixed(1)}`).join("");
  const area = `${line("wind")}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const pick = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * W;
    onSel(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  };
  const s = rows[sel];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-pan-y select-none"
      onPointerDown={pick}
      onPointerMove={pick}
      onTouchStart={(e) => e.stopPropagation()}
      role="img"
      aria-label="Saatlik rüzgâr grafiği"
    >
      {[7, 17, 22].filter((v) => v < top).map((v) => (
        <g key={v} className="text-mut">
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity=".25" strokeDasharray="2 3" />
          <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor">{v}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="text-line" stroke="currentColor" />
      {rows.map((h, i) =>
        +h.hh % 6 === 0 ? (
          <text key={h.time} x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" className="fill-mut">{h.hh}</text>
        ) : null,
      )}
      <path d={area} className="text-acc" fill="currentColor" fillOpacity=".14" />
      <path d={line("wind")} className="text-acc" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d={line("gust")} className="text-mut" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 3" />
      {nowIdx >= 0 && <line x1={x(nowIdx)} x2={x(nowIdx)} y1={T} y2={y(0)} className="text-rec" stroke="currentColor" strokeOpacity=".5" />}
      {s && (
        <g>
          <line x1={x(sel)} x2={x(sel)} y1={T} y2={y(0)} className="text-fg" stroke="currentColor" strokeOpacity=".35" />
          <circle cx={x(sel)} cy={y(s.gust)} r="2.5" className="fill-mut" />
          <circle cx={x(sel)} cy={y(s.wind)} r="3.5" className="fill-acc stroke-card" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

// Bir günün detayı: özet, rüzgâr grafiği, 3 saatte bir hava
export function DayDetail({ date, rows, info }) {
  const now = useNow();
  const isToday = YMD.format(now) === date;
  const nowIdx = isToday ? rows.findIndex((h) => h.hh === HOUR.format(now)) : -1;
  const peak = rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]);
  const [sel, setSel] = useState(nowIdx >= 0 ? nowIdx : rows.indexOf(peak));
  const s = rows[sel] || peak;
  const min = Math.min(...rows.map((h) => h.t));
  const max = Math.max(...rows.map((h) => h.t));
  const code = info?.code ?? peak.code;
  const lvl = windLevel(peak.wind);
  const sail = sailWindows(rows);

  return (
    <div className="pb-2">
      {/* Özet */}
      <div className="flex items-center gap-3">
        <Icon name={sky(code).icon} className="size-8 shrink-0 text-acc" />
        <div className="min-w-0">
          <p className="text-[1.25rem] font-semibold leading-tight tabular-nums">{min}–{max}°</p>
          <p className="text-[0.8125rem] text-mut">{sky(code).label}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-1.5 rounded-2xl bg-bg px-3.5 py-3 text-[0.8125rem]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mut">En sert</dt>
          <dd className={`flex items-center gap-1 font-semibold tabular-nums ${lvl.tone}`}>
            <WindArrow deg={peak.dir} />
            {windName(peak.dir)[0]} {peak.wind} kn
            <span className="font-normal text-mut">· sağanak {peak.gust} · {peak.hh}:00</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mut">Yelkene uygun</dt>
          <dd className={`text-right font-semibold tabular-nums ${sail.length ? "text-ok" : "text-mut"}`}>
            {sail.length ? sail.join(", ") : "uygun saat yok"}
          </dd>
        </div>
      </dl>

      {/* Seçili saat */}
      <div className="mt-4">
        <p className="text-[0.8125rem] tabular-nums">
          <span className="font-semibold">{s.hh}:00</span>
          <span className="text-mut"> · {windName(s.dir)[0]} </span>
          <span className={`font-semibold ${windLevel(s.wind).tone}`}>{s.wind} kn</span>
          <span className="text-mut"> · sağanak {s.gust} · {s.t}°</span>
        </p>
      </div>
      <div className="mt-1">
        <WindChart rows={rows} sel={sel} onSel={setSel} nowIdx={nowIdx} />
      </div>
      <p className="flex items-center justify-end gap-2 text-[0.6875rem] text-mut">
        <span className="inline-block h-0.5 w-3 rounded bg-acc" /> rüzgâr
        <span className="inline-block w-3 border-t border-dashed border-mut" /> sağanak
        {nowIdx >= 0 && <><span className="inline-block h-2.5 w-px bg-rec/60" /> şimdi</>}
        <span>· parmağınla kaydır</span>
      </p>

      {/* 3 saatte bir */}
      <div className="mt-3 grid grid-cols-8 gap-0.5 border-t border-line pt-2.5">
        {rows.filter((h) => +h.hh % 3 === 0).map((h) => (
          <Col key={h.time} label={h.hh} icon={sky(h.code, h.day).icon} temp={h.t} wind={h.wind} dir={h.dir} />
        ))}
      </div>
      <p className="mt-3 text-center text-[0.6875rem] text-mut">rüzgâr knot · yelken: 7–16 kn uygun, 17–21 sert, 22+ riskli</p>
    </div>
  );
}

const SHORT = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: PLACE.tz });
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 2 ? "az önce" : m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} sa önce`;
};

// Hava detayı: bugün + 5 gün seçici, seçilen günün saat saat ayrıntısı; altta kaynak ve karşılaştırma
export function WeatherDetail({ w, refresh, busy }) {
  const today = w.today?.date;
  const days = [{ date: today, code: w.today.code, min: w.today.min, max: w.today.max, wind: w.today.wind }, ...(w.days || [])].filter((d) => d.date);
  const [sel, setSel] = useState(today);
  const rows = dayHours(w, sel) || [];
  const info = days.find((d) => d.date === sel);
  const place = getPlace();
  const links = compareLinks(place);
  return (
    <div>
      {/* Gün seçici: bugün + 5 gün */}
      <div className="-mx-1 grid grid-cols-6 gap-1">
        {days.map((d, i) => {
          const on = d.date === sel;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSel(d.date)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-center transition active:scale-95 ${on ? "bg-deep text-white" : "bg-bg"}`}
            >
              <span className={`text-[0.6875rem] font-semibold ${on ? "text-white/80" : "text-mut"}`}>{i === 0 ? "Bugün" : SHORT.format(new Date(`${d.date}T12:00:00`))}</span>
              <Icon name={sky(d.code).icon} className={`size-5 ${on ? "" : "text-acc"}`} />
              <span className="text-[0.8125rem] font-semibold tabular-nums">{d.max}°</span>
              <span className={`text-[0.6875rem] tabular-nums ${on ? "text-white/75" : "text-mut"}`}>{d.min}°</span>
              <span className={`text-[0.6875rem] font-semibold tabular-nums ${on ? "text-white" : windLevel(d.wind).tone}`}>{d.wind} kn</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">{rows.length ? <DayDetail key={sel} date={sel} rows={rows} info={info} /> : <p className="py-6 text-center text-[0.875rem] text-mut">Bu günün saatlik verisi yok.</p>}</div>

      {/* Kaynak ve doğrulama */}
      <div className="mt-2 rounded-2xl bg-bg px-3.5 py-3 text-[0.75rem] leading-snug text-mut">
        <p>
          <b className="font-semibold text-fg">{placeLabel(place)}</b> · Kaynak: Open-Meteo (ECMWF, ICON, GFS gibi resmi meteoroloji modellerinin birleşimi) ·{" "}
          {ago(w.at)} alındı
          {w.model?.elevation != null ? ` · model noktası ${w.model.lat?.toFixed(2)}, ${w.model.lon?.toFixed(2)} (${Math.round(w.model.elevation)} m)` : ""}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <span>Karşılaştır:</span>
          <a href={links.mgm} target="_blank" rel="noopener noreferrer" className="rounded-full bg-card px-3 py-1 font-semibold text-acc ring-1 ring-line">
            MGM
          </a>
          <a href={links.windy} target="_blank" rel="noopener noreferrer" className="rounded-full bg-card px-3 py-1 font-semibold text-acc ring-1 ring-line">
            Windy
          </a>
          <button type="button" onClick={() => refresh(true)} disabled={busy} className="ml-auto rounded-full bg-card px-3 py-1 font-semibold text-acc ring-1 ring-line disabled:opacity-50">
            Yenile
          </button>
        </p>
      </div>
    </div>
  );
}
