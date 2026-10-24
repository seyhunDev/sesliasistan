"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { MenuView } from "@/market/ui/MenuView";

// Velora Market: hazır menü (/market/menu/yeni: yeni menü)
export default function MarketMenuPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const kind = useKind();
  if (!profile?.orgId || kind !== "owner") return null;
  return <MenuView orgId={profile.orgId} id={decodeURIComponent(id)} />;
}
