"use client";

import { usePathname } from "next/navigation";
import { useAssistant } from "./AssistantProvider";

// Alt kubbesi (sekmeler) olmayan sayfalarda (ayarlar, kişi, fiş ayrıntısı…) sağ altta küçük asistan düğmesi.
// Dokununca kubbe alttan yükselir ve dinlemeye başlar. Sohbet ekranında yok (yazma satırı orada).
export function AssistantFab() {
  const path = usePathname();
  const { openAssistant, open, stageOn } = useAssistant();
  if (stageOn || open || path.startsWith("/messages")) return null;
  return (
    <button
      type="button"
      onClick={() => openAssistant({ listen: true })}
      aria-label="Asistana sor"
      className="fade-in fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-deep shadow-[0_12px_28px_-12px_rgba(20,70,56,.7)] transition active:scale-90"
    >
      <span className="flex h-5 items-center gap-[3px]" aria-hidden="true">
        {[8, 14, 20, 14, 8].map((h, i) => (
          <i key={i} className="w-[3px] rounded-full bg-white" style={{ height: h }} />
        ))}
      </span>
    </button>
  );
}
