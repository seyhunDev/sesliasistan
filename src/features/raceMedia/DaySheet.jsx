"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

// Gün ekle (Seyhun 2026-10-18): yarıştan önce ya da sonra antrenman günü; o günün sayacı, rüzgârı ve çekimleri ayrı tutulur.
// Elle eklenen boş gün buradan kaldırılır (kaydı olan gün kalır).
export function DaySheet({ open, onClose, ...rest }) {
  return (
    <Sheet open={open} onClose={onClose} title="Gün ekle">
      {open && <Body {...rest} />}
    </Sheet>
  );
}

function Body({ days, today, cur, onAdd, onDrop }) {
  const [d, setD] = useState(days.includes(today) ? "" : today);
  const has = days.includes(d);
  return (
    <div className="pb-2">
      <label className="flex items-center justify-between border-y border-line py-3 text-[0.9375rem]">
        <span className="text-mut">Tarih</span>
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} className="bg-transparent text-right font-semibold tabular-nums outline-none" />
      </label>
      {has && <p className="mt-2 px-1 text-[0.8125rem] text-mut">Bu gün zaten var.</p>}
      <button type="button" disabled={!d || has} onClick={() => onAdd(d)} data-press className="btn btn-primary mt-4 h-14 w-full">
        Ekle
      </button>
      {cur?.empty && (
        <button type="button" onClick={() => onDrop(cur.day)} data-press className="btn btn-danger mt-2 w-full">
          {cur.name} gününü kaldır
        </button>
      )}
    </div>
  );
}
