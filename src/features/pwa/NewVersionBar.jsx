"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { buildWhen } from "@/lib/buildInfo";
import { applyUpdate, newVersion, subscribeVersion, watchVersion } from "@/lib/newVersion";

// Yayında daha yeni sürüm varsa altta belirgin mavi şerit: "Yeni sürüm var · 9 Ekim 21:10" + Güncelle (sayfa yenilenir).
// (Seyhun 2026-11-06 "güncelleme butonu bağımsız alttan daha belirgin çıksın; canlı yayın sayfasında da")
// × ile o açılış için gizlenir; uygulama yeniden açılınca ya da daha yeni bir sürüm gelince yine çıkar.
// className: yerleşim (varsayılan alt çubuğun üstü); canlı ekran kendi yerini verir (features/liveScreen/CanliUpdate)
export function NewVersionBar({ className = "bottom-[calc(var(--dome-h,var(--stage-h,5.5rem))+0.5rem)]" }) {
  const v = useSyncExternalStore(subscribeVersion, newVersion, () => null);
  const [hid, setHid] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => watchVersion(), []);
  if (!v || hid === v.sha) return null;
  const when = buildWhen(v.at);
  return (
    <div role="status" className={`fade-in pointer-events-none fixed inset-x-0 z-[47] flex justify-center px-4 ${className}`}>
      <div className="pointer-events-auto flex w-full max-w-[26.25rem] items-center gap-3 rounded-2xl bg-[#2563eb] py-2.5 pl-4 pr-2 text-white shadow-[0_8px_28px_rgba(37,99,235,.45)]">
        <span className="min-w-0 flex-1 leading-snug">
          <span className="block text-[0.9375rem] font-semibold">Yeni sürüm var</span>
          {when && <span className="block text-[0.8125rem] text-white/80">{when}</span>}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => (setBusy(true), applyUpdate())}
          data-press
          className="h-10 shrink-0 rounded-xl bg-white px-4 text-[0.9375rem] font-semibold text-[#2563eb] active:translate-y-px"
        >
          {busy ? "Güncelleniyor…" : "Güncelle"}
        </button>
        <button type="button" aria-label="Kapat" onClick={() => setHid(v.sha)} data-press className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 active:translate-y-px">
          <Icon name="x" className="size-4" />
        </button>
      </div>
    </div>
  );
}
