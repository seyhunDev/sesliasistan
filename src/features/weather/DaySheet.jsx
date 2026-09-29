"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { PLACE, sailWindows, sky, windLevel, windName } from "./weather";
import { Col, WindArrow } from "./parts";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });

// Saatlik rüzgâr grafiği: dolu alan = rüzgâr, kesikli = hamle; 7/17/22 kn çizgileri yelken eşikleri.
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
          <p className="text-[20px] font-semibold leading-tight tabular-nums">{min}–{max}°</p>
          <p className="text-[13px] text-mut">{sky(code).label}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-1.5 rounded-2xl bg-bg px-3.5 py-3 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-mut">En sert</dt>
          <dd className={`flex items-center gap-1 font-semibold tabular-nums ${lvl.tone}`}>
            <WindArrow deg={peak.dir} />
            {windName(peak.dir)[0]} {peak.wind} kn
            <span className="font-normal text-mut">· hamle {peak.gust} · {peak.hh}:00</span>
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
        <p className="text-[13px] tabular-nums">
          <span className="font-semibold">{s.hh}:00</span>
          <span className="text-mut"> · {windName(s.dir)[0]} </span>
          <span className={`font-semibold ${windLevel(s.wind).tone}`}>{s.wind} kn</span>
          <span className="text-mut"> · hamle {s.gust} · {s.t}°</span>
        </p>
      </div>
      <div className="mt-1">
        <WindChart rows={rows} sel={sel} onSel={setSel} nowIdx={nowIdx} />
      </div>
      <p className="flex items-center justify-end gap-2 text-[11px] text-mut">
        <span className="inline-block h-0.5 w-3 rounded bg-acc" /> rüzgâr
        <span className="inline-block w-3 border-t border-dashed border-mut" /> hamle
        {nowIdx >= 0 && <><span className="inline-block h-2.5 w-px bg-rec/60" /> şimdi</>}
        <span>· parmağınla kaydır</span>
      </p>

      {/* 3 saatte bir */}
      <div className="mt-3 grid grid-cols-8 gap-0.5 border-t border-line pt-2.5">
        {rows.filter((h) => +h.hh % 3 === 0).map((h) => (
          <Col key={h.time} label={h.hh} icon={sky(h.code, h.day).icon} temp={h.t} wind={h.wind} dir={h.dir} />
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-mut">
        {PLACE.name} · Open-Meteo · rüzgâr knot · yelken: 7–16 kn uygun, 17–21 sert, 22+ riskli
      </p>
    </div>
  );
}
