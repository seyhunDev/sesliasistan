"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { useAdd } from "@/features/add/AddProvider";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";

// Alt çubuk: + (oluştur menüsü) · Konuş · Yaz. Asistan sorar, ekler, yönetir; + elle eklemek için.
export function HomeDock() {
  const { openAssistant } = useAssistant();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  const go = (fn) => () => {
    setMenu(false);
    fn();
  };
  const items = [
    ["cal", "Plan", "Tarih ve saat", go(() => openAdd({ type: "plan" }))],
    ["task", "Görev", "Yapılacak iş", go(() => openAdd({ type: "task" }))],
    ["note", "Not", "Kısa not", go(() => openAdd({ type: "note" }))],
    ["camera", "Fiş", "Fotoğrafla", go(() => openReceipt())],
    ["cake", "Doğum günü", "Hatırlat", go(() => openBirthday())],
    ["book", "Dersler", "Program", go(() => router.push("/schedule"))],
  ];

  return (
    <>
      <VoiceTextBar
        placeholder="Sor veya yaz…"
        onMic={() => openAssistant({ listen: true })}
        onSend={(t) => openAssistant({ text: t })}
        leading={
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Oluştur"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-acc shadow-[0_6px_24px_-8px_rgba(38,40,44,.18)] ring-1 ring-line transition active:scale-90"
          >
            <Icon name="plus" className="size-6" />
          </button>
        }
      />
      <Sheet open={menu} onClose={() => setMenu(false)} title="Oluştur">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map(([icon, label, desc, onClick]) => (
            <button key={label} type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-2xl bg-bg px-3 py-3 text-left transition active:scale-[.98]">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-acc">
                <Icon name={icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[0.9375rem] font-semibold">{label}</b>
                <small className="block truncate text-[0.75rem] text-mut">{desc}</small>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
