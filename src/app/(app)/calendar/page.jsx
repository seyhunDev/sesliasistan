"use client";

import { Suspense, useMemo, useState } from "react";
import { ImpTag } from "@/components/ui/ImpTag";
import { isImportant } from "@/lib/planImportant";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Label, card } from "@/components/ui/Page";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useWho } from "@/features/data/useWho";
import { birthdaysOn, dayItems, fitOn, leftLabel, lessonsOn, monthGrid, nextBirthday } from "@/lib/agenda";
import { fitDays } from "@/lib/homeTiles";
import { isFit, statusOf } from "@/lib/fitness/model";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import Link from "next/link";
import { monthLabel, todayStr } from "@/lib/utils/format";

const WEEK = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const shift = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
// Fitness durumu (ana sayfadaki Fitness alanıyla aynı)
const FST = { done: ["Yaptı", "tone-st"], missed: ["Yapmadı", "tone-gen"], skip: ["Atladı", "tone-gen"] };
const longDay = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
// Adres çubuğundaki ?d=YYYY-MM-DD: ana sayfadaki haftadan gelince o gün seçili açılır
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarFromUrl />
    </Suspense>
  );
}
function CalendarFromUrl() {
  const d = useSearchParams().get("d") || "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  return <Calendar key={day} initial={day} />;
}

// Takvim: ay görünümü; tarihli planlar ve görevler noktayla, seçili günün listesi altta.
// Fitness: ana sayfadaki gibi kendi ve sporcuların antrenmanları (fitDays; fitOthers zaten yüklü, ek okuma yok), turuncu nokta ve satır.
function Calendar({ initial }) {
  const { plans: all, fitOthers, members, myUid, tasks, toggleTask, birthdays, lessons } = useData();
  const plans = useMemo(() => all.filter((p) => !isFit(p)), [all]);
  const fit = useMemo(() => fitDays(all, fitOthers || [], members, myUid), [all, fitOthers, members, myUid]);
  const fitDates = useMemo(() => new Set(fit.map((f) => f.date)), [fit]);
  const { openAdd } = useAdd();
  const { openBirthday } = useBirthday();
  const pillOf = useWho();
  const today = todayStr();
  const [sel, setSel] = useState(initial || today);
  const [month, setMonth] = useState((initial || today).slice(0, 7));

  const cells = monthGrid(month);
  const mark = (day) => {
    const { plans: p, tasks: t } = dayItems(plans, tasks, day);
    const open = t.filter((x) => !x.done);
    return { plans: p.length, fit: fitDates.has(day), tasks: open.length, late: day < today && open.length > 0, bday: birthdaysOn(birthdays, day).length };
  };
  const pick = (day) => {
    setSel(day);
    if (day.slice(0, 7) !== month) setMonth(day.slice(0, 7));
  };
  const items = dayItems(plans, tasks, sel);
  const bdays = birthdaysOn(birthdays, sel);
  const dayLessons = lessonsOn(lessons, sel);
  const dayFit = fitOn(fit, sel);
  const count = items.plans.length + dayFit.length + items.tasks.length + bdays.length + dayLessons.length;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Takvim">
        <Link href="/schedule" aria-label="Ders programı" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
          <Icon name="book" className="size-[1.125rem]" />
        </Link>
        {(sel !== today || month !== today.slice(0, 7)) && (
          <button onClick={() => pick(today)} data-press className="btn btn-secondary btn-sm text-acc">
            Bugün
          </button>
        )}
      </PageHeader>

      {/* Ay */}
      <section className={`${card} mt-2 px-2 pb-2 pt-2.5`}>
        <div className="flex items-center justify-between px-1">
          <button onClick={() => setMonth((m) => shift(m, -1))} aria-label="Önceki ay" data-press className="btn btn-icon btn-sm">
            <Icon name="back" className="size-5" />
          </button>
          <b className="text-[1rem] font-semibold capitalize">{monthLabel(month)}</b>
          <button onClick={() => setMonth((m) => shift(m, 1))} aria-label="Sonraki ay" data-press className="btn btn-icon btn-sm">
            <Icon name="chev" className="size-5" />
          </button>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center text-[0.6875rem] font-medium text-mut">
          {WEEK.map((w) => (
            <span key={w} className="py-1">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map(({ day, inMonth }) => {
            const m = mark(day);
            const on = day === sel;
            const isToday = day === today;
            return (
              <button
                key={day}
                onClick={() => pick(day)}
                aria-label={`${longDay(day)}${m.plans ? `, ${m.plans} plan` : ""}${m.fit ? ", fitness" : ""}${m.tasks ? `, ${m.tasks} görev` : ""}`}
                aria-pressed={on}
                className="flex flex-col items-center py-1 active:opacity-60"
              >
                <span
                  className={`grid size-9 place-items-center rounded-full text-[0.9375rem] tabular-nums ${
                    on ? "bg-acc font-semibold text-white" : isToday ? "font-semibold text-acc ring-1 ring-acc/40" : inMonth ? "text-fg" : "text-mut/50"
                  }`}
                >
                  {+day.slice(8)}
                </span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {m.plans > 0 && <i className={`size-1.5 rounded-full ${inMonth ? "bg-acc" : "bg-acc/40"}`} />}
                  {m.fit && <i className={`tone-fit tone-bar size-1.5 rounded-full ${inMonth ? "" : "opacity-40"}`} />}
                  {m.tasks > 0 && <i className={`size-1.5 rounded-full ${m.late ? "bg-rec" : inMonth ? "bg-amber-600" : "bg-amber-600/40"}`} />}
                  {m.bday > 0 && <i className={`size-1.5 rounded-full ${inMonth ? "bg-pink-500" : "bg-pink-500/40"}`} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 pb-0.5 text-[0.6875rem] text-mut">
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-acc" /> Plan</span>
          <span className="flex items-center gap-1"><i className="tone-fit tone-bar size-1.5 rounded-full" /> Fitness</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-amber-600" /> Görev</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-rec" /> Gecikmiş</span>
          <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-pink-500" /> Doğum günü</span>
        </div>
      </section>

      {/* Seçili gün */}
      <Label right={sel === today ? "Bugün" : sel > today ? leftLabel(sel, today) : `${count} kayıt`}>
        <span className={sel === today ? "text-acc" : ""}>{longDay(sel).toLocaleUpperCase("tr-TR")}</span>
      </Label>

      {count === 0 ? (
        <div className={`${card} px-4 py-5 text-center`}>
          <p className="text-[0.875rem] text-mut">Bu gün için kayıt yok.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={() => openAdd({ type: "plan", date: sel })} data-press className="btn btn-primary btn-sm">
              Plan ekle
            </button>
            <button onClick={() => openAdd({ type: "task", date: sel })} data-press className="btn btn-secondary btn-sm">
              Görev ekle
            </button>
            <button onClick={() => openBirthday({ date: sel })} aria-label="Doğum günü ekle" data-press className="btn btn-round btn-sm text-pink-600">
              <Icon name="cake" className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <ul className={`${card} divide-y divide-line overflow-hidden`}>
          {bdays.map((b) => {
            const age = nextBirthday(b, sel).age;
            return (
              <li key={b.id}>
                <button onClick={() => openBirthday({ edit: b.id })} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="grid w-16 shrink-0 place-items-start text-pink-600">
                    <Icon name="cake" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{b.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">Doğum günü{age ? ` · ${age} yaşına giriyor` : ""}{b.note ? ` · ${b.note}` : ""}</small>
                  </span>
                </button>
              </li>
            );
          })}
          {dayLessons.map((l) => (
            <li key={l.id}>
              <Link href="/schedule" className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                <span className="w-16 shrink-0 whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums text-violet-700">{l.start}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-medium">{l.title}</b>
                  <small className="block truncate text-[0.8125rem] text-mut">{["Ders", l.end && `${l.start}–${l.end}`, l.place].filter(Boolean).join(" · ")}</small>
                </span>
                <Icon name="book" className="size-4 shrink-0 text-violet-700/70" />
              </Link>
            </li>
          ))}
          {items.plans.map((p) => {
            const multi = p.endDate && p.endDate !== p.date;
            return (
              <li key={p.id}>
                <button onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg ${isImportant(p) ? "bg-accbg" : ""}`}>
                  <span className="w-16 shrink-0 whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums text-acc">{multi ? "Tüm gün" : p.time || "Tüm gün"}</span>
                  <span className="min-w-0 flex-1">
                    <b className={`block truncate text-[0.9375rem] font-medium ${p.status === "cancelled" ? "text-mut line-through" : ""}`}>{p.title}</b>
                    {(p.place || multi || isImportant(p)) && (
                      <small className="block truncate text-[0.8125rem] text-mut">
                        {isImportant(p) && <ImpTag />}
                        {[multi && `${longDay(p.date).split(" ").slice(0, 2).join(" ")} – ${longDay(p.endDate).split(" ").slice(0, 2).join(" ")}`, p.place].filter(Boolean).join(" · ")}
                      </small>
                    )}
                  </span>
                  {pillOf(p)}
                </button>
              </li>
            );
          })}
          {dayFit.map((f) => {
            const [st, tone] = FST[statusOf(f.plan, today)] || [];
            return (
              <li key={f.id}>
                <button onClick={() => openAdd({ edit: { kind: "plan", id: f.id } })} className="tone-fit flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                  <span className="w-16 shrink-0 whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums text-[var(--tfg)]">{f.plan.time || "Tüm gün"}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{f.mine ? f.plan.fit?.name || f.plan.title || "Fitness" : f.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{["Fitness", !f.mine && (f.plan.fit?.name || f.plan.title)].filter(Boolean).join(" · ")}</small>
                  </span>
                  {st && <span className={`${tone} tone-chip shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold`}>{st}</span>}
                </button>
              </li>
            );
          })}
          {items.tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggleTask(t.id)}
                aria-label={t.done ? "Yeniden aç" : "Yapıldı olarak işaretle"}
                className={`grid size-6 shrink-0 place-items-center rounded-full border-[0.1094rem] transition active:scale-90 ${t.done ? "border-ok bg-ok text-white" : t.due < today ? "border-rec/70 text-transparent" : "border-mut/60 text-transparent"}`}
              >
                <Icon name="check" className="size-3.5 [stroke-width:3]" />
              </button>
              <button onClick={() => openAdd({ edit: { kind: "task", id: t.id } })} className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-60">
                <span className="min-w-0 flex-1">
                  <b className={`block truncate text-[0.9375rem] font-medium ${t.done ? "text-mut line-through" : ""}`}>{t.title}</b>
                  <small className={`block text-[0.8125rem] ${!t.done && t.due < today ? "font-medium text-rec" : "text-mut"}`}>
                    {t.done ? "Yapıldı" : t.due < today ? "Gecikti" : "Görev · son gün"}
                  </small>
                </span>
                {pillOf(t)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
