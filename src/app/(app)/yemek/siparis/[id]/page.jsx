"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { TrackView } from "@/yemek/ui/TrackView";

// Velora Yemek: sipariş takibi (kod src/yemek)
export default function YemekOrderPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <TrackView orgId={profile.orgId} id={id} />;
}
