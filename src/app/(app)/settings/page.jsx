"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { BrainCard } from "@/features/brain/BrainCard";
import { useData } from "@/features/data/DataProvider";
import { openOnboarding } from "@/features/onboarding/Onboarding";
import { NotifyMoreRow, NotifyRow, PermissionsRow, PowerRow, SizeRow, SummaryRow, ThemeRow, VoiceRow, WeatherPlaceRow, DemoDataRow, PasswordRow, useNotifications, TourResetRow, RacesRow, LedgerRow } from "@/features/settings/Groups";
import { Group, Row } from "@/features/settings/ui";
import { BackupRow } from "@/features/settings/Backup";
import { DeviceDataRow } from "@/features/settings/DeviceData";
import { UsageRow } from "@/features/settings/Usage";
import { CallsRow } from "@/features/settings/Calls";
import { CalendarFeedRow } from "@/features/settings/CalendarFeed";
import { TimingRow } from "@/features/settings/Timing";
import { buildLine } from "@/lib/buildInfo";
import { logout } from "@/lib/auth";
import { sendersOf } from "@/lib/bankSheet";
import { initials } from "@/lib/utils/format";

// Ayarlar: profil, sık kullanılanlar (boyut, bildirim, özet, ses, mail, kişiler), diğer ayarlar (dokununca açılır), çıkış
export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { members } = useData();
  const [brain, setBrain] = useState(false);
  const n = useNotifications();
  if (!profile) return null;
  const owner = profile.role === "owner";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Ayarlar" />

      {/* Profil */}
      <section className="mt-2 flex items-center gap-4 rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-acc text-[1.1875rem] font-semibold text-white">{initials(profile.name)}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[1.1875rem] font-semibold tracking-tight">{profile.name}</b>
          <span className="block truncate text-[0.875rem] text-mut">{user?.email}</span>
          <span className="mt-1.5 inline-block rounded-full bg-acc/10 px-2.5 py-0.5 text-[0.75rem] font-semibold text-acc">{owner ? "Ana hesap" : "Kişi"}</span>
        </span>
      </section>

      {/* Sık kullanılanlar: en çok değiştirilen ayarlar */}
      <Group title="Sık kullanılanlar" footer={n.on ? "" : "Bildirimler kapalıyken günlük özet ve hatırlatmalar bu cihaza gelmez."}>
        <SizeRow />
        <ThemeRow />
        <NotifyRow n={n} />
        <SummaryRow />
        <VoiceRow />
        <WeatherPlaceRow />
        <RacesRow />
        {owner && <Row icon="wallet" tone="ok" title="Hesaplar" sub={sendersOf(profile.mailFrom).map((r) => r.name).join(", ")} href="/mail" />}
        {owner && <Row icon="users" tone="ok" title="Kişiler" sub={members.length ? `${members.length} kişi · ekle, gör, kaldır` : "Ekip ya da aile ekle"} href="/staff" />}
      </Group>

      {/* Diğer ayarlar: seyrek değişenler; dokununca açılır */}
      <Group title="Diğer ayarlar">
        <PowerRow />
        <NotifyMoreRow n={n} />
        <PermissionsRow />
        <PasswordRow />
        <CalendarFeedRow />
        {owner && <UsageRow />}
        {owner && <CallsRow />}
        {owner && <BackupRow />}
        <DeviceDataRow />
        <TimingRow />
        <Row icon="mic" tone="rec" title="Ses testi" sub="Konuşmayı yazıya çeviren yolları yan yana dene" href="/settings/voice-test" />
        {owner && <DemoDataRow />}
        <LedgerRow />
        {owner && <Row icon="mail" tone="sky" title="Gmail bağlantısı" sub="Gönderenler ve kurulum" href="/mail/setup" />}
        <Row icon="spark" tone="acc" title="Tanıtımı yeniden göster" sub="Başlangıç slaytları" onClick={openOnboarding} chevron />
        <TourResetRow />
        <Row icon="chart" tone="slate" title="Öğrenme" sub={profile.brainOff ? "Kapalı" : "Açık · miktar, kapat, sıfırla"} onClick={() => setBrain((v) => !v)} chevron>
          {brain && <BrainCard bare owner={owner} />}
        </Row>
      </Group>

      <Group>
        <Row icon="clock" tone="slate" title="Sürüm" sub={buildLine()} />
        <Row icon="back" title="Çıkış yap" danger onClick={() => logout()} />
      </Group>

      <p className="mt-6 text-center text-[0.75rem] text-mut">Sesli Asistan</p>
    </main>
  );
}
