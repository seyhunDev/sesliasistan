"use client";

import { useEffect } from "react";

// Üstten inen tam ekran. Üst çubuk ve alt butonlar sabit kalır; içerik alanı
// `min-h-0 flex-1 overflow-y-auto` ile kayar (min-h-0 olmazsa flex çocuğu küçülmez, kaydırma bozulur).
export function Screen({ open, onClose, title, children, voice }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // arkadaki sayfa kaymasın
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-voice={voice ? "" : undefined}
      inert={!open}
      className={`fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[30rem] flex-1 flex-col">{children}</div>
    </div>
  );
}
