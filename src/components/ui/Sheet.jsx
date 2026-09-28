"use client";

import { useEffect } from "react";

// Alttan açılan pencere: düz beyaz zemin, arkası koyulaşır
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-card px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
          {children}
        </div>
      </div>
    </>
  );
}
