"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { openSanal } from "@/lib/sanal";

// Ana sayfada yemek kartının altında ayrı Market düğmesi (Seyhun 2026-10-25): Alışveriş › Market'teki gibi Velora Sanal'ı açar (lib/sanal.js)
export function MarketButton() {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await openSanal();
    } finally {
      setTimeout(() => setBusy(false), 3000);
    }
  };
  return (
    <button type="button" data-press onClick={go} aria-busy={busy} className="food-card flex h-14 w-full min-w-0 items-center gap-2.5 rounded-[1.125rem] px-4 text-left">
      <Icon name="cart" className="size-5 shrink-0 text-[#22d3ee]" />
      <span className="flex-1 truncate text-[0.9375rem] font-semibold">Market</span>
      {busy && <span className="text-[0.8125rem] text-[#9fb0cc]">Açılıyor…</span>}
    </button>
  );
}
