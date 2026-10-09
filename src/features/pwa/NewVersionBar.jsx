"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { buildWhen } from "@/lib/buildInfo";
import { applyUpdate, newVersion, subscribeVersion, watchVersion } from "@/lib/newVersion";

// Yayında daha yeni sürüm varsa üstte küçük kart: "Yeni sürüm var · 9 Ekim 21:10" + Güncelle düğmesi (sayfa yenilenir).
// × ile o açılış için gizlenir; uygulama yeniden açılınca ya da daha yeni bir sürüm gelince yine çıkar.
export function NewVersionBar() {
  const v = useSyncExternalStore(subscribeVersion, newVersion, () => null);
  const [hid, setHid] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => watchVersion(), []);
  if (!v || hid === v.sha) return null;
  const when = buildWhen(v.at);
  return (
    <div role="status" className="fade-in fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[47] flex justify-center px-4">
      <div className="flex w-full max-w-[26.25rem] items-center gap-2.5 rounded-2xl bg-card py-2 pl-3.5 pr-2 shadow-[0_4px_16px_rgba(38,40,44,.14)]">
        <span className="size-2 shrink-0 rounded-full bg-acc" />
        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
          <span className="block font-semibold">Yeni sürüm var</span>
          {when && <span className="block text-mut">{when}</span>}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => (setBusy(true), applyUpdate())}
          className="shrink-0 rounded-full bg-acc px-3.5 py-1.5 text-[0.8125rem] font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Güncelleniyor…" : "Güncelle"}
        </button>
        <button type="button" aria-label="Kapat" onClick={() => setHid(v.sha)} className="grid size-7 shrink-0 place-items-center rounded-full text-mut">
          <Icon name="x" className="size-4" />
        </button>
      </div>
    </div>
  );
}
