"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { useAdd } from "@/features/add/AddProvider";
import { AddBar } from "@/features/add/AddBar";
import { useData } from "@/features/data/DataProvider";
import { groupTasks } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";
import { whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

const DONE_SHOWN = 5; // tamamlananlardan ilk başta gösterilen

export default function TasksPage() {
  const { tasks, plans, toggleTask, removeWithUndo, myUid, nameOf } = useData();
  const pillOf = useWho(); // ana hesapta görevli etiketi; çalışanda "Ana hesap ekledi" yazısı
  const { openAdd } = useAdd();
  const [showDone, setShowDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const groups = groupTasks(tasks.filter((t) => !t.done), todayStr());
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  const openCount = tasks.filter((t) => !t.done).length;
  const planTitle = (id) => plans.find((p) => p.id === id)?.title;

  const list = (items) => (
    <div className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      {items.map((t) => (
        <SwipeRow key={t.id} actions={[{ label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("task", t.id) }]}>
          <TaskRow task={t} planTitle={planTitle(t.planId)} pill={pillOf(t)} who={pillOf(t) ? "" : whoText(t, myUid, nameOf)} onToggle={() => toggleTask(t.id)} onOpen={() => openAdd({ edit: { kind: "task", id: t.id } })} />
        </SwipeRow>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-[calc(120px+env(safe-area-inset-bottom))]">
      <PageHeader title="Görevler" sub={openCount ? `${openCount} açık görev` : "Açık görev yok"} />
      {tasks.length === 0 && <p className="py-14 text-center text-sm text-mut">Henüz görev yok.<br />Aşağıya yaz, mikrofona bas ya da + ile elle ekle.</p>}
      {tasks.length > 0 && groups.length === 0 && <p className="py-10 text-center text-sm text-mut">Açık görev kalmadı. 🎉</p>}

      {groups.map((g) => (
        <section key={g.key}>
          <h3 className={`mb-2 mt-6 px-1 text-[13px] font-semibold ${g.key === "late" ? "text-rec" : "text-mut"}`}>
            {g.label} <span className="font-normal">· {g.items.length}</span>
          </h3>
          {list(g.items)}
        </section>
      ))}

      {done.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setShowDone((v) => !v)} className="flex w-full items-center justify-between px-1 text-[13px] font-semibold text-mut active:opacity-60">
            <span>Tamamlanan · {done.length}</span>
            <span className="font-medium text-acc">{showDone ? "Gizle" : "Göster"}</span>
          </button>
          {showDone && (
            <div className="mt-2">
              {list(allDone ? done : done.slice(0, DONE_SHOWN))}
              {!allDone && done.length > DONE_SHOWN && (
                <button onClick={() => setAllDone(true)} className="mt-2 w-full py-2 text-center text-[13px] font-medium text-acc active:opacity-60">
                  Tümünü göster ({done.length})
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {tasks.length > 0 && <p className="mt-8 text-center text-[12px] text-mut">İpucu: silmek için satırı sola kaydır.</p>}
      <AddBar type="task" />
    </main>
  );
}
