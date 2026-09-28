"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Row } from "@/components/dashboard/Row";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { byStart, isUpcoming, when } from "@/lib/utils/format";

export default function PlansPage() {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const up = plans.filter(isUpcoming).sort(byStart);
  const past = plans.filter((p) => !isUpcoming(p)).sort((a, b) => byStart(b, a));

  const row = (p) => (
    <Row key={p.id} icon="cal" title={p.title} sub={`${when(p)}${p.place ? ` · ${p.place}` : ""}`} onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} />
  );
  const group = (title, list) =>
    list.length > 0 && (
      <section>
        <h3 className="mb-2 mt-6 px-1 text-[13px] font-medium text-mut">{title}</h3>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{list.map(row)}</div>
      </section>
    );

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-32 pt-3">
      <PageHeader title="Planlar" addLabel="Plan" onAdd={() => openAdd({ type: "plan" })} />
      {plans.length === 0 && <p className="py-14 text-center text-sm text-mut">Henüz plan yok.</p>}
      {group("Yaklaşan", up)}
      {group("Geçmiş", past)}
    </main>
  );
}
