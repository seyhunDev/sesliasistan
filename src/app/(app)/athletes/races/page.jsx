"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RaceList, isPast } from "@/features/athletes/RaceList";
import { loadRaces } from "@/features/athletes/races";

// Yarışlar: sıradaki yarış kartı, yaklaşan yarışlar ay ay, geçmiş yarışlar en altta; yarışa dokununca evrak, sporcular, yapılacaklar
export default function RacesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId) return null;
  return <Races orgId={profile.orgId} />;
}

function Races({ orgId }) {
  const router = useRouter();
  const [races, setRaces] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadRaces(orgId).then(setRaces, (e) => (setRaces([]), setError(e?.message || "Yarışlar alınamadı.")));
  }, [orgId]);
  const up = races?.filter((r) => !isPast(r)).length || 0;
  const past = (races?.length || 0) - up;
  const sub = !races ? "Yükleniyor…" : [up ? `${up} yaklaşan` : "Yaklaşan yarış yok", past && `${past} geçmiş`].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Yarışlar" sub={sub} back="/athletes">
        <Link href="/athletes/races/new" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-[1.125rem]" />
          Yarış
        </Link>
      </PageHeader>
      {error && <p className="mt-3 text-center text-[0.875rem] text-rec">{error}</p>}
      {!races ? <Loading label="Yarışlar yükleniyor" /> : <RaceList races={races} onOpen={(r) => router.push(`/athletes/races/${r.id}`)} />}
    </main>
  );
}
