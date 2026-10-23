"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { kindOf } from "@/lib/kinds";

// Giriş yapan kişinin türü: "owner" | "staff" | "family" | "athlete" | "student" | "parent" | "other" | "courier" (Velora Yemek kuryesi)
export function useKind() {
  const { profile } = useAuth();
  if (!profile) return "";
  if (profile.role === "courier") return "courier";
  return profile.role === "staff" ? kindOf(profile) : "owner";
}
