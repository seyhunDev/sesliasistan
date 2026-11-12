"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { fitDays, homeActions } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { InboxSheet, useInbox } from "./Inbox";
import { HomeGrid } from "./HomeGrid";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { ClubRows } from "./HomeWidgets";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { RaceLive } from "./RaceLive";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { IpadHome, Waiting } from "./IpadHome";

// Ana sayfa (Seyhun 2026-11-11 "A · Zaman şeridi", 2026-11-12 iPhone'da da aynı): IpadHome (lacivert; Hava, Takvim, Bekleyen, Kulüp). Alttaki asistan kubbesi her sayfada aynı (TabBar).
export function OwnerHome() {
  const { profile } = useAuth();
  const weather = useWeather();
  const staff = profile?.role === "staff";
  const qa = useQuota("assistant");
  const qr = useQuota("receipt");
  const inbox = useInbox();
  const setSheet = inbox.setOpen;
  // Gidecek sayfası olmayan bildirime dokununca (/?bildirim=1) zil penceresi açılır, bildirimin tam metni orada
  useEffect(() => {
    if (!/[?&]bildirim=1/.test(window.location.search)) return;
    setSheet(true);
    window.history.replaceState(null, "", "/");
  }, [setSheet]);

  // Telefon ve iPad aynı ana sayfa (Seyhun 2026-11-12 "hem iPad hem iPhone'da, birleştir"): IpadHome, ekrana göre dizilişi globals.css'te
  return (
    <>
      <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} quota={staff && qa && qr ? { qa, qr } : null} />
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </>
  );
}

// Sayfa düğmeleri (homeActions, yetkiye göre) "Tümü" penceresinde (HomeGrid allOnly); sağ sütun / telefonda alt kısım: yarış, Bekleyen, Kulüp, hesaba göre kartlar.
export function HomeFeed({ weather, inbox, onInbox, quota }) {
  const { profile } = useAuth();
  const { plans, lessons, members, notes, fitOthers } = useData();
  const staff = profile?.role === "staff";
  const owner = profile?.role === "owner";
  const kind = useKind();
  const side = isAthleteSide(kind);
  const athletes = canSeeAthletes(profile?.email);
  const race = useRaceHome();
  const { openMeeting } = useMeeting();
  const training = plans.some((p) => (p.cat || p.category) === "Antrenman");
  // Antrenman kartında fitness antrenmanları da: kendi planların ve (ana hesapta) sporcularınki
  const fit = useMemo(() => (side ? [] : fitDays(plans, owner ? fitOthers || [] : [], members, profile?.uid)), [side, owner, plans, fitOthers, members, profile?.uid]);

  const actions = homeActions({
    staff,
    owner,
    side,
    parent: kind === "parent",
    athletes,
    races: race.on,
    training,
    receipts: canReceipts(kind),
    shop: listsFor(kind, members).length > 0,
    lessons: lessons.length > 0,
    fit: staff && myFit(plans, profile?.uid).length > 0,
  }).map((g) => ({ ...g, items: g.items.map((a) => (a.id === "meeting" ? { ...a, onClick: openMeeting } : a)) }));
  // Ana sayfa (Seyhun 2026-11-11 "A · Zaman şeridi", 2026-11-12 telefonda da): lacivert tek ekran, hava ve takvim ayrı panellerde; sağ sütunda yarış, Bekleyen, Kulüp
  return (
      <IpadHome
        weather={weather}
        inbox={inbox}
        onInbox={onInbox}
        side={{
          all: <HomeGrid allOnly pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />,
          body: (
            <>
              {athletes && <RaceLive open={race.open} />}
              <Waiting inbox={inbox} onAll={onInbox} />
              {quota && (
                <p className="px-1 text-[0.75rem] tabular-nums text-mut">
                  Bugün kalan · asistan {quota.qa.left}/{quota.qa.limit} · fiş {quota.qr.left}/{quota.qr.limit}
                </p>
              )}
              <PaidNotice />
              {owner && (
                <div className="iph-club empty:hidden">
                  <HomeSummary title="Kulüp" money={canReceipts(kind)} race={null} dues={!!athletes} invoices lead={athletes ? <ClubRows open={race.open} fit={fit} /> : null} />
                </div>
              )}
              {staff && <MyFitCard />}
              {side && <MyAttendanceCard kind={kind} />}
            </>
          ),
        }}
      />
    );
}
