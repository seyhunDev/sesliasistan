"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { InvoicesView } from "@/features/invoices/InvoicesView";

// Faturalar: PDF/fotoğraf yüklenir, ödendi/ödenmedi, banka maillerinden kontrol, "Fatura öde" görevi (yalnız ana hesap)
export default function InvoicesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/receipts");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <InvoicesView orgId={profile.orgId} />;
}
