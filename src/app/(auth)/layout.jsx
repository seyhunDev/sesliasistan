"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { goToSailing, pendingSailingReturn, sailingBusy, takeSailingLogout, useSailingReturn } from "@/lib/sailingReturn";
import { logout } from "@/lib/auth";

// Uygulamanın ilk yüzü: açılış ekranıyla aynı açık zemin (Apple beyazı, koyu daire içinde V; 2026-11-23, önceden lacivert kokpit). Logo ekranın üstünde sabit durur (ortalanmaz), böylece
// telefonda klavye açılınca yukarı kaymaz; her adımda tek kutu + tek düğme klavyenin üstünde kalır (2026-10-22).
// Açılış: açılış ekranının logosu buradaki logonun yerine uçar (BootSplash, data-boot-target), ardından Velora yazısı ve
// form sırayla belirir. Açılış ekranı yokken (çıkış yapınca) logo büyüyerek gelir.
export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // İlk çizimde açılış ekranı yoksa logo kendisi belirir (uçuş olmayacak)
  const [pop] = useState(() => typeof document !== "undefined" && !document.documentElement.dataset.boot);

  // Velora Sailing'den gelindiyse (?sailing=…) oturum açılınca o Sailing sayfasına dönülür (lib/sailingReturn.js)
  const sailing = useSailingReturn();

  useEffect(() => {
    if (loading) return;
    const out = takeSailingLogout(); // ilk çizimde bir kez: Sailing'de çıkış yapıldıysa Velora oturumu da kapanır
    if (!user) return;
    if (out) {
      logout(); // oturum kapanınca giriş/kayıt formu görünür, sonra yine Sailing'e dönülür
      return;
    }
    if (pendingSailingReturn()) {
      if (!sailingBusy()) goToSailing(); // kayıt sürüyorsa kayıt sayfası profil yazılınca kendisi gönderir
    } else router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return (
    <div className="acik auth-acik min-h-dvh overflow-hidden">
      <div className="mx-auto max-w-[26.25rem] px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        <div className="mb-8 flex flex-col items-center">
          <VeloraGlyph size={80} color="#1d1d1f" data-boot-target="" className={pop ? "auth-pop" : ""} />
          <span className="auth-rise mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-fg" style={{ "--d": ".5s" }}>
            Velora
          </span>
        </div>
        <div className="auth-rise" style={{ "--d": ".6s" }}>
          {sailing && (
            <p className="mb-4 rounded-2xl bg-accbg px-4 py-3 text-center text-[0.9375rem] leading-snug text-fg">
              <b className="font-semibold">Velora Sailing</b> için Velora hesabınla gir ya da ücretsiz kaydol. Sonra kaldığın sayfaya dönersin.
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
