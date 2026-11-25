"use client";

import { useHesap } from "@/features/auth/useHesap";
import { OwnerHome } from "@/features/home/OwnerHome";
import { NormalHome } from "@/features/home/NormalHome";
import { SporcuHome } from "@/features/home/SporcuHome";

// Üç ana sayfa (Seyhun 2026-11-25): ana hesap, normal kullanıcı, sporcu; hangisi lib/hesapGorunum.js viewOf (ana hesap "… gibi gör" ile ötekilerine bakar)
export default function HomePage() {
  const { view } = useHesap();
  if (view === "sporcu") return <SporcuHome />;
  if (view === "normal") return <NormalHome />;
  return <OwnerHome />;
}
