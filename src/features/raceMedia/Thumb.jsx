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
      {/* Buluta gönderilirken görüntü kapanmaz (telefondaki dosya hemen kullanılır; Seyhun 2026-10-22: "telefondaki veriyi kullanmıyor muyuz?"):
          köşede küçük dolan halka */}
      {up != null && (
        <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/45" aria-label={`Buluta gönderiliyor %${Math.round(up * 100)}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" className={up > 0 ? "" : "animate-spin"}>
            <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2.5" />
            <circle cx="9" cy="9" r="7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="44" strokeDashoffset={44 * (1 - (up > 0 ? Math.max(0.06, up) : 0.25))} transform="rotate(-90 9 9)" className="transition-[stroke-dashoffset] duration-300" />
          </svg>
        </span>
      )}
      {done && <span className="absolute right-1.5 top-1.5 grid size-[1.125rem] place-items-center rounded-full bg-ok text-[0.6875rem] font-bold text-white">✓</span>}
      {err && <span className="absolute right-1.5 top-1.5 grid size-[1.125rem] place-items-center rounded-full bg-warn text-[0.6875rem] font-bold text-white">!</span>}
    </>
  );
}
