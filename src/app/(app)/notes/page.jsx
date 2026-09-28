"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Row } from "@/components/dashboard/Row";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";

export default function NotesPage() {
  const { notes } = useData();
  const { openAdd } = useAdd();
  const list = [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-32 pt-3">
      <PageHeader title="Notlar" addLabel="Not" onAdd={() => openAdd({ type: "note" })} />
      {list.length === 0 ? (
        <p className="py-14 text-center text-sm text-mut">Henüz not yok.</p>
      ) : (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {list.map((n) => (
            <Row key={n.id} icon="note" title={n.title} sub={n.body} onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} />
          ))}
        </div>
      )}
    </main>
  );
}
