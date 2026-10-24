"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { AdminView } from "@/yemek/ui/AdminView";

// Velora Yemek (kod src/yemek; ayrı projeye taşınacak)
export default function YemekAdminViewPage() {
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <AdminView orgId={profile.orgId} />;
}
