"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AccountCard } from "@/features/auth/AccountCard";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { PermissionPrompt } from "@/features/permissions/PermissionsCard";
import { useData } from "@/features/data/DataProvider";
import { VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { Sheet } from "@/components/ui/Sheet";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { initials, todayStr } from "@/lib/utils/format";
import { HomeAgenda, NewItems, NextUp } from "./HomeAgenda";
import { PaidNotice } from "@/features/receipts/Payment";
import { WeatherCard } from "@/features/weather/WeatherCard";
import { WeekStrip } from "./WeekStrip";
import { QuickActions } from "./QuickActions";

// Özet odaklı ana sayfa: selamlama + günün tek satırı, sıradaki plan, her tür için tek kart.
// Karta dokununca o türün sayfası açılır; ekleme ve görüntüleme orada birlikte. Alt menü yok.
// Konuşma altta sabit çubuktaki büyük mikrofonla (asistan: sor, ekle, yönet).
export function OwnerHome() {
  const { profile } = useAuth();
  const { openAssistant } = useAssistant();

  const { plans, tasks } = useData();
  const now = useNow();
  const [account, setAccount] = useState(false);

  const h = now.getHours();
  const greet = h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  const date = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const firstName = (profile?.name || "").split(" ")[0];

  // Günün tek satırı: bugün kalan plan ve bugün/geciken görev sayısı
  const today = todayStr();
  const leftPlans = plans.filter((p) => p.date <= today && (p.endDate || p.date) >= today && planState(p, now) !== "past").length;
  const dueTasks = tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  const line = [leftPlans && `${leftPlans} plan`, dueTasks && `${dueTasks} görev`].filter(Boolean).join(", ");


  return (
    <main className="relative mx-auto max-w-[480px] px-5 pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]">
      {/* Başlık: tarih + selamlama */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-mut">
            <span className="capitalize">{date}</span>
            {line ? ` · bugün ${line}` : ""}
          </p>
          <h1 className="mt-0.5 text-[24px] font-semibold leading-tight tracking-tight">
            {greet}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <button
          onClick={() => setAccount(true)}
          aria-label="Hesap"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[13px] font-semibold text-acc transition active:scale-90"
        >
          {initials(profile?.name)}
        </button>
      </header>

      <div className="flex justify-center [&>*]:mt-4">
        <PermissionPrompt />
      </div>

      <PaidNotice />

      {/* Sana atanan / başkasının eklediği, henüz açılmamış kayıtlar */}
      <div className="mt-4 empty:hidden">
        <NewItems />
      </div>

      {/* Hızlı işlemler */}
      <div className="mt-5">
        <QuickActions />
      </div>

      {/* Bu hafta: takvime kısa yol */}
      <div className="mt-4">
        <WeekStrip />
      </div>

      {/* Hava ve rüzgâr (planları buna göre yapmak için) */}
      <div className="mt-3">
        <WeatherCard />
      </div>

      {/* Sıradaki plan */}
      <div className="mt-4">
        <NextUp />
      </div>

      {/* Özet */}
      <div className="mt-4">
        <HomeAgenda />
      </div>

      {/* Alt: konuş ya da yaz (asistan: sor, ekle, yönet) */}
      <VoiceTextBar placeholder="Sor veya yaz…" onMic={() => openAssistant({ listen: true })} onSend={(t) => openAssistant({ text: t })} />

      <Sheet open={account} onClose={() => setAccount(false)} title="Hesap">
        <AccountCard />
      </Sheet>
    </main>
  );
}
