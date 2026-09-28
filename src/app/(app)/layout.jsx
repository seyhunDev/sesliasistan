"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { Splash } from "@/components/ui/Splash";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { TabBar } from "@/components/ui/TabBar";
import { DataProvider } from "@/features/data/DataProvider";
import { AddProvider } from "@/features/add/AddProvider";
import { ReceiptProvider } from "@/features/receipts/ReceiptProvider";
import { AssistantProvider } from "@/features/assistant/AssistantProvider";
import { AssistantFab } from "@/features/assistant/AssistantFab";
import { TtsProvider } from "@/features/speech/TtsProvider";
import { logout } from "@/lib/auth";

export default function AppLayout({ children }) {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Splash />;

  if (error || !profile) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[420px] content-center gap-4 px-5">
        <h1 className="text-xl font-bold">Profil yüklenemedi</h1>
        <p className="text-sm text-mut">{error ?? "Profil bulunamadı."} Firestore kurallarını yayınladın mı?</p>
        <Button variant="ghost" onClick={() => logout()}>Çıkış yap</Button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <TtsProvider>
        <DataProvider>
          <AddProvider>
            <ReceiptProvider>
              <AssistantProvider>
                {children}
                <TabBar />
                <AssistantFab />
              </AssistantProvider>
            </ReceiptProvider>
          </AddProvider>
        </DataProvider>
      </TtsProvider>
    </ToastProvider>
  );
}
