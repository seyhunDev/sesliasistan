"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useEffect, useMemo, useState } from "react";
import { HomeDays } from "./HomeDays";
import { todayStr } from "@/lib/utils/format";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { fitDays, homeActions } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { BirthdayStrip } from "./BirthdayStrip";
import { InboxSheet, useInbox } from "./Inbox";
import { WaitRow } from "./WaitRow";
import { Cockpit } from "./Cockpit";
import { ShopCards } from "./ShopCards";
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
import { RaceLive } from "./RaceLive";
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

// Sıra: kokpit (iş düğmeleri, büyük günler) › Notlar › Sırada (saat çizgisi, Yarın, Sırada, "seni bekleyenler") › Sporcular › Fitness › doğum günü › sporcunun antrenmanı › Yoklamam › Kulüp/Özet canlı alanları (Seyhun 2026-10-17:
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
  // Seçilen gün (Seyhun 2026-10-23 "günler en üstte"): kokpitteki hava, grafik ve planlar bu güne göre; pick: penceresi açık gün
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const [pick, setPick] = useState(null);


  return (
    <>
      {/* Lacivert kokpit (Seyhun 2026-10-21; boşluksuz, sıkı): en üstte büyük günler (seçilen güne göre hava ve planlar), altta iş düğmeleri (en sık işler adıyla, sonunda Tümü) */}
      <Cockpit
        weather={weather}
        inbox={inbox}
        onInbox={onInbox}
        sel={sel}
        onOpenDay={() => setPick(sel)}
        live={athletes ? <RaceLive open={race.open} /> : null}
        days={<HomeDays today={today} fit={fit} att={athletes} sel={sel} onSel={setSel} pick={pick} onPick={setPick} />}
      >
        <div className="mt-4">
          <HomeGrid pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />
        </div>
        {/* Kulüp (Seyhun "A · Kutular" 2026-10-24): iş düğmelerinin altında, yemek kartının üstünde ikili kutular */}
        {owner && (
          <div className="mt-5 empty:hidden">
            <HomeSummary
              tiles
              title={athletes || race.on ? "Kulüp" : "Özet"}
              money={canReceipts(kind)}
              race={null}
              dues={!!athletes}
              invoices
              lead={athletes ? <ClubRows open={race.open} fit={fit} /> : null}
            />
          </div>
        )}
        {/* Yemek · Market · Giyim yan yana (Seyhun 2026-10-25); açık sipariş kartları üstünde */}
        {owner && (
          <div className="mt-5">
            <ShopCards />
          </div>
        )}
        {/* Deniz trafiği ve Kameralar: yalnız sayfasına giden iki sade düğme, veri çekmez (Seyhun 2026-10-23) */}
        {!side && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[["/sea", "anchor", "Deniz trafiği"], ["/cams", "video", "Kameralar"]].map(([href, icon, label]) => (
              <Link key={href} href={href} data-press className="food-card flex h-14 min-w-0 items-center gap-2.5 rounded-[1.125rem] px-4">
                <Icon name={icon} className="size-5 shrink-0 text-[#22d3ee]" />
                <span className="truncate text-[0.9375rem] font-semibold">{label}</span>
              </Link>
            ))}
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
        {/* Takvim listesi yok (Seyhun 2026-10-23 "A"): bir günün planları kokpitteki gün kutusuna dokununca açılır. Notlar kayan kartlar,
            altında Seni bekleyenler; sonra Sporcular, Fitness, Kulüp */}
        <div>
          <NotesWidget notes={notes} />
          <WaitRow inbox={inbox} onAll={onInbox} />
        </div>
        {athletes && owner && <AthletesWidget races={race.open} />}
        {!side && <FitWidget fit={fit} />}
        <div className="empty:hidden">
          <BirthdayStrip />
        </div>
        {staff && <MyFitCard />}
        {side && <MyAttendanceCard kind={kind} />}
        {/* Ana hesapta Kulüp yukarıda (kutular); burada yalnız Instagram. Diğer hesaplarda Özet listesi burada */}
        {owner ? (
          <HomeSummary posts={!staff} />
        ) : (
          <HomeSummary
            title="Özet"
            money={canReceipts(kind)}
            race={null /* Sıradaki yarış kartı yok (Seyhun 2026-10-20: "artık ona ihtiyaç yok"; yarışlar listede, Yarışlar düğmesi altta) */}
            posts={!staff}
          />
        )}
      </div>
    </>
  );
}
