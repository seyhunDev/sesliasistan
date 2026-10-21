"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { HomeGrid } from "./HomeGrid";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { AthletesWidget, FitWidget, NotesWidget } from "./HomeWidgets";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";

// Ana sayfa (Seyhun 2026-10-21 "C · Lacivert kokpit"): üstte lacivert kokpit (Cockpit: tarih, zil, Ayarlar, hava, rüzgâr grafiği, sıradaki iş),
// altında açık zeminde akış (HomeFeed): iş düğmeleri, Notlar, Sporcular, Fitness, takvim, doğum günü, Kulüp/Özet. Alttaki asistan kubbesi her sayfada aynı (TabBar).
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

  // ÖRNEK (2026-10-21): ?ilk=a tam ekran lacivert, ?ilk=b lacivert + açık; ilk ekran tam sayfa, altında büyük gün şeridi
  const [ilk] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("ilk") || ""));
  useEffect(() => {
    if (ilk !== "a") return;
    const on = () => (window.scrollY < window.innerHeight * 0.6 ? (document.body.dataset.ckTop = "1") : delete document.body.dataset.ckTop);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => (window.removeEventListener("scroll", on), delete document.body.dataset.ckTop);
  }, [ilk]);
  const pick = () => document.getElementById("takvim")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const days = <HomeDays today={todayStr()} dark={ilk === "a"} onPick={pick} />;

  if (ilk) {
    return (
      <main className="calm grouped relative mx-auto max-w-[30rem] px-4">
        {ilk === "a" ? (
          <Cockpit weather={weather} inbox={inbox} onInbox={() => setSheet(true)} fill>
            <div id="ilk-slot" className="mt-auto pt-4" />
            <div className="mt-auto pt-4">{days}</div>
          </Cockpit>
        ) : (
          <div className="flex min-h-[calc(100svh-var(--stage-h,5rem))] flex-col">
            <Cockpit weather={weather} inbox={inbox} onInbox={() => setSheet(true)} />
            <div className="relative -mx-4 -mt-6 flex flex-1 flex-col rounded-t-[1.75rem] bg-bg px-4 pt-4">
              <div id="ilk-slot" className="my-auto" />
              <div className="py-3">{days}</div>
            </div>
          </div>
        )}
        <div className={`relative -mx-4 bg-bg px-4 ${ilk === "a" ? "rounded-t-[1.75rem] pt-5" : "pt-2"}`}>
          <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} slot />
        </div>
        <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
      </main>
    );
  }

  return (
    <main className="calm grouped relative mx-auto max-w-[30rem] px-4">
      {/* Lacivert üst kısım (kokpit): tarih, zil, Ayarlar, bugünün havası, rüzgâr grafiği, sıradaki iş (Seyhun 2026-10-21 "C · Lacivert kokpit") */}
      <Cockpit weather={weather} inbox={inbox} onInbox={() => setSheet(true)} />
      {/* Açık zemin lacivertin üstüne yuvarlak köşeyle biner */}
      <div className="relative -mx-4 -mt-6 rounded-t-[1.75rem] bg-bg px-4 pt-4">
        {staff && qa && qr && (
          <p className="mb-2 px-1 text-[0.75rem] tabular-nums text-mut">
            Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
          </p>
        )}
        <PaidNotice />
        <HomeFeed weather={weather} inbox={inbox} onInbox={() => setSheet(true)} />
      </div>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </main>
  );
}

// Sıra: iş düğmeleri › Notlar › Sırada (gün şeridi, saat çizgisi, Yarın, Sırada, "seni bekleyenler") › Sporcular › Fitness › doğum günü › Yoklamam › Kulüp/Özet canlı alanları (Seyhun 2026-10-17:
// "kısa yolları canlı alanlara çevirelim": Sporcular, Fitness, yarış, aidat, fiş, hesap, Notlar, Mesajlar, Toplantı, Instagram; HomeSummary + HomeWidgets) › bütün sayfalar iş düğmelerindeki "Tümü" penceresinde (HomeGrid).
// Kişi şeridi kaldırıldı (sporcular kendi alanında, Kişiler alttaki düğmelerde).
// Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
export function HomeFeed({ weather, inbox, onInbox, slot }) {
  const [slotEl, setSlotEl] = useState(null);
  useEffect(() => {
    if (slot) setSlotEl(document.getElementById("ilk-slot"));
  }, [slot]);
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
    <div className="space-y-6">
      {/* İş düğmeleri: en sık işler adıyla, sonunda Tümü (bütün sayfalar) */}
      {slot ? slotEl && createPortal(<HomeGrid pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />, slotEl) : <HomeGrid pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />}
      {/* Notlar takvimin üstünde (Seyhun 2026-10-20: "notlar çok aşağıda kalıyor"); Sporcular ve Fitness takvimin altında, Kulüp'ten önce (2026-10-21) */}
      <NotesWidget notes={notes} />
      <SiradaCard noWeek={slot} skip={next?.id} weather={weather} inbox={inbox} onInbox={onInbox} fit={fit} att={athletes} training={training || fit.length > 0 || plans.some((p) => p.date && p.status !== "cancelled")} />
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
      />
    </div>
  );
}
