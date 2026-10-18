"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RollPanel } from "@/features/athletes/RollPanel";

// Yoklama sayfası (ekran ve kayıt features/athletes/RollPanel.jsx; antrenman sayfasında da aynısı açılır)
export default function AttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);

  if (!allowed) return null;
  return (
    <Suspense>
      <RollPanel />
    </Suspense>
  );
}

