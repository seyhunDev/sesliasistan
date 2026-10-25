"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { sanalLink } from "@/lib/sanal";

// Velora Sanal (market, ileride giyim) Velora'nın içinde gömülü sayfa (Seyhun 2026-10-25: "ayrı bir şey açmadan, bizim bir sayfaymış gibi").
// Sistem ayrı site (velora-sanal.netlify.app); burada tam ekran çerçevede açılır, üst satır ve alt sekme çubuğu Velora'nın.
// Giriş şifresiz: her açılışta 1 saatlik anahtar (lib/sanal.js sanalLink → /giris#t=…). Sanal, çerçevede kendi başlığını gizler.
export default function Sanal() {
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    sanalLink().then((u) => on && setSrc(u));
    return () => {
      on = false;
    };
  }, []);
  return (
    <main className="fixed inset-x-0 top-0 z-0 flex flex-col bg-bg pt-[env(safe-area-inset-top)]" style={{ bottom: "var(--stage-h, 6rem)" }}>
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <BackButton href="/" />
        <h1 className="text-[1.0625rem] font-semibold">Market</h1>
      </div>
      <div className="relative min-h-0 flex-1">
        {!ready && <span className="absolute inset-0 grid place-items-center text-[0.875rem] text-mut">Açılıyor…</span>}
        {src && (
          <iframe
            src={src}
            title="Velora Sanal"
            allow="fullscreen"
            onLoad={() => setReady(true)}
            className={`absolute inset-0 size-full border-0 transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
    </main>
  );
}
