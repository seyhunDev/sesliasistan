"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";

const ST = { present: ["Geldi", "text-ok"], absent: ["Gelmedi", "text-rec"], excused: ["İzinli", "text-amber-700"] };
const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Sporcu, öğrenci ve velinin ana sayfası: bu ayın yoklaması (geldi/gelmedi, devam %), son antrenman. Dokununca Yoklamam.
// Veli birden çok sporcuya bağlıysa her biri bir satır. Kayıt yoksa ya da erişim yoksa çizilmez.
export function MyAttendanceCard({ kind }) {
  const { recs } = useMyAttendance(kind);
  if (!recs?.length) return null;
  const parent = kind === "parent";

  return (
    <section aria-label="Yoklama">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">{parent ? "YOKLAMA · BU AY" : "YOKLAMAM · BU AY"}</span>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
        {recs.map((r) => {
          const m = monthOf(r);
          const last = m.last && ST[m.last[1]];
          return (
            <li key={r.id}>
              <Link href="/my-attendance" className="flex items-center gap-3 px-3.5 py-3 active:bg-bg">
                <span className="grid size-[2.625rem] shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-bold tabular-nums text-acc">
                  {m.rate == null ? <Icon name="check" className="size-5" /> : `%${m.rate}`}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">
                    {parent ? r.name : m.rate == null ? "Bu ay yoklama yok" : `${m.present} geldi · ${m.absent} gelmedi`}
                  </b>
                  <small className="block truncate text-[0.75rem] text-mut">
                    {parent && m.rate != null && `${m.present} geldi · ${m.absent} gelmedi · `}
                    {last ? (
                      <>
                        Son: {DAY.format(new Date(`${m.last[0]}T12:00:00`))} <span className={`font-semibold ${last[1]}`}>{last[0]}</span>
                      </>
                    ) : (
                      "Henüz yoklama kaydı yok"
                    )}
                  </small>
                </span>
                <Icon name="chev" className="size-4 shrink-0 text-mut" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
