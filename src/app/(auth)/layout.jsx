"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { AppLogo } from "@/components/ui/AppLogo";

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return (
    <div data-boot-enter="" className="mx-auto flex min-h-dvh max-w-[26.25rem] flex-col justify-center px-5 py-10">
      {/* Uygulama kimliği */}
      <div className="mb-7 flex flex-col items-center text-center">
        <AppLogo size={60} className="shadow-[0_12px_28px_-12px_rgba(31,90,75,.7)]" />
        <p className="mt-3 text-[1.25rem] font-semibold tracking-tight">Sesli Asistan</p>
        <p className="mt-0.5 text-[0.875rem] text-mut">Planlar, görevler ve notlar; konuşarak</p>
      </div>
      <div className="rounded-3xl bg-card p-6 shadow-[0_1px_3px_rgba(38,40,44,.06),0_12px_32px_-16px_rgba(38,40,44,.18)]">{children}</div>
    </div>
  );
}
