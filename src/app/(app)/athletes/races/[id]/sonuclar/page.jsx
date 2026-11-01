"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadRace } from "@/features/athletes/races";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { ResultsTab } from "@/features/raceMedia/ResultsTab";

// Yarışın sonuç sayfası (Seyhun 2026-11-01 "PDF yükle butonu başka yerde olmalı"): sonuç PDF'i burada yüklenir ve okunur; yarış sayfasının
// Sonuçlar satırı ve Yayın ⋯ menüsü buraya gelir. Yalnız ana hesap.
export default function Page() {
  const { user, profile, isOwner } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [race, setRace] = useState(null);
  const [athletes, setAthletes] = useState([]);
  useEffect(() => {
    if (profile && !isOwner) router.replace(`/athletes/races/${id}`);
  }, [profile, isOwner, router, id]);
  useEffect(() => {
    if (!profile?.orgId) return;
    let on = true;
    loadRace(profile.orgId, id).then((r) => on && setRace(r || {}), () => on && setRace({}));
    loadAthletes().then((d) => on && setAthletes(d.athletes || []), () => {});
    return () => {
      on = false;
    };
  }, [profile?.orgId, id]);
  if (!isOwner || !profile?.orgId || !user) return null;
  const ours = athletes.filter((a) => race?.athleteIds?.includes(a.id));
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Sonuçlar">
        <header className="flex items-center gap-2.5">
          <BackButton href={`/athletes/races/${id}`} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Sonuçlar</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{race?.name || ""}</p>
          </div>
        </header>
      </section>
      <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pb-1 pt-5">
        {race?.id ? <ResultsTab orgId={profile.orgId} race={race} ours={ours} club={athletes.filter(isActive)} onRace={setRace} /> : null}
      </div>
    </main>
  );
}
