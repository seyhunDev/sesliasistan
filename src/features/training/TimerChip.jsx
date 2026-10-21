"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mmss } from "@/lib/raceScore";
import { ownedBy, upSec } from "@/lib/raceLive";
import { ownHere, useTimer } from "./Countdown";

// Sayaç çalışırken asistan küresinin üstünde süre düğmesi (Seyhun 2026-10-20: "geri sayım devam ediyor ya da ileri akıyor, tıklanınca ilgili
// sayfaya gider"; altta küreyle karışıyordu, üste alınıp büyütüldü). Sayacın sayfası kaydın kendisinde (own: yarış multimedya ya da antrenman günü).
export function TimerChip() {
  const t = useTimer();
  usePathname(); // sayfa değişince yeniden bakılır
  const [now, setNow] = useState(0);
  const on = t.end != null && !!t.own;
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [on]);
  if (!on || !now || ownedBy(t.own, ownHere())) return null;
  const up = now >= t.end;
  const text = up ? `+${mmss(upSec(t.end, now))}` : mmss(Math.ceil((t.end - now) / 1000));
  return (
    <Link
      href={t.own.startsWith("/athletes/races/") ? `${t.own}?tab=sure` : t.own}
      data-timer-chip=""
      aria-label={up ? `Startan beri ${text}, sayaca git` : `Starta ${text}, sayaca git`}
      className="pointer-events-auto absolute -top-[3.5rem] left-1/2 z-10 flex h-8 -translate-x-1/2 items-center rounded-full bg-acc px-3.5 text-[1rem] font-semibold tabular-nums leading-none text-white shadow-[0_2px_10px_rgba(38,40,44,.18)] active:scale-95"
    >
      {text}
    </Link>
  );
}
