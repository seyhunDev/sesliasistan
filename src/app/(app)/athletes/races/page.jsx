"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { RaceList } from "@/features/athletes/RaceList";
import { useData } from "@/features/data/DataProvider";
import { racePlanSync, racePlansOf } from "@/features/athletes/raceLinks";
import { loadRaces, racesNow } from "@/features/athletes/races";
import { shareAll } from "@/features/athletes/sharedRaces";
import { sweepLive } from "@/features/athletes/raceWipe";
import { RaceAddSheet } from "@/features/athletes/RaceAddSheet";
import { liveHead } from "@/features/liveScreen/fonts";
import "@/features/fitness/fitSahne.css";
import "@/features/athletes/raceSahne.css";
import "@/features/athletes/raceListSahne.css";

// Yarışlar (Sahne, Seyhun 2026-11-26): koyu zeminde üst çubuk, Sıradaki yarış kartı, Yaklaşan, Geçmiş, Yarış takvimi; yarışa dokununca yarış sayfası
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
  // Yarış planları yarışın asıl günlerine (Seyhun 2026-11-27 "bir kere düzeltelim"): eskiden yolculuk yazılınca plan gidiş–dönüş günlerine
  // uzuyordu. Liste açılınca, ana hesapta, oturumda bir kez: günleri yarıştan farklı olan yarış planları yarışın günlerine çekilir (yolculuk
  // günleri yarış kaydında kalır, bir şey kaybolmaz). Sonrası yarış sayfasındaki eşitlemeyle (raceLinks.racePlanSync) aynı.
  const { plans, updateRecord, isStaff } = useData();
  const swept = useRef(false);
  useEffect(() => {
    if (swept.current || !owner || isStaff || !races?.length || !plans?.length) return;
    swept.current = true;
    for (const r of races) {
      for (const [pid, x] of racePlanSync(r, racePlansOf(r, plans))) {
        if (!("date" in x)) continue;
        updateRecord("plan", pid, { date: x.date, endDate: x.endDate }, { name: me.name || "Kullanıcı" });
      }
    }
  }, [owner, isStaff, races, plans, updateRecord, me.name]);

  // Başlık (yarış kart, Seyhun 2026-11-07 "Yarışlar başlığı geri butonun yanında olmalı, diğer sayfalardaki gibi"): Planlar gibi yuvarlak geri,
  // yanında "Yarışlar", sağda beyaz + Yarış. Az kullanılanlar (Geçmiş yarışlar, Yarış takvimi, Siteden ekle) altta açılır "Diğer"de.
  // Üst çubuk (Sahne, Seyhun 2026-11-26): yarış detayı ve Fitness gibi yuvarlak geri, ortada küçük "Yarışlar", sağda limon + (ana hesapta
  // federasyon penceresi RaceAddSheet: TFF'den seç · Talimatla · Elle; diğerlerinde elle yeni yarış)
  const head = (
    <header className="rsh-bar">
      <BackButton href="/" />
      <span className="rsh-mid">Yarışlar</span>
      {owner ? (
        <button type="button" onClick={() => setAdding(true)} aria-label="Yarış ekle" data-press className="fs-rb fs-add">
          <Icon name="plus" className="size-5" />
        </button>
      ) : (
        <Link href="/athletes/races/new" aria-label="Yarış ekle" data-press className="fs-rb fs-add">
          <Icon name="plus" className="size-5" />
        </Link>
      )}
    </header>
  );
  const extra = (
    <Link href="/races" data-press="row" className="rsl-row">
      <span className="rsl-k">
        <b>Yarış takvimi</b>
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-mut" />
    </Link>
  );

  return (
    <main className={`rz rzc rzla fs rsh rsl ${liveHead.variable} mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]`}>
      <RaceList races={races} head={head} extra={extra} onOpen={(r) => router.push(`/athletes/races/${r.id}`)}>
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!races && <Loading label="Yarışlar yükleniyor" />}
      </RaceList>
      {owner && <RaceAddSheet open={adding} onClose={() => setAdding(false)} orgId={orgId} uid={me.uid} races={races} onAdded={() => setVer((n) => n + 1)} />}
    </main>
  );
}
