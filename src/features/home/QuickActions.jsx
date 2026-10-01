"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAdd } from "@/features/add/AddProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { unseenNotes } from "@/lib/people";
import { canSeeAthletes } from "@/features/athletes/access";
import { TOOLS, useHomeTools } from "./tools";

// Tek düğme: simge kutusu üstte, kısa ad altta (tek satır; uzun ad kesilir). Tek sıra halinde dizilir, yer kaplamaz.
function Tile({ icon, label, onClick, muted, badge = 0 }) {
  return (
    <button type="button" onClick={onClick} aria-label={badge ? `${label}, ${badge} okunmamış` : undefined} className="flex min-w-0 flex-col items-center gap-1.5 py-1 transition active:scale-95">
      <span className={`relative grid size-12 place-items-center rounded-2xl ${muted ? "border border-dashed border-mut/40 text-mut" : "bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)]"}`}>
        <Icon name={icon} className="size-6" />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white">{badge > 99 ? "99+" : badge}</span>
        )}
      </span>
      <span className={`w-full truncate text-center text-[0.75rem] font-semibold ${muted ? "text-mut" : ""}`}>{label}</span>
    </button>
  );
}

// Ana sayfa hızlı işlemleri (tek sıra; sığmazsa yana kayar): Mesajlar (okunmamış sayısıyla) herkeste; sabit dört (Plan, Görev, Not, Fiş) + seçilen ekstralar + (izinliyse) Sporcular + (ana hesap) Mailler + "Ekle"
export function QuickActions() {
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const router = useRouter();
  const { selected, save } = useHomeTools();
  const [pick, setPick] = useState(false);
  const { profile } = useAuth();
  const athletes = canSeeAthletes(profile?.email); // yalnızca izinli hesapta
  const mail = profile?.role === "owner"; // Mailler: ana hesapta her zaman
  const { plans, tasks, notes, myUid } = useData();
  const unread = [...plans, ...tasks, ...notes].filter((r) => unseenNotes(r, myUid).length).length; // okunmamış konuşma

  const run = { birthday: () => openBirthday(), schedule: () => router.push("/schedule") };
  const extras = TOOLS.filter((t) => selected.includes(t.id));

  return (
    <>
      <nav aria-label="Hızlı ekle" className="-mx-5 grid auto-cols-[minmax(3.5rem,1fr)] grid-flow-col gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        <Tile icon="cal" label="Plan" onClick={() => openAdd({ type: "plan" })} />
        <Tile icon="task" label="Görev" onClick={() => openAdd({ type: "task" })} />
        <Tile icon="note" label="Not" onClick={() => openAdd({ type: "note" })} />
        <Tile icon="camera" label="Fiş" onClick={() => openReceipt()} />
        {extras.map((t) => (
          <Tile key={t.id} icon={t.icon} label={t.label} onClick={run[t.id]} />
        ))}
        {athletes && <Tile icon="anchor" label="Sporcular" onClick={() => router.push("/athletes")} />}
        <Tile icon="chat" label="Mesajlar" badge={unread} onClick={() => router.push("/messages")} />
        {mail && <Tile icon="mail" label="Mailler" onClick={() => router.push("/mail")} />}
        <Tile icon="plus" label="Ekle" muted onClick={() => setPick(true)} />
      </nav>

      <Sheet open={pick} onClose={() => setPick(false)} title="Ana sayfaya ekle">
        <p className="-mt-1 mb-3 text-[0.875rem] text-mut">Plan, görev, not ve fiş her zaman var. İstediğin ekstraları aç; ana sayfada düğmesi ve kartı görünür.</p>
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
                    <b className="block text-[0.9375rem] font-semibold">{t.label}</b>
                    <small className="block text-[0.8125rem] leading-snug text-mut">{t.desc}</small>
                  </span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-acc" : "bg-line"}`}>
                    <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setPick(false)} className="mt-4 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">
          Tamam
        </button>
      </Sheet>
    </>
  );
}
