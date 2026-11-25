"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptic";
import { Loader } from "./Loader";
import { buttonClass } from "./buttonClass";

// variant: primary (ana) · secondary (ikincil; eski adı ghost) · text (yazı) · icon (simge) · danger (tehlike) · back (geri, BackButton); size: md · sm
// İşlem göstergesi (Seyhun 2026-11-04 "her buton için içinde yuvarlak bir loading; veri gitti mi görmek için, tıklama hissiyatı"):
// onClick bir Promise döndürürse (kaydetme, gönderme) iş bitene kadar düğmenin içinde dönen halka çıkar, düğme kilitlenir;
// her dokunuşta hafif titreşim (iPhone uygulamasında Taptic).
export function Button({ variant = "primary", size = "md", full, loading, children, className = "", disabled, onClick, ...p }) {
  const [busy, setBusy] = useState(false);
  const click = (e) => {
    haptic("light");
    const r = onClick?.(e);
    if (r && typeof r.then === "function") {
      setBusy(true);
      Promise.resolve(r)
        .catch(() => {})
        .finally(() => setBusy(false));
    }
  };
  return (
    <button {...p} onClick={click} data-press aria-busy={busy || undefined} disabled={disabled || loading || busy} className={`${buttonClass({ variant, size, full })} ${className}`}>
      {busy ? <span className="btn-spin" aria-hidden="true" /> : null}
      {loading && <Loader size="sm" className="text-current" />}
      {loading ? "Bekleyin…" : children}
    </button>
  );
}
