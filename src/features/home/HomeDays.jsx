"use client";

import { useState } from "react";
import { useData } from "@/features/data/DataProvider";
import { dayInfo, planTone, trainingWeek } from "@/lib/homeTiles";
import { DayPick } from "./DayPick";

// Kokpitin altındaki büyük gün şeridi (Seyhun 2026-10-21: "tarihleri büyük yapalım"): bugünden 7 gün, gün adı, büyük gün sayısı,
// altında o günün planlarının renginde nokta (antrenman, plan türü, fitness turuncu). Her gün kabarık düğme (basınca içeri girer); bugün beyaz,
// açık penceredeki gün mor (Seyhun 2026-10-21: "seçili olana renk, buton gibi tıklama hissi"). Güne dokununca o günün penceresi açılır
// (DayPick: planlar, yelken/yoklama, fitness; Seyhun: "ne varsa o gün onları göstermeliyiz", kaydırma yok). att: yoklama yetkisi; fit: fitDays().
export function HomeDays({ today, fit, att }) {
  const { plans } = useData();
  const [pick, setPick] = useState(null);
  const week = trainingWeek(plans, today, fit || [], 2, true);
  const days = Array.from({ length: 7 }, (_, i) => {
    const got = week?.days[i + 1];
    if (got) return got;
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    return { date: d.toLocaleDateString("sv-SE"), d: d.getDate(), state: "none", sail: [], fit: [], other: [] };
  });
  return (
    <>
      <nav aria-label="Günler" className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const tones = [...new Set([...d.sail, ...d.other].map(planTone))].slice(0, 2);
          const tap = dayInfo(d, att, today).tap;
          const on = pick?.date === d.date;
          const w = new Date(`${d.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
          return (
            <button key={d.date} type="button" data-press disabled={!tap} aria-pressed={on} onClick={() => setPick(d)} className={`raised flex flex-col items-center gap-1 rounded-2xl py-2 ${on ? "ck-sel" : i === 0 ? "act-main" : ""}`}>
              <small className={`text-[0.75rem] font-semibold capitalize ${on || i === 0 ? "" : "text-white/60"}`}>{w}</small>
              <b className="text-[1.625rem] font-bold leading-none tracking-[-.03em] tabular-nums">{d.d}</b>
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
      <DayPick day={pick} att={att} today={today} onClose={() => setPick(null)} />
    </>
  );
}
