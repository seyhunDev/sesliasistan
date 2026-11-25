"use client";

import { useState } from "react";
import Link from "next/link";
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,22,40,.3)_0%,rgba(11,22,40,.72)_45%,#081429_100%)]" />
    </div>
  );
}

export const DOW = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// Bu haftanın 7 günü (Sahne, 2026-11-25): ✓ yaptı limon, ✕ yapmadı kırmızı, – atladı, limon çerçeve bugün, rakam sıradaki, nokta antrenmansız.
// days: weekStats().days ({ id, date, name, st }); antrenmanlı güne dokununca onOpen(gün)
export function WeekBoxes({ days, today, onOpen, className = "" }) {
  const mon = addDays(today, 1 - dowOf(today));
  return (
    <div className={`grid grid-cols-7 gap-1.5 ${className}`}>
      {DOW.map((dn, i) => {
        const date = addDays(mon, i);
        const d = days.find((x) => x.date === date);
        const look = !d
          ? "border border-[#26262b] bg-[#17171a] text-[#71717a]"
          : { done: "bg-[#d4ff3a] text-[#111]", missed: "border border-[#5b1d20] bg-[#3a1416] text-[#ff6b6b]", skip: "bg-[#1f1f22] text-white/70", today: "border-2 border-[#d4ff3a] text-[#d4ff3a]" }[d.st] || "border border-[#3f3f46] bg-[#17171a] text-white";
        return (
          <button key={date} type="button" disabled={!d} aria-label={d ? `${dn} ${d.name} · ${STATUS[d.st]}` : dn} onClick={() => d && onOpen(d)} className="flex flex-col items-center gap-1">
            <small className={`text-[0.75rem] font-semibold ${date === today ? "text-white" : "text-[#a1a1aa]"}`}>{dn}</small>
            <span className={`num grid h-11 w-full place-items-center rounded-xl text-[0.9375rem] font-bold ${look}`}>
              {!d ? "·" : d.st === "done" ? <Icon name="check" className="size-4 [stroke-width:3]" /> : d.st === "missed" ? "✕" : d.st === "skip" ? "–" : +date.slice(8)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Sahne üst çubuğu (ana sayfadaki gibi): geri · ortada ad ve tarih · ⋯ · limon +
export function FsHead({ label, back = "/", onBack, onMore, onAdd, addLabel = "Ekle", children }) {
  const d = new Date().toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  return (
    <div className="flex items-center gap-2 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Geri" data-press className="fs-rb">
          <Icon name="back" className="size-5" />
        </button>
      ) : (
        <Link href={back} aria-label="Geri" data-press className="fs-rb">
          <Icon name="back" className="size-5" />
        </Link>
      )}
      <span className="fs-date">{label ?? `Fitness · ${d}`}</span>
      {children}
      {onMore && (
        <button type="button" onClick={onMore} aria-label="Diğer" data-press className="fs-rb">
          <Icon name="more" className="size-5" />
        </button>
      )}
      {onAdd && (
        <button type="button" onClick={onAdd} aria-label={addLabel} data-press className="fs-rb fs-add">
          <Icon name="plus" className="size-5 [stroke-width:2.6]" />
        </button>
      )}
    </div>
  );
}
