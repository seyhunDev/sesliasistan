"use client";

import { useId } from "react";

// Asistanın canlı logosu (Seyhun'un onayladığı örnek, 2026-10-22; /mnt/project-files/asistan-ekrani/asistan-yeni.html):
// Velora halkasının 24 çubuğu durumu anlatır, ayrı süs animasyonu yok.
//   boşta     açılışta çubuklar sırayla bir kez büyür, sonra durur (boşta hiçbir şey oynamaz)
//   dinliyor  çubuklar sesin gücüyle uzar (--lvl, ListenWave her karede kubbeye yazar; burada yalnız CSS)
//   çalışıyor işlerin sayısı belliyse çubuklar ilerledikçe yanar ("2 / 4"), belli değilse üzerinde ışık döner
//   konuşuyor çubuklar sırayla atar
//   bitti     çubuklar içeri çekilir, ortadaki daire büyür ve onay işareti çizilir
// r: lib/assistRing.js ringOf sonucu ({ tone, fill, label, sub, bars, check, creep }). Görünüş globals.css .lring.
const H = [60, 100, 140, 90, 120, 70, 150, 85];
const BARS = Array.from({ length: 24 }, (_, i) => H[i % 8]);
// Her çubuğun sese tepkisi biraz farklı (hepsi aynı uzayınca halka şişer gibi görünür)
const M = BARS.map((_, i) => (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7))).toFixed(2));

export function LogoRing({ r, big }) {
  const id = useId().replace(/:/g, "");
  const tone = r.tone || "idle";
  const lit = tone === "work" && !r.creep && r.fill > 0 ? Math.round(r.fill * 24) : -1;
  const svg = (
    <svg
      viewBox="132 132 760 760"
      data-ring=""
      data-tone={tone}
      data-fill={r.fill || 0}
      data-run={tone === "work" && lit < 0 ? "" : undefined}
      className={`lring ${big ? "size-[11.5rem]" : "size-11 shrink-0"}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`lr${id}`} gradientUnits="userSpaceOnUse" x1="160" y1="160" x2="864" y2="864">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <g stroke={`url(#lr${id})`}>
        {BARS.map((h, i) => (
          <g key={i} transform={`rotate(${i * 15} 512 512)`}>
            <line x1="512" y1="312" x2="512" y2={312 - h} style={{ "--i": i, "--m": M[i] }} className={lit >= 0 && i < lit ? "on" : undefined} />
          </g>
        ))}
      </g>
      <circle cx="512" cy="512" r="70" fill={`url(#lr${id})`} />
      {r.check && <path className="lring-check" d="M440 515 l50 50 l100 -110" />}
    </svg>
  );
  if (big) return (
    <div className="pointer-events-none flex shrink-0 flex-col items-center pt-[6vh] text-center" aria-live="polite">
      {svg}
      <p className="mt-4 min-h-7 px-6 text-xl font-semibold text-fg">{r.label || (tone === "idle" ? "Ne yapalım?" : "")}</p>
      <p className="min-h-5 px-6 text-sm text-mut">{r.sub}</p>
    </div>
  );
  if (!r.label && !r.fill && !r.bars) return null;
  return (
    <div className="pointer-events-none mx-4 flex shrink-0 items-center gap-3" aria-live="polite">
      {svg}
      <div className="min-w-0" hidden={!r.label}>
        <p className="truncate text-[0.9375rem] font-semibold text-fg">{r.label}</p>
        {r.sub && <p className="truncate text-[0.8125rem] text-mut">{r.sub}</p>}
      </div>
    </div>
  );
}
