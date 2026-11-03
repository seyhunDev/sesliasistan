"use client";

import { useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Icon } from "@/components/ui/Icon";
import { DelBadge, Empty } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { addDate } from "@/lib/ai/digest";
import { groupTasks } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";
import { assigneesOf, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";
import { WordCard } from "@/features/words/WordCard";

// Görevler (yeni tasarım, 2026-11-03): lacivert üstte açık görev sayısı büyük, dağılım çubuğu ve Geciken · Bugün · Bu hafta,
// "+ Görev", ana hesapta kişi çipleri; altta son tarihe göre gruplar (gecikenler en üstte). Tek dokunuşla "yapıldı", bildirimde Geri al. Yapılanlar arşivde.
export default function TasksPage() {
  const { tasks, plans, toggleTask, removeWithUndo, myUid, nameOf, members, isStaff } = useData();
  const pillOf = useWho(); // ana hesapta görevli etiketi; çalışanda "Ana hesap ekledi" yazısı
  const { openAdd } = useAdd();
  const toast = useToast();
  const [who, setWho] = useState("all"); // all | me | uid
  const done = (t) => {
    toggleTask(t.id);
    toast(`Yapıldı · ${t.title}`, { action: { label: "Geri al", onClick: () => toggleTask(t.id) } });
  };
  const today = todayStr();
  const weekAgo = addDate(today, -6);

  const mine = (t) => (who === "all" ? true : who === "me" ? !assigneesOf(t).length || assigneesOf(t).includes(myUid) : assigneesOf(t).includes(who));
  const open = tasks.filter((t) => !t.done);
  const shown = open.filter(mine);
  const groups = groupTasks(shown, today);
  const doneWeek = tasks.filter((t) => t.done && (t.doneAt || "").slice(0, 10) >= weekAgo).length;
  const cnt = (k) => groupTasks(open, today).find((g) => g.key === k)?.items.length || 0;
  const late = cnt("late");
  const dueToday = cnt("today");
  const week = cnt("tomorrow") + cnt("week");
  const rest = open.length - late - dueToday - week;
  const planTitle = (id) => plans.find((p) => p.id === id)?.title;
  const countFor = (k) => open.filter((t) => (k === "all" ? true : k === "me" ? !assigneesOf(t).length || assigneesOf(t).includes(myUid) : assigneesOf(t).includes(k))).length;
  const people = !isStaff && members.length > 0 ? [["all", "Herkes"], ["me", "Benim"], ...members.map((m) => [m.uid, (m.name || "").split(" ")[0]])].map(([k, l]) => [k, l, countFor(k)]) : [];
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  const list = (items) => (
    <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line">
      {items.map((t) => (
        <SwipeRow
          key={t.id}
          actions={[
            { label: "Yapıldı", icon: "check", tone: "neutral", onAction: () => done(t) },
            { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("task", t.id) },
          ]}
        >
          <div className="bg-card">
            <TaskRow
              task={t}
              planTitle={planTitle(t.planId)}
              pill={pillOf(t)}
              who={pillOf(t) ? "" : whoText(t, myUid, nameOf)}
              badge={t.deleteReq && <DelBadge rec={t} />}
              onToggle={() => done(t)}
              onOpen={() => openAdd({ edit: { kind: "task", id: t.id } })}
            />
          </div>
        </SwipeRow>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Görevler">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Görevler</h1>
          <button type="button" onClick={() => openAdd({ type: "task" })} data-press className="ck-btn shrink-0 !flex items-center gap-1">
            <Icon name="plus" className="size-4" />
            Görev
          </button>
        </header>

        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="flex min-w-0 items-baseline gap-1.5">
            <b className="text-[2.125rem] font-bold leading-none tracking-[-.02em] tabular-nums text-white">{open.length}</b>
            <span className="truncate text-[1rem] text-white/60">açık</span>
          </p>
          <span className="shrink-0 text-[0.8125rem] tabular-nums text-white/65">7 günde {doneWeek} yapıldı</span>
        </div>
        {open.length > 0 && (
          <div className="mt-3 flex h-1.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
            {[
              [late, "bg-rec"],
              [dueToday, "bg-white"],
              [week, "bg-white/55"],
              [rest, "bg-white/20"],
            ].map(([v, c], i) => v > 0 && <i key={i} className={`h-full rounded-full ${c}`} style={{ flexGrow: v }} />)}
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [late, "Geciken", late > 0],
            [dueToday, "Bugün"],
            [week, "Bu hafta"],
          ].map(([n, l, warn]) => (
            <div key={l} className="ck-glass min-w-0 rounded-xl px-3 py-2">
              <b className={`block text-[1.125rem] font-bold leading-tight tabular-nums ${warn ? "text-rec" : "text-white"}`}>{n}</b>
              <small className="block truncate text-[0.75rem] text-white/65">{l}</small>
            </div>
          ))}
        </div>

        {people.length > 0 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {people.map(([k, l, c]) => (
              <button key={k} type="button" onClick={() => setWho(k)} aria-pressed={who === k} data-press className={`${pill0} ${who === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
                <span className="max-w-[8rem] truncate">{l}</span>
                <span className="ml-1.5 tabular-nums opacity-70">{c}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {tasks.length === 0 && <Empty icon="task" title="Henüz görev yok" />}
        {tasks.length > 0 && groups.length === 0 && <Empty icon="check" title="Açık görev kalmadı" />}
        {groups.map((g) => (
          <section key={g.key}>
            <ListHead title={g.label} count={g.items.length} />
            {list(g.items)}
          </section>
        ))}

        {tasks.length > 0 && (
          <Link href="/archive?t=task" className="block text-center text-[0.875rem] font-semibold text-acc active:opacity-70">
            Arşiv ›
          </Link>
        )}

        <WordCard />
      </div>
    </main>
  );
}
