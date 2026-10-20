"use client";

import { Icon } from "@/components/ui/Icon";
import { countsText, kindOf, rangeText } from "./eventModel";

// Asistandaki etkinlik kartı. Soru sorulurken: "Genel plan yap"; kaydedilince: özet, Aç ve Sil.
export function EventCard({ e, onGeneral, onOpen, onDelete }) {
  const [, label, icon] = kindOf(e.kind);
  if (e.asking)
    return (
      <div className="fade-in mt-3 rounded-2xl bg-bg p-3">
        <p className="flex items-center gap-2 text-[0.8125rem] text-mut">
          <Icon name={icon} className="size-4 text-acc" />
          Cevap vermezsen genel bir plan hazırlarım.
        </p>
        <button type="button" onClick={onGeneral} data-press className="btn btn-secondary btn-sm mt-2.5 w-full">
          Genel plan yap
        </button>
      </div>
    );
  if (e.deleted)
    return <p className="fade-in mt-3 rounded-2xl bg-bg px-3 py-2.5 text-[0.8125rem] text-mut">“{e.title}” silindi.</p>;
  return (
    <div className="fade-in mt-3 rounded-2xl bg-bg p-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
          <Icon name={icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{e.title || label}</b>
          <small className="block truncate text-[0.75rem] text-mut">{[rangeText(e.startDate, e.endDate), e.place].filter(Boolean).join(" · ") || "Genel plan"}</small>
          <small className="mt-0.5 block text-[0.75rem] text-mut">{countsText(e)}</small>
        </span>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={onOpen} data-press className="btn btn-primary btn-sm flex-1">
          Aç
        </button>
        <button type="button" onClick={onDelete} data-press className="btn btn-danger btn-sm">
          Sil
        </button>
      </div>
    </div>
  );
}
