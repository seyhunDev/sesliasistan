"use client";

import { Suspense } from "react";
import { BilgiAdmin } from "@/features/bilgi/BilgiAdmin";

// Bilgi ekranı yönetimi (yalnız ana hesap)
export default function BilgiYonetPage() {
  return (
    <Suspense>
      <BilgiAdmin />
    </Suspense>
  );
}
