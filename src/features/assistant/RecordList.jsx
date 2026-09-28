"use client";

import { Row } from "@/components/dashboard/Row";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { fdate, when } from "@/lib/utils/format";

const dateKey = (it) =>
  it.kind === "plan" ? it.rec.date : it.kind === "task" ? it.rec.due || "Tarihsiz" : (it.rec.createdAt || "").slice(0, 10) || "Tarihsiz";

// Asistanın yanıtına dayanak olan kayıtlar: güne göre gruplu, dokununca düzenleme ekranı açılır
export function RecordList({ items, plans, onOpen, onToggle }) {
  const groups = {};
  items.forEach((it) => {
    const k = dateKey(it);
    (groups[k] = groups[k] || []).push(it);
  });
  const keys = Object.keys(groups).sort((a, b) => (a === "Tarihsiz" ? 1 : b === "Tarihsiz" ? -1 : a.localeCompare(b)));

  return (
    <div className="fade-in mt-5">
      {keys.map((k) => (
        <section key={k}>
          <h3 className="mb-2 mt-4 px-1 text-[12.5px] font-semibold uppercase tracking-wider text-mut">{k === "Tarihsiz" ? "Tarihsiz" : fdate(k)}</h3>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {groups[k].map((it) =>
              it.kind === "task" ? (
                <TaskRow
                  key={`t${it.rec.id}`}
                  task={it.rec}
                  planTitle={plans.find((p) => p.id === it.rec.planId)?.title}
                  onToggle={() => onToggle(it.rec.id)}
                  onOpen={() => onOpen("task", it.rec.id)}
                />
              ) : it.kind === "plan" ? (
                <Row key={`p${it.rec.id}`} icon="cal" title={it.rec.title} sub={`${it.rec.endDate ? when(it.rec) : it.rec.time || "Tüm gün"}${it.rec.place ? ` · ${it.rec.place}` : ""}`} onClick={() => onOpen("plan", it.rec.id)} />
              ) : (
                <Row key={`n${it.rec.id}`} icon="note" title={it.rec.title} sub={it.rec.body} onClick={() => onOpen("note", it.rec.id)} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
