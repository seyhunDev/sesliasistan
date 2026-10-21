"use client";

import { useData } from "@/features/data/DataProvider";
import { planTone } from "@/lib/homeTiles";

// Kokpitin (ilk ekranın) altındaki büyük gün şeridi (Seyhun 2026-10-21: "tarihleri büyük yapalım, tıkladığımda aşağı kaysın"): bugünden 7 gün,
// gün adı, büyük gün sayısı, planı olan günün altında renkli nokta. Dokununca sayfa aşağıdaki takvim listesine kayar.
export function HomeDays({ today, onPick }) {
  const { plans } = useData();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    const date = d.toLocaleDateString("sv-SE");
    const tones = [...new Set(plans.filter((p) => p.date === date && p.status !== "cancelled").map(planTone))].slice(0, 3);
    return { date, w: d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""), d: d.getDate(), tones };
  });
  return (
    <nav aria-label="Günler" className="grid grid-cols-7 gap-1">
      {days.map((d, i) => (
        <button key={d.date} type="button" data-press onClick={() => onPick(d.date)} className={`flex flex-col items-center gap-1 rounded-2xl py-2 ${i === 0 ? "bg-white text-[#141938]" : ""}`}>
          <small className={`text-[0.75rem] font-semibold capitalize ${i === 0 ? "" : "text-white/60"}`}>{d.w}</small>
          <b className="text-[1.625rem] font-bold leading-none tracking-[-.03em] tabular-nums">{d.d}</b>
          <span className="flex h-1.5 items-center gap-0.5">
            {d.tones.map((t) => (
              <span key={t} className={`tone-${t} tone-bar size-1.5 rounded-full`} />
            ))}
          </span>
        </button>
      ))}
    </nav>
  );
}
