"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { SIMULATOR_URL, sailingToken } from "@/lib/externalLinks";

// Velora Sailing Velora'nın içinde gömülü sayfa (Seyhun 2026-11-22: "web açılınca yukarıdaki kısım rahatsız edici… Velora
// uygulamasının içine dahil edebilir miyiz?"). /sanal ile aynı yol: ayrı site (velora-sailing.netlify.app) TAM EKRAN çerçevede,
// sekme çubuğu ve başlık yok. Giriş anahtarı (/api/sailing-giris) adresin # kısmında gider; Sailing onunla Velora hesabıyla açılır.
// Çerçeve güvenli alanın içinde durur (çentik / Dynamic Island / alt çizgi payı lacivert kalır), çünkü çerçevenin içine
// safe-area gelmez ve Sailing telefonda yatay kullanılır. Geri: Sailing çerçevede olduğunu anlar, üst çubuğunda "Velora'ya dön"
// düğmesi gösterir ve { type: "velora-sailing", event: "close" } gönderir; burada ana sayfaya dönülür.
const ORIGIN = new URL(SIMULATOR_URL).origin;

export default function Sailing() {
  const router = useRouter();
  const { user } = useAuth();
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const frame = useRef(null);
  useEffect(() => {
    if (user === undefined) return; // oturum henüz bilinmiyor: çerçeve iki kez yüklenmesin
    let on = true;
    sailingToken().then((t) => on && setSrc(t ? `${SIMULATOR_URL}#t=${encodeURIComponent(t)}` : SIMULATOR_URL));
    return () => {
      on = false;
    };
  }, [user]);
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== ORIGIN || e.data?.type !== "velora-sailing") return;
      if (e.data.event === "close") {
        if (window.history.length > 1) router.back();
        else router.replace("/");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [router]);
  return (
    <main className="fixed inset-0 z-30 bg-[#0b1a33]">
      <div className="absolute inset-0 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
        {src && (
          <iframe
            ref={frame}
            src={src}
            title="Velora Sailing"
            allow="fullscreen; screen-wake-lock"
            onLoad={() => setReady(true)}
            className={`size-full border-0 transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
    </main>
  );
}
