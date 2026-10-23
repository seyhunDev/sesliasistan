"use client";

import { Suspense } from "react";
import { CamsPage } from "@/features/cams/CamsPage";

// Halka açık canlı kameralar: seçilen yerin çevresi (Windy Webcams). Ayrıntı src/features/cams, sunucu /api/cams.
export default function Cams() {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <Suspense fallback={null}>
        <CamsPage />
      </Suspense>
    </main>
  );
}
