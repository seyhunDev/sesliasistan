"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIP, EXERCISES, GROUPS, fold } from "@/lib/fitness/exercises";
import { isCustomKey, libList } from "@/lib/fitness/library";
import { useFitLib } from "./useFitLib";

// Hareket seç: arama + kas grubu; dokununca seçilir. Liste uygulamanın içinde + kulübün kendi hareketleri (kütüphane).
// Bulunamazsa yazılan adla yeni hareket eklenir (kütüphaneye numarasıyla girer). onPick({ id, name, custom })
export function ExercisePicker({ open, onClose, onPick }) {
  const { lib } = useFitLib();
  const [q, setQ] = useState("");
  const [g, setG] = useState("");
  const f = fold(q);
  const nos = lib?.items || {};
  const own = g ? [] : libList(lib, q).filter((e) => isCustomKey(e.key));
  const list = EXERCISES.filter((e) => (!g || e.group === g) && (!f || fold(e.name).includes(f) || e.id.includes(f)));
  const exact = f && (list.some((e) => fold(e.name) === f) || own.some((e) => fold(e.name) === f));
  const pick = (e) => {
    onPick(e);
    onClose();
    setQ("");
  };
  const row = (key, name, sub, no, e) => (
    <li key={key}>
      <button type="button" onClick={() => pick(e)} className="flex w-full items-center gap-3 py-2.5 text-left">
        {no ? <span className="w-8 shrink-0 text-[0.75rem] font-semibold tabular-nums text-mut">{no}</span> : null}
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-medium">{name}</b>
          <small className="block truncate text-[0.75rem] text-mut">{sub}</small>
        </span>
        <Icon name="plus" className="size-4 text-acc" />
      </button>
    </li>
  );
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
        {q.trim() && !exact && (
          <li>
            <button type="button" onClick={() => pick({ id: "", name: q.trim().slice(0, 60), custom: true })} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold text-acc">“{q.trim()}” adıyla ekle</b>
                <small className="block truncate text-[0.75rem] text-mut">Listede yok, yeni hareket olarak eklenir</small>
              </span>
              <Icon name="plus" className="size-4 text-acc" />
            </button>
          </li>
        )}
        {own.map((e) => row(e.key, e.name, "Kulübün hareketi", e.no, { id: "", name: e.name, custom: true }))}
        {list.map((e) => row(e.id, e.name, `${e.group} · ${EQUIP[e.equip]}`, nos[e.id]?.no, e))}
        {!list.length && !own.length && !q.trim() && <li className="py-6 text-center text-[0.875rem] text-mut">Bulunamadı</li>}
      </ul>
    </Sheet>
  );
}
