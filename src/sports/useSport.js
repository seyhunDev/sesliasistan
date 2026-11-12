"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { hasPart, sportOf } from "./index";

// Aktif spor ve bölüm sorgusu: const { sport, has } = useSport(); has("races")
export function useSport() {
  const { profile } = useAuth();
  const sport = sportOf(profile);
  return { sport, has: (part) => hasPart(sport, part) };
}
