"use client";

import { useState } from "react";
import { useKind } from "@/features/auth/useKind";
import { BackButton } from "@/components/ui/BackButton";
import { placeById } from "@/yemek/store";
import { MAP_STYLES } from "@/yemek/mapStyles";
import { TrackMap } from "@/yemek/ui/TrackMap";

// Geçici örnek (Seyhun 2026-10-23): takip haritasının görünümünü seçmek için. Seçilince MAP_STYLE değişir, sayfa silinir.
const HOME = { lat: 39.069, lng: 26.8845 };
export default function HaritaOrnekPage() {
  const kind = useKind();
  const [look, setLook] = useState("acik");
  if (kind !== "owner") return null;
  const from = placeById("pizza-ruzgar").pos;
  const courier = { lat: from.lat + (HOME.lat - from.lat) * 0.55, lng: from.lng + (HOME.lng - from.lng) * 0.55 };
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/shopping?tab=yemek" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Harita görünümü</h1>
        </header>
        <div className="mt-3.5 grid grid-cols-4 gap-2">
          {Object.entries(MAP_STYLES).map(([k, st]) => (
            <button key={k} type="button" data-press aria-pressed={look === k} onClick={() => setLook(k)} className={`raised h-11 rounded-xl border text-[0.875rem] font-semibold ${look === k ? "ck-sel" : ""}`}>{st.name}</button>
          ))}
        </div>
      </section>
      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <TrackMap key={look} look={look} from={from} to={HOME} courier={courier} tall />
      </div>
    </main>
  );
}
