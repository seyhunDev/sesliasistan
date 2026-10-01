"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, DelBadge, Empty, Hero, HeroLabel, Label, Stat, card } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { useAdd } from "@/features/add/AddProvider";
import { AddBar } from "@/features/add/AddBar";
import { useData } from "@/features/data/DataProvider";
import { addDate } from "@/lib/ai/digest";
import { groupTasks } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";
import { assigneesOf, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";


// Görevler: üstte durum (açık, geciken, bugün, bu hafta; dağılım çubuğu), ana hesapta kişiye göre süzme,
// altında son tarihe göre gruplar. Tamamlananlar ayrı sekmede.
export default function TasksPage() {
  const { tasks, plans, toggleTask, removeWithUndo, myUid, nameOf, members, isStaff } = useData();
  const pillOf = useWho(); // ana hesapta görevli etiketi; çalışanda "Ana hesap ekledi" yazısı
  const { openAdd } = useAdd();
  const [who, setWho] = useState("all"); // all | me | uid
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
  const people = !isStaff && members.length > 0 ? [["all", "Herkes"], ["me", "Ana hesap"], ...members.map((m) => [m.uid, (m.name || "").split(" ")[0]])] : [];

  const list = (items) => (
    <div className={`${card} divide-y divide-line overflow-hidden`}>
      {items.map((t) => (
        <SwipeRow key={t.id} actions={[{ label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("task", t.id) }]}>
          <TaskRow
            task={t}
            planTitle={planTitle(t.planId)}
            pill={pillOf(t)}
            who={pillOf(t) ? "" : whoText(t, myUid, nameOf)}
            badge={t.deleteReq && <DelBadge rec={t} />}
            onToggle={() => toggleTask(t.id)}
            onOpen={() => openAdd({ edit: { kind: "task", id: t.id } })}
          />
        </SwipeRow>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Görevler" sub={open.length ? `${open.length} açık görev` : "Açık görev yok"}>
        <ArchiveLink type="task" />
      </PageHeader>

      <Hero className="mt-2">
        <div className="flex items-baseline justify-between gap-3">
          <HeroLabel>DURUM</HeroLabel>
          <span className="text-[0.75rem] tabular-nums text-white/75">son 7 günde {doneWeek} tamamlandı</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <b className="text-[2.625rem] font-semibold leading-none tracking-tight tabular-nums">{open.length}</b>
          <span className="pb-1 text-[0.8125rem] text-white/80">açık görev</span>
        </div>
        {open.length > 0 && (
          <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full" aria-hidden="true">
            {[
              [late, "bg-[#ff9b8a]"],
              [dueToday, "bg-white"],
              [week, "bg-white/55"],
              [rest, "bg-white/25"],
            ].map(([v, c], i) => v > 0 && <i key={i} className={`h-full rounded-full ${c}`} style={{ flexGrow: v }} />)}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Stat n={late} label="geciken" tone={late ? "rec" : ""} />
          <Stat n={dueToday} label="bugün" />
          <Stat n={week} label="bu hafta" />
        </div>
      </Hero>


      {people.length > 0 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {people.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setWho(k)}
              aria-pressed={who === k}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition active:scale-95 ${who === k ? "bg-acc text-white" : "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.06)]"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {tasks.length === 0 && <Empty icon="task" title="Henüz görev yok" sub="Aşağıdan söyle, yaz ya da + ile ekle." />}
      {tasks.length > 0 && groups.length === 0 && <Empty icon="check" title="Açık görev kalmadı" sub="Tamamlananlar arşivde." />}
      {groups.map((g) => (
        <section key={g.key}>
          <Label tone={g.key === "late" ? "rec" : ""} right={g.items.length}>
            {g.label.toLocaleUpperCase("tr-TR")}
          </Label>
          {list(g.items)}
        </section>
      ))}

      {tasks.length > 0 && <p className="mt-8 text-center text-[0.75rem] text-mut">İpucu: silmek için satırı sola kaydır.</p>}
      <AddBar type="task" />
    </main>
  );
}
