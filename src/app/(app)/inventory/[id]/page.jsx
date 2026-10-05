"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { InventoryView } from "@/features/inventory/InventoryView";

// Tek envanter: ürünler kategoriye göre, arama, düzenleme, hareketler, Excel
export default function InventoryOnePage() {
  const { profile } = useAuth();
  const { id } = useParams();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <InventoryView key={id} orgId={profile.orgId} id={id} by={profile?.name || ""} />;
}
