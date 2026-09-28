"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <Splash />;
  return <div className="mx-auto grid min-h-dvh max-w-[420px] content-center px-5 py-10">{children}</div>;
}
