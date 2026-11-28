"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBilgi, useTekneler } from "@/features/bilgi/bilgiStore";
import { membersOf } from "@/lib/bilgi";
import { bilgiOrg } from "@/lib/kinds";
import { useNow } from "@/hooks/useNow";

// VİTRİN KARTLARI (Seyhun 2026-11-28 "Velora Sailing'i sadece bir buton olarak değil, güzel bir tasarımla, telefonda yatayda full göstermek istiyorum;
// Yönet de aynı şekilde; arka fonları, solukluk, yazı güzel alanlar olmalı"; örnek yonetim-paneli/ornek.html v2).
// Ana hesap ve normal kullanıcının ana sayfasında (SahneHome.jsx, pano.css .vt): solu karartılmış çizim zemin, küçük üst yazı, büyük ad, tek satır, Aç.
// Zemin kodla çizilir (resim dosyası yok): Sailing'de denizde tramola atan tekneler, Yönet'te parkur haritasında yanıp sönen tekneler.
// Hareket azaltılmışsa (iOS ayarı) çizim durur.
function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const f = () => setStill(m.matches);
    f();
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, []);
  return still;
}

const HULL = "M0 -9 C5 -3 5 5 3 9 H-3 C-5 5 -5 -3 0 -9Z";
const WAVES = Array.from({ length: 10 }, (_, i) => 20 + i * 40);

function SailBg({ still }) {
  return (
    <svg className="vt-bg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="vt-sd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b3d5c" />
          <stop offset="1" stopColor="#062033" />
        </linearGradient>
        <radialGradient id="vt-sr" cx=".8" cy=".2" r=".7">
          <stop offset="0" stopColor="#3d8bff" stopOpacity=".35" />
          <stop offset="1" stopColor="#3d8bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="220" fill="url(#vt-sd)" />
      <rect width="400" height="220" fill="url(#vt-sr)" />
      <g stroke="#7fc4ff" strokeOpacity=".12" fill="none">
        {WAVES.map((x) => (
          <path key={x} d={`M${x} 0 q 10 20 0 40 t 0 40 t 0 40 t 0 40 t 0 40 t 0 40`} />
        ))}
      </g>
      <g stroke="#9cc2ff" strokeOpacity=".35" strokeDasharray="4 6" fill="none">
        <path d="M240 200 L300 120 L250 70 L320 20" />
        <path d="M200 200 L330 40" strokeOpacity=".5" />
      </g>
      <circle cx="320" cy="20" r="6" fill="#f5b13d" />
      <path d="M230 205 L300 205" stroke="#e9edf7" strokeOpacity=".5" />
      <g transform={still ? "translate(300 120) rotate(40)" : undefined}>
        <path d={HULL} fill="#fff" />
        <path d="M0 -7 L0 7" stroke="#3d8bff" strokeWidth="1.5" />
        {!still && <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path="M240 200 L300 120 L250 70 L320 20" />}
      </g>
      <g opacity=".7" transform={still ? "translate(290 80) rotate(-20)" : undefined}>
        <path d={HULL} fill="#9cc2ff" />
        {!still && <animateMotion dur="9s" begin="-2s" repeatCount="indefinite" rotate="auto" path="M270 205 L340 130 L290 80 L325 25" />}
      </g>
    </svg>
  );
}

const GRID_X = Array.from({ length: 20 }, (_, i) => i * 20);
const GRID_Y = Array.from({ length: 11 }, (_, i) => i * 20);
const DOTS = [
  [268, 120, 0],
  [282, 95, 0.4],
  [259, 140, 0.8],
  [305, 72, 1.2],
  [290, 150, 1.6],
];

function YonetBg({ still }) {
  return (
    <svg className="vt-bg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="vt-yr" cx=".75" cy=".5" r=".6">
          <stop offset="0" stopColor="#1e3a7a" stopOpacity=".7" />
          <stop offset="1" stopColor="#0a1124" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="220" fill="#0a1124" />
      <rect width="400" height="220" fill="url(#vt-yr)" />
      <g stroke="#3d8bff" strokeOpacity=".08">
        {GRID_X.map((x) => (
          <path key={`x${x}`} d={`M${x} 0V220`} />
        ))}
        {GRID_Y.map((y) => (
          <path key={`y${y}`} d={`M0 ${y}H400`} />
        ))}
      </g>
      <path d="M370 0 C340 60 360 140 330 220 H400 V0Z" fill="#132447" opacity=".8" />
      <path d="M250 185 L300 40 L345 130 Z" fill="none" stroke="#9cc2ff" strokeOpacity=".5" strokeDasharray="3 5" />
      <path d="M225 190 L280 190" stroke="#e9edf7" strokeWidth="1.5" strokeOpacity=".7" />
      <g fill="#f5b13d">
        <circle cx="300" cy="40" r="5" />
        <circle cx="345" cy="130" r="5" />
        <circle cx="250" cy="185" r="4" />
      </g>
      <g fill="none" stroke="#3d8bff" strokeOpacity=".35">
        <path d="M268 120 L262 135 L256 150" />
        <path d="M282 95 L276 112 L270 128" />
        <path d="M305 72 L298 90 L292 105" />
      </g>
      <g fill="#3d8bff">
        {DOTS.map(([x, y, d]) => (
          <circle key={x} cx={x} cy={y} r="3.5">
            {!still && <animate attributeName="r" values="3.5;5;3.5" dur="2s" begin={`${d}s`} repeatCount="indefinite" />}
          </circle>
        ))}
      </g>
      {!still && (
        <circle cx="300" cy="110" r="0" fill="none" stroke="#3d8bff" strokeOpacity=".4">
          <animate attributeName="r" values="0;90" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values=".4;0" dur="3.5s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function Card({ href, cls, bg, top, title, line, extra }) {
  return (
    <Link href={href} data-press className={`vt ${cls}`}>
      {bg}
      <span className="vt-top">{top}</span>
      <b className="vt-t">{title}</b>
      <span className="vt-l">{line}</span>
      <span className="vt-ft">
        <span className="vt-go">Aç</span>
        {extra}
      </span>
    </Link>
  );
}

// Yönet kartı: kanal açıkken düğmenin yanında "Açık · 5 tekne" (son 90 sn'de konum veren tekneler; tekneler yalnız kanal açıkken dinlenir)
function YonetCard({ profile, still }) {
  const org = bilgiOrg(profile);
  const b = useBilgi(org);
  const k = b?.kanal?.open ? b.kanal : null;
  const boats = useTekneler(k ? org : "");
  const now = useNow(30000).getTime();
  const n = k ? membersOf(boats, k.id, now).length : 0;
  return (
    <Card
      href="/bilgi/yonet"
      cls="vt-yon"
      bg={<YonetBg still={still} />}
      top="Su üstü"
      title="Yönet"
      line="Tekneler, parkur ve start tek haritada."
      extra={k ? <em className="vt-live">{n ? `Açık · ${n} tekne` : "Açık"}</em> : null}
    />
  );
}

export function Vitrin({ yonet, profile }) {
  const still = useStill();
  return (
    <div className="vt-row">
      <Card href="/sailing" cls="vt-sail" bg={<SailBg still={still} />} top="Simülatör" title="Velora Sailing" line="Taktik ve kural senaryoları, oynayarak öğren." />
      {yonet && <YonetCard profile={profile} still={still} />}
    </div>
  );
}
