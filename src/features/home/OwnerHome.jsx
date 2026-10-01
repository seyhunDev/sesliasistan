"use client";

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
import { MoneyRow, TeamStrip } from "./TeamMoney";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { TodayCard } from "./TodayCard";
import { StageBrief } from "./StageBrief";
import { AssistantBrief } from "./AssistantBrief";

// Ana sayfa (tek kaydırma, açık zemin), yukarıdan aşağı:
//   gün ve tarih · kişi › asistan özeti (selam, tek cümle, öneriler) › hava durumu › günün akışı (HomeFeed).
// Alttaki asistan sahnesi burada ince çubuk olarak başlar. Çalışanda bugünkü kalan hak başlığın altında.
export function OwnerHome() {
  const { profile } = useAuth();
  const weather = useWeather();
  const now = useNow();
  const staff = profile?.role === "staff";
  const qa = useQuota("assistant");
  const qr = useQuota("receipt");

  const day = now.toLocaleDateString("tr-TR", { weekday: "long" });
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

  return (
    <main className="relative mx-auto max-w-[30rem] px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium text-mut">
            <span className="capitalize">{day}</span> · {date}
          </p>
          {staff && qa && qr && (
            <p className="mt-0.5 text-[0.75rem] tabular-nums text-mut">
              Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
            </p>
          )}
        </div>
        <Link href="/settings" aria-label="Ayarlar" className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <PaidNotice />

      <div className="mt-4">
        <AssistantBrief />
      </div>

      <div className="mt-6">
        <HomeHero weather={weather} next={false} />
      </div>

      <div className="mt-6">
        <HomeFeed />
      </div>
    </main>
  );
}

// Günün akışı, yukarıdan aşağı:
//   Sıradaki plan › Senin için (karar, mesaj, geciken, yeni, ödeme) › Bugün › doğum günü › Kişiler (ana hesap) › para › sayfalar.
// Çalışanda Karar, Kişiler ve Mailler yok.
export function HomeFeed() {
  const { profile } = useAuth();
  const { plans, tasks, notes, birthdays, lessons, myUid, members } = useData();
  const now = useNow();
  const staff = profile?.role === "staff";
  const kind = useKind();
  const open = tasks.filter((t) => !t.done && !t.doneBy?.[myUid]).length;

  const links = [
    ["/plans", "cal", "Planlar", pendingPlans(plans, now)],
    ["/tasks", "task", "Görevler", open],
    ["/notes", "note", "Notlar", notes.length],
    ["/birthdays", "cake", "Doğum günleri", birthdays.length],
    listsFor(kind, members).length > 0 && ["/shopping", "cart", "Alışveriş"],
    lessons.length > 0 && ["/schedule", "book", "Dersler"],
    ["/archive", "archive", "Arşiv"],
    !staff && ["/mail", "mail", "Mailler"],
    staff && canSeeAthletes(profile?.email) && ["/athletes", "anchor", "Sporcular"], // ana hesapta Kişiler kartında
    isAthleteSide(kind) && ["/my-attendance", "check", kind === "parent" ? "Yoklama" : "Yoklamam"],
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <StageBrief />
      <div className="empty:hidden">
        <ForYou />
      </div>
      <TodayCard />
      <div className="-mt-2 empty:hidden">
        <BirthdayStrip />
      </div>
      {!staff && <TeamStrip />}
      {canReceipts(kind) && <MoneyRow />}
      <nav aria-label="Sayfalar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {links.map(([href, icon, label, n]) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[0.8125rem] font-semibold ring-1 ring-line active:scale-95">
            <Icon name={icon} className="size-4 text-acc" />
            {label}
            {n > 0 && <span className="tabular-nums text-mut">{n}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
