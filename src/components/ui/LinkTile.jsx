"use client";

import { openExternal } from "@/lib/externalLinks";

// Dış projeye giden kart (Seyhun 2026-11-12 "Velora Simülatör"): bulunduğu alanın genişliğinde, lacivert, beyaz rozet + dalga, sağ üstte ↗
export function LinkTile({ title, href, onOpen, icon = <SailMark /> }) {
  return (
    <button type="button" data-press className="lt" onClick={() => (onOpen ? onOpen() : openExternal(href))} aria-label={`${title} (dışarıda açılır)`}>
      <span className="lt-ic">{icon}</span>
      <b className="lt-t truncate">{title}</b>
      <span className="lt-go" aria-hidden>
        ↗
      </span>
      <svg className="lt-wave" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path d="M0 22 Q12 14 25 22 T50 22 T75 22 T100 22 V40 H0Z" fill="rgba(61,123,255,.18)" />
        <path d="M0 22 Q12 14 25 22 T50 22 T75 22 T100 22" fill="none" stroke="#3d7bff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </button>
  );
}

function SailMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M12 3v14M12 4l6 12h-6M12 6l-5 10h5" fill="none" stroke="#0b1a33" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 19c2.5 1.5 13.5 1.5 16 0" fill="none" stroke="#3d7bff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
