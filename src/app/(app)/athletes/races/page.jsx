"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RaceList, isPast } from "@/features/athletes/RaceList";
import { loadRaces, racesNow } from "@/features/athletes/races";
import { shareAll } from "@/features/athletes/sharedRaces";
import { RaceSwitch } from "@/features/raceCal/RaceSwitch";

// Yarışlar (yeni tasarım 2026-10-21): lacivert üstte başlık ve sıradaki yarış; sıradaki yarış kartı, yaklaşan yarışlar ay ay, geçmiş yarışlar en altta; yarışa dokununca evrak, sporcular, yapılacaklar
export default function RacesPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId) return null;
  return <Races orgId={profile.orgId} me={{ uid: user?.uid, email: profile.email || user?.email, name: profile.name || "" }} />;
}

function Races({ orgId, me }) {
  const router = useRouter();
  const [races, setRaces] = useState(() => racesNow(orgId)); // bellekte varsa hemen (geri dönüşte boş ekran yok), arkada tazelenir
  const [error, setError] = useState("");
  useEffect(() => {
    loadRaces(orgId).then(
      (list) => {
        setRaces(list);
        // Kulübün yarışları ortak yarışlara (lib/sharedRace.js; oturumda bir kez, yalnız bağı olmayanlar)
        if (me.uid && me.uid === orgId) shareAll({ orgId, uid: me.uid, email: me.email, name: me.name, races: list });
      },
      (e) => (setRaces((r) => r || []), setError(e?.message || "Yarışlar alınamadı.")),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);
  const up = races?.filter((r) => !isPast(r)).length || 0;
  const past = (races?.length || 0) - up;
  const sub = !races ? "Yükleniyor…" : [up ? `${up} yaklaşan` : "Yaklaşan yarış yok", past && `${past} geçmiş`].filter(Boolean).join(" · ");

  const head = (
    <>
    <header className="flex items-center gap-2.5">
      <BackButton href="/athletes" />
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Yarışlar</h1>
        <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>
      </div>
      <Link href="/athletes/races/new" data-press className="raised act-main flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3.5 text-[0.875rem] font-semibold">
        <Icon name="plus" className="size-4" />
        Yarış
      </Link>
    </header>
    <RaceSwitch on="club" />
    </>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <RaceList races={races} head={head} onOpen={(r) => router.push(`/athletes/races/${r.id}`)}>
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!races && <Loading label="Yarışlar yükleniyor" />}
      </RaceList>
    </main>
  );
}
