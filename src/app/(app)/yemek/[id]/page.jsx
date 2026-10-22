"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { PlaceView } from "@/yemek/ui/PlaceView";

// Velora Yemek: restoran menüsü (kod src/yemek; ayrı projeye taşınacak)
export default function YemekPlacePage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return (
    <Suspense fallback={null}>
      <PlaceView orgId={profile.orgId} uid={profile.uid} id={id} />
    </Suspense>
  );
}
