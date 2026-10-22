"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hm } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { MomentPicker } from "./MomentPicker";

// Tam ekran görüntüleyici (Seyhun 2026-10-18: "tıklandığında tam ekran olsun, yan çevirip izleyebilmeliyim"): iPhone Fotoğraflar gibi
// siyah zemin, fotoğraf/video ekrana sığar. Üstte Kapat, an, sıra ve ⋯ (Paylaş · Kimler var · Düzelt · Sil; Düzelt: yarış ve an,
// MomentPicker). Görüntü her zaman bütün ekranı kaplar, şerit üstünde durur: yan çevirince görüntü küçülüp büyümez (Seyhun 2026-10-20).
// Görüntüye dokununca çubuklar gizlenir/görünür; sağa-sola kaydırınca önceki/sonraki.
export function MediaViewer(props) {
  if (!props.id) return null;
  return createPortal(<View {...props} />, document.body);
}

// Video: küçük resmi hemen görünür (yüklenirken boş ekran olmasın), oynarken sol üstte çekimdeki sayaç (Seyhun 2026-10-22: "çekilmiş videoyu
// izlerken geri sayım yok"): çekildiği an startan kaç saniye önce/sonraysa (m.sec) oynatma süresi eklenerek "Start 3:12" / "Startan beri 1:35"
function Clip({ m }) {
  const [t, setT] = useState(0);
  const s = m.phase ? Math.round(m.sec + t) : null;
  return (
    <>
      <video key={m.id} src={m.url} poster={m.thumb || undefined} preload="auto" controls autoPlay playsInline onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} className="size-full object-contain" />
      {s != null && (
        <span className={`pointer-events-none absolute left-3 top-3 landscape:left-[calc(1rem+env(safe-area-inset-left))] landscape:top-[calc(3.5rem+env(safe-area-inset-top))] rounded-lg px-2.5 py-1 text-[1.0625rem] font-semibold tabular-nums ${s < 0 && s >= -10 ? "bg-rec" : "bg-black/50"}`}>
          {s < 0 ? `Start ${mmss(-s)}` : `Startan beri ${mmss(Math.min(s, 3599))}`}
        </span>
      )}
    </>
  );
}

function View({ items, id, onPick, onClose, label, ours = [], onTag, onShare, onDrop, starts = [], onFix, busy = "" }) {
  const [ui, setUi] = useState(true);
  // Videoyu paylaşırken sorulur: sesli ya da sessiz (Seyhun 2026-10-20)
  const [ask, setAsk] = useState(false);
  const shareIt = (x) => (x.kind === "video" ? setAsk(true) : onShare(x));
  // Paylaş · Kimler var · Düzelt · Sil "⋯" altında (Seyhun 2026-10-22: "öyle açık kalmasına gerek yok, odak noktamız video");
  // panel: altta açık düzenleme ("fix": yarış ve an, "tag": kimler var), Tamam ile kapanır
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState(null);
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
        <div className={`absolute inset-x-0 top-0 bottom-0 portrait:top-[calc(3.5rem+env(safe-area-inset-top))] ${panel ? "portrait:bottom-[calc(9rem+env(safe-area-inset-bottom))]" : "portrait:bottom-[env(safe-area-inset-bottom)]"}`}>
          <Clip m={m} />
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
          <button type="button" onClick={() => setMenu(true)} aria-label="Diğer" className="grid size-10 shrink-0 place-items-center rounded-full text-[1.25rem] font-bold leading-none active:bg-white/15">
            ⋯
          </button>
        </div>
      )}
      {busy && <p className="absolute inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-20 mx-auto w-fit rounded-lg bg-black/70 px-3 py-1.5 text-[0.875rem] font-semibold">{busy}</p>}
      {menu && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={() => setMenu(false)}>
          <div className="w-full max-w-[22rem] space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl bg-[#2C2C2E]">
              {[
                onShare && ["Paylaş", () => shareIt(m)],
                ours.length > 0 && onTag && ["Kimler var", () => setPanel("tag")],
                onFix && ["Düzelt", () => setPanel("fix")],
                ["Sil", () => onDrop(m), true],
              ]
                .filter(Boolean)
                .map(([l, f, red]) => (
                  <button key={l} type="button" onClick={() => (setMenu(false), f())} className={`block h-14 w-full border-b border-white/10 text-[1.0625rem] font-semibold last:border-0 active:bg-[#3A3A3C] ${red ? "text-[#FF453A]" : ""}`}>
                    {l}
                  </button>
                ))}
            </div>
            <button type="button" onClick={() => setMenu(false)} className="h-14 w-full rounded-2xl bg-[#1C1C1E] text-[1.0625rem] active:bg-[#2C2C2E]">
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {ask && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={() => setAsk(false)}>
          <div className="w-full max-w-[22rem] space-y-2" onClick={(e) => e.stopPropagation()}>
            {[
              ["Sesli paylaş", false],
              ["Sessiz paylaş", true],
            ].map(([l, muted]) => (
              <button key={l} type="button" onClick={() => (setAsk(false), onShare(m, muted))} className="h-14 w-full rounded-2xl bg-[#2C2C2E] text-[1.0625rem] font-semibold active:bg-[#3A3A3C]">
                {l}
              </button>
            ))}
            <button type="button" onClick={() => setAsk(false)} className="h-14 w-full rounded-2xl bg-[#1C1C1E] text-[1.0625rem] active:bg-[#2C2C2E]">
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {panel && (
        <div className={`absolute inset-x-0 bottom-0 z-10 bg-black/80 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3 ${side}`}>
          {panel === "fix" && onFix && <MomentPicker at={m.at} mom={m.phase ? { rid: m.rid, phase: m.phase, sec: m.sec, end: m.end } : null} starts={starts} onChange={(mom) => onFix(m, mom)} />}
          {panel === "tag" && (
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
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
          <button type="button" onClick={() => setPanel(null)} className="mt-2 h-10 w-full text-[1.0625rem] font-semibold">
            Tamam
          </button>
        </div>
      )}
    </div>
  );
}
