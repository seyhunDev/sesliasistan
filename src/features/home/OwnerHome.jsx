"use client";

import { useEffect, useMemo, useState } from "react";
import { todayStr } from "@/lib/utils/format";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { fitDays, homeActions } from "@/lib/homeTiles";
import { useQuota } from "@/lib/quota";
import { InboxSheet, useInbox } from "./Inbox";
import { Cockpit } from "./Cockpit";
import { HomeGrid } from "./HomeGrid";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { ClubRows, NotesWidget } from "./HomeWidgets";
import { HomeSummary } from "./HomeSummary";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { MyFitCard } from "./MyFitCard";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { RaceLive } from "./RaceLive";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useWide } from "@/hooks/useWide";
import { IpadHome, Waiting } from "./IpadHome";

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

  const wide = useWide();
  const feed = <HomeFeed wide={wide} weather={weather} inbox={inbox} onInbox={() => setSheet(true)} quota={staff && qa && qr ? { qa, qr } : null} />;
  if (wide)
    return (
      <>
        {feed}
        <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
      </>
    );
  return (
    <main className="calm grouped relative mx-auto max-w-[30rem] px-4">
      {feed}
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </main>
  );
}

// Sıra: kokpit (iş düğmeleri, büyük günler) › Notlar › Sırada (saat çizgisi, Yarın, Sırada, "seni bekleyenler") › Sporcular › Fitness › doğum günü › sporcunun antrenmanı › Yoklamam › Kulüp/Özet canlı alanları (Seyhun 2026-10-17:
// "kısa yolları canlı alanlara çevirelim": Sporcular, Fitness, yarış, aidat, fiş, hesap, Notlar, Mesajlar, Toplantı, Instagram; HomeSummary + HomeWidgets) › bütün sayfalar iş düğmelerindeki "Tümü" penceresinde (HomeGrid).
// Kişi şeridi kaldırıldı (sporcular kendi alanında, Kişiler alttaki düğmelerde).
// Her bölüm yalnız içeriği varsa çizilir; yazı az, her satır tek iş.
export function HomeFeed({ weather, inbox, onInbox, quota, wide = false }) {
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


  // iPad / geniş ekran (Seyhun 2026-11-11 "A · Zaman şeridi"): lacivert tek ekran, hava ve takvim ayrı panellerde; sağ sütunda yarış, Bekleyen, Kulüp
  if (wide)
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

  const lowBlock = (
    <div className={wide ? "home-low relative space-y-4" : "home-low relative space-y-6 pb-6 pt-5"}>
      {quota && (
        <p className="px-1 text-[0.75rem] tabular-nums text-mut">
          Bugün kalan · asistan {quota.qa.left}/{quota.qa.limit} · fiş {quota.qr.left}/{quota.qr.limit}
        </p>
      )}
      <PaidNotice />
      {/* Yalnız notlar (Seyhun 2026-11-03 "A · İyice sade"); Sporcular, Fitness, doğum günü, İngilizce, Görevler, Medya, Özet kartları kalktı
          (sayfaları "Tümü" içinde). Çalışanın ve sporcunun kendi antrenman/yoklama kartı kalır. Geniş ekranda sağ sütunun altında */}
      <NotesWidget notes={notes} />
      {staff && <MyFitCard />}
      {side && <MyAttendanceCard kind={kind} />}
    </div>
  );

  return (
    <>
      {/* Lacivert kokpit (Seyhun 2026-10-21; boşluksuz, sıkı): en üstte büyük günler (seçilen güne göre hava ve planlar), altta iş düğmeleri (en sık işler adıyla, sonunda Tümü) */}
      <Cockpit
        weather={weather}
        inbox={inbox}
        onInbox={onInbox}
        sel={sel}
        onSel={setSel}
        wide={wide}
        live={athletes ? <RaceLive open={race.open} /> : null}
        grid={<HomeGrid pages={actions} side={side} athletes={!!athletes} receipts={canReceipts(kind)} owner={owner} />}
      >
        {/* Kulüp kutuları kalır (Seyhun 2026-11-03: "ana sayfadaki kulüp kutuları kalsın"); Yemek · Market · Giyim, Deniz trafiği · Kameralar yok, "Tümü" içinde */}
        {owner && (
          <div className="ck-d mt-5 empty:hidden">
            <HomeSummary
              title={athletes || race.on ? "Kulüp" : "Özet"}
              money={canReceipts(kind)}
              race={null}
              dues={!!athletes}
              invoices
              lead={athletes ? <ClubRows open={race.open} fit={fit} /> : null}
            />
          </div>
        )}
        {wide && lowBlock}
      </Cockpit>
      {/* Alt kısım da lacivert (Seyhun 2026-10-22: "yukarısı daha güzel, bu tasarımı devam ettirelim"): kartlar kokpitteki gibi
          yarı saydam lacivert, yazılar açık; renkler globals.css .navy değişkenlerinden (koyu görünüm sınıfları da çalışır) */}
      {!wide && lowBlock}
    </>
  );
}
