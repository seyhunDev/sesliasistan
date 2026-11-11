"use client";

import { useEffect, useRef, useState } from "react";
import { useWeather } from "@/features/weather/useWeather";
import { dayHours, nowOf, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { todayStr } from "@/lib/utils/format";

// Antrenman sayfası iPad (Seyhun 2026-11-11 "A · Üç sütun"): Start'ın altındaki küçük rüzgâr eğrisi. Antrenman saatinin çevresi
// (başlangıçtan 1 sa önce, bitişten 1 sa sonra), antrenman aralığı yeşil zeminli, bugünse kırmızı "şimdi" çizgisi.
// Veri Hava sayfasında seçilen yerin tahmini (useWeather); dokununca ortak saat saat tablo (RaceWx) açılır.
const hOf = (t) => (t && /^\d{1,2}:\d{2}/.test(t) ? +t.split(":")[0] + +t.split(":")[1].slice(0, 2) / 60 : null);

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function TrainWind({ plan, date, onOpen }) {
  const { w } = useWeather();
  const now = useNow(60000);
  const [ref, W] = useWidth();
  const rows = dayHours(w, date) || [];
  const s = hOf(plan?.time) ?? 14;
  const e = Math.max(hOf(plan?.endTime) ?? s + (plan?.durationMin ? plan.durationMin / 60 : 2.5), s + 0.75);
  const h0 = Math.max(0, Math.floor(s - 1));
  const h1 = Math.min(23, Math.ceil(e + 1));
  const pts = rows.map((r) => ({ ...r, x: +r.hh })).filter((p) => p.x >= h0 && p.x <= h1);
  const isToday = date === todayStr();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const n = isToday ? nowOf(w) : null;
  const H = 120;
  const X = (h) => 8 + ((h - h0) / (h1 - h0 || 1)) * (W - 16);
  const wy0 = 8;
  const wy1 = H - 24;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind ?? 0)) + 3;
  const Y = (k) => wy1 - (k / top) * (wy1 - wy0);
  const line = (k) => pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p[k] ?? p.wind).toFixed(1)}`).join(" ");
  const area = pts.length ? `M${X(pts[0].x)} ${wy1} ${line("wind").replace(/^M/, "L")} L${X(pts.at(-1).x)} ${wy1}Z` : "";
  const showNow = isToday && nowH >= h0 && nowH <= h1 && pts.length > 1;
  const nowWind = showNow ? pts.reduce((a, p) => (Math.abs(p.x - nowH) < Math.abs(a.x - nowH) ? p : a), pts[0]).wind : null;
  const ticks = [];
  for (let h = h0 + 1; h < h1; h += h1 - h0 > 6 ? 2 : 1) ticks.push(h);

  return (
    <button type="button" onClick={onOpen} className="tw-pn tw-wind" aria-label="Rüzgâr ayrıntısı">
      <span className="tw-pt">
        Rüzgâr<span className="flex-1" />
        {n ? (
          <em className="num">
            şimdi {Math.round(n.wind)} kn{windName(n.dir) ? ` · ${windName(n.dir)[0]}` : ""}
          </em>
        ) : null}
      </span>
      <span ref={ref} className="block" style={{ height: H }}>
        {W > 0 && pts.length > 1 ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
            <defs>
              <linearGradient id="tw-wz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d7bff" stopOpacity=".45" />
                <stop offset="1" stopColor="#3d7bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x={X(s)} y={wy0 - 4} width={Math.max(0, X(e) - X(s))} height={wy1 - wy0 + 4} fill="#35b48a" opacity=".1" />
            <path d={area} fill="url(#tw-wz)" />
            <path d={line("wind")} stroke="#8fb3ff" strokeWidth="2" fill="none" />
            <path d={line("gust")} stroke="#8fb3ff" strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity=".7" />
            {ticks.map((h) => (
              <text key={h} x={X(h)} y={H - 6} fill="#7d90b5" fontSize="11" textAnchor="middle" fontWeight="600">
                {String(h).padStart(2, "0")}:00
              </text>
            ))}
            {showNow && (
              <>
                <line x1={X(nowH)} x2={X(nowH)} y1={wy0 - 4} y2={wy1} stroke="var(--rec)" strokeWidth="1.6" />
                {nowWind != null && <circle cx={X(nowH)} cy={Y(nowWind)} r="5" fill="var(--rec)" stroke="#fff" strokeWidth="2" />}
              </>
            )}
          </svg>
        ) : (
          <span className="grid h-full place-items-center text-[0.8125rem] text-[#7d90b5]">{w ? "Bu gün için tahmin yok" : "Hava yükleniyor…"}</span>
        )}
      </span>
    </button>
  );
}
