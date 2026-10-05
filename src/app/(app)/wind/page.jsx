"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { WindMapView } from "@/features/weather/WindMap";

// Rüzgâr haritası (Windy gibi): Dikili körfezi saat saat rüzgâr okları. Herkes açabilir; veri Open-Meteo'dan, Firestore'a dokunmaz.
export default function WindPage() {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Rüzgâr haritası" />
      <WindMapView />
    </main>
  );
}
