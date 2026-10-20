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
import { initials, todayStr } from "@/lib/utils/format";
import { BirthdayStrip } from "./BirthdayStrip";
import { InboxBell, InboxSheet, useInbox } from "./Inbox";
import { SiradaCard } from "./SiradaCard";
import { BirthdayBadge } from "./PeopleStrip";
import { HomeHero, HomeWind } from "./HomeHero";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { AthletesWidget, FitWidget, NotesWidget, TalkWidgets } from "./HomeWidgets";
import { GROUP } from "./ui";
import { AppLogo } from "@/components/ui/AppLogo";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (gruplu, iPhone ayarlar düzeni; Seyhun 2026-10-17 "2'deki gibi"): üstte "Cmt 17 Ekim", sağda zil (Senin için penceresi) ve Ayarlar; altında hava kartı (hava satırı + rüzgâr grafiği). Akış (HomeFeed): Sırada kartı,
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

  // Tarih başlığı: "Cmt 17 Ekim" (kısa gün, uzun ay; büyük "Bugün" başlığı yok)
  const day = now.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

  return (
    <main className="calm grouped relative mx-auto max-w-[30rem] px-4 pt-[calc(0.875rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-3 px-1">
        {/* Velora logosu tarihin solunda, aynı satırda (yer kaplamaz); geniş ekranda sol menüde olduğu için gizli */}
        <AppLogo size={28} className="-mr-1 flex shrink-0 lg:hidden" />
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold leading-tight tracking-[-.02em]">
          <span className="capitalize">{day}</span> {date}
        </h1>
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={() => setSheet(true)} />
        <Link href="/settings" aria-label="Ayarlar" className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-[0.8125rem] font-semibold text-acc active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>
      {staff && qa && qr && (
        <p className="mt-0.5 px-1 text-[0.75rem] tabular-nums text-mut">
          Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
        </p>
      )}

      {/* Hava kartı: üstte simge, sıcaklık, durum; altında bugünün rüzgâr grafiği (ikisi de hava penceresini açar) */}
      <div className={`mt-2.5 px-3.5 pb-2.5 pt-3 ${GROUP}`}>
        <HomeHero weather={weather} />
        <HomeWind weather={weather} />
      </div>
      <PaidNotice />

      <div className="mt-2.5">
        <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} />
      </div>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </main>
  );
}

// Sıra: Notlar › Sporcular › Fitness › Sırada (gün şeridi, saat çizgisi, Yarın, Sırada, "seni bekleyenler") › doğum günü › Yoklamam › Kulüp/Özet canlı alanları (Seyhun 2026-10-17:
// "kısa yolları canlı alanlara çevirelim": Sporcular, Fitness, yarış, aidat, fiş, hesap, Notlar, Mesajlar, Toplantı, Instagram; HomeSummary + HomeWidgets) › kalan sayfalar küçük düğmeler (PageChips).
// Kişi şeridi kaldırıldı (sporcular kendi alanında, Kişiler alttaki düğmelerde).
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
      {/* Notlar, Sporcular ve Fitness (ayrı kartlar) takvimin üstünde (Seyhun 2026-10-20: "notlar çok aşağıda kalıyor"; "sporcular ayrı, fitness ayrı") */}
      <div className="space-y-2.5">
        <NotesWidget notes={notes} />
        {athletes && owner && <AthletesWidget att={athletes} races={race.open} />}
        {!side && <FitWidget fit={fit} />}
      </div>
      <SiradaCard weather={weather} inbox={inbox} onInbox={onInbox} fit={fit} att={athletes} training={training || fit.length > 0 || plans.some((p) => p.date && p.status !== "cancelled")} />
      <div className="empty:hidden">
        <BirthdayStrip />
      </div>
      {side && <MyAttendanceCard kind={kind} />}
      {staff && <MyFitCard />}
      <HomeSummary
        title={owner && (athletes || race.on) ? "Kulüp" : "Özet"}
        money={canReceipts(kind)}
        race={null /* Sıradaki yarış kartı yok (Seyhun 2026-10-20: "artık ona ihtiyaç yok"; yarışlar listede, Yarışlar düğmesi altta) */}
        dues={athletes && owner}
        posts={!staff}
        invoices={owner}
        tail={<TalkWidgets meeting={!side} />}
        pages={actions}
        hide={["/notes", ...(!side ? ["meeting"] : []), ...(athletes && owner ? ["/athletes", "/athletes/attendance"] : []), ...(!side && fit.some((f) => f.date >= todayStr()) ? ["/fitness"] : [])]}
      />
    </div>
  );
}
