"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Yoklama ekranının görünümü (veri ve kayıt sayfada, attendance/page.jsx). Üstte yalnız gün satırı; sınıf seçimi kapalı
// bir düğme (dokununca liste), toplu işaretlerle aynı satırda; sporcu listesi hemen başlar.
export const ST = {
  present: { label: "Geldi", short: "Geldi", on: "bg-ok text-white", dot: "bg-ok", tone: "text-ok" },
  absent: { label: "Gelmedi", short: "Yok", on: "bg-rec text-white", dot: "bg-rec", tone: "text-rec" },
  excused: { label: "İzinli", short: "İzin", on: "bg-amber-500 text-white", dot: "bg-amber-500", tone: "text-amber-600 dark:text-amber-400" },
};
export const shift = (d, n) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

export function RollView({ date, today, onDate, list, classes, usedClasses, cls, onCls, stateOf, onTap, onBulk, after }) {
  const [menu, setMenu] = useState(false);
  const empty = list.filter((a) => !stateOf(a)).length;
  const clsName = usedClasses.find((c) => c.id === cls)?.name || "Tümü";
  useEffect(() => {
    if (!menu) return;
    const close = (e) => !e.target.closest?.("[data-cls-menu]") && setMenu(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  return (
    <>
      {/* Gün: tek ince satır */}
      <section className="raised mt-1 flex items-center px-1 py-1">
        <button data-press onClick={() => onDate(shift(date, -1))} aria-label="Önceki gün" className="grid size-9 place-items-center rounded-full">
          <Icon name="back" className="size-5" />
        </button>
        <button data-press onClick={() => onDate(today)} className="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold capitalize">
          {dayLabel(date)}
          {date !== today && <span className="ml-1.5 text-[0.75rem] font-medium normal-case text-acc">· Bugüne dön</span>}
        </button>
        <button data-press onClick={() => onDate(shift(date, 1))} disabled={date >= today} aria-label="Sonraki gün" className="grid size-9 place-items-center rounded-full disabled:opacity-30">
          <Icon name="chev" className="size-5" />
        </button>
      </section>

      {/* Sınıf seçimi (kapalı, dokununca açılır) ve toplu işaret aynı satırda */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <div data-cls-menu className="relative min-w-0 flex-1">
          {usedClasses.length > 1 ? (
            <button data-press onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="raised flex h-8 max-w-full items-center gap-1 px-3 text-[0.8125rem] font-semibold">
              <span className="truncate">{clsName}</span>
              <span className="shrink-0 tabular-nums text-mut">{list.length}</span>
              <Icon name="chev" className={`size-3.5 shrink-0 text-mut transition-transform ${menu ? "-rotate-90" : "rotate-90"}`} />
            </button>
          ) : (
            <span className="block truncate text-[0.75rem] font-semibold uppercase tracking-wide text-mut">{list.length} sporcu</span>
          )}
          {menu && (
            <ul className="absolute left-0 top-10 z-20 max-h-72 min-w-[11rem] overflow-y-auto rounded-2xl bg-card py-1 shadow-[0_8px_24px_rgba(38,40,44,.18)] ring-1 ring-line">
              {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
                <li key={c.id || "all"}>
                  <button
                    onClick={() => {
                      onCls(c.id);
                      setMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[0.875rem] ${cls === c.id ? "font-semibold text-acc" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {cls === c.id && <Icon name="check" className="size-4 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button data-press onClick={() => onBulk("present")} disabled={!list.length} className="raised h-8 shrink-0 px-3 text-[0.8125rem] font-semibold text-ok disabled:opacity-40">
          Hepsi geldi
        </button>
        <button data-press onClick={() => onBulk("absent")} disabled={!empty} className="raised h-8 shrink-0 px-3 text-[0.8125rem] font-semibold text-rec disabled:opacity-40">
          Kalanlar yok
        </button>
      </div>

      {/* Sporcular */}
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        {list.map((a) => {
          const s = stateOf(a);
          return (
            <li key={a.id} className="relative flex items-center gap-2 py-2 pl-4 pr-2">
              {s && <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${ST[s].dot}`} />}
              <span className="min-w-0 flex-1">
                <Link href={`/athletes/${a.id}`} className="block truncate text-[0.9375rem] font-medium">{a.studentName}</Link>
                {!cls && classes[a.currentClassId] && <small className="block truncate text-[0.75rem] text-mut">{classes[a.currentClassId]}</small>}
              </span>
              <span className="flex shrink-0 gap-0.5 rounded-xl bg-bg p-0.5">
                {Object.entries(ST).map(([k, v]) => (
                  <button
                    key={k}
                    data-press
                    onClick={() => onTap(a, k)}
                    aria-pressed={s === k}
                    className={`h-9 w-[3.25rem] rounded-[0.625rem] text-[0.8125rem] font-semibold ${s === k ? `${v.on} shadow-sm` : "text-mut"}`}
                  >
                    {v.short}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      {after}
    </>
  );
}
