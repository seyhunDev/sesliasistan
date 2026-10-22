"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { GlowMark } from "@/components/ui/AppLogo";

// Uygulamanın ilk yüzü: tüm ekran lacivert kokpit. Logo ekranın üstünde sabit durur (ortalanmaz), böylece
// telefonda klavye açılınca yukarı kaymaz; her adımda tek kutu + tek düğme klavyenin üstünde kalır (2026-10-22).
// Açılış: açılış ekranının logosu buradaki logonun yerine uçar (BootSplash, data-boot-target), ardından Velora yazısı ve
// form sırayla belirir. Açılış ekranı yokken (çıkış yapınca) logo büyüyerek gelir.
export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // İlk çizimde açılış ekranı yoksa logo kendisi belirir (uçuş olmayacak)
  const [pop] = useState(() => typeof document !== "undefined" && !document.documentElement.dataset.boot);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return (
    <div className="ck min-h-dvh overflow-hidden">
      <div className="mx-auto max-w-[26.25rem] px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        <div className="mb-8 flex flex-col items-center">
          <GlowMark size={84} data-boot-target="" className={pop ? "auth-pop" : ""} />
          <span className="auth-rise mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-white" style={{ "--d": ".5s" }}>
            Velora
          </span>
        </div>
        <div className="auth-rise" style={{ "--d": ".6s" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
