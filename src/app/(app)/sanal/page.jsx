"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { sanalLink } from "@/lib/sanal";

// Velora Sanal (market, ileride giyim) Velora'nın içinde gömülü sayfa (Seyhun 2026-10-25: "ayrı bir şey açmadan, bizim bir sayfaymış gibi").
// Sistem ayrı site (velora-sanal.netlify.app); burada TAM EKRAN açılır (Seyhun 2026-10-25: "tam ekran olmalı"): sekme çubuğu ve başlık yok,
// yalnız sol üstte küçük yarı saydam Geri düğmesi (ana sayfaya). Çerçeve çentik ve alt çizgi dahil bütün ekran; paylar st/sb ile Sanal'a gider.
// Giriş şifresiz: her açılışta 1 saatlik anahtar (lib/sanal.js sanalLink → /giris#t=…). Sanal, çerçevede kendi başlığını gizler.
export default function Sanal() {
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const probe = useRef(null);
  useEffect(() => {
    let on = true;
    // iPhone'un çentik / alt çizgi payını ölç, Sanal'a adresle ver (çerçeve bütün ekranı kaplar, paylar Sanal'ın içinde boş kalır)
    const cs = probe.current && getComputedStyle(probe.current);
    const pad = cs ? { st: Math.round(parseFloat(cs.paddingTop) || 0), sb: Math.round(parseFloat(cs.paddingBottom) || 0) } : null;
    sanalLink(pad).then((u) => on && setSrc(u));
    return () => {
      on = false;
    };
  }, []);
  return (
    <main className="fixed inset-0 z-30 bg-[#11203a]">
      <span ref={probe} aria-hidden="true" className="invisible absolute pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]" />
      {!ready && <span className="absolute inset-0 grid place-items-center text-[0.875rem] text-white/60">Açılıyor…</span>}
      {src && (
        <iframe
          src={src}
          title="Velora Sanal"
          allow="fullscreen"
          onLoad={() => setReady(true)}
          className={`absolute inset-0 size-full border-0 transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <Link
        href="/"
        data-press
        aria-label="Geri"
        className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.5rem)] grid size-10 place-items-center rounded-full bg-black/45 text-white shadow-[0_2px_8px_rgba(0,0,0,.3)] backdrop-blur-md"
      >
        <Icon name="back" className="size-5" />
      </Link>
    </main>
  );
}
