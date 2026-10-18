"use client";

import { useState } from "react";
import { mmss } from "@/lib/raceScore";

// Küçük resim: fotoğraf ya da videonun ilk karesi; videoda sağ altta süresi (Seyhun 2026-10-18: "videoların süresi gösterilsin").
// Süre kayıttan (dur), yoksa videonun kendisinden okunur.
export function Thumb({ kind, url, dur = 0 }) {
  const [meta, setMeta] = useState(0);
  const sec = dur || meta;
  if (kind !== "video")
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={url} alt="" loading="lazy" className="size-full object-cover" />
    );
  return (
    <>
      <video
        src={`${url}#t=0.3`}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setMeta(Math.round(e.currentTarget.duration))}
        className="size-full object-cover"
      />
      <span className="absolute bottom-1 right-1.5 text-[0.6875rem] font-semibold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{sec ? mmss(sec) : "video"}</span>
    </>
  );
}
