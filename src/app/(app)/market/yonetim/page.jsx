"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { MarketAdmin } from "@/market/ui/MarketAdmin";

// Market yönetimi (yalnız ana hesap; kod src/market)
export default function MarketAdminPage() {
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <MarketAdmin orgId={profile.orgId} />;
}
