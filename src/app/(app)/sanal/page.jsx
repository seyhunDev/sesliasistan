"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { SANAL_URL, sanalToken } from "@/lib/sanal";

// Velora Sanal (market, ileride giyim) Velora'nın içinde gömülü sayfa (Seyhun 2026-10-25: "ayrı bir şey açmadan, bizim bir sayfaymış gibi").
// Sistem ayrı site (velora-sanal.netlify.app); burada TAM EKRAN açılır (Seyhun 2026-10-25: "tam ekran olmalı"): sekme çubuğu ve başlık yok,
// yalnız sol üstte küçük yarı saydam Geri düğmesi (ana sayfaya). Çerçeve çentik ve alt çizgi dahil bütün ekran; paylar st/sb ile Sanal'a gider.
// Hızlı açılış (Seyhun 2026-10-26: "yemek nasıl yükleniyorsa sanal da öyle yüklensin"): çerçeve anahtarı beklemeden hemen kökten açılır
// (#st=…&sb=…&u=uid), "Açılıyor…" yazısı yok, yalnız lacivert zemin. Anahtar arka planda alınır; Sanal'da oturum yoksa
// { type: "velora-sanal", event: "need-token" } gönderir, anahtar { type: "velora-token", t } ile verilir (velora-sanal #14).
const ORIGIN = new URL(SANAL_URL).origin;

export default function Sanal() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const probe = useRef(null);
  const frame = useRef(null);
  useEffect(() => {
    if (user === undefined) return; // oturum henüz bilinmiyor: çerçeve iki kez yüklenmesin
    // iPhone'un çentik / alt çizgi payını ölç, Sanal'a adresle ver (çerçeve bütün ekranı kaplar, paylar Sanal'ın içinde boş kalır)
    const cs = probe.current && getComputedStyle(probe.current);
    const st = cs ? Math.round(parseFloat(cs.paddingTop) || 0) : 0;
    const sb = cs ? Math.round(parseFloat(cs.paddingBottom) || 0) : 0;
    setSrc(`${SANAL_URL}/#st=${st}&sb=${sb}&u=${encodeURIComponent(uid)}`);
  }, [user, uid]);
  useEffect(() => {
    let on = true;
    let want = false;
    let token = null;
    const give = () => token && frame.current?.contentWindow?.postMessage({ type: "velora-token", t: token }, ORIGIN);
    sanalToken().then((t) => {
      if (!on) return;
      token = t;
      if (want) give();
    });
    const onMsg = (e) => {
      if (e.origin !== ORIGIN || e.data?.type !== "velora-sanal" || e.data.event !== "need-token") return;
      want = true;
      give();
    };
    window.addEventListener("message", onMsg);
    return () => {
      on = false;
      window.removeEventListener("message", onMsg);
    };
  }, []);
  return (
    <main className="fixed inset-0 z-30 bg-[#11203a]">
      <span ref={probe} aria-hidden="true" className="invisible absolute pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]" />
      {src && (
        <iframe
          ref={frame}
          src={src}
          title="Velora Sanal"
          allow="fullscreen"
          onLoad={() => setReady(true)}
          className={`absolute inset-0 size-full border-0 transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
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
