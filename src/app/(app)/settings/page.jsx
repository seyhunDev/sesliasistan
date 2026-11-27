"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { BrainCard } from "@/features/brain/BrainCard";
import { useData } from "@/features/data/DataProvider";
import { Fold, NotifyMoreRow, NotifyRow, PermissionsRow, PowerRow, SizeRow, SummaryRow, ThemeRow, VoiceRow, WeatherPlaceRow, PasswordRow, TekneKimRow, useNotifications, LedgerRow } from "@/features/settings/Groups";
import { Group, Row } from "@/features/settings/ui";
import { BackupRow } from "@/features/settings/Backup";
import { MailFilesRow, MoveAllRow } from "@/features/settings/MoveAll";
import { Durum, TtsQuotaRow } from "@/features/settings/Durum";
import { CallsRow } from "@/features/settings/Calls";
import { CalendarFeedRow } from "@/features/settings/CalendarFeed";
import { PastChatsRow } from "@/features/settings/PastChats";
import { AndroidApkRow } from "@/features/settings/AndroidApk";
import { CleanAccountsRow } from "@/features/settings/CleanAccounts";
import { buildLine } from "@/lib/buildInfo";
import { logout } from "@/lib/auth";
import { FaceIdRow } from "@/features/ios/AppLock";
import { KIND_LABEL, isCoach, isPlain, kindOf } from "@/lib/kinds";
import { setGibiGor, useHesap } from "@/features/auth/useHesap";
import { useRouter } from "next/navigation";
import { ProfilePhoto } from "@/features/people/ProfilePhoto";
import { liveHead } from "@/features/liveScreen/fonts";
import { AdminRow } from "@/features/admin/AdminPage";
import { PaketKart } from "@/features/paket/PaketKart";
import { ClubRow } from "@/features/clubs/ClubRow";
import { isVeloraAdmin } from "@/lib/hesapGorunum";
import { KullanimRow } from "@/features/kullanim/KullanimKaydi";

// Sahne üst (2026-11-26, uygulamanın koyu dili): geri, dar büyük AYARLAR, altında ad · hesap türü, sağda fotoğraf
function Top({ profile, label }) {
  return (
    <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Ayarlar">
      <header className="flex items-center gap-2.5">
        <BackButton href="/" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="sahne-t truncate text-[2rem]">Ayarlar</h1>
          <p className="mt-1 truncate text-[0.8125rem] text-mut">{[profile.name, label].filter(Boolean).join(" · ")}</p>
        </div>
        <ProfilePhoto orgId={profile.orgId} uid={profile.uid} name={profile.name} photo={profile.photo} photoPath={profile.photoPath} size="size-10" text="text-[0.9375rem]" tone="bg-acc text-[#111]" />
      </header>
    </section>
  );
}

// Gövde ve bölüm: başlık listenin dışında (ListHead), satırlar ince çizgili koyu kartta
function Body({ children }) {
  return <div className="wide-body wide-cols space-y-6">{children}</div>;
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
  // Normal kullanıcı (çalışan, aile, diğer; Seyhun 2026-11-24 "sade, net"): yalnız 8 satır. Plan hatırlatması, günlük özetler,
  // sürüm ve Android satırı yok (gizli, silinmedi). Sporcu tarafı eskisi gibi.
  if (isPlain(kind))
    return (
      <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
        <Top profile={profile} label={isCoach(profile) ? "Antrenör" : KIND_LABEL[kind] || "Kişi"} />
        <Body>
          <Sec title="Ayarlar">
            <SizeRow />
            <ThemeRow />
            <NotifyRow n={n} />
            <VoiceRow />
            <WeatherPlaceRow />
          </Sec>
          <Sec title="Hesap">
            <PasswordRow />
            <FaceIdRow />
            <KullanimRow />
            <Row title="Çıkış yap" danger onClick={() => logout()} />
          </Sec>
        </Body>
      </main>
    );
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <Top profile={profile} label={KIND_LABEL[kind] || "Kişi"} />
      <Body>
        <Sec title="Ayarlar">
          <SizeRow />
          <ThemeRow />
          <NotifyRow n={n} />
          <NotifyMoreRow n={n} />
          {ai && kind !== "parent" && <SummaryRow />}
          {ai && <VoiceRow />}
          <WeatherPlaceRow />
          {(kind === "athlete" || kind === "student") && <TekneKimRow />}
        </Sec>
        <Sec title="Hesap">
          {(kind === "staff" || kind === "family" || kind === "other") && <ClubRow />}
          <PasswordRow />
          <FaceIdRow />
          <KullanimRow />
          <VersionRow />
          <AndroidApkRow />
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
  const h = useHesap();
  const router = useRouter();
  if (!profile) return null;
  // "… gibi gör" (ana hesap): o hesabın Ayarlar düzeni görünür (lib/hesapGorunum.js)
  if (h.preview) return <PersonSettings profile={{ ...profile, role: "staff", kind: h.kind, coach: false }} n={n} />;
  if (profile.role !== "owner") return <PersonSettings profile={profile} n={n} />;

  // Herkese açık uygulama (2026-11-27): Durum (uygulamanın Gemini/Firebase/Netlify harcaması) ve Geliştirici yalnız Velora ana hesabında.
  // Yeni düzen (örnek velora-tarama/ayarlar.html, Seyhun 2026-11-25 "yap"; 2026-11-26 grafikli Durum, dik iPad 52rem + 2 sütun): en üstte Durum kartları; Kişiler ve hesaplar ayrı grup;
  // Geliştirici en altta, sürüm sayfanın sonunda tek satır. Kalkanlar (gizli, silinmedi): Ana sayfada yarışlar / yarış kısayolu
  // (yarışlar artık hep görünür), ayrı Yapay zeka kullanımı, Açılış süresi, Telefondaki veriler ve Yayın satırları (kartlara taşındı).
  const ver = buildLine().split(" · ").slice(0, 2).join(" · ");
  const admin = isVeloraAdmin(profile.email);
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 md:max-w-[52rem] md:px-8 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <Top profile={profile} label="Ana hesap" />
      <Body>
        <PaketKart />
        {admin && <Durum />}

        <Sec title="Görünüm">
          <SizeRow />
          <ThemeRow />
          <WeatherPlaceRow />
          <TekneKimRow />
        </Sec>

        <Sec title="Bildirimler">
          <NotifyRow n={n} />
          <NotifyMoreRow n={n} />
          <SummaryRow />
        </Sec>

        <Sec title="Ses ve asistan">
          <VoiceRow />
          <TtsQuotaRow />
          <PowerRow />
          <PastChatsRow />
          <PermissionsRow />
        </Sec>

        {/* Üç hesap görünümü (Seyhun 2026-11-25 "ben her şeye hakim olmalıyım"): ötekilerin ana sayfası, alt çubuğu, menüsü; veri yine senin */}
        <Sec title="Kişiler ve hesaplar">
          {admin && <AdminRow org={profile.orgId} />}
          <Row title="Kişiler" sub={members.length ? `${members.length} kişi` : ""} href="/staff" />
          <Row title="Normal kullanıcı gibi gör" onClick={() => (setGibiGor("normal"), router.push("/"))} chevron />
          <Row title="Sporcu gibi gör" onClick={() => (setGibiGor("sporcu"), router.push("/"))} chevron />
          <CleanAccountsRow />
        </Sec>

        <Sec title="Bağlantılar ve yedek">
          {admin && <Row title="Gmail ve banka mailleri" href="/mail/setup" />}
          <CalendarFeedRow />
          <BackupRow />
        </Sec>

        <Sec title="Hesap">
          <ClubRow />
          <PasswordRow />
          <FaceIdRow />
          <KullanimRow />
          <Row title="Çıkış yap" danger onClick={() => logout()} />
        </Sec>

        {admin && (
        <Sec title="Geliştirici">
          <Row title="Testler" href="/settings/tests" />
          <AndroidApkRow />
          <SheetRow title="Arşivlenenler" sub="5">
            <Group>
              <LedgerRow />
              <Fold title="Öğrenme" sub={profile.brainOff ? "Kapalı" : "Açık"}>
                <BrainCard bare owner />
              </Fold>
              <CallsRow />
              <MoveAllRow />
              <MailFilesRow />
            </Group>
          </SheetRow>
        </Sec>
        )}

        {ver && <p className="pb-2 text-center text-[0.75rem] text-mut">Sürüm {ver}</p>}
      </Body>
    </main>
  );
}
