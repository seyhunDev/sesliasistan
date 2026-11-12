"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RaceList } from "@/features/athletes/RaceList";
import { loadRaces, racesNow } from "@/features/athletes/races";
import { shareAll } from "@/features/athletes/sharedRaces";
import { sweepLive } from "@/features/athletes/raceWipe";
import { RaceAddSheet } from "@/features/athletes/RaceAddSheet";

// Yarışlar (yarış kart 2026-11-07): lacivert üstte başlık ve sıradaki yarış kartı; açık zeminde Yaklaşan ve açılır Diğer; yarışa dokununca yarış sayfası
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
  const [adding, setAdding] = useState(false);
  const [ver, setVer] = useState(0);
  useEffect(() => {
    loadRaces(orgId).then(
      (list) => {
        setRaces(list);
        // Kulübün yarışları ortak yarışlara (lib/sharedRace.js; oturumda bir kez, yalnız bağı olmayanlar)
        if (me.uid && me.uid === orgId) shareAll({ orgId, uid: me.uid, email: me.email, name: me.name, races: list });
        // Silinmiş yarışlardan kalan yayın verisi (oturumda bir kez, yalnız ana hesap; raceWipe.js sweepLive)
        if (me.uid && me.uid === orgId) sweepLive();
      },
      (e) => (setRaces((r) => r || []), setError(e?.message || "Yarışlar alınamadı.")),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, ver]);
  const owner = me.uid === orgId;

  // Başlık (yarış kart, Seyhun 2026-11-07 "Yarışlar başlığı geri butonun yanında olmalı, diğer sayfalardaki gibi"): Planlar gibi yuvarlak geri,
  // yanında "Yarışlar", sağda beyaz + Yarış. Az kullanılanlar (Geçmiş yarışlar, Yarış takvimi, Siteden ekle) altta açılır "Diğer"de.
  const head = (
    <header className="flex items-center gap-2.5">
      <BackButton href="/" />
      <h1 className="min-w-0 flex-1 truncate">Yarışlar</h1>
      {/* + Yarış (Seyhun 2026-11-09): ana hesapta federasyon sitesindeki yarışlar penceresi (RaceAddSheet: TFF'den seç · Talimatla · Elle); diğerlerinde elle */}
      {owner ? (
        <button type="button" onClick={() => setAdding(true)} data-press className="btn btn-primary h-10 shrink-0 gap-1 px-3.5 text-[0.9375rem]">
          <Icon name="plus" className="size-4" />
          Yarış
        </button>
      ) : (
        <Link href="/athletes/races/new" data-press className="btn btn-primary h-10 shrink-0 gap-1 px-3.5 text-[0.9375rem]">
          <Icon name="plus" className="size-4" />
          Yarış
        </Link>
      )}
    </header>
  );
  const extra = (
    <>
      <Link href="/races" data-press="row" className="rz-row w-full">
        <span className="rz-k">Yarış takvimi</span>
        <span className="rz-chev" aria-hidden="true" />
      </Link>
    </>
  );

  return (
    <main className="rz rzc rzl split mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <RaceList races={races} head={head} owner={owner} extra={extra} onOpen={(r) => router.push(`/athletes/races/${r.id}`)}>
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!races && <Loading label="Yarışlar yükleniyor" />}
      </RaceList>
      {owner && <RaceAddSheet open={adding} onClose={() => setAdding(false)} orgId={orgId} uid={me.uid} races={races} onAdded={() => setVer((n) => n + 1)} />}
    </main>
  );
}
