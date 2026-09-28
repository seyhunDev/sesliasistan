"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";

export default function TasksPage() {
  const { tasks, plans, toggleTask } = useData();
  const { openAdd } = useAdd();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const planTitle = (id) => plans.find((p) => p.id === id)?.title;

  const group = (title, list) =>
    list.length > 0 && (
      <section>
        <h3 className="mb-2 mt-6 px-1 text-[13px] font-medium text-mut">{title}</h3>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} planTitle={planTitle(t.planId)} onToggle={() => toggleTask(t.id)} onOpen={() => openAdd({ edit: { kind: "task", id: t.id } })} />
          ))}
        </div>
      </section>
    );

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-32 pt-3">
      <PageHeader title="Görevler" addLabel="Görev" onAdd={() => openAdd({ type: "task" })} />
      {tasks.length === 0 && <p className="py-14 text-center text-sm text-mut">Henüz görev yok.</p>}
      {group(`Açık (${open.length})`, open)}
      {group("Tamamlanan", done)}
    </main>
  );
}
