"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RaceMedia } from "@/features/raceMedia/RaceMedia";

// Yarış multimedya sayfası (yarış günü): Hava · Süre · Sonuçlar · Medya. Ana sayfadaki sıradaki yarıştan ve yarış sayfasından açılır.
export default function RaceMediaPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId || !user) return null;
  return (
    <Suspense>
      <RaceMedia orgId={profile.orgId} id={id} />
    </Suspense>
  );
}
