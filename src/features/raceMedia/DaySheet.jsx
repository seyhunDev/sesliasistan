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

// Gün seçimi (Seyhun 2026-10-29: şerit yerine Özet'in yanında tek gün düğmesi, dokununca bu liste; bugün açılışta seçili)
export function DayPick({ open, onClose, days, names, cur, today, label, onPick, onAdd }) {
  return (
    <Sheet open={open} onClose={onClose} title="Gün">
      <ul className="divide-y divide-line border-y border-line">
        {days.map((d) => (
          <li key={d}>
            <button type="button" data-day={d} aria-pressed={d === cur} onClick={() => onPick(d)} data-press="row" className="flex w-full items-center gap-3 py-3 text-left">
              <b className="w-16 shrink-0 text-[0.9375rem] font-semibold tabular-nums">{label(d)}</b>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{names[d]}{d === today ? " · Bugün" : ""}</span>
              {d === cur && <span className="size-2.5 shrink-0 rounded-full bg-acc" />}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onAdd} data-press className="btn btn-secondary mt-4 w-full">
        Gün ekle
      </button>
    </Sheet>
  );
}
