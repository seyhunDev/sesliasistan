"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dayOf, hm } from "@/lib/raceLive";
import { dayLabel } from "@/lib/agenda";
import { Icon } from "@/components/ui/Icon";
import { MomentPicker } from "./MomentPicker";

// Tam ekran görüntüleyici, iPhone Fotoğraflar gibi sade (Seyhun 2026-10-22: "çok karma karışık, daha sade, iPhone tasarım"; örnek
// yaris-tasarim/medya/izleme-sade.png): siyah zemin, görüntü ekrana sığar. Üstte yuvarlak geri, ortada başlık (yarış/start adı) ve altında
// küçük gün · saat, sağda ⋯ (Paylaş · Kimler var · Düzelt · Sil; Düzelt: yarış ve an, MomentPicker). Videoda yalnız çekimdeki sayaç, altta
// ince çubuk (geçen / kalan süre) ve oynat/durdur. Görüntüye dokununca bütün yazılar gizlenir/görünür; sağa-sola kaydırınca önceki/sonraki.
// Telefonda tutulan dosya (m.local, 7 gün) varsa o oynar, beklemeden açılır; yoksa Firebase'den, inerken "Yükleniyor %38".
export function MediaViewer(props) {
  if (!props.id) return null;
  return createPortal(<View {...props} />, document.body);
}

// "1:35" (iPhone gibi, başta sıfır yok)
const ms = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

// Çekimdeki sayaç (Seyhun 2026-10-22: "çekilmiş videoyu izlerken geri sayım yok"): çekildiği an startan kaç saniye önce/sonraysa (m.sec),
// videoda oynatma süresi eklenerek "Start 3:12" / "Startan beri 1:35"
function Pill({ s }) {
  if (s == null) return null;
  return (
    <span className={`pointer-events-none absolute left-[calc(0.75rem+env(safe-area-inset-left))] top-[calc(4rem+env(safe-area-inset-top))] rounded-lg px-2.5 py-1 text-[1.0625rem] font-semibold tabular-nums ${s < 0 && s >= -10 ? "bg-rec" : "bg-black/50"}`}>
      {s < 0 ? `Start ${ms(-s)}` : `Startan beri ${ms(Math.min(s, 3599))}`}
    </span>
  );
}

// Video: kendi oynatma çubuğumuz (iPhone'un düğmeleri yok). Küçük resim hemen görünür, inerken ortada halka ve yüzde.
function Clip({ m, bar, onTap }) {
  const v = useRef(null);
  const track = useRef(null);
  const [t, setT] = useState(0);
  const [d, setD] = useState(m.dur || 0);
  const [play, setPlay] = useState(false);
  const [wait, setWait] = useState(true);
  const [pct, setPct] = useState(0);
  const s = m.phase ? Math.round(m.sec + t) : null;
  const toggle = () => {
    const x = v.current;
    if (!x) return;
    if (x.paused || x.ended) x.play().catch(() => {});
    else x.pause();
  };
  const seek = (e) => {
    const r = track.current?.getBoundingClientRect();
    const x = v.current;
    if (!r || !x || !d) return;
    x.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d;
    setT(x.currentTime);
  };
  const buffered = (x) => {
    const n = x.buffered.length;
    if (n && isFinite(x.duration) && x.duration > 0) setPct(Math.min(1, x.buffered.end(n - 1) / x.duration));
  };
  const stop = (e) => e.stopPropagation();
  const side = "pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))]";
  return (
    <>
      <video
        ref={v}
        src={m.local || m.url}
        poster={m.thumb || undefined}
        preload="auto"
        autoPlay
        playsInline
        onClick={onTap}
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setD(e.currentTarget.duration)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onProgress={(e) => buffered(e.currentTarget)}
        onPlay={() => setPlay(true)}
        onPause={() => setPlay(false)}
        onEnded={() => setPlay(false)}
        onWaiting={() => setWait(true)}
        onCanPlay={() => setWait(false)}
        onPlaying={() => setWait(false)}
        className={`size-full object-contain transition-[filter] ${wait ? "brightness-[.55]" : ""}`}
      />
      <Pill s={s} />
      {wait && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" role="status">
          <svg width="52" height="52" viewBox="0 0 44 44" className={`mx-auto ${pct > 0 ? "" : "animate-spin"}`}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - (pct > 0 ? Math.max(0.04, pct) : 0.25))} transform="rotate(-90 22 22)" className="transition-[stroke-dashoffset] duration-300" />
          </svg>
          <p className="mt-1.5 text-[0.75rem] tabular-nums text-white/75">{pct > 0 ? `Yükleniyor %${Math.round(pct * 100)}` : "Yükleniyor"}</p>
        </div>
      )}
      {bar && (
        <div onTouchStart={stop} onTouchEnd={stop} className={`absolute inset-x-0 bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [text-shadow:0_1px_2px_rgba(0,0,0,.6)] ${side}`}>
          <div
            ref={track}
            onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), seek(e))}
            onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seek(e)}
            className="flex h-6 cursor-pointer touch-none items-center"
            role="slider"
            aria-label="Süre"
            aria-valuemin={0}
            aria-valuemax={Math.round(d)}
            aria-valuenow={Math.round(t)}
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${d ? Math.min(100, (t / d) * 100) : 0}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-[0.6875rem] tabular-nums text-white/60">
            <span>{ms(Math.round(t))}</span>
            <span>−{ms(Math.max(0, Math.round(d - t)))}</span>
          </div>
          <button type="button" onClick={toggle} aria-label={play ? "Durdur" : "Oynat"} className="mx-auto mt-1 grid size-12 place-items-center rounded-full active:bg-white/15">
            <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
              {play ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10.2-6.5a.5.5 0 0 0 0-.84L8.77 5.08A.5.5 0 0 0 8 5.5Z" />}
            </svg>
          </button>
        </div>
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
  const title = label(m);
  const when = dayLabel(dayOf(m.at), dayOf(new Date().toISOString()));

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black text-white" onTouchStart={down} onTouchEnd={up}>
      {m.kind === "video" ? (
        // Düzenleme paneli açıkken dikte video panelin üstünde biter (yan çevrilince bütün ekran)
        <div className={`absolute inset-0 ${panel ? "portrait:bottom-[calc(9rem+env(safe-area-inset-bottom))]" : ""}`}>
          <Clip key={m.id} m={m} bar={ui && !panel} onTap={() => setUi((v) => !v)} />
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={m.id} src={m.local || m.url} alt="" onClick={() => setUi((v) => !v)} className="absolute inset-0 size-full object-contain" />
          <Pill s={m.phase ? Math.round(m.sec) : null} />
        </>
      )}
      {ui && (
        <div className={`absolute inset-x-0 top-0 z-10 flex items-center gap-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] ${side}`}>
          <button type="button" onClick={onClose} aria-label="Geri" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 active:bg-white/25">
            <Icon name="back" className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-center leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
            <p className="truncate text-[0.9375rem] font-semibold">{title || hm(m.at)}</p>
            <p className="truncate text-[0.75rem] text-white/60">{title ? `${when} · ${hm(m.at)}` : when}</p>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Diğer" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 active:bg-white/25">
            <Icon name="more" className="size-5" />
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
