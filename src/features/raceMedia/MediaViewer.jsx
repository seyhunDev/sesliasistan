"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dayOf } from "@/lib/raceLive";
import { dayLabel } from "@/lib/agenda";
import { Icon } from "@/components/ui/Icon";
import { MomentPicker } from "./MomentPicker";

// Tam ekran görüntüleyici, iPhone Fotoğraflar gibi sade (Seyhun 2026-10-22: "çok karma karışık, daha sade, iPhone tasarım"; örnek
// yaris-tasarim/medya/izleme-sade.png): siyah zemin, görüntü ekrana sığar. Üstte yuvarlak X (2026-11-12 Apple gibi; önce geri oku), ortada başlık (yarış/start adı) ve altında
// küçük gün · saat. Altta iPhone gibi araç çubuğu: Paylaş · Kimler · Düzelt · Sil (Düzelt: yarış ve an, MomentPicker). Videoda çekimdeki sayaç, altta
// oynat · sarma çubuğu (geçen / kalan) · ses. Görüntüye dokununca bütün yazılar gizlenir/görünür; sağa-sola kaydırınca önceki/sonraki.
// Telefonda tutulan dosya (m.local, 7 gün) varsa o oynar, beklemeden açılır; yoksa Firebase'den, inerken "Yükleniyor %38".
export function MediaViewer(props) {
  if (!props.id) return null;
  return createPortal(<View {...props} />, document.body);
}

// "1:35" (iPhone gibi, başta sıfır yok)
const ms = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

// Apple oynatıcısı gibi koyu cam (Seyhun 2026-11-12): yuvarlak düğmeler ve iPad'deki alt şerit
const GLASS_BG = "md:bg-[rgba(40,44,52,.6)] md:backdrop-blur-xl";
const GLASS = "grid shrink-0 place-items-center rounded-full bg-[rgba(40,44,52,.6)] text-white backdrop-blur-xl active:scale-95 transition-transform";
// 10 sn geri/ileri: yarım ok ve ortada 10
function Skip({ back = false }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d={back ? "M12 4.5a7.5 7.5 0 1 1-7.5 7.5" : "M12 4.5a7.5 7.5 0 1 0 7.5 7.5"} />
      <path d={back ? "M12 1.8v5.4L8.6 4.5z" : "M12 1.8v5.4l3.4-2.7z"} fill="currentColor" stroke="none" />
      <text x="12" y="15.6" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">
        10
      </text>
    </svg>
  );
}

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

// Video: kendi oynatma çubuğumuz (iPhone'un düğmeleri yok). 2026-11-12 Apple oynatıcısı gibi: telefonda ortada 10 sn geri · oynat · 10 sn ileri, altta ince süre çizgisi; iPad'de (md) hepsi altta yüzen camsı şeritte; ses sağ üstte. Küçük resim hemen görünür, inerken ortada halka ve yüzde.
function Clip({ m, bar, onTap, tools = null }) {
  const v = useRef(null);
  const track = useRef(null);
  const [t, setT] = useState(0);
  const [d, setD] = useState(m.dur || 0);
  const [play, setPlay] = useState(false);
  const [wait, setWait] = useState(true);
  const [pct, setPct] = useState(0);
  // Açılınca oynatılır; iPhone sesli kendiliğinden oynatmaya izin vermezse video hiç inmiyor ve "Yükleniyor" bitmiyordu
  // (Seyhun 2026-10-22): o zaman halka yerine küçük resim ve oynat düğmesi görünür, dokununca iner ve oynar.
  const [want, setWant] = useState(true);
  const [mute, setMute] = useState(false);
  useEffect(() => {
    v.current?.play().catch(() => setWant(false));
  }, []);
  const s = m.phase ? Math.round(m.sec + t) : null;
  const toggle = () => {
    const x = v.current;
    if (!x) return;
    if (x.paused || x.ended) (setWant(true), x.play().catch(() => setWant(false)));
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
  const skip = (n) => {
    const x = v.current;
    if (!x) return;
    x.currentTime = Math.min(d || x.duration || 0, Math.max(0, x.currentTime + n));
    setT(x.currentTime);
  };
  const mute1 = () => (v.current && (v.current.muted = !mute), setMute(!mute));
  const playB = (c, ic) => (
    <button type="button" onClick={toggle} aria-label={play ? "Durdur" : "Oynat"} className={`${GLASS} ${c}`}>
      <Icon name={play ? "pause" : "play"} className={ic} />
    </button>
  );
  const skipB = (c) => (
    <button type="button" onClick={() => skip(-10)} aria-label="10 saniye geri" className={`${GLASS} ${c}`}>
      <Skip back />
    </button>
  );
  const skipF = (c) => (
    <button type="button" onClick={() => skip(10)} aria-label="10 saniye ileri" className={`${GLASS} ${c}`}>
      <Skip />
    </button>
  );
  return (
    <>
      <video
        ref={v}
        src={m.local || m.url}
        poster={m.thumb || undefined}
        preload="auto"
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
        onLoadedData={() => setWait(false)}
        onPlaying={() => setWait(false)}
        className={`size-full object-contain transition-[filter] ${want && wait ? "brightness-[.55]" : ""}`}
      />
      <Pill s={s} />
      {want && wait && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" role="status">
          <svg width="52" height="52" viewBox="0 0 44 44" className={`mx-auto ${pct > 0 ? "" : "animate-spin"}`}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - (pct > 0 ? Math.max(0.04, pct) : 0.25))} transform="rotate(-90 22 22)" className="transition-[stroke-dashoffset] duration-300" />
          </svg>
          <p className="mt-1.5 text-[0.75rem] tabular-nums text-white/75">{pct > 0 ? `Açılıyor %${Math.round(pct * 100)}` : "Açılıyor"}</p>
        </div>
      )}
      {bar && (
        <>
          {/* Ses sağ üstte (iPhone/iPad oynatıcısı gibi; Seyhun 2026-11-12 "Apple tarzı") */}
          <button type="button" onClick={mute1} aria-label={mute ? "Sesi aç" : "Sesi kapat"} className={`${GLASS} absolute right-[calc(1rem+env(safe-area-inset-right))] top-[calc(0.5rem+env(safe-area-inset-top))] z-20 size-10`}>
            <Icon name={mute ? "mute" : "volume"} className="size-5" />
          </button>
          {/* Telefon: ortada 10 sn geri · oynat/durdur · 10 sn ileri */}
          <div onTouchStart={stop} onTouchEnd={stop} className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 md:hidden ${want && wait ? "invisible" : ""}`}>
            {skipB("size-12")}
            {playB("size-16", "size-8")}
            {skipF("size-12")}
          </div>
          {/* Altta: telefonda ince süre çizgisi ve altında geçen/kalan; iPad'de (md, 48rem) düğmeler ve süre yüzen tek camsı şeritte */}
          <div onTouchStart={stop} onTouchEnd={stop} className={`absolute inset-x-0 bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${side}`}>
            <div className={`md:mx-auto md:flex md:max-w-[40rem] md:items-center md:gap-2 md:rounded-[1.25rem] md:px-3 md:py-2 ${GLASS_BG}`}>
              <div className="hidden items-center md:flex">
                {skipB("size-10 !bg-transparent !backdrop-blur-none")}
                {playB("size-10 !bg-transparent !backdrop-blur-none", "size-6")}
                {skipF("size-10 !bg-transparent !backdrop-blur-none")}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  ref={track}
                  onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), seek(e))}
                  onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seek(e)}
                  className="flex h-7 cursor-pointer touch-none items-center"
                  role="slider"
                  aria-label="Süre"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(d)}
                  aria-valuenow={Math.round(t)}
                >
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${d ? Math.min(100, (t / d) * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[0.6875rem] font-medium tabular-nums text-white/75 md:hidden">
                  <span>{ms(Math.round(t))}</span>
                  <span>−{ms(Math.max(0, Math.round(d - t)))}</span>
                </div>
              </div>
              <span className="hidden w-12 shrink-0 text-right text-[0.75rem] font-medium tabular-nums text-white/75 md:block">−{ms(Math.max(0, Math.round(d - t)))}</span>
            </div>
            {tools}
          </div>
        </>
      )}
    </>
  );
}

function View({ items, id, onPick, onClose, label, ours = [], onTag, onShare, onSave, onDrop, starts = [], onFix, onCloud, busy = "" }) {
  const [ui, setUi] = useState(true);
  // Videoyu paylaşırken sorulur: sesli ya da sessiz (Seyhun 2026-10-20)
  const [ask, setAsk] = useState(false);
  const shareIt = (x) => (x.kind === "video" ? setAsk(true) : onShare(x));
  // Paylaş · Kimler · Düzelt · Sil altta araç çubuğunda (önce ⋯ altındaydı; Seyhun 2026-10-22 iPhone gibi istedi);
  // panel: altta açık düzenleme ("fix": yarış ve an, "tag": kimler var), Tamam ile kapanır
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
  // Alt araç çubuğu (iPhone Fotoğraflar gibi; Seyhun 2026-10-22: "iPhone tasarımına benzetelim, daha kullanışlı olur").
  // Yüklenmekte olan kayıtta yok (künyesi henüz yok)
  // Yalnız telefonda duran video (m.ph): bu telefonda varsa (m.local) izlenir, paylaşılır, "Buluta yükle"; yoksa yalnız bilgi
  const away = m.ph && !m.local;
  const acts = m.up != null ? [] : [
    m.ph && m.local && onCloud && ["Buluta yükle", "cloud", () => onCloud(m)],
    !away && onShare && ["Paylaş", "share", () => shareIt(m)],
    !away && onSave && ["İndir", "download", () => onSave(m)],
    ours.length > 0 && onTag && ["Kimler", "users", () => setPanel("tag")],
    onFix && ["Düzelt", "edit", () => setPanel("fix")],
    onDrop && ["Sil", "trash", () => onDrop(m)],
  ].filter(Boolean);
  const tools = acts.length > 0 && (
    <div className="mt-1 flex justify-around">
      {acts.map(([l, ic, f]) => (
        <button key={l} type="button" onClick={f} className="flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.6875rem] font-semibold active:bg-white/15">
          <Icon name={ic} className="size-6" />
          {l}
        </button>
      ))}
    </div>
  );
  const when = dayLabel(dayOf(m.at), dayOf(new Date().toISOString()));

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black text-white" onTouchStart={down} onTouchEnd={up}>
      {away ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.thumb && <img src={m.thumb} alt="" className="absolute inset-0 size-full object-contain opacity-50" />}
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-[1rem] font-semibold">Bu video yalnız çekildiği telefonda</p>
          {ui && !panel && tools && <div className={`absolute inset-x-0 bottom-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] ${side}`}>{tools}</div>}
        </>
      ) : m.kind === "video" ? (
        // Düzenleme paneli açıkken dikte video panelin üstünde biter (yan çevrilince bütün ekran)
        <div className={`absolute inset-0 ${panel ? "portrait:bottom-[calc(9rem+env(safe-area-inset-bottom))]" : ""}`}>
          <Clip key={m.local || m.id} m={m} bar={ui && !panel} onTap={() => setUi((v) => !v)} tools={tools} />
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={m.id} src={m.local || m.url} alt="" onClick={() => setUi((v) => !v)} className="absolute inset-0 size-full object-contain" />
          <Pill s={m.phase ? Math.round(m.sec) : null} />
          {ui && !panel && tools && <div className={`absolute inset-x-0 bottom-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] ${side}`}>{tools}</div>}
        </>
      )}
      {ui && (
        <div className={`absolute inset-x-0 top-0 z-10 flex items-center gap-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] ${side}`}>
          <button type="button" onClick={onClose} aria-label="Kapat" className={`${GLASS} size-10`}>
            <Icon name="x" className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-center leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
            <p className="truncate text-[0.9375rem] font-semibold">{title || when}</p>
            {items.length > 1 ? <p className="text-[0.75rem] tabular-nums text-white/60">{`${i + 1} / ${items.length}`}</p> : null}
            {m.up != null ? <p className="truncate text-[0.75rem] text-white/60">{m.up < 0 ? "Telefonda · buluta gönderilemedi" : `Buluta gönderiliyor %${Math.round(m.up * 100)}`}</p> : m.ph && <p className="truncate text-[0.75rem] text-white/60">Yalnız telefonda</p>}
          </div>
          <span className="size-10 shrink-0" />
        </div>
      )}
      {busy && <p className="absolute inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-20 mx-auto w-fit rounded-lg bg-black/70 px-3 py-1.5 text-[0.875rem] font-semibold">{busy}</p>}
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
