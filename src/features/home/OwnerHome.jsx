"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { useNow } from "@/hooks/useNow";
import { homeActions } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { initials } from "@/lib/utils/format";
import { BirthdayStrip } from "./BirthdayStrip";
import { ForYou } from "./ForYou";
import { Notifications } from "./Notifications";
import { HomeHero } from "./HomeHero";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { TodayCard } from "./TodayCard";
import { HomeActions } from "./HomeActions";
import { HomeSummary } from "./HomeSummary";
import { HomeNotes } from "./HomeNotes";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (sade): gün ve tarih, altında tek satır hava. Akış (HomeFeed): bilgiler (Senin için, doğum günü, Bugün,
// sporcu/veli: Yoklamam, Özet kartları), en altta İşlemler düğmeleri. Alttaki asistan kubbesi her sayfada aynı (TabBar); akış onun üstünde biter.
export function OwnerHome() {
  const { profile } = useAuth();
  const now = useNow();
  const weather = useWeather();
  const staff = profile?.role === "staff";
  const qa = useQuota("assistant");
  const qr = useQuota("receipt");

  const day = now.toLocaleDateString("tr-TR", { weekday: "long" });
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

  return (
    <main className="relative mx-auto max-w-[30rem] px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-start gap-3 px-1">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.625rem] font-semibold leading-tight tracking-tight">
            <span className="capitalize">{day}</span> <span className="font-normal text-mut">{date}</span>
          </h1>
          <div className="mt-1">
            <HomeHero weather={weather} />
          </div>
          {staff && qa && qr && (
            <p className="mt-0.5 text-[0.75rem] tabular-nums text-mut">
              Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
            </p>
          )}
        </div>
        <Link href="/settings" aria-label="Ayarlar" className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <PaidNotice />

      <div className="mt-5">
        <HomeFeed weather={weather} />
      </div>
    </main>
  );
}

// Ana sayfanın iki bölümü: önce bilgiler (Bildirimler › Senin için › doğum günü › Bugün › Yoklamam › Özet › Notlar), sonra İşlemler (aynı tip düğmeler).
// Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
export function HomeFeed({ weather }) {
  const { profile } = useAuth();
  const { plans, lessons, members } = useData();
  const staff = profile?.role === "staff";
  const owner = profile?.role === "owner";
  const kind = useKind();
  const side = isAthleteSide(kind);
  const athletes = canSeeAthletes(profile?.email);
  const race = useRaceHome();
  const { openMeeting } = useMeeting();
  const training = plans.some((p) => (p.cat || p.category) === "Antrenman");

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
  }).map((g) => ({ ...g, items: g.items.map((a) => (a.id === "meeting" ? { ...a, onClick: openMeeting } : a)) }));

  return (
    <div className="space-y-6">
      <div className="empty:hidden">
        <Notifications />
      </div>
      <div className="empty:hidden">
        <ForYou />
      </div>
      <div className="empty:hidden">
        <BirthdayStrip />
      </div>
      <TodayCard weather={weather} />
      {side && <MyAttendanceCard kind={kind} />}
      <HomeSummary money={canReceipts(kind)} race={race.on && race} dues={athletes && owner} posts={!staff} training={training} plans={plans} invoices={owner} />
      <HomeNotes />
      <HomeActions groups={actions} />
    </div>
  );
}
