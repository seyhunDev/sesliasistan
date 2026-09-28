"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { rel, when } from "@/lib/utils/format";
import { DraftCard } from "./DraftCard";

const META = { plan: { label: "Plan", icon: "cal" }, task: { label: "Görev", icon: "task" }, note: { label: "Not", icon: "note" } };

// Oluşturulacak kaydın sade özeti. "Düzenle" ile tüm alanlar açılır.
export function ItemCard({ d, index, plan, onChange, onType, onRemove }) {
  const [open, setOpen] = useState(false);
  const missing = d.type === "plan" && !d.date;
  const isOpen = open || missing; // eksik tarih varsa kart kendiliğinden açık
  const m = META[d.type];

  const lines = [];
  if (d.type === "plan") {
    lines.push({ icon: "cal", text: d.date ? when(d) : "Tarih seçilmedi", warn: !d.date });
    if (d.date && !d.time && !d.endDate && !d.allDay) lines.push({ icon: "clock", text: "Saat belirtilmedi, tüm gün olarak eklenecek" });
    if (d.place) lines.push({ icon: "pin", text: d.place });
  }
  if (d.type === "task") {
    lines.push({ icon: "clock", text: d.date ? `Son tarih: ${rel(d.date)}` : "Son tarih yok" });
    if (d.link && plan) lines.push({ icon: "cal", text: `Plana bağlı: ${plan.title || "plan"}` });
  }
  const title = d.title || (d.type === "note" ? d.body : "") || "Başlıksız";

  return (
    <div className="animate-pop mt-3 overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-start gap-3 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-bg">
          <Icon name={m.icon} className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">{m.label}</p>
          <p className="mt-0.5 break-words text-[16px] font-semibold leading-snug">{title}</p>
          {lines.map((l, i) => (
            <p key={i} className={`mt-1 flex items-center gap-1.5 text-[13.5px] ${l.warn ? "font-medium text-amber-700" : "text-mut"}`}>
              <Icon name={l.icon} className="size-[15px] shrink-0" />
              <span className="min-w-0 break-words">{l.text}</span>
            </p>
          ))}
          {d.type === "note" && d.body && d.body !== title && <p className="mt-1 line-clamp-2 text-[13.5px] text-mut">{d.body}</p>}
        </div>
        <button type="button" onClick={() => onRemove(index)} aria-label="Kaldır" className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-mut transition active:scale-90">
          <Icon name="x" className="size-4" />
        </button>
      </div>

      <div className="border-t border-line px-3.5 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-acc transition active:opacity-50"
        >
          <Icon name="edit" className="size-4" />
          {isOpen && !missing ? "Bitti" : "Düzenle"}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-line bg-bg/50 p-3.5">
          <DraftCard bare d={d} index={index} plan={plan} noRemove onChange={onChange} onType={onType} />
        </div>
      )}
    </div>
  );
}
