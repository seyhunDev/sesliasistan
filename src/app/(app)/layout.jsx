"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { TimerSound } from "@/features/training/Countdown";
import { IosBridge } from "@/features/ios/IosBridge";
import { AppLock } from "@/features/ios/AppLock";
import { DataProvider } from "@/features/data/DataProvider";
import { ChatProvider } from "@/features/chat/ChatProvider";
import { CallProvider } from "@/features/call/CallProvider";
import { AddProvider } from "@/features/add/AddProvider";
import { BirthdayProvider } from "@/features/birthdays/BirthdayProvider";
import { OpenFromUrl } from "@/features/add/OpenFromUrl";
import { InboxSeen } from "@/features/home/InboxSeen";
import { ReceiptProvider } from "@/features/receipts/ReceiptProvider";
import { AssistantProvider } from "@/features/assistant/AssistantProvider";
import { DockProvider, TabBarHost } from "@/features/home/TabBar";
import { TtsProvider } from "@/features/speech/TtsProvider";
import { BrainSync } from "@/features/brain/BrainSync";
import { MeetingProvider } from "@/features/meeting/MeetingProvider";
import { logout } from "@/lib/auth";
import { OfflineBanner, PushSync } from "@/features/pwa/Pwa";
import { UpdateNote } from "@/features/pwa/UpdateNote";
import { NewVersionBar } from "@/features/pwa/NewVersionBar";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { TryAssistant } from "@/features/onboarding/TryAssistant";
import { SportGate } from "@/sports/SportGate";
import { installTrail } from "@/lib/navTrail";
import { NavProgress } from "@/components/ui/NavProgress";
import { OpenTimer } from "@/components/ui/OpenTimer";
import { SyncLine } from "@/components/ui/SyncLine";
import { SwipeBack } from "@/components/ui/SwipeBack";

export default function AppLayout({ children }) {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();
  // Uygulama içinden açılan canlı ekran (app/(app)/athletes/(..)canli): uygulama ayakta kalır, yalnız alt çubuk ve uygulamanın
  // açılır notları görünmez (canlı ekranın kendi geri ve "Yeni sürüm" çubuğu var)
  const live = usePathname().startsWith("/canli");

  // Geri düğmeleri gelinen sayfaya dönsün diye uygulama içi geçmiş izlenir
  useEffect(() => installTrail(), []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Splash />;

  if (error || !profile) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[26.25rem] content-center gap-4 px-5">
        <h1 className="text-xl font-bold">Hesabın yüklenemedi</h1>
        <p className="text-sm text-mut">Bağlantında bir sorun olabilir. Çıkış yapıp tekrar giriş yapmayı dene.</p>
        <Button variant="ghost" onClick={() => logout()}>Çıkış yap</Button>
      </div>
    );
  }

  // Velora Food kurye hesabı: kurye ekranı Velora Food'da (2026-10-25); Velora'da hiçbir veri açılmaz
  if (profile.role === "courier") {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[26.25rem] content-center gap-4 px-5">
        <h1 className="text-xl font-bold">Kurye hesabı</h1>
        <p className="text-sm text-mut">Bu hesapla Velora Food uygulamasından giriş yap.</p>
        <Button variant="ghost" onClick={() => logout()}>Çıkış yap</Button>
      </div>
    );
  }

  return (
    <ToastProvider>
     <ConfirmProvider>
      <TtsProvider>
        <DataProvider>
         <ChatProvider>
         <CallProvider>
          <ReceiptProvider>
            <AddProvider>
             <BirthdayProvider>
              <MeetingProvider>
                <AssistantProvider>
                 <DockProvider>
                  <NavProgress />
                  <OpenTimer />
                  <SyncLine />
                  <SwipeBack />
                  <OfflineBanner />
                  {!live && <UpdateNote />}
                  {!live && <NewVersionBar />}
                  <PushSync profile={profile} />
                  {children}
                  {!live && <TabBarHost />}
                  <BrainSync />
                  <OpenFromUrl />
                  <InboxSeen />
                  {!live && <Onboarding />}
                  {!live && <TryAssistant />}
                  {!live && <SportGate />}
                  <TimerSound />
                  <IosBridge />
                  <AppLock />
                 </DockProvider>
                </AssistantProvider>
              </MeetingProvider>
             </BirthdayProvider>
            </AddProvider>
          </ReceiptProvider>
         </CallProvider>
         </ChatProvider>
        </DataProvider>
      </TtsProvider>
     </ConfirmProvider>
    </ToastProvider>
  );
}
