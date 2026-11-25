"use client";

import { BilgiKenar, BilgiScreen } from "@/features/bilgi/BilgiScreen";

// Sporcu bilgi ekranı: tek ekran, dokunulmaz (Seyhun 2026-11-15)
export default function BilgiPage() {
  return (
    <>
      <BilgiKenar />
      <BilgiScreen />
    </>
  );
}
