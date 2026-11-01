"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { BroadcastPage } from "@/features/broadcast/BroadcastPage";

// Yarışın yayın sayfası (Seyhun 2026-11-01 "herkese açık multimedyasını ayrı bir sayfada yöneteceğiz"): yalnız ana hesap.
export default function Page() {
  const { user, profile, isOwner } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  useEffect(() => {
    if (profile && !isOwner) router.replace(`/athletes/races/${id}`);
  }, [profile, isOwner, router, id]);
  if (!isOwner || !profile?.orgId || !user) return null;
  return (
    <Suspense>
      <BroadcastPage orgId={profile.orgId} id={id} />
    </Suspense>
  );
}
