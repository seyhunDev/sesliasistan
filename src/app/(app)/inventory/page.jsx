"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { InventoryHome } from "@/features/inventory/InventoryHome";

// Envanter: birden çok envanter (Yelken Kulübü, Normal, …), ürünler, adetler, hareketler (yalnız ana hesap)
export default function InventoryPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <InventoryHome orgId={profile.orgId} />;
}
