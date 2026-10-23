"use client";

import { useEffect, useMemo } from "react";
import { HomeDays } from "./HomeDays";
import { todayStr } from "@/lib/utils/format";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { useNow } from "@/hooks/useNow";
import { fitDays, homeActions, nextPlan } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { BirthdayStrip } from "./BirthdayStrip";
import { InboxSheet, useInbox } from "./Inbox";
import { SiradaCard } from "./SiradaCard";
import { Cockpit } from "./Cockpit";
import { FoodCard } from "./FoodCard";
import { HomeGrid } from "./HomeGrid";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { AthletesWidget, ClubRows, FitWidget, NotesWidget } from "./HomeWidgets";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (Seyhun 2026-10-21 "C · Lacivert kokpit", ilk ekran "A · tam lacivert"): ilk ekran tam bir sayfa lacivert kokpit (Cockpit: tarih, zil, Ayarlar,
// hava, rüzgâr grafiği, sıradaki iş, iş düğmeleri, büyük günler), altında açık zeminde akış (HomeFeed): Notlar, Sporcular, Fitness, takvim, doğum günü, Kulüp/Özet. Alttaki asistan kubbesi her sayfada aynı (TabBar).
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

  return (
    <main className="calm grouped relative mx-auto max-w-[30rem] px-4">
      <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} quota={staff && qa && qr ? { qa, qr } : null} />
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </main>
  );
}

// Sıra: kokpit (iş düğmeleri, büyük günler) › Notlar › Sırada (saat çizgisi, Yarın, Sırada, "seni bekleyenler") › Sporcular › Fitness › doğum günü › Yoklamam › Kulüp/Özet canlı alanları (Seyhun 2026-10-17:
// "kısa yolları canlı alanlara çevirelim": Sporcular, Fitness, yarış, aidat, fiş, hesap, Notlar, Mesajlar, Toplantı, Instagram; HomeSummary + HomeWidgets) › bütün sayfalar iş düğmelerindeki "Tümü" penceresinde (HomeGrid).
// Kişi şeridi kaldırıldı (sporcular kendi alanında, Kişiler alttaki düğmelerde).
// Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
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
  const now = useNow();
  const next = nextPlan(plans, now);
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
    <>
      {/* Lacivert kokpit (Seyhun 2026-10-21; boşluksuz, sıkı): iş düğmeleri (en sık işler adıyla, sonunda Tümü) ve büyük günler (güne dokununca o günün penceresi) */}
      <Cockpit weather={weather} inbox={inbox} onInbox={onInbox}>
        <div className="mt-4">
          <HomeGrid pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />
        </div>
        <div className="mt-3">
          <HomeDays today={todayStr()} fit={fit} att={athletes} />
        </div>
        {owner && (
          <div className="mt-3">
            <FoodCard />
          </div>
        )}
      </Cockpit>
      {/* Alt kısım da lacivert (Seyhun 2026-10-22: "yukarısı daha güzel, bu tasarımı devam ettirelim"): kartlar kokpitteki gibi
          yarı saydam lacivert, yazılar açık; renkler globals.css .navy değişkenlerinden (koyu görünüm sınıfları da çalışır) */}
      <div data-theme="dark" className="navy home-navy relative -mx-4 space-y-6 px-4 pb-6 pt-2">
        {quota && (
          <p className="-mb-4 px-1 text-[0.75rem] tabular-nums text-mut">
            Bugün kalan · asistan {quota.qa.left}/{quota.qa.limit} · fiş {quota.qr.left}/{quota.qr.limit}
          </p>
        )}
        <PaidNotice />
        {/* Notlar takvimin üstünde (Seyhun 2026-10-20: "notlar çok aşağıda kalıyor"); Sporcular ve Fitness takvimin altında, Kulüp'ten önce (2026-10-21) */}
        <NotesWidget notes={notes} />
        <SiradaCard skip={next?.id} weather={weather} inbox={inbox} onInbox={onInbox} att={athletes} />
        {athletes && owner && <AthletesWidget races={race.open} />}
        {!side && <FitWidget fit={fit} />}
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
          lead={athletes && owner ? <ClubRows open={race.open} fit={fit} /> : null}
        />
      </div>
    </>
  );
}
