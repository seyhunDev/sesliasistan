"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { card, Empty } from "@/components/ui/Page";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import { STATUS, addDays, dowOf, monthStats, myFit, records, statusOf, weekStats } from "@/lib/fitness/model";
import { HistoryCard, MonthCard, ProgressCard, RowButton, TodayCard, WeekStrip } from "./FitDashboard";

// Sporcunun Fitness sayfası (salt okunur): programı antrenör hazırlar, sporcu yalnız antrenmanı yapar ve sonucu yazar.
// Bugünkü antrenman, bu hafta, sıradaki antrenmanlar, kapalı "Gelişim ve geçmiş". Veri cihazdaki planlardan (ek okuma yok).
const dayText = (d) => new Date(`${d}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

export function AthleteFitness() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const [more, setMore] = useState(false);
  const today = todayStr();
  const mine = myFit(plans, profile.uid);
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });

  if (!mine.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Antrenman programın" />
        <Empty icon="dumbbell" title="Programını antrenörün hazırlıyor" sub="Program hazır olunca burada ve takvimde görünür, sana bildirim gelir." />
      </main>
    );
  }

  const week = weekStats(mine, today);
  const month = monthStats(mine, today.slice(0, 7), today);
  const recs = records(mine);
  const todays = mine.filter((p) => p.date === today);
  const nextOne = mine.find((p) => p.date > today);
  const upcoming = mine.filter((p) => p.date > today).slice(0, 5);
  const history = mine.filter((p) => p.date < today || p.fit?.res?.st).reverse().slice(0, 12);
  const mon = addDays(today, 1 - dowOf(today));
  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    const p = week.days.find((d) => d.date === date);
    return { date, dow: i + 1, st: p?.st || "", id: p?.id };
  });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Fitness" sub="Antrenörünün hazırladığı program" />
      <TodayCard plan={todays[0]} next={nextOne} today={today} onOpen={open} />
      {todays.slice(1).map((p) => (
        <button key={p.id} type="button" onClick={() => open(p)} className={`${card} mt-2 flex w-full items-center gap-3 px-4 py-3 text-left`}>
          <Icon name="dumbbell" className="size-5 shrink-0 text-acc" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{p.fit?.name || p.title}</span>
          <span className="shrink-0 text-[0.8125rem] text-mut">{p.time || STATUS[statusOf(p, today)]}</span>
        </button>
      ))}
      <WeekStrip week={week} strip={strip} today={today} onOpen={open} />
      {upcoming.length > 0 && (
        <section className="mt-5">
          <small className="block px-1 text-[0.75rem] font-bold tracking-[.06em] text-mut">SIRADAKİ ANTRENMANLAR</small>
          <div className={`${card} mt-2 divide-y divide-line/60`}>
            {upcoming.map((p) => (
              <button key={p.id} type="button" onClick={() => open(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="w-24 shrink-0 text-[0.8125rem] text-mut">
                  {dayText(p.date)}
                  {p.time ? ` ${p.time}` : ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{p.fit?.name || p.title}</span>
                <Icon name="chev" className="size-4 shrink-0 text-mut" />
              </button>
            ))}
          </div>
        </section>
      )}
      {(recs.length > 0 || history.length > 0) && <RowButton icon="trend" title="Gelişim ve geçmiş" sub="En iyi değerler, bu ay" open={more} onClick={() => setMore(!more)} />}
      {more && (
        <>
          <ProgressCard recs={recs} plans={mine} />
          <MonthCard month={month} today={today} />
          <HistoryCard list={history} today={today} onOpen={open} />
        </>
      )}
    </main>
  );
}
