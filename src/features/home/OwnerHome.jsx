"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { AccountCard } from "@/features/auth/AccountCard";
import { useAdd } from "@/features/add/AddProvider";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useData } from "@/features/data/DataProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { totalOf } from "@/lib/receipts";
import { byStart, initials, rel, todayStr } from "@/lib/utils/format";

const money = (k) => ((k || 0) / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const nowHM = () => new Date().toTimeString().slice(0, 5);

// Tek bakışta: ikon + sayı (etiket yalnızca ekran okuyucu için)
function Glance({ href, icon, value, label, dot }) {
  return (
    <Link href={href} aria-label={label} className="flex items-center gap-2 rounded-full border border-line bg-card/80 py-2 pl-3 pr-4 backdrop-blur transition active:scale-95">
      <Icon name={icon} className="size-[18px] text-acc" />
      <b className="text-[15px] font-semibold tabular-nums">{value}</b>
      {dot && <i className="size-1.5 rounded-full bg-rec" />}
    </Link>
  );
}

export function OwnerHome() {
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const { openAssistant } = useAssistant();
  const { openReceipt } = useReceipt();
  const { plans, tasks, receipts } = useData();
  const [account, setAccount] = useState(false);
  const [text, setText] = useState("");

  const h = new Date().getHours();
  const greet = h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  const date = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const firstName = (profile?.name || "").split(" ")[0];

  const today = todayStr();
  const now = nowHM();
  const todayPlans = plans.filter((p) => p.date <= today && (p.endDate || p.date) >= today).sort(byStart);
  const open = tasks.filter((t) => !t.done);
  const overdue = open.some((t) => t.due && t.due < today);
  const monthSpend = receipts.filter((r) => (r.date || "").startsWith(today.slice(0, 7))).reduce((a, r) => a + totalOf(r), 0);
  const review = receipts.filter((r) => r.status === "review").length;
  // Sıradaki: bugün henüz geçmemiş plan, yoksa ilk gelecek plan
  const next = [...todayPlans.filter((p) => !p.time || p.time >= now), ...plans.filter((p) => p.date > today).sort(byStart)][0];
  const nextWhen = next ? (next.date === today ? next.time || "Bugün" : rel(next.date).replace(/^(\S+ \S+).*/, "$1")) : "";

  // Konuşma başlatıcılar
  const chips = [
    { label: "Bugün ne var?", run: () => openAssistant({ text: "Bugün neler var?" }) },
    { label: "Bu hafta", run: () => openAssistant({ text: "Bu hafta neler var?" }) },
    { label: "Fiş", icon: "camera", run: () => openReceipt() },
    { label: "Görev", icon: "plus", run: () => openAdd({ type: "task" }) },
    { label: "Plan", icon: "plus", run: () => openAdd({ type: "plan" }) },
    { label: "Harcamalar", run: () => openAssistant({ text: "Bu ay ne kadar harcadık?" }) },
  ];

  const send = () => {
    const t = text.trim();
    if (!t) return openAssistant({ listen: true });
    setText("");
    openAssistant({ text: t });
  };
  const typing = text.trim().length > 0;

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden px-5 pb-[calc(150px+env(safe-area-inset-bottom))] pt-3">
      {/* Arka plan ışığı */}
      <div aria-hidden="true" className="home-aura pointer-events-none absolute left-1/2 top-24 -z-0 size-[420px] -translate-x-1/2 rounded-full" />

      {/* Üst */}
      <div className="relative flex items-center justify-between py-1.5">
        <span className="text-[13px] font-medium capitalize text-mut">{date}</span>
        <button
          onClick={() => setAccount(true)}
          aria-label="Hesap"
          className="grid size-9 place-items-center rounded-full bg-card text-[13px] font-semibold ring-1 ring-line transition active:scale-90"
        >
          {initials(profile?.name)}
        </button>
      </div>

      {/* Merkez: konuşma */}
      <section className="relative flex flex-1 flex-col items-center justify-center py-8 text-center">
        <button onClick={() => openAssistant({ listen: true })} aria-label="Konuş" className="orb transition duration-300 active:scale-90">
          <span className="orb-glow" />
          <span className="orb-shape">
            <span className="orb-fill" />
            <span className="orb-shine" />
          </span>
          <Icon name="mic" className="relative size-10 text-white drop-shadow" />
        </button>

        <p className="mt-9 text-[24px] font-semibold tracking-tight">
          {greet}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <p className="mt-1 text-[14px] text-mut">Dokun ve konuş</p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Glance href="/plans" icon="cal" value={todayPlans.length} label={`Bugün ${todayPlans.length} plan`} />
          <Glance href="/tasks" icon="task" value={open.length} label={`${open.length} açık görev`} dot={overdue} />
          <Glance href="/receipts" icon="wallet" value={money(monthSpend)} label="Bu ay harcama" />
        </div>

        {next && (
          <button
            onClick={() => openAdd({ edit: { kind: "plan", id: next.id } })}
            className="mt-4 flex w-full max-w-[340px] items-center gap-3 rounded-2xl border border-line bg-card/80 px-4 py-3 text-left backdrop-blur transition active:scale-[.98]"
          >
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-acc" />
            <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-acc">{nextWhen}</span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{next.title}</span>
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </button>
        )}

        {review > 0 && (
          <Link href="/receipts" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[13px] font-semibold text-amber-800 active:scale-95">
            <Icon name="alert" className="size-4" /> {review} fiş kontrol
          </Link>
        )}
      </section>

      {/* Konuşma başlatıcılar */}
      <div className="relative -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {chips.map((c) => (
          <button
            key={c.label}
            onClick={c.run}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card/80 px-3.5 py-2 text-[14px] font-medium backdrop-blur transition active:scale-95"
          >
            {c.icon && <Icon name={c.icon} className="size-4 text-mut" />}
            {c.label}
          </button>
        ))}
      </div>

      {/* Alt: yaz veya konuş */}
      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 px-4">
        <div className="mx-auto flex max-w-[448px] items-center gap-1.5 rounded-full border border-line bg-card/90 p-1.5 shadow-lg backdrop-blur-xl">
          <button onClick={() => openReceipt()} aria-label="Fiş ekle" className="grid size-10 shrink-0 place-items-center rounded-full text-mut transition active:scale-90 active:bg-bg">
            <Icon name="camera" className="size-5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
            placeholder="Sor veya söyle…"
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent px-1 text-base text-fg outline-none placeholder:text-mut"
          />
          <button
            onClick={send}
            aria-label={typing ? "Gönder" : "Konuş"}
            className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-90 ${typing ? "bg-fg text-bg" : "bg-acc text-white"}`}
          >
            <Icon name={typing ? "up" : "mic"} className="size-5" />
          </button>
        </div>
      </div>

      <Sheet open={account} onClose={() => setAccount(false)} title="Hesap">
        <AccountCard />
      </Sheet>
    </main>
  );
}
