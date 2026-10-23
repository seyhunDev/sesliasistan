"use client";

import { SeaPage } from "@/features/sea/SeaPage";

// Deniz trafiği: Dikili çevresindeki gemiler canlı (AIS, aisstream.io). Ayrıntı src/features/sea, sunucu /api/sea.
export default function Sea() {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <SeaPage />
    </main>
  );
}
