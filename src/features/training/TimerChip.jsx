"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mmss } from "@/lib/raceScore";
import { upSec } from "@/lib/raceLive";
import { useTimer } from "./Countdown";

// Sayaç çalışırken asistan küresinin üstünde (2026-10-20: altta küreyle karışıyordu, büyütüldü) küçük süre düğmesi (Seyhun 2026-10-20: "geri sayım devam ediyor ya da ileri akıyor,
// tıklanınca ilgili sayfaya gider"). Sayacın sayfası (yarış multimedya ya da antrenman günü) o sayfa açıkken burada saklanır.
const YER = "sa-sayac-yer";
const sub = (f) => (window.addEventListener(YER, f), () => window.removeEventListener(YER, f));
const yer = () => {
  try {
    return localStorage.getItem(YER) || "";
  } catch {
    return "";
  }
};

// Sayacı gösteren sayfa çağırır: sayaç çalışırken bu sayfanın adresi saklanır
export function useTimerHome() {
  const t = useTimer();
  const path = usePathname();
  useEffect(() => {
    if (t.end == null) return;
    try {
      localStorage.setItem(YER, path + window.location.search);
    } catch {}
    window.dispatchEvent(new Event(YER));
  }, [t.end, path]);
}

export function TimerChip() {
  const t = useTimer();
  const path = usePathname();
  const href = useSyncExternalStore(sub, yer, () => "");
  const [now, setNow] = useState(0);
  const on = t.end != null && !!href;
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [on]);
  if (!on || !now || href.split("?")[0] === path) return null;
  const up = now >= t.end;
  const text = up ? `+${mmss(upSec(t.end, now))}` : mmss(Math.ceil((t.end - now) / 1000));
  return (
    <Link
      href={href}
      data-timer-chip=""
      aria-label={up ? `Startan beri ${text}, sayaca git` : `Starta ${text}, sayaca git`}
      className="pointer-events-auto absolute -top-[3.5rem] left-1/2 z-10 flex h-8 -translate-x-1/2 items-center rounded-full bg-acc px-3.5 text-[1rem] font-semibold tabular-nums leading-none text-white shadow-[0_2px_10px_rgba(38,40,44,.18)] active:scale-95"
    >
      {text}
    </Link>
  );
}
