"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { useWide } from "@/hooks/useWide";

const CLOSE_AT = 110; // bu kadar piksel aşağı çekilirse kapanır (tam boydaysa yarıma iner)
const GROW_AT = 40; // bu kadar yukarı çekilirse tam boy olur
const FLICK = 0.6; // ya da bu hızdan (px/ms) hızlı fırlatılırsa

const noop = () => () => {};
// Açık pencere sayısı: en az biri açıkken arkadaki sayfa kaymaz (Seyhun: "aşağı yukarı yaptığında arka plan aşağı yukarı oynuyor").
let locks = 0;
function lockPage() {
  if (locks++ === 0) document.documentElement.style.overflow = document.body.style.overflow = "hidden";
  return () => {
    if (--locks === 0) document.documentElement.style.overflow = document.body.style.overflow = "";
  };
}
const typing = () => {
  const el = document.activeElement;
  return (!!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) || (window.visualViewport?.offsetTop || 0) > 0;
};

// Ortak pencere (ortak eylemler, Seyhun 2026-11-09 onaylı örnek "Ortak eylemler"):
// Telefonda alttan açılır, içerik kadar (en çok ekranın %75'i). Tutamaçtan yukarı çekince tam boy olur; aşağı çekince önce yarıma iner, sonra kapanır.
// iPad ve geniş ekranda ekranın ortasında yüzen pencere; anchor verilirse (seçim listeleri) düğmenin altında küçük kutu.
// X ile, arka plana dokunarak, Esc ile ya da aşağı çekerek kapanır. dirty: yazılmış bir şey varsa kapatmadan önce "Yazdıkların silinsin mi?" sorulur.
// footer: en altta sabit iş düğmeleri (SheetActions). Sayfanın en üst katmanına (body) çizilir: kaydırılan bir kutunun içinden açılsa da kırpılmaz.
export function Sheet({ open, onClose, title, navy, children, footer, dirty, anchor }) {
  const wide = useWide();
  const [dy, setDy] = useState(0);
  const [full, setFull] = useState(false);
  const [ask, setAsk] = useState(false);
  const [pos, setPos] = useState(null); // anchor kutusunun yeri
  const drag = useRef(null); // { y, t, fromContent, up }
  const bodyRef = useRef(null);
  // Pencere kapanınca boyu ve soru sıfırlanır (önceki değer state'te tutulur)
  const [was, setWas] = useState(open);
  if (was !== open) {
    setWas(open);
    if (!open) {
      setDy(0);
      setFull(false);
      setAsk(false);
    }
  }
  const asking = ask && !!dirty;

  // Kapatma isteği: yazılmış bir şey varsa önce sorulur; soru açıkken ikinci istek kapatır
  const want = useCallback(() => (dirty && !ask ? setAsk(true) : onClose()), [dirty, ask, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && want();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, want]);

  useEffect(() => {
    if (open) return lockPage();
  }, [open]);

  const pop = wide && !!anchor;
  useLayoutEffect(() => {
    if (!open || !pop) return;
    const place = () => {
      const el = typeof anchor === "function" ? anchor() : anchor?.current || anchor;
      const r = el?.getBoundingClientRect?.();
      if (!r) return setPos(null);
      const w = Math.min(320, window.innerWidth - 32);
      const left = Math.max(16, Math.min(r.right - w, window.innerWidth - w - 16));
      const top = r.bottom + 8;
      setPos({ left, top, width: w, maxHeight: Math.max(240, window.innerHeight - top - 16) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, pop, anchor]);

  const begin = (e, fromContent) => {
    if (fromContent && (bodyRef.current?.scrollTop || 0) > 0) return;
    // Klavye açıkken (yazı alanı seçili) iPhone sayfayı kaydırır; içerikten aşağı çekmek pencereyi kapatmasın
    if (fromContent && typing()) return;
    drag.current = { y: e.touches[0].clientY, t: Date.now(), fromContent, up: 0 };
  };
  const startHead = (e) => begin(e, false);
  const startBody = (e) => begin(e, true);
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.touches[0].clientY - d.y;
    if (d.fromContent && delta < 0) {
      drag.current = null; // yukarı kaydırma: içerik kaysın
      return setDy(0);
    }
    d.up = Math.min(0, delta);
    setDy(Math.max(0, delta));
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const speed = dy / Math.max(1, Date.now() - d.t);
    if (!d.fromContent && d.up < -GROW_AT) setFull(true);
    else if (dy > CLOSE_AT || speed > FLICK) {
      if (full) setFull(false);
      else want();
    }
    setDy(0);
  };

  const client = useSyncExternalStore(noop, () => true, () => false);
  const dragging = dy > 0;

  const askBar = asking && (
    <div role="alert" className="mb-3 flex items-center gap-2 rounded-2xl border border-warn/30 bg-warnbg px-3 py-2 text-[0.875rem] font-semibold text-warn">
      <span className="min-w-0 flex-1">Yazdıkların silinsin mi?</span>
      <button type="button" onClick={() => setAsk(false)} data-press className="btn btn-secondary btn-sm">
        Devam
      </button>
      <button type="button" onClick={onClose} data-press className="btn btn-danger btn-sm">
        Sil
      </button>
    </div>
  );
  const head = (
    <div className="flex items-center justify-between gap-3 pb-2">
      <h2 className="min-w-0 truncate text-[1.0625rem] font-semibold">{title}</h2>
      <button onClick={want} aria-label="Kapat" data-press className="btn btn-round btn-sm shrink-0 text-mut">
        <Icon name="x" className="size-[1.125rem]" />
      </button>
    </div>
  );
  const foot = footer && <div className="shrink-0 border-t border-line px-5 pt-3">{footer}</div>;
  const panel = `flex flex-col ${navy ? "navy" : "bg-card"}`;

  let ui;
  if (wide) {
    // iPad / geniş ekran: ortada yüzen pencere ya da düğmenin altında küçük kutu
    ui = (
      <>
        <div onClick={want} className={`fixed inset-0 z-40 transition-opacity duration-200 ${pop ? "bg-black/10" : "bg-black/40"} ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
        <div data-sheet-c="" data-pop={pop ? "" : undefined} className={`pointer-events-none fixed inset-0 z-50 ${pop ? "" : "grid place-items-center p-6"}`}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-theme={navy ? "dark" : undefined}
            style={pop ? { position: "absolute", ...(pos || { left: "50%", top: "30%", width: 320 }) } : undefined}
            className={`${panel} w-full overflow-hidden transition duration-200 ease-out ${pop ? "max-h-[28rem] rounded-[1.25rem] border border-line pb-3 shadow-[0_18px_44px_rgba(11,26,51,.22)]" : "max-h-[85dvh] max-w-[28rem] rounded-3xl pb-5 shadow-[0_24px_60px_rgba(0,0,0,.25)]"} ${
              open ? "pointer-events-auto scale-100 opacity-100" : "scale-[.97] opacity-0"
            }`}
          >
            <div className={`shrink-0 px-5 ${pop ? "pt-3" : "pt-4"}`}>{head}</div>
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-1">
              {askBar}
              {children}
            </div>
            {foot}
          </div>
        </div>
      </>
    );
  } else {
    ui = (
      <>
        <div
          onClick={want}
          style={open && dragging ? { opacity: Math.max(0.2, 1 - dy / 400) } : undefined}
          className={`fixed inset-0 z-40 transition-[opacity,background-color] duration-300 ${full ? "bg-black/55" : "bg-black/40"} ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-sheet=""
          data-full={full ? "" : undefined}
          style={open && dragging ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[30rem] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
        >
          <div
            data-theme={navy ? "dark" : undefined}
            style={{ maxHeight: full ? "94dvh" : "75dvh", minHeight: full ? "94dvh" : 0 }}
            className={`${panel} rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-[min-height,max-height] duration-300 ease-out`}
          >
            {/* Tutamaç + başlık + X: buradan her zaman çekilebilir (yukarı: tam boy, aşağı: yarım / kapat) */}
            <div onTouchStart={startHead} onTouchMove={move} onTouchEnd={end} className="shrink-0 touch-none px-5 pt-3">
              <button type="button" onClick={() => setFull((f) => !f)} aria-label={full ? "Küçült" : "Büyüt"} className="mx-auto block h-3 w-12">
                <span className="mx-auto block h-1 w-9 rounded-full bg-line" />
              </button>
              <div className="mt-1">{head}</div>
            </div>
            <div ref={bodyRef} onTouchStart={startBody} onTouchMove={move} onTouchEnd={end} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-1">
              {askBar}
              {children}
            </div>
            {foot}
          </div>
        </div>
      </>
    );
  }
  return client ? createPortal(ui, document.body) : ui;
}

// Pencerenin en altındaki iş düğmeleri: solda Vazgeç (ya da düzenlemede kırmızı yazı "Sil"), sağda ana iş.
// İş Promise döndürürse düğmede dönen halka çıkar (Button).
//   <Sheet footer={<SheetActions onCancel={close} yes="Kaydet" onYes={save} />}>
//   formla: <SheetActions form="urun-formu" yes="Kaydet" onDelete={del} />  (ana düğme o formu gönderir)
export function SheetActions({ onCancel, cancel = "Vazgeç", onDelete, del = "Sil", yes = "Kaydet", onYes, form, disabled, danger }) {
  return (
    <div className={`grid gap-2 ${onDelete ? "grid-cols-[auto_1fr]" : "grid-cols-2"}`}>
      {onDelete ? (
        <Button variant="text" onClick={onDelete} className="px-3 text-rec">
          {del}
        </Button>
      ) : (
        <Button variant="secondary" onClick={onCancel}>
          {cancel}
        </Button>
      )}
      <Button variant={danger ? "danger" : "primary"} type={form ? "submit" : "button"} form={form} onClick={onYes} disabled={disabled}>
        {yes}
      </Button>
    </div>
  );
}
