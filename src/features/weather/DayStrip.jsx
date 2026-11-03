"use client";

import { Icon } from "@/components/ui/Icon";
import { kn, sky } from "./weather";
import { mmText } from "./hourCols";

const DARK_SKY = { sun: "text-amber-300", cloudSun: "text-amber-200", moon: "text-indigo-200", cloud: "text-slate-300", fog: "text-slate-300", rain: "text-sky-300", snow: "text-sky-100", storm: "text-amber-300" };

// Günler şeridi (Seyhun 2026-11-03 Windy görseli, örnek hava-sayfasi-ornek.png "Böyle yap"): lacivert üstte yan yana günler; her günde ad, gökyüzü,
// en düşük / en yüksek sıcaklık, günlük yağış mm (sayıyla, mavi) ve rüzgâr–sağanak kn. Arkada en yüksek sıcaklığın soluk eğrisi. Seçili gün camgöbeği çerçeveli;
// dokununca altındaki saat saat tablo o güne geçer.
export function DayStrip({ days, sel, onSel, today }) {
  if (!days?.length) return null;
  const mx = days.map((d) => d.max ?? 0);
  const lo = Math.min(...mx) - 4, hi = Math.max(...mx) + 2;
  const n = days.length;
  const curve = `M0,100 ${mx.map((v, i) => `L${((i + 0.5) * 100) / n},${(100 - ((v - lo) / Math.max(1, hi - lo)) * 70).toFixed(1)}`).join(" ")} L100,100Z`;
  return (
    <nav aria-label="Günler" className="relative grid overflow-hidden rounded-[1.125rem] border border-white/10 bg-white/5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        <path d={curve} fill="rgba(255,255,255,.06)" />
      </svg>
      {days.map((d, i) => {
        const on = d.date === sel;
        const s = sky(d.code);
        const dt = new Date(`${d.date}T12:00:00`);
        const name = d.date === today ? "Bugün" : dt.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
        return (
          <button
            key={d.date}
            type="button"
            data-press
            aria-pressed={on}
            onClick={() => onSel(d.date)}
            className={`relative flex min-w-0 flex-col items-center gap-0.5 py-2 tabular-nums ${i ? "border-l border-white/10" : ""} ${on ? "rounded-[1rem] bg-[#0ea5c4]/25 shadow-[inset_0_0_0_2px_#0ea5c4]" : ""}`}
          >
            <small className={`text-[0.75rem] font-semibold capitalize ${on ? "text-white" : "text-white/70"}`}>{name}</small>
            <Icon name={s.icon} className={`my-0.5 size-5 ${DARK_SKY[s.icon] || "text-white/80"}`} />
            <span className="text-[0.75rem] text-white/70">
              {d.min}° / <b className="text-[0.875rem] font-bold text-white">{d.max}°</b>
            </span>
            <span className="h-4 text-[0.6875rem] font-bold text-[#7fb6ff]">{d.mm >= 0.1 ? `${mmText(d.mm)} mm` : ""}</span>
            <span className="truncate text-[0.6875rem] text-white/70">{d.wind != null ? `${kn(d.wind, d.gust)} kn` : ""}</span>
          </button>
        );
      })}
    </nav>
  );
}
