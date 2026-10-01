"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { rel, when } from "@/lib/utils/format";
import { DraftCard, NoStaffRow } from "./DraftCard";

const META = { plan: { label: "Plan", icon: "cal" }, task: { label: "Görev", icon: "task" }, note: { label: "Not", icon: "note" } };

// Oluşturulacak kaydın tek satırlık özeti; satıra dokununca alanlar açılır (liste içinde kullanılır)
export function ItemCard({ d, index, plan, assign, onAddStaff, onChange, onType, onRemove }) {
  const [open, setOpen] = useState(false);
  const missing = d.type === "plan" && !d.date;
  const isOpen = open || missing || (!d.title && !d.body); // eksik tarih ya da boş (yeni eklenen) kart kendiliğinden açık
  const m = META[d.type];

  const meta = [m.label];
  if (d.type === "plan") {
    meta.push(d.date ? when(d) : "Tarih seçilmedi");
    if (d.place) meta.push(d.place);
  } else if (d.type === "task") {
    meta.push(d.date ? `Son: ${rel(d.date)}` : "Son tarih yok");
    if (d.link && plan) meta.push(`Plan: ${plan.title || "plan"}`);
  } else if (d.body && d.body !== d.title) meta.push(d.body);

  const title = d.title || (d.type === "note" ? d.body : "") || "Başlıksız";

  return (
    <div className="animate-pop">
      <div className="flex items-center gap-2 py-2.5 pl-3.5 pr-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60">
          <Icon name={m.icon} className="size-5 shrink-0 text-acc" />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-medium">{title}</b>
            <small className={`block truncate text-[0.8125rem] ${missing ? "font-medium text-amber-700" : "text-mut"}`}>{meta.join(" · ")}</small>
          </span>
          <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${isOpen ? "rotate-90" : ""}`} />
        </button>
        <button type="button" onClick={() => onRemove(index)} aria-label="Kaldır" className="grid size-8 shrink-0 place-items-center rounded-full text-mut transition active:scale-90 active:bg-bg">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      {/* Sorumlu: kartı açmadan da seçilebilsin (yapay zeka anlamadıysa buradan elle) */}
      {!isOpen && assign?.length > 0 && <QuickAssign d={d} index={index} members={assign} onChange={onChange} />}
      {!isOpen && assign && !assign.length && onAddStaff && <NoStaffRow compact onAdd={onAddStaff} />}
      {isOpen && (
        <div className="border-t border-line bg-bg/60 p-3.5">
          <DraftCard bare d={d} index={index} plan={plan} assign={assign} onAddStaff={onAddStaff} noRemove onChange={onChange} onType={onType} />
        </div>
      )}
    </div>
  );
}

// Kart kapalıyken tek satır sorumlu seçimi: Genel + çalışanlar (birden fazla seçilebilir)
function QuickAssign({ d, index, members, onChange }) {
  const cur = (d.assignees || []).filter((u) => members.some((m) => m.uid === u));
  const set = (v) => onChange(index, { assignees: v, _general: !v.length }); // "Genel" bilinçli seçildi: kaydederken tekrar sorulmaz
  const toggle = (uid) => set(cur.includes(uid) ? cur.filter((u) => u !== uid) : [...cur, uid]);
  const chip = (on) =>
    `inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 pb-3 [scrollbar-width:none]">
      <span className="mr-0.5 flex shrink-0 items-center gap-1 text-[0.75rem] font-medium text-mut">
        <Icon name="users" className="size-3.5" /> Sorumlu
      </span>
      <button type="button" onClick={() => set([])} className={chip(!cur.length && d._general)}>
        Genel
      </button>
      {members.map((m) => (
        <button key={m.uid} type="button" aria-pressed={cur.includes(m.uid)} onClick={() => toggle(m.uid)} className={chip(cur.includes(m.uid))}>
          {cur.includes(m.uid) && <Icon name="check" className="size-3.5" />}
          {m.name}
        </button>
      ))}
    </div>
  );
}
