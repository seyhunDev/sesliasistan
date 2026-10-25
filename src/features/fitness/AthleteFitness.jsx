"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import { STATUS, itemLine, monthStats, myFit, records, statusOf, weekStats } from "@/lib/fitness/model";
import { HistoryCard, MonthCard, ProgressCard } from "./FitDashboard";
import { FitPhoto, WeekBoxes } from "./FitDark";

// Sporcunun Fitness sayfası (salt okunur; Seyhun 2026-10-25 "bizim fitness sayfası gibi"): ana hesabın Sporcular sekmesi gibi baştan sona koyu,
// üstte salon fotoğrafı. Bugünün antrenmanı büyük yazılır, altında bu hafta (çubuk + Pzt–Paz kutuları) ve tek ana düğme;
// sonra bugünün hareketleri, sıradaki antrenmanlar, kapalı "Gelişim ve geçmiş". Programı antrenör hazırlar, sporcu yapar ve sonucu yazar.
// Veri cihazdaki planlardan (ek okuma yok).
const shortDay = (d) => new Date(`${d}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
const WARM = ["warmup", "stretch"];
const began = (p) => p.fit?.res?.ex?.some((e) => e.sets?.some((s) => s.ok));

export function AthleteFitness() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const [more, setMore] = useState(false);
  const today = todayStr();
  const mine = myFit(plans, profile.uid);
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });

  const week = weekStats(mine, today);
  const todays = mine.filter((p) => p.date === today);
  const plan = todays[0];
  const st = plan && statusOf(plan, today);
  const items = (plan?.fit?.items || []).filter((it) => !WARM.includes(it.ex));
  const upcoming = mine.filter((p) => p.date > today).slice(0, 5);
  const history = mine.filter((p) => p.date < today || p.fit?.res?.st).reverse().slice(0, 12);
  const recs = records(mine);
  const sub = !plan
    ? null
    : st === "done"
      ? [["Yaptın", "text-[#9fe7c6]"], plan.fit?.res?.min && [`${plan.fit.res.min} dk`]]
      : st === "skip"
        ? [["Atladın"]]
        : [[`${items.length} hareket`], [`${items.reduce((t, it) => t + (+it.sets || 1), 0)} set`]];

  return (
    <main data-theme="dark" className="navy fit-dark relative mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <FitPhoto />
      <div className="relative flex items-center gap-2.5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <BackButton href="/" className="-my-0.5 touch-manipulation" />
        <h1 className="min-w-0 flex-1 truncate text-[1.875rem] font-bold leading-tight tracking-[-.02em]">Fitness</h1>
      </div>

      {!mine.length ? (
        <section className="relative mt-4">
          <b className="block text-[1.625rem] font-bold leading-tight tracking-[-.02em]">Programın hazırlanıyor</b>
        </section>
      ) : (
        <div className="relative">
          <section className="mt-4">
            <small className="text-[0.75rem] font-bold tracking-[.06em] text-white/60">{`BUGÜN · ${shortDay(today).toLocaleUpperCase("tr-TR")}${plan?.time ? ` · ${plan.time}` : ""}`}</small>
            <b className="mt-0.5 block truncate text-[1.625rem] font-bold leading-tight tracking-[-.02em]">{plan ? plan.fit?.name || plan.title : "Dinlenme günü"}</b>
            {sub && (
              <p className="mt-1 text-[0.875rem] text-white/75">
                {sub.filter(Boolean).map(([t, cl], i) => (
                  <span key={t} className={cl}>
                    {i ? " · " : ""}
                    {t}
                  </span>
                ))}
              </p>
            )}
            {week.planned > 0 && (
              <div className="mt-3.5 flex items-center gap-2.5 text-[0.8125rem]">
                <span className="text-white/75">Bu hafta</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <span className="block h-full rounded-full bg-[#67e8f9]" style={{ width: `${Math.round((week.done / week.planned) * 100)}%` }} />
                </span>
                <b className="tabular-nums">{`${week.done}/${week.planned}`}</b>
              </div>
            )}
            <WeekBoxes days={week.days} today={today} onOpen={open} className="mt-3" />
            {plan && (
              <Button full onClick={() => open(plan)} className="mt-4 [--acc:#0ea5c4]">
                {st === "done" || st === "skip" ? "Sonucu aç" : began(plan) ? "Devam et" : "Antrenmana başla"}
              </Button>
            )}
          </section>

          {plan && st !== "done" && st !== "skip" && items.length > 0 && (
            <section className="mt-7">
              <ListHead title="Bugünkü hareketler" count={items.length} />
              <RowList>
                {items.map((it, i) => (
                  <Row
                    key={i}
                    lead={<span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[.08] text-[0.75rem] font-bold tabular-nums">{i + 1}</span>}
                    title={it.name}
                    right={<span className="text-[0.8125rem] font-semibold text-mut">{itemLine(it)}</span>}
                  />
                ))}
              </RowList>
            </section>
          )}

          {(todays.length > 1 || upcoming.length > 0) && (
            <section className="mt-7">
              <ListHead title="Sıradaki" count={todays.length - 1 + upcoming.length} />
              <RowList>
                {[...todays.slice(1), ...upcoming].map((p) => (
                  <Row key={p.id} onClick={() => open(p)} title={p.fit?.name || p.title} sub={[p.date === today ? STATUS[statusOf(p, today)] : shortDay(p.date), p.time].filter(Boolean).join(" · ")} />
                ))}
              </RowList>
            </section>
          )}

          {(recs.length > 0 || history.length > 0) && (
            <section className="mt-7">
              <RowList>
                <Row onClick={() => setMore(!more)} title="Gelişim ve geçmiş" chev={false} right={<Icon name="chev" className={`size-4 text-mut transition-transform ${more ? "rotate-90" : ""}`} />} />
              </RowList>
              {more && (
                <>
                  <ProgressCard recs={recs} plans={mine} />
                  <MonthCard month={monthStats(mine, today.slice(0, 7), today)} today={today} />
                  <HistoryCard list={history} today={today} onOpen={open} />
                </>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
