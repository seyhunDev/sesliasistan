"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hm } from "@/lib/raceLive";
import { MomentPicker } from "./MomentPicker";

// Tam ekran görüntüleyici (Seyhun 2026-10-18: "tıklandığında tam ekran olsun, yan çevirip izleyebilmeliyim"): iPhone Fotoğraflar gibi
// siyah zemin, fotoğraf/video ekrana sığar. Dikte üstte Kapat, an ve sıra; altta "Kimler var" ve Paylaş · Düzelt · Sil (Düzelt: yarış
// ve an, MomentPicker). Görüntü her zaman bütün ekranı kaplar, şeritler üstünde durur: yan çevirince görüntü küçülüp büyümez
// (Seyhun 2026-10-20). Yan çevrilince tek ince üst şerit (Kapat · an · Paylaş · Sil).
// Görüntüye dokununca çubuklar gizlenir/görünür; sağa-sola kaydırınca önceki/sonraki.
export function MediaViewer(props) {
  if (!props.id) return null;
  return createPortal(<View {...props} />, document.body);
}

function View({ items, id, onPick, onClose, label, ours = [], onTag, onShare, onDrop, starts = [], onFix }) {
  const [ui, setUi] = useState(true);
  const [fixing, setFixing] = useState(false);
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
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black text-white" onTouchStart={down} onTouchEnd={up}>
      {m.kind === "video" ? (
        // Dikte videonun oynatma çubuğu alttaki şeridin altında kalmasın: video şeridin üstünde biter (yan çevrilince bütün ekran)
        <div className={`absolute inset-x-0 top-0 bottom-0 portrait:top-[calc(3.5rem+env(safe-area-inset-top))] ${ours.length ? "portrait:bottom-[calc(8.5rem+env(safe-area-inset-bottom))]" : "portrait:bottom-[calc(6rem+env(safe-area-inset-bottom))]"}`}>
          <video key={m.id} src={m.url} controls autoPlay playsInline className="size-full object-contain" />
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={m.id} src={m.url} alt="" onClick={() => setUi((v) => !v)} className="absolute inset-0 size-full object-contain" />
      )}
      {ui && (
        <div className={`absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent pb-6 pt-[calc(0.5rem+env(safe-area-inset-top))] ${side}`}>
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
      {ui && (
        <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-6 landscape:hidden ${side}`}>
          {fixing && onFix && (
            <div className="pb-3">
              <MomentPicker at={m.at} mom={m.phase ? { rid: m.rid, phase: m.phase, sec: m.sec, end: m.end } : null} starts={starts} onChange={(mom) => onFix(m, mom)} />
            </div>
          )}
          {ours.length > 0 && !fixing && (
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
            {onFix && (
              <button type="button" onClick={() => setFixing((v) => !v)} aria-pressed={fixing} className={`h-10 text-[1.0625rem] ${fixing ? "font-semibold" : ""}`}>
                {fixing ? "Tamam" : "Düzelt"}
              </button>
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
