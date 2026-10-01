"use client";

import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { dayLabel, nextPlan, soonLabel } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";
import { useForYou } from "./ForYou";

const SHOW = 2;

// Ana sayfada asistan sahnesinin içindeki kısa özet: Sıradaki plan (açık kart) ve "Senin için"in ilk öğeleri.
// "Tümü" sayfadaki tam listeye kaydırır (kaydırınca sahne küçülür). Gösterecek bir şey yoksa hiç çizilmez.
export function StageBrief() {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const { list } = useForYou();
  const now = useNow();
  const n = nextPlan(plans, now);
  const today = todayStr();
  if (!n && !list.length) return null;
  const toAll = () => document.getElementById("foryou")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-2">
      {n && (
        <button
          type="button"
          onClick={() => openAdd({ edit: { kind: "plan", id: n.plan.id } })}
          className="flex w-full items-center gap-3 rounded-2xl bg-[#f4f3ef] px-3.5 py-2.5 text-left text-[#1f3a47] transition active:scale-[.99]"
        >
          <span className="w-14 shrink-0 text-center">
            <b className={`block font-bold tabular-nums ${n.plan.time ? "whitespace-nowrap text-[1.0625rem]" : "text-[0.8125rem] leading-tight"}`}>{n.plan.time || "Gün boyu"}</b>
            <small className="block truncate text-[0.6875rem] text-[#1f3a47]/60">
              {n.state === "now" ? "şu an" : n.plan.date === today && n.plan.time ? soonLabel(n.plan, now).replace(" sonra", "") : dayLabel(n.plan.date, today)}
            </small>
          </span>
          <span className="h-8 w-px shrink-0 bg-[#1f3a47]/15" />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.625rem] font-bold tracking-[.1em] text-acc">{n.state === "now" ? "ŞU AN" : "SIRADAKİ"}</span>
            <b className="block truncate text-[0.9375rem] font-semibold">{n.plan.title}</b>
            {(n.plan.place || n.when) && <small className="block truncate text-[0.75rem] text-[#1f3a47]/60">{n.plan.place || n.when}</small>}
          </span>
          <Icon name="chev" className="size-4 shrink-0 text-[#1f3a47]/50" />
        </button>
      )}

      {list.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/[.07] ring-1 ring-white/10">
          <div className="flex items-center justify-between px-3.5 pt-2">
            <span className="text-[0.625rem] font-bold tracking-[.1em] text-[#9cc3d3]">SENİN İÇİN</span>
            {list.length > SHOW && (
              <button type="button" onClick={toAll} className="-my-1 rounded-full px-2 py-1 text-[0.75rem] font-semibold text-white/70 active:bg-white/10">
                Tümü · {list.length}
              </button>
            )}
          </div>
          <ul>
            {list.slice(0, SHOW).map((x, i) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={x.onOpen}
                  className={`flex w-full items-center gap-3 px-3.5 py-2 text-left active:bg-white/10 ${i ? "border-t border-white/10" : ""}`}
                >
                  <span className="shrink-0 rounded-full bg-[#f4f3ef] [&>span]:size-9">{x.lead}</span>
                  <span className="min-w-0 flex-1 [&_.text-mut]:text-white/55">
                    <span className="flex items-baseline gap-2">
                      <b className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{x.title}</b>
                      {x.time && <time className="shrink-0 text-[0.6875rem] tabular-nums text-white/55">{x.time}</time>}
                    </span>
                    <span className={`block truncate text-[0.75rem] ${x.subTone ? "text-[#f0a8a2]" : "text-white/60"}`}>{x.sub}</span>
                  </span>
                  {x.badge > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#9cc3d3] px-1.5 text-[0.6875rem] font-bold tabular-nums text-[#1f3a47]">{x.badge > 99 ? "99+" : x.badge}</span>
                  )}
                  {x.dot && <span className="size-2 shrink-0 rounded-full bg-[#9cc3d3]" aria-label="yeni" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
