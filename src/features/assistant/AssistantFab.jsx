"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAssistant } from "./AssistantProvider";

// Ana sayfa dışındaki her sayfada sağ altta asistan düğmesi
export function AssistantFab() {
  const path = usePathname();
  const { openAssistant, open } = useAssistant();
  if (path === "/" || open) return null;
  return (
    <button
      type="button"
      onClick={() => openAssistant({ listen: true })}
      aria-label="Asistana sor"
      className="fade-in fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-acc text-white shadow-lg transition active:scale-90"
    >
      <Icon name="mic" className="size-6" />
    </button>
  );
}
