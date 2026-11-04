"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { colorOf } from "@/lib/windMap";
import { PLACE, getPlace, mmTone, sky, skyTone } from "./weather";
import { STEP, hourCols, markAt, mmText } from "./hourCols";
import { useWindObs } from "./useWindObs";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const COL = 44; // sütun genişliği (px, w-11)
const CH = 56; // üstteki rüzgâr grafiğinin yüksekliği (px)
const DARK_SKY = { sun: "text-amber-300", cloudSun: "text-amber-200", moon: "text-indigo-200", cloud: "text-slate-300", fog: "text-slate-300", rain: "text-sky-300", snow: "text-sky-100", storm: "text-amber-300" };

// obs / station: ölçümü dışarıdan ver (canlı ekran, oturumsuz); nowMs: kendi saatin (canlı ekranın eşlenmiş saati); scale: büyük ekranda CSS zoom.
// Saat saat hava tablosu (Seyhun 2026-11-03, Windy görseli: "yağmur milimetre olarak, sayı olarak da gösteriliyor"; örnek hava-tablo.html, "A · İyice sade").
// Uygulamadaki bütün hava gösterimleri bu tabloyu kullanır (Seyhun 2026-11-03 "bütün hava durumlarını bu tarza getirelim"): ana sayfa, hava sayfası,
// yarış havası, multimedya Hava. Sütunlar her saat bir: seçilen günün saatleri, ardından ertesi gün (ilk sütunda gün adı, solunda ince çizgi);
// parmakla sola kaydırılır. Satırlar: saat, gökyüzü simgesi, sıcaklık, hissedilen (veri yoksa satır yok), yağmur (o saatin yağışı, mm, mavi sayı ve altında
// şiddete göre renkli şerit, mmTone), rüzgâr kn, sağanak kn (rüzgâr haritasının renginde kutu, colorOf), yön oku (rüzgârın estiği yöne bakar) ve derece.
// Gerçekleşen (canlı yayın ekranındaki gibi): geçmiş saatlerde en yakın istasyonun ölçümü (useWindObs; far: 100 km'ye kadar) açık mavi yazılır
// (hourCols), altta tek satır "Ölçülen (Dikili istasyonu) · Tahmin". Bugünse şimdiki saatin sütunu kırmızı çerçeveli ve açılışta solda görünür;
// başka günde sabah 6'dan başlar. marks: [{ at: "HH:MM", label }] plan / start saatleri pembe dikey çizgi ve altında kısa yazı.
// Renkler CSS değişkeniyle (--ht-mut, --ht-line, --ht-rain, --ht-now, --ht-obs, --ht-mark, --ht-cell): lacivert kartta varsayılanlar, açık sayfada tone="light".
export function HourTable({ rows, next = null, date, tone = "dark", onClick, className = "", place = null, far = false, marks = [], obs = null, station = null, nowMs = null, scale = 1 }) {
  const clock = useNow();
  const now = nowMs != null ? new Date(nowMs) : clock;
  const ref = useRef(null);
  const today = YMD.format(now);
  const got = useWindObs(obs ? null : place || getPlace(), date, today, far);
  const ob = obs ? { rows: obs, station } : got;
  const nowH = +HOUR.format(now);
  const cols = hourCols(rows, next, ob?.rows || [], { date, today, nowH });
  const nowAt = date === today ? cols.findIndex((c) => !c.next && +c.hh === Math.floor(nowH / STEP) * STEP) : -1;
  const start = nowAt >= 0 ? nowAt : cols.findIndex((c) => !c.next && +c.hh >= 6);
  const hasFeel = cols.some((c) => c.feel != null);
  const anyObs = cols.some((c) => c.obs);
  const lines = (marks || []).map((m) => ({ ...m, x: markAt(cols, m.at) })).filter((m) => m.x != null);

  useEffect(() => {
    const el = ref.current;
    if (!el || start < 0) return;
    const cell = el.querySelector(`[data-col="${start}"]`);
    if (cell) el.scrollLeft = Math.max(0, cell.offsetLeft - (nowAt >= 0 ? cell.offsetWidth : 0));
  }, [date, start, nowAt]);

  if (!cols.length) return null;
  const vars = tone === "light" ? LIGHT : DARK;
  const labels = [["Saat"], [""], ["Sıcaklık"], ...(hasFeel ? [["Hissedilen"]] : []), ["Yağmur", "mm"], ["Rüzgâr", "kn"], ["Sağanak", "kn"], ["Yön"], ...(lines.length ? [[""]] : [])];
  const ink = (c) => (c.obs ? "text-[color:var(--ht-obs)]" : "");

  return (
    <div style={scale !== 1 ? { ...vars, zoom: scale } : vars} className={className}>
      <div
        data-hour-table
        onClick={onClick}
        className={`flex overflow-hidden rounded-[1.125rem] border border-[color:var(--ht-line)] bg-[color:var(--ht-card)] ${onClick ? "cursor-pointer" : ""}`}
      >
        <div className="shrink-0 border-r border-[color:var(--ht-line)]">
          <div style={{ height: CH }} aria-hidden="true" />
          <div className="py-1">
          {labels.map(([a, b], i) => (
            <div key={i} className="flex h-7 items-center whitespace-nowrap pl-3 pr-2 text-[0.6875rem] font-semibold text-[color:var(--ht-mut)]">
              {a}
              {b && <small className="ml-0.5 text-[0.625rem] font-medium opacity-75">{b}</small>}
            </div>
          ))}
          </div>
        </div>
        <div ref={ref} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <WindChart cols={cols} nowAt={nowAt} />
          <div className="relative flex w-max py-1">
            {cols.map((c, i) => {
              const s = sky(c.code, c.day);
              const rain = mmTone(c.mm);
              return (
                <div
                  key={c.time}
                  data-col={i}
                  data-now={i === nowAt ? "" : undefined}
                  data-obs={c.obs ? "" : undefined}
                  className={`relative w-11 shrink-0 text-center tabular-nums ${c.first ? "border-l border-[color:var(--ht-line)]" : ""}`}
                >
                  {i === nowAt && <span aria-hidden className="pointer-events-none absolute -bottom-1 -top-1 inset-x-0 rounded-[0.625rem] border-2 border-[color:var(--ht-now)]" />}
                  <Cell className={`text-[0.75rem] font-semibold ${c.first ? "text-[color:var(--ht-fg)]" : "text-[color:var(--ht-mut)]"}`}>{c.first ? c.dname : c.hh}</Cell>
                  <Cell>
                    <Icon name={s.icon} className={`size-[1.15rem] ${tone === "light" ? skyTone(s.icon) : DARK_SKY[s.icon] || "text-white/80"}`} />
                  </Cell>
                  <Cell className={`text-[0.9375rem] font-bold ${ink(c)}`}>{c.t}°</Cell>
                  {hasFeel && <Cell className="text-[0.8125rem] text-[color:var(--ht-mut)]">{c.feel != null ? `${c.feel}°` : ""}</Cell>}
                  <Cell className="relative text-[0.75rem] font-bold text-[color:var(--ht-rain)]">
                    {rain && <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: rain }} />}
                    {mmText(c.mm)}
                  </Cell>
                  <Cell className={`text-[0.875rem] font-bold ${ink(c)}`}>{c.wind}</Cell>
                  <Cell>
                    {(c.gust ?? c.wind) != null && (
                      <span className={`grid h-6 w-9 place-items-center rounded-md text-[0.8125rem] font-bold text-[#0b1730] ${c.obs ? "ring-2 ring-inset ring-[color:var(--ht-obs)]" : ""}`} style={{ background: colorOf(c.gust ?? c.wind) }}>
                        {c.gust ?? c.wind}
                      </span>
                    )}
                  </Cell>
                  <Cell>
                    {c.dir != null && (
                      <svg viewBox="0 0 16 16" aria-label={`${Math.round(c.dir)}°`} className={`size-4 ${c.obs ? "text-[color:var(--ht-obs)]" : "text-[color:var(--ht-mut)]"}`} style={{ transform: `rotate(${c.dir + 180}deg)` }}>
                        <path d="M8 1l5 13-5-3-5 3z" fill="currentColor" />
                      </svg>
                    )}
                  </Cell>
                  {lines.length > 0 && <Cell />}
                </div>
              );
            })}
            {lines.map((m, k) => (
              <span key={k} data-mark={m.at} aria-label={`${m.label || ""} ${m.at}`.trim()} className="pointer-events-none absolute bottom-1 top-1 w-0.5 bg-[color:var(--ht-mark)]" style={{ left: m.x * COL }}>
                <small className="absolute bottom-0 left-1 whitespace-nowrap text-[0.6875rem] font-bold text-[color:var(--ht-mark)]">{`${m.label ? `${m.label} ` : ""}${m.at}`}</small>
              </span>
            ))}
          </div>
        </div>
      </div>
      {anyObs && (
        <p className="mt-1.5 flex flex-nowrap gap-3 whitespace-nowrap px-1 text-[0.6875rem] text-[color:var(--ht-mut)]" aria-label="Tablo açıklaması">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-full bg-[color:var(--ht-obs)]" />
            {`Ölçülen${ob?.station?.name ? ` (${ob.station.name} istasyonu)` : ""}`}
          </span>
          <span>Tahmin</span>
        </p>
      )}
    </div>
  );
}

function Cell({ className = "", children }) {
  return <div className={`grid h-7 place-items-center ${className}`}>{children}</div>;
}

const DARK = { "--ht-wind": "#67e8f9", "--ht-gust": "#c4b5fd", "--ht-obs": "#9ed6ff", "--ht-mark": "#ff5c8f", "--ht-fg": "#fff", "--ht-mut": "rgba(255,255,255,.62)", "--ht-line": "rgba(255,255,255,.12)", "--ht-card": "rgba(255,255,255,.05)", "--ht-rain": "#7fb6ff", "--ht-now": "#f05a5a" };
const LIGHT = { "--ht-wind": "#38bdf8", "--ht-gust": "#7c6bd6", "--ht-obs": "#1f6fd1", "--ht-mark": "#e0336f", "--ht-fg": "var(--color-fg, #1d2433)", "--ht-mut": "var(--color-mut, #6b7385)", "--ht-line": "var(--color-line, #e3e6ec)", "--ht-card": "var(--color-card, #fff)", "--ht-rain": "#2f6fc0", "--ht-now": "#e5484d" };

// Tablonun üstündeki rüzgâr grafiği (Seyhun 2026-11-04 "bu tasarıma bir grafik de ekle"): her sütunun üstünde, tabloyla birlikte kayar; dolu alan rüzgâr, kesik çizgi sağanak,
// bugünse şimdiki saatte kırmızı çizgi. Ölçek günün en sert sağanağına göre (en az 10 kn).
function WindChart({ cols, nowAt }) {
  const pts = cols.map((c, i) => ({ x: (i + 0.5) * COL, w: c.wind, g: c.gust ?? c.wind })).filter((p) => p.w != null);
  if (pts.length < 2) return <div style={{ height: CH }} aria-hidden="true" />;
  const max = Math.max(10, ...pts.map((p) => p.g || 0)) * 1.1;
  const y = (v) => (4 + (1 - (v || 0) / max) * (CH - 8)).toFixed(1);
  const line = (k) => pts.map((p, i) => `${i ? "L" : "M"}${p.x},${y(p[k])}`).join("");
  const W = cols.length * COL;
  return (
    <svg data-wind-chart width={W} height={CH} viewBox={`0 0 ${W} ${CH}`} className="block" aria-hidden="true">
      <path d={`${line("w")}L${pts[pts.length - 1].x},${CH}L${pts[0].x},${CH}Z`} fill="var(--ht-wind)" fillOpacity=".8" />
      <path d={line("g")} fill="none" stroke="var(--ht-gust)" strokeWidth="1.5" strokeDasharray="4 3" />
      {nowAt >= 0 && <line x1={(nowAt + 0.5) * COL} x2={(nowAt + 0.5) * COL} y1="0" y2={CH} stroke="var(--ht-now)" strokeWidth="2" />}
    </svg>
  );
}

export { mmText };
