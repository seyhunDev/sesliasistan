"use client";

import { Icon } from "@/components/ui/Icon";

// "Seni bekleyenler" satırı (ana sayfa, notların altında): kırmızı karede sayı, sağda ilk işlerin adı (bekleyen yoksa çizilmez;
// ayrıntı zil penceresinde). Eskiden takvim kartının (SiradaCard) altındaydı; takvim listesi 2026-10-23'te kalktı.
export function WaitRow({ inbox, onAll }) {
  const list = inbox?.list || [];
  if (!list.length) return null;
  const peek = list.map((x) => x.title).filter((t) => typeof t === "string" && t).slice(0, 3).join(", ");
  return (
    <button type="button" onClick={onAll} className="mt-2.5 flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-card px-3.5 py-2.5 text-left">
      <span aria-hidden="true" className="grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-[var(--red)] text-[0.8125rem] font-bold tabular-nums text-white">
        {list.length}
      </span>
      <span className="shrink-0">Seni bekleyenler</span>
      <span className="min-w-0 flex-1 truncate text-right text-mut">{peek}</span>
      <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
    </button>
  );
}
