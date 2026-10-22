"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { CourierView } from "@/yemek/ui/CourierView";

// Velora Yemek (kod src/yemek; ayrı projeye taşınacak)
export default function YemekCourierViewPage() {
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <CourierView orgId={profile.orgId} />;
}
