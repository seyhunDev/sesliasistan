"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Yoklama ekranının görünümü (veri ve kayıt sayfada, attendance/page.jsx). Üst kısım tek kart: gün + sayılar;
// sınıf seçimi ve toplu işaretler listenin hemen üstünde, sporcu listesi ekranın ilk yarısında başlar.
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
  const count = (s) => list.filter((a) => stateOf(a) === s).length;
  const empty = list.filter((a) => !stateOf(a)).length;
  const stats = [
    { n: count("present"), label: "Geldi", tone: ST.present.tone },
    { n: count("absent"), label: "Yok", tone: ST.absent.tone },
    { n: count("excused"), label: "İzinli", tone: ST.excused.tone },
    { n: empty, label: "Boş", tone: "text-mut" },
  ];

  return (
    <>
      {/* Gün ve sayılar: tek kart */}
      <section className="raised mt-1 px-1.5 pb-2.5 pt-1.5">
        <div className="flex items-center">
          <button data-press onClick={() => onDate(shift(date, -1))} aria-label="Önceki gün" className="grid size-10 place-items-center rounded-full">
            <Icon name="back" className="size-5" />
          </button>
          <button data-press onClick={() => onDate(today)} className="min-w-0 flex-1 text-center leading-tight">
            <b className="block truncate text-[0.9375rem] font-semibold capitalize">{dayLabel(date)}</b>
            <small className={`text-[0.75rem] ${date === today ? "text-acc" : "text-mut"}`}>{date === today ? "Bugün" : "Bugüne dön"}</small>
          </button>
          <button data-press onClick={() => onDate(shift(date, 1))} disabled={date >= today} aria-label="Sonraki gün" className="grid size-10 place-items-center rounded-full disabled:opacity-30">
            <Icon name="chev" className="size-5" />
          </button>
        </div>
        <div className="mx-1.5 mt-1.5 grid grid-cols-4 divide-x divide-line border-t border-line pt-2 text-center">
          {stats.map((s) => (
            <span key={s.label} className="leading-tight">
              <b className={`block text-[1.25rem] font-semibold tabular-nums ${s.n ? s.tone : "text-mut/60"}`}>{s.n}</b>
              <small className="text-[0.6875rem] text-mut">{s.label}</small>
            </span>
          ))}
        </div>
      </section>

      {/* Sınıf */}
      {usedClasses.length > 1 && (
        <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
          {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
            <button
              key={c.id || "all"}
              data-press
              onClick={() => onCls(c.id)}
              className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium ${cls === c.id ? "bg-acc text-white" : "bg-card text-fg ring-1 ring-line"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Toplu işaret */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <span className="min-w-0 flex-1 truncate text-[0.75rem] font-semibold uppercase tracking-wide text-mut">{list.length} sporcu</span>
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
