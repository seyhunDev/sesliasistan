"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mmss } from "@/lib/raceScore";
import { ownedBy, upSec } from "@/lib/raceLive";
import { ownHere, useTimer } from "./Countdown";

// Sayaç çalışırken üstte ortada küçük siyah ada (Seyhun 2026-11-23 "B · Üstte küçük siyah ada", örnek sure-gostergesi/ornek.html;
// önceden asistan küresinin üstünde mavi haptı). Kırmızı nokta + süre (start geçince "+00:45") + çarpı. Dokununca sayacın sayfası açılır
// (yarış: ?tab=sure, antrenman günü). Sayacın kendi sayfasında görünmez. Çarpı yalnız bu sayacı gizler (HIDE: sahip + süre + bitiş);
// yeni sayaç başlayınca (bitiş saati süreden fazla kayınca) yine çıkar. Telefonda sayfa ada kadar aşağı kayar (globals.css .tisl).
const HIDE = "sa-timer-hide";
const readHide = () => {
  try {
    return JSON.parse(localStorage.getItem(HIDE) || "null");
  } catch {
    return null;
  }
};
const hidden = (t, h) => !!h && h.own === t.own && h.dur === t.dur && Math.abs(h.end - t.end) < Math.max(60, t.dur || 0) * 1000;

export function TimerChip() {
  const t = useTimer();
  usePathname(); // sayfa değişince yeniden bakılır
  const [now, setNow] = useState(0);
  const [hide, setHide] = useState(readHide);
  const on = t.end != null && !!t.own;
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [on]);
  if (!on || !now || ownedBy(t.own, ownHere()) || hidden(t, hide)) return null;
  const up = now >= t.end;
  const text = up ? `+${mmss(upSec(t.end, now))}` : mmss(Math.ceil((t.end - now) / 1000));
  const close = () => {
    const h = { own: t.own, dur: t.dur, end: t.end };
    try {
      localStorage.setItem(HIDE, JSON.stringify(h));
    } catch {}
    setHide(h);
  };
  return (
    <div data-timer-chip="" className="tisl">
      <Link href={t.own.startsWith("/athletes/races/") ? `${t.own}?tab=sure` : t.own} aria-label={up ? `Startan beri ${text}, sayaca git` : `Starta ${text}, sayaca git`} className="tisl-go">
        <i aria-hidden="true" />
        {!up && t.mode === "start" && <span className="tisl-w">Starta</span>}
        <b className="num">{text}</b>
      </Link>
      <button type="button" onClick={close} aria-label="Süreyi gizle" className="tisl-x">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </div>
  );
}
