"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIP, EXERCISES, GROUPS, fold } from "@/lib/fitness/exercises";
import { isCustomKey, libList, nameKey } from "@/lib/fitness/library";
import { useFitLib } from "./useFitLib";
import { useOrtak } from "./useOrtak";

// Hareket seç: arama + kas grubu; dokununca seçilir. Liste uygulamanın içinde + kulübün kendi hareketleri (kütüphane).
// Bulunamazsa yazılan adla yeni hareket eklenir (kütüphaneye numarasıyla girer). onPick({ id, name, custom })
export function ExercisePicker({ open, onClose, onPick }) {
  const { lib } = useFitLib();
  // Velora sahibi olmayan hesapta iki sekme (Seyhun 2026-11-27): Velora'nın hareketleri (fotoğraf, animasyon, açıklamayla) ve Benim
  const ortak = useOrtak();
  const vList = ortak.velora ? [] : libList(ortak.lib).filter((e) => e.media?.length || e.how);
  const [tab, setTab] = useState("v");
  const velora = vList.length > 0 && tab === "v";
  const [q, setQ] = useState("");
  const [g, setG] = useState("");
  const f = fold(q);
  const nos = lib?.items || {};
  // Aynı hareket başka yazımla varsa ("+" / "-" / "ve", sözcük sırası) o gösterilir, yeni olarak sunulmaz
  const nk = nameKey(q);
  const own = g ? [] : libList(lib).filter((e) => isCustomKey(e.key) && (!f || fold(e.name).includes(f) || String(e.no) === f || nameKey(e.name) === nk));
  const list = EXERCISES.filter((e) => (!g || e.group === g) && (!f || fold(e.name).includes(f) || e.id.includes(f) || nameKey(e.name) === nk));
  const exact = f && (EXERCISES.some((e) => nameKey(e.name) === nk) || libList(lib).some((e) => nameKey(e.name) === nk));
  const pick = (e) => {
    onPick(e);
    onClose();
    setQ("");
  };
  const row = (key, name, sub, no, e) => (
    <li key={key}>
      <button type="button" onClick={() => pick(e)} data-press="row" className="flex w-full items-center gap-3 py-2.5 text-left">
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
      {vList.length > 0 && (
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-bg p-[3px]">
          {[
            ["v", "Velora hareketleri"],
            ["b", "Benim"],
          ].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={`h-10 rounded-[0.625rem] text-[0.875rem] font-semibold ${tab === k ? "bg-acc text-[#111]" : "text-mut"}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {velora ? (
        <ul className="mt-2 divide-y divide-line">
          {vList
            .filter((e) => !f || fold(e.name).includes(f) || nameKey(e.name) === nk)
            .map((e) => row(`v${e.key}`, e.name, [e.media?.some((m) => m.kind === "photo") && "fotoğraf", e.media?.some((m) => m.a) && "animasyon", e.how && "açıklama"].filter(Boolean).join(", "), 0, { id: e.ex || "", name: e.name, custom: !e.ex, velora: e }))}
        </ul>
      ) : (
      <>
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
            <button type="button" onClick={() => pick({ id: "", name: q.trim().slice(0, 60), custom: true })} data-press="row" className="flex w-full items-center gap-3 py-2.5 text-left">
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
      </>
      )}
    </Sheet>
  );
}
