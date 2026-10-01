"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { Icon } from "@/components/ui/Icon";

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[26.25rem] flex-col justify-center px-5 py-10">
      {/* Uygulama kimliği */}
      <div className="mb-7 flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-acc text-white shadow-[0_8px_24px_-10px_rgba(62,110,132,.7)]">
          <Icon name="anchor" className="size-7" />
        </span>
        <p className="mt-3 text-[1.25rem] font-semibold tracking-tight">Sesli Asistan</p>
        <p className="mt-0.5 text-[0.875rem] text-mut">Planlar, görevler ve notlar; konuşarak</p>
      </div>
      <div className="rounded-3xl bg-card p-6 shadow-[0_1px_3px_rgba(38,40,44,.06),0_12px_32px_-16px_rgba(38,40,44,.18)]">{children}</div>
    </div>
  );
}
