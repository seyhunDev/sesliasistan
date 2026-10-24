"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { PanelView } from "@/yemek/ui/PanelView";

// Velora Yemek (kod src/yemek; ayrı projeye taşınacak)
export default function YemekPanelViewPage() {
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <PanelView orgId={profile.orgId} />;
}
