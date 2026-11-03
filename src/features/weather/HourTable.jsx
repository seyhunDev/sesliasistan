"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { colorOf } from "@/lib/windMap";
import { PLACE, mmTone, sky, skyTone } from "./weather";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const STEP = 3;
const DARK_SKY = { sun: "text-amber-300", cloudSun: "text-amber-200", moon: "text-indigo-200", cloud: "text-slate-300", fog: "text-slate-300", rain: "text-sky-300", snow: "text-sky-100", storm: "text-amber-300" };

// Saat saat hava tablosu (Seyhun 2026-11-03, Windy görseli: "yağmur milimetre olarak, sayı olarak da gösteriliyor"; örnek hava-tablo.html, "A · İyice sade").
// Ana sayfa hava kartı ve hava sayfası aynı tabloyu kullanır. Sütunlar 3 saatte bir: seçilen günün saatleri, ardından ertesi gün (ilk sütunda gün adı, solunda ince çizgi);
// parmakla sola kaydırılır. Satırlar: saat, gökyüzü simgesi, sıcaklık, hissedilen (veri yoksa satır yok), yağmur (o 3 saatin toplamı, mm, mavi sayı ve altında
// şiddete göre renkli şerit, mmTone), rüzgâr kn, sağanak kn (rüzgâr haritasının renginde kutu, colorOf), yön oku (rüzgârın estiği yöne bakar) ve derece.
// Bugünse şimdiki saatin sütunu kırmızı çerçeveli ve açılışta solda görünür; başka günde sabah 6'dan başlar.
// Renkler CSS değişkeniyle (--ht-mut, --ht-line, --ht-rain, --ht-now, --ht-cell): lacivert kartta varsayılanlar, açık sayfada tone="light" ile açık zemin değerleri.
export function HourTable({ rows, next = null, date, tone = "dark", onClick, className = "" }) {
  const now = useNow();
  const ref = useRef(null);
  const cols = [...pick(rows, false), ...pick(next, true)];
  const today = YMD.format(now);
  const nowAt = date === today ? cols.findIndex((c) => !c.next && +c.hh === Math.floor(+HOUR.format(now) / STEP) * STEP) : -1;
  const start = nowAt >= 0 ? nowAt : cols.findIndex((c) => !c.next && +c.hh >= 6);
  const hasFeel = cols.some((c) => c.feel != null);

  useEffect(() => {
    const el = ref.current;
    if (!el || start < 0) return;
    const cell = el.querySelector(`[data-col="${start}"]`);
    if (cell) el.scrollLeft = Math.max(0, cell.offsetLeft - (nowAt >= 0 ? cell.offsetWidth : 0));
  }, [date, start, nowAt]);

  if (!cols.length) return null;
  const vars = tone === "light" ? LIGHT : DARK;
  const labels = [["Saat"], [""], ["Sıcaklık"], ...(hasFeel ? [["Hissedilen"]] : []), ["Yağmur", "mm"], ["Rüzgâr", "kn"], ["Sağanak", "kn"], ["Yön"]];

  return (
    <div
      data-hour-table
      onClick={onClick}
      style={vars}
      className={`flex overflow-hidden rounded-[1.125rem] border border-[color:var(--ht-line)] bg-[color:var(--ht-card)] ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="shrink-0 border-r border-[color:var(--ht-line)] py-1">
        {labels.map(([a, b], i) => (
          <div key={i} className="flex h-7 items-center whitespace-nowrap pl-3 pr-2 text-[0.6875rem] font-semibold text-[color:var(--ht-mut)]">
            {a}
            {b && <small className="ml-0.5 text-[0.625rem] font-medium opacity-75">{b}</small>}
          </div>
        ))}
      </div>
      <div ref={ref} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max py-1">
          {cols.map((c, i) => {
            const s = sky(c.code, c.day);
            const rain = mmTone(c.mm);
            return (
              <div
                key={c.time}
                data-col={i}
                data-now={i === nowAt ? "" : undefined}
                className={`relative w-11 shrink-0 text-center tabular-nums ${c.first ? "border-l border-[color:var(--ht-line)]" : ""}`}
              >
                {i === nowAt && <span aria-hidden className="pointer-events-none absolute -bottom-1 -top-1 inset-x-0 rounded-[0.625rem] border-2 border-[color:var(--ht-now)]" />}
                <Cell className={`text-[0.75rem] font-semibold ${c.first ? "text-[color:var(--ht-fg)]" : "text-[color:var(--ht-mut)]"}`}>{c.first ? c.dname : c.hh}</Cell>
                <Cell>
                  <Icon name={s.icon} className={`size-[1.15rem] ${tone === "light" ? skyTone(s.icon) : DARK_SKY[s.icon] || "text-white/80"}`} />
                </Cell>
                <Cell className="text-[0.9375rem] font-bold">{c.t}°</Cell>
                {hasFeel && <Cell className="text-[0.8125rem] text-[color:var(--ht-mut)]">{c.feel != null ? `${c.feel}°` : ""}</Cell>}
                <Cell className="relative text-[0.75rem] font-bold text-[color:var(--ht-rain)]">
                  {rain && <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: rain }} />}
                  {mmText(c.mm)}
                </Cell>
                <Cell className="text-[0.875rem] font-bold">{c.wind}</Cell>
                <Cell>
                  <span className="grid h-6 w-9 place-items-center rounded-md text-[0.8125rem] font-bold text-[#0b1730]" style={{ background: colorOf(c.gust ?? c.wind) }}>
                    {c.gust ?? c.wind}
                  </span>
                </Cell>
                <Cell>
                  {c.dir != null && (
                    <svg viewBox="0 0 16 16" aria-label={`${Math.round(c.dir)}°`} className="size-4 text-[color:var(--ht-mut)]" style={{ transform: `rotate(${c.dir + 180}deg)` }}>
                      <path d="M8 1l5 13-5-3-5 3z" fill="currentColor" />
                    </svg>
                  )}
                </Cell>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Cell({ className = "", children }) {
  return <div className={`grid h-7 place-items-center ${className}`}>{children}</div>;
}

const DARK = { "--ht-fg": "#fff", "--ht-mut": "rgba(255,255,255,.62)", "--ht-line": "rgba(255,255,255,.12)", "--ht-card": "rgba(255,255,255,.05)", "--ht-rain": "#7fb6ff", "--ht-now": "#f05a5a" };
const LIGHT = { "--ht-fg": "var(--color-fg, #1d2433)", "--ht-mut": "var(--color-mut, #6b7385)", "--ht-line": "var(--color-line, #e3e6ec)", "--ht-card": "var(--color-card, #fff)", "--ht-rain": "#2f6fc0", "--ht-now": "#e5484d" };

// 3 saatte bir sütun; yağmur o 3 saatin toplamı. next: ertesi gün (ilk sütunu gün adıyla)
function pick(rows, next) {
  if (!rows?.length) return [];
  const out = [];
  rows.forEach((h, i) => {
    if (+h.hh % STEP) return;
    const block = rows.slice(i, i + STEP).filter((r) => Math.floor(+r.hh / STEP) === +h.hh / STEP);
    const mms = block.map((r) => r.mm).filter((v) => v != null);
    out.push({ ...h, mm: mms.length ? mms.reduce((a, b) => a + b, 0) : h.mm, next, first: next && !out.length, dname: next ? dayShort(h.time) : "" });
  });
  return out;
}
const dayShort = (time) => {
  const s = new Date(`${time.slice(0, 10)}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
};
export const mmText = (v) => (v == null || v < 0.1 ? "" : v < 10 ? v.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : String(Math.round(v)));
