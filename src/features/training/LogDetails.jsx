"use client";

import { missingOf } from "@/lib/trainingLog";

// Günlüğün ayrıntıları (sağanak, deniz, yer, katılanlar, sınıflar, sonraki antrenman, diğer) ve eksik bilgi satırı
export function detailRows(l) {
  if (!l) return [];
  return [
    l.gust ? ["Sağanak", `${l.gust} kn`] : null,
    l.sea ? ["Deniz", l.sea] : null,
    l.place ? ["Yer", l.place] : null,
    l.athletes?.length ? ["Katılanlar", l.athletes.join(", ")] : null,
    l.boats?.length ? ["Sınıf", l.boats.join(", ")] : null,
    l.next ? ["Sonraki antrenman", l.next] : null,
    ...(l.details || []).map((d) => [d.k, d.v]),
  ].filter(Boolean);
}

export function Missing({ log, className = "" }) {
  const m = missingOf(log);
  if (!m.length) return null;
  return <small className={`block text-[0.75rem] font-medium text-amber-700 ${className}`}>Eksik: {m.join(", ")}</small>;
}

export function LogDetails({ log, className = "" }) {
  const rows = detailRows(log);
  if (!rows.length) return null;
  return (
    <dl className={`space-y-0.5 text-[0.8125rem] leading-snug ${className}`}>
      {rows.map(([k, v], i) => (
        <div key={`${k}-${i}`} className="flex gap-1.5">
          <dt className="shrink-0 text-mut">{k}:</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
