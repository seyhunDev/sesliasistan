"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIP, EXERCISES, GROUPS, fold } from "@/lib/fitness/exercises";

// Hareket seç: arama + kas grubu; dokununca seçilir. Liste uygulamanın içinde (okuma yok).
export function ExercisePicker({ open, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [g, setG] = useState("");
  const f = fold(q);
  const list = EXERCISES.filter((e) => (!g || e.group === g) && (!f || fold(e.name).includes(f) || e.id.includes(f)));
  return (
    <Sheet open={open} onClose={onClose} title="Hareket ekle">
      <label className="flex items-center gap-2 rounded-xl bg-bg px-3">
        <Icon name="search" className="size-4 text-mut" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: squat, şınav, plank…" className="h-11 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none" />
      </label>
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {["", ...GROUPS].map((x) => (
          <button key={x || "all"} type="button" onClick={() => setG(x)} className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ${g === x ? "bg-acc text-white" : "bg-bg"}`}>
            {x || "Hepsi"}
          </button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-line">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                onPick(e);
                onClose();
              }}
              className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70"
            >
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-medium">{e.name}</b>
                <small className="block truncate text-[0.75rem] text-mut">
                  {e.group} · {EQUIP[e.equip]}
                </small>
              </span>
              <Icon name="plus" className="size-4 text-acc" />
            </button>
          </li>
        ))}
        {!list.length && <li className="py-6 text-center text-[0.875rem] text-mut">Bulunamadı</li>}
      </ul>
    </Sheet>
  );
}
