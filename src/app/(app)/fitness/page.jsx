"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { FitnessHome } from "@/features/fitness/FitnessHome";

// Fitness: yapay zekayla antrenman programı, planlara ekleme, antrenman takibi (yalnız ana hesap; ilk sürüm)
export default function FitnessPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return (
    <Suspense fallback={null}>
      <FitnessHome />
    </Suspense>
  );
}
