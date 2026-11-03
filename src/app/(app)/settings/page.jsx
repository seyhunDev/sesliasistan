"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { BrainCard } from "@/features/brain/BrainCard";
import { useData } from "@/features/data/DataProvider";
import { Fold, NotifyMoreRow, NotifyRow, PermissionsRow, PowerRow, SizeRow, SummaryRow, ThemeRow, VoiceRow, WeatherPlaceRow, PasswordRow, useNotifications, RacesRow, RaceLiveRow, LedgerRow } from "@/features/settings/Groups";
import { Group, Row } from "@/features/settings/ui";
import { BackupRow } from "@/features/settings/Backup";
import { DeviceDataRow } from "@/features/settings/DeviceData";
import { MailFilesRow, MoveAllRow } from "@/features/settings/MoveAll";
import { UsageRow } from "@/features/settings/Usage";
import { CallsRow } from "@/features/settings/Calls";
import { CalendarFeedRow } from "@/features/settings/CalendarFeed";
import { PastChatsRow } from "@/features/settings/PastChats";
import { EnergyRow } from "@/features/settings/Energy";
import { buildLine } from "@/lib/buildInfo";
import { logout } from "@/lib/auth";
import { FaceIdRow } from "@/features/ios/AppLock";
import { KIND_LABEL, kindOf } from "@/lib/kinds";
import { ProfilePhoto } from "@/features/people/ProfilePhoto";

// Lacivert üst: geri, Ayarlar, altında ad · hesap türü, sağda fotoğraf (yeni tasarım, 2026-11-03)
function Top({ profile, label }) {
  return (
    <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Ayarlar">
      <header className="flex items-center gap-2.5">
        <BackButton href="/" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Ayarlar</h1>
          <p className="truncate text-[0.8125rem] text-white/65">{[profile.name, label].filter(Boolean).join(" · ")}</p>
        </div>
        <ProfilePhoto orgId={profile.orgId} uid={profile.uid} name={profile.name} photo={profile.photo} photoPath={profile.photoPath} size="size-10" text="text-[0.9375rem]" tone="bg-acc text-white" />
      </header>
    </section>
  );
}

// Açık alan ve bölüm: başlık listenin dışında (ListHead), satırlar ince çizgili beyaz kartta (yeni tasarım, 2026-11-03)
function Body({ children }) {
  return <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">{children}</div>;
}
function Sec({ title, children }) {
  return (
    <section>
      {title && <ListHead title={title} />}
      <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>
    </section>
  );
}

// Sürüm: satırda tarih ve PR, dokununca değişikliğin kendisi
function VersionRow() {
  const [date, pr, ...rest] = buildLine().split(" · ");
  const short = pr?.startsWith("#") ? `${date} · ${pr}` : date;
  const more = (pr?.startsWith("#") ? rest : [pr, ...rest]).filter(Boolean).join(" · ");
  if (!more) return <Row title="Sürüm" sub={short} />;
  return (
    <Fold title="Sürüm" sub={short}>
      <p className="px-4 pb-3.5 text-[0.875rem] leading-snug text-mut">{more}</p>
    </Fold>
  );
}

// Ana hesap dışındaki kişiler (çalışan, aile, sporcu…): yalnız kişinin kendisine gereken ayarlar (Seyhun, 2026-10-19).
// Sporcu ve öğrencide asistan yok: sesli yanıt ve günlük özetler de yok.
function PersonSettings({ profile, n }) {
  const kind = kindOf(profile);
  const ai = kind !== "athlete" && kind !== "student";
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <Top profile={profile} label={KIND_LABEL[kind] || "Kişi"} />
      <Body>
        <Sec title="Ayarlar">
          <SizeRow />
          <ThemeRow />
          <NotifyRow n={n} />
          <NotifyMoreRow n={n} />
          {ai && <SummaryRow />}
          {ai && <VoiceRow />}
          <WeatherPlaceRow />
        </Sec>
        <Sec title="Hesap">
          <PasswordRow />
          <FaceIdRow />
          <VersionRow />
          <Row title="Çıkış yap" danger onClick={() => logout()} />
        </Sec>
      </Body>
    </main>
  );
}

// Arşivlenenler: seyrek ya da bir kez kullanılan ayarlar silinmedi, alttan açılan pencerede durur (Seyhun, 2026-10-22).
// Seyhun gerekirse tek tek kaldıracak.
function SheetRow({ title, sub, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row title={title} sub={sub} onClick={() => setOpen(true)} chevron />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="-mt-5 pb-2">{children}</div>
      </Sheet>
    </>
  );
}

// Ayarlar (ana hesap): Genel, Bildirimler, Ses ve asistan, Veri ve cihaz, Testler, Hesap; en altta Arşivlenenler (Seyhun, 2026-10-22)
export default function SettingsPage() {
  const { profile } = useAuth();
  const { members } = useData();
  const n = useNotifications();
  if (!profile) return null;
  if (profile.role !== "owner") return <PersonSettings profile={profile} n={n} />;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <Top profile={profile} label="Ana hesap" />
      <Body>
        <Sec title="Genel">
          <SizeRow />
          <ThemeRow />
          <WeatherPlaceRow />
          <RacesRow />
          <RaceLiveRow />
          <Row title="Yayın" href="/settings/yayin" />
        </Sec>

        <Sec title="Bildirimler">
          <NotifyRow n={n} />
          <NotifyMoreRow n={n} />
          <SummaryRow />
        </Sec>

        <Sec title="Ses ve asistan">
          <VoiceRow />
          <PowerRow />
          <PastChatsRow />
          <PermissionsRow />
        </Sec>

        <Sec title="Veri ve cihaz">
          <EnergyRow />
          <UsageRow />
          <DeviceDataRow />
          <BackupRow />
          <Row title="Gmail ve banka mailleri" href="/mail/setup" />
          <CalendarFeedRow />
        </Sec>

        <Sec>
          <Row title="Testler" href="/settings/tests" />
        </Sec>

        <Sec title="Hesap">
          <PasswordRow />
          <FaceIdRow />
          <VersionRow />
          <Row title="Çıkış yap" danger onClick={() => logout()} />
        </Sec>

        <Sec>
          <SheetRow title="Arşivlenenler" sub="6">
            <Group>
              <LedgerRow />
              <Fold title="Öğrenme" sub={profile.brainOff ? "Kapalı" : "Açık"}>
                <BrainCard bare owner />
              </Fold>
              <CallsRow />
              <MoveAllRow />
              <MailFilesRow />
              <Row title="Kişiler" sub={members.length ? `${members.length} kişi` : ""} href="/staff" />
            </Group>
          </SheetRow>
        </Sec>
      </Body>
    </main>
  );
}
