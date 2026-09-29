"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AccountCard } from "@/features/auth/AccountCard";
import { useAdd } from "@/features/add/AddProvider";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { PermissionPrompt } from "@/features/permissions/PermissionsCard";
import { useData } from "@/features/data/DataProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { initials, todayStr } from "@/lib/utils/format";
import { HomeAgenda, NextUp } from "./HomeAgenda";
import { PaidNotice } from "@/features/receipts/Payment";

// Özet odaklı ana sayfa: selamlama + günün tek satırı, sıradaki plan, özet kartı, hızlı ekle.
// Konuşma altta sabit çubuktaki büyük mikrofonla.
export function OwnerHome() {
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const { openAssistant } = useAssistant();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const { plans, tasks } = useData();
  const now = useNow();
  const [account, setAccount] = useState(false);
  const [text, setText] = useState("");

  const h = now.getHours();
  const greet = h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  const date = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const firstName = (profile?.name || "").split(" ")[0];

  // Günün tek satırı: bugün kalan plan ve bugün/geciken görev sayısı
  const today = todayStr();
  const leftPlans = plans.filter((p) => p.date <= today && (p.endDate || p.date) >= today && planState(p, now) !== "past").length;
  const dueTasks = tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  const line = [leftPlans && `${leftPlans} plan`, dueTasks && `${dueTasks} görev`].filter(Boolean).join(", ");

  const quick = [
    { label: "Plan", icon: "cal", run: () => openAdd({ type: "plan" }) },
    { label: "Görev", icon: "task", run: () => openAdd({ type: "task" }) },
    { label: "Not", icon: "note", run: () => openAdd({ type: "note" }) },
    { label: "Fiş", icon: "camera", run: () => openReceipt() },
    { label: "Toplantı", icon: "users", run: () => openMeeting() },
  ];

  const send = () => {
    const t = text.trim();
    if (!t) return openAssistant({ listen: true });
    setText("");
    openAssistant({ text: t });
  };
  const typing = text.trim().length > 0;

  return (
    <main className="relative mx-auto max-w-[480px] px-5 pb-[calc(170px+env(safe-area-inset-bottom))] pt-5">
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

      {/* Hızlı ekle: çerçevesiz yuvarlak düğmeler */}
      <nav aria-label="Hızlı ekle" className="mt-6 flex justify-between px-1">
        {quick.map((c) => (
          <button key={c.label} onClick={c.run} className="flex w-14 flex-col items-center gap-1.5 text-[12px] font-medium text-mut transition active:scale-95">
            <span className="grid size-12 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.07)]">
              <Icon name={c.icon} className="size-5" />
            </span>
            {c.label}
          </button>
        ))}
      </nav>

      {/* Sıradaki plan */}
      <div className="mt-6">
        <NextUp />
      </div>

      {/* Özet */}
      <div className="mt-4">
        <HomeAgenda />
      </div>

      {/* Alt: yaz veya konuş */}
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 px-4">
        <div className="mx-auto flex max-w-[448px] items-center gap-2 rounded-full bg-card py-1.5 pl-5 pr-1.5 shadow-[0_6px_24px_-8px_rgba(38,40,44,.18)] ring-1 ring-line">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
            placeholder="Sor veya söyle…"
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-mut"
          />
          <button
            onClick={send}
            aria-label={typing ? "Gönder" : "Konuş"}
            className={`grid size-12 shrink-0 place-items-center rounded-full text-white transition active:scale-90 ${typing ? "bg-fg" : "bg-acc"}`}
          >
            <Icon name={typing ? "up" : "mic"} className="size-[22px]" />
          </button>
        </div>
      </div>

      <Sheet open={account} onClose={() => setAccount(false)} title="Hesap">
        <AccountCard />
      </Sheet>
    </main>
  );
}
