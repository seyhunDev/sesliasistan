"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { OwnerHome } from "@/features/home/OwnerHome";
import { StaffHome } from "@/features/home/StaffHome";

export default function HomePage() {
  const { role } = useAuth();
  return role === "staff" ? <StaffHome /> : <OwnerHome />;
}
