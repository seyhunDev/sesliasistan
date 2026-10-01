"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, Chips, DelBadge, Empty, Hero, HeroLabel, Label, card, catStyle } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { addDate } from "@/lib/ai/digest";
import { dayLabel, groupByDay, leftLabel, nextPlan, planState, remainLabel, soonLabel, weekdayLong, weekdayShort } from "@/lib/agenda";
import { short, todayStr } from "@/lib/utils/format";
import { assigneesOf, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

const spanDays = (p) => Math.round((new Date(`${p.endDate}T00:00`) - new Date(`${p.date}T00:00`)) / 864e5) + 1;
const inDay = (p, d) => p.date <= d && (p.endDate || p.date) >= d;
const mins = (t) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
// Aynı gün saatleri çakışan planlar (süre yoksa 60 dk sayılır)
function conflicts(items) {
  const timed = items.filter((p) => p.time && !(p.endDate && p.endDate !== p.date)).map((p) => [p.id, mins(p.time), mins(p.time) + (p.durationMin || 60)]);
  const out = new Set();
  timed.forEach(([a, s1, e1], i) => timed.slice(i + 1).forEach(([b, s2, e2]) => s1 < e2 && s2 < e1 && (out.add(a), out.add(b))));
  return out;
}

// Planlar: üstte önümüzdeki 7 gün ve sıradaki plan; ana hesapta kişiye göre süzme; gün gün liste
// (saat, kategori rengi, yer, kimler; çakışan saatler uyarılır). Geçmiş planlar arşivde.
export default function PlansPage() {
  const { plans: allPlans, removeWithUndo, myUid, nameOf, members, isStaff } = useData();
  const [who, setWho] = useState("all"); // all | me | uid
  const mine = (p) => (who === "all" ? true : who === "me" ? !assigneesOf(p).length || assigneesOf(p).includes(myUid) : assigneesOf(p).includes(who));
  const plans = allPlans.filter(mine);
  const people = !isStaff && members.length > 0 ? [["all", "Herkes"], ["me", "Benim"], ...members.map((m) => [m.uid, (m.name || "").split(" ")[0]])] : [];
  const pillOf = useWho();
  const { openAdd } = useAdd();
  const tab = "up"; // geçmiş planlar arşivde (/archive)
  const now = useNow();
  const today = todayStr();
  const up = groupByDay(plans, today, true);
  // Saati geçmiş planlar listede görünmez (arşive geçer)
  const days = up.map((g) => ({ ...g, items: g.items.filter((p) => planState(p, now) !== "past") })).filter((g) => g.items.length);
  const upcoming = days.reduce((n, g) => n + g.items.length, 0);
  const week = [...Array(7)].map((_, i) => addDate(today, i));
  const weekCount = plans.filter((p) => week.some((d) => inDay(p, d))).length;
  const n = nextPlan(plans, now);

  const goDay = (d) => {
    const el = document.getElementById(`d-${d}`);
    if (el && tab === "up") el.scrollIntoView({ behavior: "smooth", block: "start" });
    else openAdd({ type: "plan", date: d });
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Planlar" sub={upcoming ? `${upcoming} yaklaşan plan` : "Yaklaşan plan yok"}>
        <ArchiveLink type="plan" />
        <Link href="/calendar" aria-label="Takvim" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
          <Icon name="cal" className="size-5" />
        </Link>
      </PageHeader>

      <Hero className="mt-2">
        <div className="flex items-baseline justify-between gap-3">
          <HeroLabel>ÖNÜMÜZDEKİ 7 GÜN</HeroLabel>
          <span className="text-[0.75rem] text-white/75 tabular-nums">{weekCount} plan</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {week.map((d, i) => {
            const cnt = plans.filter((p) => inDay(p, d)).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => goDay(d)}
                aria-label={`${dayLabel(d, today)}: ${cnt} plan`}
                className={`flex flex-col items-center rounded-2xl py-2 transition active:scale-95 ${i === 0 ? "bg-white text-[#2c5163]" : "bg-white/10"}`}
              >
                <span className={`text-[0.625rem] font-semibold uppercase ${i === 0 ? "" : "text-white/70"}`}>{weekdayShort(d)}</span>
                <b className="text-[1.0625rem] font-semibold leading-tight tabular-nums">{+d.slice(8, 10)}</b>
                <span className="mt-1 flex h-1.5 gap-0.5">
                  {[...Array(Math.min(cnt, 3))].map((_, k) => (
                    <i key={k} className={`size-1.5 rounded-full ${i === 0 ? "bg-[#2c5163]" : "bg-white"}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        {n && (
          <button
            type="button"
            onClick={() => openAdd({ edit: { kind: "plan", id: n.plan.id } })}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-left active:bg-white/15"
          >
            <span className="text-[0.6875rem] font-bold tracking-[.08em] text-white/70">{n.state === "now" ? "ŞU AN" : "SIRADAKİ"}</span>
            <b className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{n.plan.title}</b>
            <span className="shrink-0 text-[0.75rem] tabular-nums text-white/80">
              {n.plan.date === today && n.plan.time && n.state !== "now" ? soonLabel(n.plan, now) : [dayLabel(n.plan.date, today), n.plan.time].filter(Boolean).join(" ")}
            </span>
          </button>
        )}
      </Hero>


      {people.length > 0 && <Chips value={who} onChange={setWho} options={people} className="mt-3" />}

      {days.length === 0 && (
        <Empty icon="cal" title="Yaklaşan plan yok" sub="Aşağıdan söyle, yaz ya da + ile ekle. Geçmiş planlar arşivde." />
      )}

      {days.map(({ day, items }) => {
        const isToday = day === today;
        const label = dayLabel(day, today);
        return (
          <section key={day} id={`d-${day}`} className="scroll-mt-20">
            <Label right={label === "Bugün" || label === "Yarın" ? "" : leftLabel(day, today)}>
              <span className={isToday ? "text-acc" : ""}>
                {label.toLocaleUpperCase("tr-TR")}
                {label === "Bugün" || label === "Yarın" ? ` · ${weekdayLong(day).toLocaleUpperCase("tr-TR")}` : /^\d/.test(label) ? ` · ${weekdayShort(day).toLocaleUpperCase("tr-TR")}` : ""}
              </span>
            </Label>
            <div className={`${card} divide-y divide-line overflow-hidden`}>
              {items.map((p, _i, arr) => {
                const clash = conflicts(arr).has(p.id);
                const cs = catStyle(p.cat);
                const multi = p.endDate && p.endDate !== p.date;
                const st = planState(p, now);
                const pill = pillOf(p, "ml-auto");
                const who = pill ? "" : whoText(p, myUid, nameOf);
                return (
                  <SwipeRow key={p.id} actions={[{ label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("plan", p.id) }]}>
                    <button
                      onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })}
                      className={`relative flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left transition active:bg-bg ${tab === "up" && st === "past" ? "opacity-45" : ""}`}
                    >
                      <span className={`absolute inset-y-2.5 left-0 w-1 rounded-r-full ${cs.bar}`} aria-hidden="true" />
                      <span className="w-[3.75rem] shrink-0">
                        <b className={`block font-bold tabular-nums ${p.time || multi ? "whitespace-nowrap text-[0.9375rem]" : "text-[0.8125rem] leading-tight"} ${st === "now" ? "text-acc" : ""}`}>
                          {multi ? `${spanDays(p)} gün` : p.time || "Gün boyu"}
                        </b>
                        <small className="block text-[0.6875rem] text-mut">
                          {tab === "up" && st === "now" ? <span className="font-semibold text-acc">şu an</span> : multi ? "etkinlik" : p.time ? `${p.durationMin || 60} dk` : ""}
                        </small>
                      </span>
                      <span className="h-8 w-px shrink-0 bg-line" />
                      <span className="min-w-0 flex-1">
                        <b className={`block truncate text-[0.9375rem] font-semibold ${tab === "past" ? "text-mut" : ""}`}>{p.title}</b>
                        {clash && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-amber-700">
                            <Icon name="alert" className="size-3" /> Aynı saatte başka plan var
                          </span>
                        )}
                        {(multi || p.place || who || pill || (p.cat && p.cat !== "Genel")) && (
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.75rem] text-mut">
                            <span className="min-w-0 truncate">
                              {p.cat && p.cat !== "Genel" && <span className={`font-semibold ${cs.chip.split(" ")[1]}`}>{p.cat}{multi || p.place ? " · " : ""}</span>}
                              {[multi && `${short(p.date)} – ${short(p.endDate)}`, multi && tab === "up" && st === "now" && remainLabel(p, today), p.place].filter(Boolean).join(" · ")}
                              {who && <span className="text-acc">{multi || p.place ? " · " : ""}{who}</span>}
                            </span>
                            {pill}
                          </span>
                        )}
                        {p.deleteReq && (
                          <span className="mt-1 block">
                            <DelBadge rec={p} />
                          </span>
                        )}
                      </span>
                      <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
                    </button>
                  </SwipeRow>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
