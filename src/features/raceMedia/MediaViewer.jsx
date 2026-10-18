"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hm } from "@/lib/raceLive";

// Tam ekran görüntüleyici (Seyhun 2026-10-18: "tıklandığında tam ekran olsun, yan çevirip izleyebilmeliyim"): iPhone Fotoğraflar gibi
// siyah zemin, fotoğraf/video ekrana sığar. Dikte üstte Kapat, an ve sıra; altta "Kimler var" ve Paylaş · Sil. Yan çevrilince görüntü
// bütün ekranı kaplar, tek ince üst şerit (Kapat · an · Paylaş · Sil) üstünde durur. onShare verilmezse Paylaş yok (kaydetmeden önce ön izleme). Görüntüye dokununca çubuklar gizlenir/görünür; sağa-sola kaydırınca önceki/sonraki.
export function MediaViewer({ items, id, onPick, onClose, label, ours = [], onTag, onShare, onDrop }) {
  if (!id) return null;
  return createPortal(<View items={items} id={id} onPick={onPick} onClose={onClose} label={label} ours={ours} onTag={onTag} onShare={onShare} onDrop={onDrop} />, document.body);
}

function View({ items, id, onPick, onClose, label, ours, onTag, onShare, onDrop }) {
  const [ui, setUi] = useState(true);
  const start = useRef(null);
  const i = Math.max(0, items.findIndex((m) => m.id === id));
  const m = items[i];
  const go = (d) => items[i + d] && onPick(items[i + d].id);
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const key = (e) => (e.key === "Escape" ? onClose() : e.key === "ArrowLeft" ? goRef.current(-1) : e.key === "ArrowRight" ? goRef.current(1) : null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  if (!m) return null;

  const down = (e) => (start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const up = (e) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };
  const side = "pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" onTouchStart={down} onTouchEnd={up}>
      {ui && (
        <div className={`flex shrink-0 items-center gap-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] landscape:absolute landscape:inset-x-0 landscape:top-0 landscape:z-10 landscape:bg-gradient-to-b landscape:from-black/70 landscape:to-transparent landscape:pb-6 ${side}`}>
          <button type="button" onClick={onClose} className="h-10 shrink-0 text-[1.0625rem]">
            Kapat
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[0.875rem] font-semibold">{label(m) || hm(m.at)}</p>
          <span className="w-12 shrink-0 text-right text-[0.8125rem] tabular-nums text-white/60">{items.length > 1 ? `${i + 1}/${items.length}` : ""}</span>
          {onShare && (
            <button type="button" onClick={() => onShare(m)} className="h-10 shrink-0 text-[1.0625rem] portrait:hidden">
              Paylaş
            </button>
          )}
          <button type="button" onClick={() => onDrop(m)} className="h-10 shrink-0 text-[1.0625rem] text-[#FF453A] portrait:hidden">
            Sil
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {m.kind === "video" ? (
          <video key={m.id} src={m.url} controls autoPlay playsInline className="absolute inset-0 size-full object-contain" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={m.id} src={m.url} alt="" onClick={() => setUi((v) => !v)} className="absolute inset-0 size-full object-contain" />
        )}
      </div>
      {ui && (
        <div className={`shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 landscape:hidden ${side}`}>
          {ours.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {ours.map((a) => {
                const on = m.ath.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => onTag(m, a.id)} aria-pressed={on} className={`h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-white text-black" : "bg-white/15"}`}>
                    {(a.studentName || "").split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between">
            {onShare ? (
              <button type="button" onClick={() => onShare(m)} className="h-10 text-[1.0625rem]">
                Paylaş
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => onDrop(m)} className="h-10 text-[1.0625rem] text-[#FF453A]">
              Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
