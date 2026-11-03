"use client";

import { useState } from "react";
import { useData } from "@/features/data/DataProvider";
import { dayInfo, planTone, trainingWeek } from "@/lib/homeTiles";
import { DayPick } from "./DayPick";

// Kokpitin altındaki büyük gün şeridi (Seyhun 2026-10-21: "tarihleri büyük yapalım"): bugünden 7 gün, gün adı, büyük gün sayısı,
// altında o günün planlarının renginde nokta (antrenman, plan türü, fitness turuncu). Her gün kabarık düğme (basınca içeri girer); bugün beyaz,
// açık penceredeki gün mor (Seyhun 2026-10-21: "seçili olana renk, buton gibi tıklama hissi"). Güne dokununca o günün penceresi açılır
// (DayPick: planlar, yelken/yoklama, fitness; Seyhun: "ne varsa o gün onları göstermeliyiz", kaydırma yok). att: yoklama yetkisi; fit: fitDays().
// 2026-10-23 (Seyhun "günler en üstte"): şerit kokpitin en üstünde, bugün diğerlerinden geniş ve büyük. Güne dokununca o gün seçilir (sel/onSel;
// kokpitteki hava, grafik ve planlar o güne geçer), aynı dokunuşla o günün penceresi de açılır (2026-11-02). Seçili gün camgöbeği; başka gün
// seçiliyken bugün beyaz çerçeveli kalır, bugüne dokununca geri döner.
// pick / onPick: penceresi açık günün tarihi (kokpitteki "Günü aç" da açar)
export function HomeDays({ today, fit, att, sel = today, onSel, pick, onPick }) {
  const { plans } = useData();
  const week = trainingWeek(plans, today, fit || [], 2, true);
  const days = Array.from({ length: 7 }, (_, i) => {
    const got = week?.days[i + 1];
    if (got) return got;
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    return { date: d.toLocaleDateString("sv-SE"), d: d.getDate(), state: "none", sail: [], fit: [], other: [] };
  });
  // Önceki 5 gün (Seyhun 2026-11-03): kapalı başlar; "‹ Önceki 5 gün" şeridi geçmiş 5 güne çevirir, güne dokununca hava o günün tahmini ve ölçümüyle gelir
  const [back, setBack] = useState(false);
  const past = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 5 + i);
    return { date: d.toLocaleDateString("sv-SE"), d: d.getDate(), state: "none", sail: [], fit: [], other: [] };
  });
  const shown = back ? past : days;
  const picked = [...past, ...days].find((d) => d.date === pick) || null;
  return (
    <>
      <div className="mb-1 flex justify-end">
        <button type="button" data-press aria-pressed={back} onClick={() => (setBack((b) => !b), onSel?.(today))} className="h-6 rounded-full px-2.5 text-[0.75rem] font-semibold text-white/70">
          {back ? "Önümüzdeki günler ›" : "‹ Önceki 5 gün"}
        </button>
      </div>
      <nav aria-label="Günler" className={`grid items-end gap-1 ${back ? "grid-cols-5" : "grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]"}`}>
        {shown.map((d, i) => {
          const tones = [...new Set([...d.sail, ...d.other].map(planTone))].slice(0, 2);
          const tap = dayInfo(d, att, today).tap;
          const on = sel === d.date;
          const first = !back && i === 0;
          const w = new Date(`${d.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
          // Tek dokunuş (Seyhun 2026-11-02 "güne tıklayınca hem rüzgâr değişmeli hem alttan planlar"): gün seçilir (hava, grafik o güne geçer)
          // ve o günün penceresi alttan açılır (gösterecek bir şey ya da yoklama yetkisi varsa)
          const open = () => {
            if (!on) onSel?.(d.date);
            if (tap) onPick?.(d.date);
          };
          return (
            <button key={d.date} type="button" data-press aria-pressed={on} onClick={open} className={`raised flex flex-col items-center gap-1 rounded-2xl ${first ? "py-[clamp(0.625rem,calc(var(--u,7px)*1.6),1.125rem)]" : "py-[clamp(0.5rem,calc(var(--u,7px)*1.35),1rem)]"} ${first ? (on ? "act-main" : "ck-tout") : on ? "ck-sel" : ""}`}>
              <small className={`text-[0.75rem] font-semibold capitalize ${on || first ? "" : "text-white/60"}`}>{w}</small>
              <b className={`${first ? "text-[clamp(1.5rem,calc(var(--u,7px)*4.6),2.5rem)]" : "text-[clamp(1.3125rem,calc(var(--u,7px)*4),2.125rem)]"} font-bold leading-none tracking-[-.03em] tabular-nums`}>{d.d}</b>
              <span className="flex h-1.5 items-center gap-0.5">
                {tones.map((t) => (
                  <span key={t} className={`tone-${t} tone-bar size-1.5 rounded-full`} />
                ))}
                {d.fit.length > 0 && <span className="size-1.5 rounded-full bg-orange-400" />}
              </span>
            </button>
          );
        })}
      </nav>
      <DayPick day={picked} att={att} today={today} onClose={() => onPick?.(null)} />
    </>
  );
}
