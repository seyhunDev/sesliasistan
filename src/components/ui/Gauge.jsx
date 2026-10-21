// Ortak göstergeler (Seyhun 2026-10-21: "ortak bir gösterge; hepsini ortaklaştıralım"). Yeni sayfalar oran/sayı göstermek için bunları kullanır.
// Gauge: yarım daire yay (aidat 18/30, rüzgâr 11 kn); ortada büyük değer, altında kısa yazı. dark: lacivert zemin (logo geçişi), değilse mor.
// Segments: "kaçta kaçı" için küçük parçalar (fitness 1/3); Bar: ince oran çubuğu (aidat 18/30); ikisi de satırın sağına sığar.
import { useId } from "react";

export function Gauge({ value = 0, max = 100, label, sub, dark = false, size = 96, className = "" }) {
  const id = `g${useId().replace(/:/g, "")}`;
  const p = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = 40, c = Math.PI * r; // yarım çevre
  return (
    <span className={`inline-flex flex-col items-center ${className}`} style={{ width: size }}>
      <svg viewBox="0 0 100 56" width={size} height={size * 0.56} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={dark ? "#8b5cf6" : "var(--acc)"} />
            <stop offset="1" stopColor={dark ? "#22d3ee" : "var(--acc)"} />
          </linearGradient>
        </defs>
        <path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke={dark ? "rgba(255,255,255,.14)" : "var(--line)"} strokeWidth="8" strokeLinecap="round" />
        {p > 0 && <path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`} />}
      </svg>
      <b className="-mt-6 text-[1.5rem] font-bold leading-none tabular-nums">{label ?? value}</b>
      {sub && <small className={`mt-1.5 text-center text-[0.75rem] leading-tight ${dark ? "text-white/70" : "text-mut"}`}>{sub}</small>}
    </span>
  );
}

export function Segments({ done = 0, total = 0, className = "" }) {
  if (!total) return null;
  return (
    <span role="img" aria-label={`${total} içinden ${done}`} className={`flex w-16 shrink-0 gap-0.5 ${className}`}>
      {Array.from({ length: Math.min(total, 8) }, (_, i) => (
        <i key={i} className={`h-2 flex-1 rounded-sm ${i < done ? "bg-acc" : "bg-line"}`} />
      ))}
    </span>
  );
}

export function Bar({ p = 0, className = "" }) {
  const v = Math.max(0, Math.min(1, p || 0));
  return (
    <span aria-hidden="true" className={`block h-2 w-14 shrink-0 overflow-hidden rounded-full bg-line ${className}`}>
      <span className="block h-full rounded-full bg-acc" style={{ width: `${Math.round(v * 100)}%` }} />
    </span>
  );
}
