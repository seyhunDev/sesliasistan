"use client";

import { useEffect, useState } from "react";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { SOON } from "./index";
import { SeaBackdrop } from "./SeaBackdrop";

// "Hangi spor?" ekranı (2026-11-12). Kayıtta ilk adım; eski hesaplara SportGate ile bir kez.
// Sailing → tekne animasyonu → onDone("sailing"). Diğer → Yakında (seçilemez).
// Tam ekran, kendi lacivert deniz arka planıyla durur.

const I = {
  sailing: <><path d="M15 4v20M15 5l10 17H15M13 9L6 22h7" /><path d="M4 26c3 2 6 2 8 0s6-2 8 0 6 2 8 0" /></>,
  other: <><circle cx="9" cy="16" r="1.6" /><circle cx="16" cy="16" r="1.6" /><circle cx="23" cy="16" r="1.6" /></>,
  tennis: <><circle cx="16" cy="16" r="11" /><path d="M7 9c5 3 5 11 0 14M25 9c-5 3-5 11 0 14" /></>,
  running: <><circle cx="19" cy="6" r="2.5" /><path d="M12 14l5-4 4 4 4 1M17 10l-3 8 5 4v6M14 18l-4 2-3-1" /></>,
  swimming: <><circle cx="22" cy="9" r="2.5" /><path d="M6 17l7-4 5 3M4 23c3 2 6 2 8 0s6-2 8 0 6 2 8 0" /></>,
  cycling: <><circle cx="8" cy="21" r="5" /><circle cx="24" cy="21" r="5" /><path d="M8 21l5-9h7l4 9M13 12l4 9h-9M18 8h3" /></>,
  football: <><circle cx="16" cy="16" r="11" /><path d="M16 11l5 3.5-2 6h-6l-2-6z" /></>,
  rowing: <><path d="M4 22l24-8M8 26l4-4M20 10l5-5M4 26c3 1 5 1 7-1" /></>,
};
const Ico = ({ k, className = "" }) => (
  <svg viewBox="0 0 32 32" className={`sp-ico ${className}`} aria-hidden="true">{I[k]}</svg>
);

export function SportPick({ onDone, onBack }) {
  const [step, setStep] = useState("pick"); // pick | soon | sail

  useEffect(() => {
    if (step !== "sail") return;
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => onDone("sailing"), still ? 500 : 2600);
    return () => clearTimeout(t);
  }, [step, onDone]);

  return (
    <div className="sp-screen fixed inset-0 z-[70] overflow-hidden text-white" role="dialog" aria-modal="true" aria-label="Spor seçimi">
      <SeaBackdrop />
      <div className="relative mx-auto flex h-full max-w-[26.25rem] flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+3rem)]">
        {step === "pick" && (
          <div key="pick" className="sp-in flex flex-col">
            <VeloraGlyph size={56} className="mx-auto" />
            <h1 className="mt-6 text-center text-[1.75rem] font-semibold tracking-[-0.02em]">Hangi spor?</h1>
            <div className="mt-8 space-y-3">
              <button type="button" className="sp-opt sp-main" onClick={() => setStep("sail")}>
                <span className="sp-ic"><Ico k="sailing" /></span>
                <span className="flex-1">Sailing</span>
                <span aria-hidden="true" className="sp-chev">›</span>
              </button>
              <button type="button" className="sp-opt" onClick={() => setStep("soon")}>
                <span className="sp-ic"><Ico k="other" /></span>
                <span className="flex-1">Diğer</span>
                <span aria-hidden="true" className="sp-chev">›</span>
              </button>
            </div>
            {onBack && (
              <button type="button" onClick={onBack} className="mt-6 self-center text-[0.9375rem] font-semibold text-[#8fb3ff]">
                Girişe dön
              </button>
            )}
          </div>
        )}

        {step === "soon" && (
          <div key="soon" className="sp-in flex flex-col">
            <div className="flex items-center gap-3">
              <button type="button" className="btn-round sp-back" aria-label="Geri" onClick={() => setStep("pick")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">Yakında</h1>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {SOON.map((s, i) => (
                <div key={s.id} className="sp-soon" style={{ "--i": i }}>
                  <Ico k={s.id} className="sp-dim" />
                  <span className="text-[1.0625rem] font-semibold">{s.name}</span>
                  <span className="sp-tag">Yakında</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "sail" && (
          <div key="sail" className="sp-sail flex flex-1 flex-col items-center justify-center">
            <div className="sp-stage">
              <svg className="sp-boat" viewBox="0 0 84 96" aria-hidden="true">
                <path d="M40 4v70" stroke="#fff" strokeWidth="2.5" />
                <path d="M42 8l30 58H42z" fill="#fff" />
                <path d="M38 18L12 66h26z" fill="#8fb3ff" />
                <path d="M8 74h68l-8 12H18z" fill="#3d7bff" />
              </svg>
              <svg className="sp-line" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 6q25-6 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0" stroke="#8fb3ff" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <p className="sp-word mt-6 text-[2rem] font-semibold tracking-[-0.02em]">
              Velora <span className="text-[#8fb3ff]">Sailing</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
