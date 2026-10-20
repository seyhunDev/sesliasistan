"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { BrainCard } from "@/features/brain/BrainCard";
import { useData } from "@/features/data/DataProvider";
import { Fold, IntroRow, NotifyMoreRow, NotifyRow, PermissionsRow, PowerRow, SizeRow, SummaryRow, TestPushRow, ThemeRow, VoiceRow, WeatherPlaceRow, DemoDataRow, PasswordRow, useNotifications, RacesRow, LedgerRow } from "@/features/settings/Groups";
import { Group, Row } from "@/features/settings/ui";
import { BackupRow } from "@/features/settings/Backup";
import { DeviceDataRow } from "@/features/settings/DeviceData";
import { MailFilesRow, MoveAllRow } from "@/features/settings/MoveAll";
import { UsageRow } from "@/features/settings/Usage";
import { CallsRow } from "@/features/settings/Calls";
import { CalendarFeedRow } from "@/features/settings/CalendarFeed";
import { ProbeRow, TimingRow } from "@/features/settings/Timing";
import { buildLine } from "@/lib/buildInfo";
import { logout } from "@/lib/auth";
import { KIND_LABEL, kindOf } from "@/lib/kinds";
import { ProfilePhoto } from "@/features/people/ProfilePhoto";

// Profil kartı (ana hesap ve kişiler ortak)
function Profile({ profile, label }) {
  return (
    <section className="mt-2 flex items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3.5">
      <ProfilePhoto orgId={profile.orgId} uid={profile.uid} name={profile.name} photo={profile.photo} photoPath={profile.photoPath} size="size-14" text="text-[1.1875rem]" tone="bg-acc text-white" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[1.1875rem] font-semibold tracking-tight">{profile.name}</b>
        <span className="block truncate text-[0.875rem] text-mut">{label}</span>
      </span>
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
      <PageHeader title="Ayarlar" />
      <Profile profile={profile} label={KIND_LABEL[kind] || "Kişi"} />
      <Group title="Ayarlar">
        <SizeRow />
        <ThemeRow />
        <NotifyRow n={n} />
        <NotifyMoreRow n={n} />
        {ai && <SummaryRow />}
        {ai && <VoiceRow />}
        <WeatherPlaceRow />
      </Group>
      <Group title="Hesap">
        <PasswordRow />
        <VersionRow />
        <Row title="Çıkış yap" danger onClick={() => logout()} />
      </Group>
    </main>
  );
}

// Seyrek kullanılanlar: satıra dokununca alttan açılan pencerede aynı düzende satırlar
function SheetRow({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row title={title} onClick={() => setOpen(true)} chevron />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="-mt-5 pb-2">{children}</div>
      </Sheet>
    </>
  );
}

// Ayarlar (ana hesap): Genel, Bildirimler, Asistan; Diğer (Bağlantılar, Veri ve kullanım, Testler pencereleri); Hesap (Seyhun, 2026-10-20)
export default function SettingsPage() {
  const { profile } = useAuth();
  const { members } = useData();
  const n = useNotifications();
  if (!profile) return null;
  if (profile.role !== "owner") return <PersonSettings profile={profile} n={n} />;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Ayarlar" />

      <Profile profile={profile} label="Ana hesap" />

      <Group title="Genel">
        <SizeRow />
        <ThemeRow />
        <WeatherPlaceRow />
        <RacesRow />
        <LedgerRow />
      </Group>

      <Group title="Bildirimler">
        <NotifyRow n={n} />
        <NotifyMoreRow n={n} />
        <SummaryRow />
      </Group>

      <Group title="Asistan">
        <VoiceRow />
        <PowerRow />
        <Fold title="Öğrenme" sub={profile.brainOff ? "Kapalı" : "Açık"}>
          <BrainCard bare owner />
        </Fold>
        <PermissionsRow />
      </Group>

      <Group title="Diğer">
        <SheetRow title="Bağlantılar">
          <Group>
            <Row title="Gmail ve banka mailleri" href="/mail/setup" />
            <CalendarFeedRow />
          </Group>
        </SheetRow>
        <SheetRow title="Veri ve kullanım">
          <Group title="Kullanım">
            <UsageRow />
            <CallsRow />
          </Group>
          <Group title="Veri">
            <BackupRow />
            <DeviceDataRow />
            <MoveAllRow />
            <MailFilesRow />
          </Group>
        </SheetRow>
        <SheetRow title="Testler">
          <Group title="Asistan">
            <Row title="Ses testi" href="/settings/voice-test" />
            <ProbeRow />
            <TimingRow />
          </Group>
          <Group title="Uygulama">
            <TestPushRow n={n} />
            <Row title="Bildirim testi" href="/settings/push-test" />
            <IntroRow />
            <DemoDataRow />
          </Group>
        </SheetRow>
      </Group>

      <Group title="Hesap">
        <Row title="Kişiler" sub={members.length ? `${members.length} kişi` : ""} href="/staff" />
        <PasswordRow />
        <VersionRow />
        <Row title="Çıkış yap" danger onClick={() => logout()} />
      </Group>
    </main>
  );
}
