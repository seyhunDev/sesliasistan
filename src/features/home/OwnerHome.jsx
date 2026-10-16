"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePress } from "@/hooks/usePress";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { useNow } from "@/hooks/useNow";
import { fitDays, homeActions } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { initials } from "@/lib/utils/format";
import { BirthdayStrip } from "./BirthdayStrip";
import { InboxBell, InboxSheet, useInbox } from "./Inbox";
import { SiradaCard } from "./SiradaCard";
import { BirthdayBadge, PeopleStrip } from "./PeopleStrip";
import { HomeHero } from "./HomeHero";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { HomeActions } from "./HomeActions";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (sade): gün ve tarih, altında tek satır hava; sağ üstte zil (Senin için penceresi) ve Ayarlar. Akış (HomeFeed): Sırada kartı,
// "N şey seni bekliyor" satırı (zil ile aynı pencere), doğum günü, sporcu/veli: Yoklamam, Kulüp/Özet satırları, Kısayollar. Alttaki asistan kubbesi her sayfada aynı (TabBar); akış onun üstünde biter.
export function OwnerHome() {
  const { profile } = useAuth();
  const now = useNow();
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

  // Kısa tarih: "Sal 14 Eki" (göz yormayan düzen, uzun gün/ay adı yok)
  const day = now.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }).replace(".", "");

  return (
    <main className="calm relative mx-auto max-w-[30rem] px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-start gap-3 px-1">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.5rem] font-semibold leading-tight tracking-[-.015em]">
            <span className="capitalize">{day}</span> {date}
          </h1>
          <div className="mt-0.5">
            <HomeHero weather={weather} />
          </div>
          {staff && qa && qr && (
            <p className="mt-0.5 text-[0.75rem] tabular-nums text-mut">
              Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
            </p>
          )}
        </div>
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={() => setSheet(true)} />
        <Link href="/settings" aria-label="Ayarlar" className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <PaidNotice />

      <div className="mt-5">
        <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} />
      </div>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </main>
  );
}

// Sıra: Sırada (hafta şeridi, sıradaki planlar, "seni bekliyor" şeridi) › doğum günü › Yoklamam › Kulüp/Özet (yarış, notlar, kartlar) › Kısayollar. Kartlar ortak görünümde (ui.jsx).
// Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
export function HomeFeed({ weather, inbox, onInbox }) {
  const { profile } = useAuth();
  const { plans, lessons, members, notes, fitOthers } = useData();
  const staff = profile?.role === "staff";
  const owner = profile?.role === "owner";
  const kind = useKind();
  const side = isAthleteSide(kind);
  const athletes = canSeeAthletes(profile?.email);
  const race = useRaceHome();
  const { openMeeting } = useMeeting();
  const root = useRef(null);
  usePress(root);
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

  return (
    <div ref={root} className="space-y-6">
      <PeopleStrip />
      <SiradaCard weather={weather} inbox={inbox} onInbox={onInbox} fit={fit} att={athletes} training={training || fit.length > 0 || plans.some((p) => p.date && p.status !== "cancelled")} />
      <div className="empty:hidden">
        <BirthdayStrip />
      </div>
      {side && <MyAttendanceCard kind={kind} />}
      {staff && <MyFitCard />}
      <HomeSummary title={owner && (athletes || race.on) ? "Kulüp" : "Özet"} money={canReceipts(kind)} race={race.on && race} dues={athletes && owner} posts={!staff} invoices={owner} notes={notes} />
      <HomeActions groups={actions} />
    </div>
  );
}
