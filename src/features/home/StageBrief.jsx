"use client";

import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { dayLabel, nextPlan, soonLabel } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";

// Ana sayfa akışının (HomeFeed) en üstü: Sıradaki ya da şu anki plan. Plan yoksa hiç çizilmez.
export function StageBrief() {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const n = nextPlan(plans, now);
  const today = todayStr();
  if (!n) return null;

  return (
    <button
      type="button"
      onClick={() => openAdd({ edit: { kind: "plan", id: n.plan.id } })}
      className="flex w-full items-center gap-3 rounded-[1.25rem] bg-card px-4 py-3 text-left shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)] transition active:scale-[.99]"
    >
      <span className="w-14 shrink-0 text-center">
        <b className={`block font-bold tabular-nums ${n.plan.time ? "whitespace-nowrap text-[1.0625rem]" : "text-[0.8125rem] leading-tight"}`}>{n.plan.time || "Gün boyu"}</b>
        <small className="block truncate text-[0.6875rem] text-mut">
          {n.state === "now" ? "şu an" : n.plan.date === today && n.plan.time ? soonLabel(n.plan, now).replace(" sonra", "") : dayLabel(n.plan.date, today)}
        </small>
      </span>
      <span className="h-9 w-px shrink-0 bg-line" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.6875rem] font-bold tracking-[.08em] text-acc">{n.state === "now" ? "ŞU AN" : "SIRADAKİ"}</span>
        <b className="block truncate text-[1rem] font-semibold">{n.plan.title}</b>
        {(n.plan.place || n.when) && <small className="block truncate text-[0.75rem] text-mut">{n.plan.place || n.when}</small>}
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-mut" />
    </button>
  );
}
