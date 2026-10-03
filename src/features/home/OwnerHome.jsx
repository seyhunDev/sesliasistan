"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { useNow } from "@/hooks/useNow";
import { pendingPlans } from "@/lib/agenda";
import { useQuota } from "@/lib/quota";
import { initials } from "@/lib/utils/format";
import { BirthdayStrip } from "./BirthdayStrip";
import { ForYou } from "./ForYou";
import { HomeHero } from "./HomeHero";
import { MoneyRow } from "./TeamMoney";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { TodayCard } from "./TodayCard";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { StageBrief } from "./StageBrief";
import { useRaceHome } from "@/features/athletes/raceHome";
import { ClubTiles } from "./ClubTiles";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (sade): gün ve tarih, altında tek satır hava · kişi. Akış: Sıradaki › Senin için › Bugün › (sporcu/veli: yoklama) ›
// doğum günü › para › büyük kartlar (Aidatlar, Yarışlar, Instagram, Antrenman; ClubTiles) › diğer sayfalar. Alttaki asistan kubbesi her sayfada aynı (TabBar); akış onun üstünde biter.
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

// Sayfa düğmelerine dokunma sayıları (bu cihaz, sa-home-links). Sıra sayfa açılışında hesaplanır, dokununca hemen kaymaz.
const USE_KEY = "sa-home-links";
function readUse() {
  try {
    return JSON.parse(localStorage.getItem(USE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function saveUse(href) {
  const u = readUse();
  u[href] = (u[href] || 0) + 1;
  try {
    localStorage.setItem(USE_KEY, JSON.stringify(u));
  } catch {}
}

// Günün akışı. Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
export function HomeFeed({ weather }) {
  const { profile } = useAuth();
  const { plans, tasks, notes, birthdays, lessons, myUid, members } = useData();
  const now = useNow();
  const staff = profile?.role === "staff";
  const kind = useKind();
  const athletes = canSeeAthletes(profile?.email);
  const race = useRaceHome();
  const [used] = useState(readUse);
  const { openMeeting } = useMeeting();

  const links = [
    ["/plans", "cal", "Planlar", pendingPlans(plans, now)],
    !staff && ["/events", "tent", "Etkinlikler"],
    ["/notes", "note", "Notlar", notes.length],
    !staff && ["/people/staff", "users", "Kişiler"],
    athletes && ["/athletes", "anchor", "Sporcular"],
    ["/birthdays", "cake", "Doğum günleri", birthdays.length],
    listsFor(kind, members).length > 0 && ["/shopping", "cart", "Alışveriş"],
    lessons.length > 0 && ["/schedule", "book", "Dersler"],
    !staff && ["/mail", "mail", "Mailler"],
    isAthleteSide(kind) && ["/my-attendance", "check", kind === "parent" ? "Yoklama" : "Yoklamam"],
    ["/archive", "archive", "Arşiv"],
  ].filter(Boolean);
  // Sık açılan sayfa öne gelir (bu cihazdaki dokunma sayısı; eşitse yukarıdaki sıra)
  const order = links.map((l, i) => [l, i]).sort((a, b) => (used[b[0][0]] || 0) - (used[a[0][0]] || 0) || a[1] - b[1]).map(([l]) => l);

  return (
    <div className="space-y-5">
      <StageBrief />
      <div className="empty:hidden">
        <ForYou />
      </div>
      <TodayCard weather={weather} />
      {isAthleteSide(kind) && <MyAttendanceCard kind={kind} />}
      <div className="-mt-2 empty:hidden">
        <BirthdayStrip />
      </div>
      {canReceipts(kind) && <MoneyRow />}
      <ClubTiles
        race={race.on && race}
        dues={athletes && profile?.role === "owner"}
        posts={!staff}
        training={plans.some((p) => (p.cat || p.category) === "Antrenman")}
        plans={plans}
        onOpen={saveUse}
      />
      {!isAthleteSide(kind) && (
        <button onClick={openMeeting} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line active:scale-[.98]">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc text-white">
            <Icon name="mic" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-semibold">Toplantı modu</b>
            <small className="block truncate text-[0.8125rem] text-mut">Dinlerim; görevleri, mesajları ve özeti çıkarırım</small>
          </span>
          <Icon name="chev" className="size-4 shrink-0 text-mut" />
        </button>
      )}
      <nav aria-label="Diğer sayfalar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {order.map(([href, icon, label, n]) => (
          <Link key={href} href={href} onClick={() => saveUse(href)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[0.8125rem] font-semibold ring-1 ring-line active:scale-95">
            <Icon name={icon} className="size-4 text-acc" />
            {label}
            {n > 0 && <span className="tabular-nums text-mut">{n}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
