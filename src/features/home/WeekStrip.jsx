"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useData } from "@/features/data/DataProvider";
import { birthdaysOn, dayItems } from "@/lib/agenda";
import { addDays, todayStr } from "@/lib/utils/format";

const WD = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");

// Ana sayfada bu hafta: bugünden itibaren 7 gün; planlı / görevli günler noktalı. Güne dokununca takvim o günle açılır.
export function WeekStrip() {
  const { plans, tasks, birthdays } = useData();
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => (i === 0 ? today : addDays(i)));
  return (
    <section className="rounded-2xl bg-card px-2 pb-2 pt-2.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <Link href="/calendar" className="mx-2 mb-1.5 flex items-center gap-1.5 active:opacity-60">
        <Icon name="cal" className="size-4 text-acc" />
        <b className="flex-1 text-[0.875rem] font-semibold">Takvim</b>
        <Icon name="chev" className="size-4 text-mut" />
      </Link>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const { plans: p, tasks: t } = dayItems(plans, tasks, d);
          const open = t.filter((x) => !x.done).length;
          const bd = birthdaysOn(birthdays, d).length;
          const busy = p.length + open + bd;
          return (
            <Link key={d} href={`/calendar?d=${d}`} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 active:bg-bg">
              <span className={`text-[0.6875rem] font-medium ${i === 0 ? "text-acc" : "text-mut"}`}>{i === 0 ? "Bugün" : WD(d)}</span>
              <span className={`grid size-8 place-items-center rounded-full text-[0.9375rem] font-semibold tabular-nums ${i === 0 ? "bg-acc text-white" : "text-fg"}`}>{+d.slice(8)}</span>
              <span className="flex h-1.5 gap-0.5">
                {p.length > 0 && <i className="size-1.5 rounded-full bg-acc" />}
                {open > 0 && <i className="size-1.5 rounded-full bg-amber-600" />}
                {bd > 0 && <i className="size-1.5 rounded-full bg-pink-500" />}
              </span>
              <span className="text-[0.625rem] tabular-nums text-mut">{busy ? busy : ""}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
