"use client";

import { Icon } from "@/components/ui/Icon";
import { itemLabel, kindOf } from "./invModel";

// Asistandaki envanter kartı: yapılanlardan sonra "Envanteri aç"; silme sorulurken Sil / Vazgeç
export function InvCard({ v, onOpen, onDelete, onKeep }) {
  return (
    <div className="fade-in mt-3 rounded-2xl bg-bg p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
          <Icon name={kindOf(v.kind)[2]} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{v.name}</b>
          <small className="block truncate text-[0.75rem] text-mut">{v.ask?.length ? `Silinecek: ${v.ask.map(itemLabel).join(", ")}` : v.sub}</small>
        </span>
      </div>
      {v.ask?.length ? (
        <div className="mt-2.5 flex gap-2">
          <button type="button" onClick={onDelete} className="h-9 flex-1 rounded-xl bg-rec text-[0.8125rem] font-semibold text-white active:scale-[.98]">
            Sil
          </button>
          <button type="button" onClick={onKeep} className="h-9 flex-1 rounded-xl bg-card text-[0.8125rem] font-semibold text-fg ring-1 ring-line active:scale-[.98]">
            Vazgeç
          </button>
        </div>
      ) : (
        <button type="button" onClick={onOpen} className="mt-2.5 h-9 w-full rounded-xl bg-acc text-[0.8125rem] font-semibold text-white active:scale-[.98]">
          Envanteri aç
        </button>
      )}
    </div>
  );
}
