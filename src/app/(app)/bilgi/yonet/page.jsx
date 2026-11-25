"use client";

import { Suspense } from "react";
import { SheetTone } from "@/components/ui/Sheet";
import { BilgiAdmin } from "@/features/bilgi/BilgiAdmin";

// Bilgi ekranı yönetimi (yalnız ana hesap). Koyu Sahne: içindeki bütün pencereler koyu (SheetTone)
export default function BilgiYonetPage() {
  return (
    <SheetTone.Provider value="sahne">
      <Suspense>
        <BilgiAdmin />
      </Suspense>
    </SheetTone.Provider>
  );
}
