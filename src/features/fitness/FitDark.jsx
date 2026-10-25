"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { STATUS, addDays, dowOf } from "@/lib/fitness/model";

// Koyu Fitness sayfalarının ortak parçaları (Seyhun 2026-10-23 "A · Koyu"; sporcunun Fitness sayfası da aynı, 2026-10-25):
// üstteki salon fotoğrafı ve Pzt–Paz gün kutuları. Ana hesabın Sporcular sekmesi (FitnessHome) ve sporcunun sayfası (AthleteFitness) kullanır.

// Arka plan: üstte salon fotoğrafı (ücretsiz lisanslı Unsplash), aşağı doğru koyulaşıp sayfanın koyu zeminine karışır. Yüklenemezse yalnız koyu zemin kalır.
const FIT_BG = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=60&auto=format&fit=crop";
export function FitPhoto() {
  const [off, setOff] = useState(false);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[27rem] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- dış bağlantı (Unsplash), Next görüntü sunucusu yok */}
      {!off && <img src={FIT_BG} alt="" onError={() => setOff(true)} className="size-full object-cover opacity-80" />}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,22,40,.3)_0%,rgba(11,22,40,.72)_45%,#0b1628_100%)]" />
    </div>
  );
}

export const DOW = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// Bu haftanın 7 günü: ✓ yaptı, ✕ yapmadı, – atladı, çerçeveli bugün, rakam sıradaki, nokta antrenmansız.
// days: weekStats().days ({ id, date, name, st }); antrenmanlı güne dokununca onOpen(gün)
export function WeekBoxes({ days, today, onOpen, className = "" }) {
  const mon = addDays(today, 1 - dowOf(today));
  return (
    <div className={`grid grid-cols-7 gap-1.5 ${className}`}>
      {DOW.map((dn, i) => {
        const date = addDays(mon, i);
        const d = days.find((x) => x.date === date);
        const look = !d
          ? "text-white/25"
          : { done: "bg-[#9fe7c6] text-[#0b2a20]", missed: "bg-[#f3a39a] text-[#5a1610]", skip: "bg-white/12 text-white/70", today: "border-2 border-[#67e8f9] text-[#67e8f9]" }[d.st] || "border border-white/30 text-white";
        return (
          <button key={date} type="button" disabled={!d} aria-label={d ? `${dn} ${d.name} · ${STATUS[d.st]}` : dn} onClick={() => d && onOpen(d)} className="flex flex-col items-center gap-1">
            <small className={`text-[0.6875rem] ${date === today ? "font-bold text-white" : "text-[#9fb0cc]"}`}>{dn}</small>
            <span className={`grid h-10 w-full place-items-center rounded-xl text-[0.8125rem] font-bold ${look}`}>
              {!d ? "·" : d.st === "done" ? <Icon name="check" className="size-4" /> : d.st === "missed" ? "✕" : d.st === "skip" ? "–" : +date.slice(8)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
