"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAssistant } from "./AssistantProvider";

// Kendi alt çubuğu olmayan sayfalarda (ör. fiş ayrıntısı) sağ altta asistan düğmesi.
// Ana sayfa ve tür sayfalarında alttaki çubuk zaten yaz/söyle sunar.
const HAS_BAR = ["/", "/plans", "/tasks", "/notes", "/receipts", "/calendar", "/schedule", "/birthdays", "/messages", "/athletes/attendance", "/settings", "/mail/setup", "/staff"];
export function AssistantFab() {
  const path = usePathname();
  const { openAssistant, open } = useAssistant();
  if (HAS_BAR.includes(path) || open) return null;
  return (
    <button
      type="button"
      onClick={() => openAssistant({ listen: true })}
      aria-label="Asistana sor"
      className="fade-in fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-acc text-white shadow-lg transition active:scale-90"
    >
      <Icon name="mic" className="size-6" />
    </button>
  );
}
