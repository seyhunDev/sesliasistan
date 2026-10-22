"use client";

import { useState } from "react";
import { mmss } from "@/lib/raceScore";

// Küçük resim: fotoğraf ya da videonun ilk karesi; videoda sağ altta süresi (Seyhun 2026-10-18: "videoların süresi gösterilsin").
// Süre kayıttan (dur), yoksa videonun kendisinden okunur. thumb: kayıtla yüklenen 480 px JPEG (Seyhun 2026-10-21: "sürekli video
// yüklemesi olmasın"); varsa liste videoyu hiç indirmez. local: bu telefonda çekilen dosya (yüklenirken ve sonra, internetten inmez).
// up: yükleniyor (0..1, halka dolar); done: yeni yüklendi (kısa ✓); err: yüklenemedi.
export function Thumb({ kind, url, thumb = "", local = "", dur = 0, up = null, done = false, err = false }) {
  const [meta, setMeta] = useState(0);
  const sec = dur || meta;
  const pic = local && kind !== "video" ? local : thumb || (kind !== "video" ? url : "");
  return (
    <>
      {pic ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={pic} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <video
          src={`${local || url}#t=0.3`}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setMeta(Math.round(e.currentTarget.duration))}
          className="size-full object-cover"
        />
      )}
      {kind === "video" && <span className="absolute bottom-1 right-1.5 text-[0.6875rem] font-semibold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{sec ? mmss(sec) : "video"}</span>}
      {up != null && (
        <span className="absolute inset-0 grid place-items-center bg-[rgba(20,22,40,.35)]" aria-label={`Yükleniyor %${Math.round(up * 100)}`}>
          <svg width="44" height="44" viewBox="0 0 44 44" className={up > 0 ? "" : "animate-spin"}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - (up > 0 ? Math.max(0.04, up) : 0.25))} transform="rotate(-90 22 22)" className="transition-[stroke-dashoffset] duration-300" />
          </svg>
          {up > 0 && <b className="absolute text-[0.6875rem] font-semibold tabular-nums text-white">{Math.round(up * 100)}</b>}
        </span>
      )}
      {done && <span className="absolute right-1.5 top-1.5 grid size-[1.125rem] place-items-center rounded-full bg-ok text-[0.6875rem] font-bold text-white">✓</span>}
      {err && <span className="absolute right-1.5 top-1.5 grid size-[1.125rem] place-items-center rounded-full bg-warn text-[0.6875rem] font-bold text-white">!</span>}
    </>
  );
}
