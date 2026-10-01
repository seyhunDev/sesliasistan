"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { DataProvider } from "@/features/data/DataProvider";
import { ChatProvider } from "@/features/chat/ChatProvider";
import { AddProvider } from "@/features/add/AddProvider";
import { BirthdayProvider } from "@/features/birthdays/BirthdayProvider";
import { OpenFromUrl } from "@/features/add/OpenFromUrl";
import { ReceiptProvider } from "@/features/receipts/ReceiptProvider";
import { AssistantProvider } from "@/features/assistant/AssistantProvider";
import { AssistantFab } from "@/features/assistant/AssistantFab";
import { TabBarHost } from "@/features/home/TabBar";
import { TtsProvider } from "@/features/speech/TtsProvider";
import { BrainSync } from "@/features/brain/BrainSync";
import { MeetingProvider } from "@/features/meeting/MeetingProvider";
import { logout } from "@/lib/auth";
import { OfflineBanner } from "@/features/pwa/Pwa";
import { Onboarding } from "@/features/onboarding/Onboarding";

export default function AppLayout({ children }) {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();

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

  return (
    <ToastProvider>
      <TtsProvider>
        <DataProvider>
         <ChatProvider>
          <ReceiptProvider>
            <AddProvider>
             <BirthdayProvider>
              <MeetingProvider>
                <AssistantProvider>
                  <OfflineBanner />
                  {children}
                  <TabBarHost />
                  <AssistantFab />
                  <BrainSync />
                  <OpenFromUrl />
                  <Onboarding />
                </AssistantProvider>
              </MeetingProvider>
             </BirthdayProvider>
            </AddProvider>
          </ReceiptProvider>
         </ChatProvider>
        </DataProvider>
      </TtsProvider>
    </ToastProvider>
  );
}
