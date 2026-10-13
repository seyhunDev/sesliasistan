"use client";

import { Suspense } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { FitnessHome } from "@/features/fitness/FitnessHome";
import { AthleteFitness } from "@/features/fitness/AthleteFitness";

// Fitness: ana hesapta program hazırlama ve takip; sporcu ve diğer hesaplarda antrenörün hazırladığı program (salt okunur)
export default function FitnessPage() {
  const { profile } = useAuth();
  if (!profile?.orgId) return null;
  if (profile.role === "staff") return <AthleteFitness />;
  return (
    <Suspense fallback={null}>
      <FitnessHome />
    </Suspense>
  );
}
