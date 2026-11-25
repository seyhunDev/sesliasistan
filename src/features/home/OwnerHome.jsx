"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/features/data/DataProvider";
import { useHesap } from "@/features/auth/useHesap";
import { BilgiTile } from "@/features/bilgi/BilgiTile";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { fitDays } from "@/lib/homeTiles";
import { useRaceHome } from "@/features/athletes/raceHome";
import { IntroTile } from "@/components/ui/IntroTile";
import { SailingPreview } from "@/features/intro/SailingPreview";
import { InboxSheet, useInbox } from "./Inbox";
import { HomeGrid } from "./HomeGrid";
import { usePages } from "./usePages";
import { ClubRows } from "./HomeWidgets";
import { HomeSummary } from "./HomeSummary";
import { RaceLive } from "./RaceLive";
import { IpadHome, Waiting } from "./IpadHome";

// ÜÇ ANA SAYFA (Seyhun 2026-11-25): ana hesap (bu dosya, OwnerHome), normal kullanıcı (NormalHome), sporcu (SporcuHome).
// Kim neyi görür lib/hesapGorunum.js'te; görünüm useHesap'tan (ana hesap "… gibi gör" ile ötekilerine bakar).
// Üçü aynı çerçeve: HomeFrame (IpadHome: üst satır, Hava, Takvim; Seyhun 2026-11-11 "A · Zaman şeridi"), sağ sütun / telefonda alt kısım her sayfanın kendisi.

// Ortak çerçeve: hava, zil penceresi, Tümü sayfaları; children(inbox, onInbox) sağ sütunu çizer
export function HomeFrame({ children }) {
  const h = useHesap();
  const weather = useWeather();
  const inbox = useInbox();
  const setSheet = inbox.setOpen;
  const actions = usePages();
  // Gidecek sayfası olmayan bildirime dokununca (/?bildirim=1) zil penceresi açılır, bildirimin tam metni orada
  useEffect(() => {
    if (!/[?&]bildirim=1/.test(window.location.search)) return;
    setSheet(true);
    window.history.replaceState(null, "", "/");
  }, [setSheet]);
  const onInbox = () => setSheet(true);
  return (
    <>
      <IpadHome
        weather={weather}
        inbox={inbox}
        onInbox={onInbox}
        can={{ yoklama: h.athletes, yonet: h.owner || h.coach }}
        side={{ all: <HomeGrid pages={actions} />, body: children(inbox, onInbox) }}
      />
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </>
  );
}

// Ana hesap: süren yarış, Tekne ekranı (Aç · Yönet), Bekleyen, ödeme bildirimi, Velora Sailing, Kulüp listesi
export function OwnerHome() {
  const h = useHesap();
  const { plans, members, fitOthers } = useData();
  const race = useRaceHome();
  const router = useRouter();
  // Kulüp › Antrenman satırında fitness antrenmanları da: kendi planların ve sporcularınki
  const fit = useMemo(() => fitDays(plans, fitOthers || [], members, h.profile?.uid), [plans, fitOthers, members, h.profile?.uid]);
  return (
    <HomeFrame>
      {(inbox, onInbox) => (
        <>
          {h.athletes && <RaceLive open={race.open} />}
          <BilgiTile owner />
          <Waiting inbox={inbox} onAll={onInbox} />
          <PaidNotice />
          {/* Velora'nın içinde tam ekran açılır (/sailing, Seyhun 2026-11-22); tanıtım animasyonu Sailing senaryoları gibi (2026-11-23, örnek A) */}
          <IntroTile preview={<SailingPreview />} title="Velora Sailing" sub="Taktik ve kural senaryoları" onOpen={() => router.push("/sailing")} />
          <div className="iph-club empty:hidden">
            <HomeSummary title="Kulüp" money race={null} dues={!!h.athletes} invoices lead={h.athletes ? <ClubRows open={race.open} fit={fit} /> : null} />
          </div>
        </>
      )}
    </HomeFrame>
  );
}
