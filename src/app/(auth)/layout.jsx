"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { AppLogo } from "@/components/ui/AppLogo";

// Uygulamanın ilk yüzü: tüm ekran lacivert kokpit. Logo ekranın üstünde sabit durur (ortalanmaz), böylece
// telefonda klavye açılınca yukarı kaymaz; her adımda tek kutu + tek düğme klavyenin üstünde kalır (2026-10-22).
export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return (
    <div data-boot-enter="" className="ck min-h-dvh">
      <div className="mx-auto max-w-[26.25rem] px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        <div className="mb-8 flex flex-col items-center">
          <AppLogo size={84} />
          <span className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-white">Velora</span>
        </div>
        {children}
      </div>
    </div>
  );
}
