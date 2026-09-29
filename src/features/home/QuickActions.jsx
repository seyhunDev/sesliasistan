"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAdd } from "@/features/add/AddProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { TOOLS, useHomeTools } from "./tools";

// Tek düğme: simge üstte, kısa ad altta (tek satır; uzun ad taşmaz, kesilir)
function Tile({ icon, label, onClick, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition active:scale-95 ${muted ? "border border-dashed border-line" : "bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
    >
      <span className={`grid size-9 place-items-center rounded-full ${muted ? "text-mut" : "bg-acc/10 text-acc"}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className={`w-full truncate text-center text-[12px] font-medium ${muted ? "text-mut" : ""}`}>{label}</span>
    </button>
  );
}

// Ana sayfa hızlı işlemleri: sabit dört (Plan, Görev, Not, Fiş) + seçilen ekstralar + (izinliyse) Sporcular + "Ekle"
export function QuickActions() {
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const router = useRouter();
  const { selected, save } = useHomeTools();
  const [pick, setPick] = useState(false);
  const { profile } = useAuth();
  const athletes = canSeeAthletes(profile?.email); // yalnızca izinli hesapta

  const run = { birthday: () => openBirthday(), schedule: () => router.push("/schedule") };
  const extras = TOOLS.filter((t) => selected.includes(t.id));

  return (
    <>
      <nav aria-label="Hızlı ekle" className="grid grid-cols-4 gap-2">
        <Tile icon="cal" label="Plan" onClick={() => openAdd({ type: "plan" })} />
        <Tile icon="task" label="Görev" onClick={() => openAdd({ type: "task" })} />
        <Tile icon="note" label="Not" onClick={() => openAdd({ type: "note" })} />
        <Tile icon="camera" label="Fiş" onClick={() => openReceipt()} />
        {extras.map((t) => (
          <Tile key={t.id} icon={t.icon} label={t.label} onClick={run[t.id]} />
        ))}
        {athletes && <Tile icon="anchor" label="Sporcular" onClick={() => router.push("/athletes")} />}
        <Tile icon="plus" label="Ekle" muted onClick={() => setPick(true)} />
      </nav>

      <Sheet open={pick} onClose={() => setPick(false)} title="Ana sayfaya ekle">
        <p className="-mt-1 mb-3 text-[14px] text-mut">Plan, görev, not ve fiş her zaman var. İstediğin ekstraları aç; ana sayfada düğmesi ve kartı görünür.</p>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
          {TOOLS.map((t) => {
            const on = selected.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => save(on ? selected.filter((x) => x !== t.id) : [...selected, t.id])}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-card"
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${on ? "bg-acc text-white" : "bg-card text-acc"}`}>
                    <Icon name={t.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[15px] font-semibold">{t.label}</b>
                    <small className="block text-[13px] leading-snug text-mut">{t.desc}</small>
                  </span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-acc" : "bg-line"}`}>
                    <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setPick(false)} className="mt-4 h-12 w-full rounded-xl bg-acc text-[15px] font-semibold text-white active:scale-[.98]">
          Tamam
        </button>
      </Sheet>
    </>
  );
}
