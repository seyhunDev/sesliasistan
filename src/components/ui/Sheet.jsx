"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

const CLOSE_AT = 110; // bu kadar piksel aşağı çekilirse kapanır
const FLICK = 0.6; // ya da bu hızdan (px/ms) hızlı fırlatılırsa

const noop = () => () => {};
// Alttan açılan pencere: X ile, arka plana dokunarak, Esc ile ya da aşağı çekerek kapanır.
// Sayfanın en üst katmanına (body) çizilir: kaydırılan ya da soldurma maskeli bir kutunun (ör. asistan sahnesi)
// içinden açılsa da kırpılmaz, altında kalmaz.
// Aşağı çekme tutamaçtan/başlıktan her zaman, içerikten yalnızca içerik en üstteyken çalışır.
export function Sheet({ open, onClose, title, children }) {
  const [dy, setDy] = useState(0);
  const drag = useRef(null); // { y, t, fromContent }
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDy(0);
  }, [open]);

  const start = (fromContent) => (e) => {
    if (fromContent && (bodyRef.current?.scrollTop || 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, t: Date.now(), fromContent };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.touches[0].clientY - d.y;
    if (d.fromContent && delta < 0) {
      drag.current = null; // yukarı kaydırma: içerik kaysın
      return setDy(0);
    }
    setDy(Math.max(0, delta));
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const speed = dy / Math.max(1, Date.now() - d.t);
    if (dy > CLOSE_AT || speed > FLICK) onClose();
    setDy(0);
  };

  const dragging = dy > 0;
  const client = useSyncExternalStore(noop, () => true, () => false);
  const ui = (
    <>
      <div
        onClick={onClose}
        style={open && dragging ? { opacity: Math.max(0.2, 1 - dy / 400) } : undefined}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={open && dragging ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[30rem] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex max-h-[90dvh] flex-col rounded-t-3xl bg-card pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {/* Tutamaç + başlık + X: buradan her zaman aşağı çekilebilir */}
          <div onTouchStart={start(false)} onTouchMove={move} onTouchEnd={end} className="shrink-0 touch-none px-5 pt-3">
            <div className="mx-auto h-1 w-9 rounded-full bg-line" />
            <div className="mt-2 flex items-center justify-between pb-2">
              <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-bg text-mut transition active:scale-90">
                <Icon name="x" className="size-[1.125rem]" />
              </button>
            </div>
          </div>
          <div ref={bodyRef} onTouchStart={start(true)} onTouchMove={move} onTouchEnd={end} className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
  return client ? createPortal(ui, document.body) : ui;
}
