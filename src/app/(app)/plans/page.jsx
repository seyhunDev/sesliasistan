"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAdd } from "@/features/add/AddProvider";
import { AddBar } from "@/features/add/AddBar";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { dayLabel, groupByDay, leftLabel, monthYear, planState, remainLabel, weekdayShort } from "@/lib/agenda";
import { short, todayStr } from "@/lib/utils/format";
import { whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

const spanDays = (p) => Math.round((new Date(`${p.endDate}T00:00`) - new Date(`${p.date}T00:00`)) / 864e5) + 1;

// Gün gün ajanda: solda tarih, sağda o günün planları (saat · başlık · yer)
export default function PlansPage() {
  const { plans, removeWithUndo, myUid, nameOf } = useData();
  const pillOf = useWho();
  const { openAdd } = useAdd();
  const [tab, setTab] = useState("up"); // up | past
  const now = useNow();
  const today = todayStr();
  const up = groupByDay(plans, today, true);
  const past = groupByDay(plans, today, false);
  const days = tab === "up" ? up : past;
  const upcoming = up.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-[calc(120px+env(safe-area-inset-bottom))]">
      <PageHeader title="Planlar" sub={upcoming ? `${upcoming} yaklaşan plan` : "Yaklaşan plan yok"}>
        <Link href="/calendar" aria-label="Takvim" className="grid size-9 place-items-center rounded-xl border border-line bg-card text-acc active:scale-95">
          <Icon name="cal" className="size-[18px]" />
        </Link>
      </PageHeader>

      <div className="mt-2 flex rounded-xl bg-card p-[3px] ring-1 ring-line">
        {[["up", "Yaklaşan", up.length], ["past", "Geçmiş", past.length]].map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-[10px] py-2 text-sm font-semibold transition ${tab === k ? "bg-fg text-bg" : "text-mut"}`}
          >
            {l} {n > 0 && <span className="font-normal opacity-70">· {n} gün</span>}
          </button>
        ))}
      </div>

      {days.length === 0 && (
        <p className="py-16 text-center text-sm text-mut">{tab === "up" ? "Yaklaşan plan yok." : "Geçmiş plan yok."}</p>
      )}

      {days.map(({ day, items }, i) => {
        const showMonth = i === 0 || days[i - 1].day.slice(0, 7) !== day.slice(0, 7);
        const isToday = day === today;
        const label = dayLabel(day, today);
        return (
          <div key={day}>
            {showMonth && <h2 className="mb-1 mt-7 px-1 text-[13px] font-semibold text-mut">{monthYear(day)}</h2>}
            <section className="mt-3 flex gap-3">
              {/* Tarih sütunu */}
              <div className="w-11 shrink-0 pt-1.5 text-center">
                <p className={`text-[11px] font-semibold uppercase ${isToday ? "text-acc" : "text-mut"}`}>{weekdayShort(day)}</p>
                <p className={`text-[20px] font-semibold leading-tight tabular-nums ${isToday ? "text-acc" : tab === "past" ? "text-mut" : ""}`}>{+day.slice(8, 10)}</p>
              </div>

              {/* O günün planları */}
              <div className="min-w-0 flex-1">
                {/* Kaç gün kaldı / kaç gün önce */}
                <p className={`mb-1 px-1 text-[13px] font-semibold ${isToday ? "text-acc" : "text-mut"}`}>
                  {label === "Bugün" || label === "Yarın" ? label : leftLabel(day, today)}
                </p>
                <div className="divide-y divide-line overflow-hidden rounded-xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                  {items.map((p) => {
                    const multi = p.endDate && p.endDate !== p.date;
                    const st = planState(p, now); // bugünün saati geçmiş planı soluk
                    const pill = pillOf(p, "ml-auto");
                    const who = pill ? "" : whoText(p, myUid, nameOf); // ana hesapta etiket, çalışanda yazı
                    return (
                      <SwipeRow key={p.id} actions={[{ label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("plan", p.id) }]}>
                      <button
                        onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })}
                        className={`flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition active:bg-bg ${tab === "up" && st === "past" ? "opacity-40" : ""}`}
                      >
                        <span className={`w-16 shrink-0 whitespace-nowrap pt-px text-[13px] font-semibold tabular-nums ${tab === "past" ? "text-mut" : "text-acc"}`}>
                          {multi ? `${spanDays(p)} gün` : p.time || "Tüm gün"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className={`flex items-center gap-2 truncate text-[15px] font-medium ${tab === "past" ? "text-mut" : ""}`}>
                            <span className="truncate">{p.title}</span>
                            {tab === "up" && st === "now" && p.time && <span className="shrink-0 rounded-full bg-acc/10 px-2 py-0.5 text-[11px] font-semibold text-acc">Şu an</span>}
                            {pill}
                          </b>
                          {(multi || p.place || who) && (
                            <small className="mt-0.5 block truncate text-[13px] text-mut">
                              {[multi && `${short(p.date)} – ${short(p.endDate)}`, multi && tab === "up" && st === "now" && remainLabel(p, today), p.place].filter(Boolean).join(" · ")}
                              {who && <span className="text-acc">{multi || p.place ? " · " : ""}{who}</span>}
                            </small>
                          )}
                        </span>
                      </button>
                      </SwipeRow>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        );
      })}
      <AddBar type="plan" />
    </main>
  );
}
