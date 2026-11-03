"use client";

import { BackButton } from "@/components/ui/BackButton";
import { Empty } from "@/components/ui/Page";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useData } from "@/features/data/DataProvider";
import { daysBetween, leftLabel, monthYear, nextBirthday, upcomingBirthdays } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";

const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const DAY = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const wd = (s) => DAY[new Date(`${s}T12:00`).getDay()];
const shortDay = (s) => `${wd(s)} ${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]}`;

// Doğum günleri (yeni tasarım, 2026-11-03): lacivert üstte sıradaki (ad, gün, kaç gün kaldı), altta aylara göre liste.
// Satır: solda gün kutusu, ad, altında yaş · not, sağda kalan gün; dokununca düzenleme penceresi.
export default function BirthdaysPage() {
  const { birthdays } = useData();
  const { openBirthday } = useBirthday();
  const today = todayStr();
  const all = birthdays.map((b) => ({ ...b, ...nextBirthday(b, today) })).sort((a, b) => a.date.localeCompare(b.date));
  const next = all[0];
  const soon = upcomingBirthdays(birthdays, today, 30).length;
  const left = next ? daysBetween(today, next.date) : 0;
  const months = [...new Set(all.map((b) => b.date.slice(0, 7)))];
  const sub = birthdays.length ? [`${birthdays.length} kişi`, soon && `30 günde ${soon}`].filter(Boolean).join(" · ") : "Henüz yok";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Doğum günleri">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Doğum günleri</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>
          </div>
        </header>

        {next && (
          <button type="button" onClick={() => openBirthday({ edit: next.id })} data-press className="ck-glass mt-4 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left">
            <span className="min-w-0 flex-1">
              <small className="block truncate text-[0.8125rem] font-semibold text-white/65">{left === 0 ? "Bugün" : "Sıradaki"}</small>
              <b className="block truncate text-[1.375rem] font-bold leading-tight tracking-[-.02em]">{next.name}</b>
              <small className="block truncate text-[0.8125rem] text-white/65">{[shortDay(next.date), next.age && `${next.age} yaşına giriyor`].filter(Boolean).join(" · ")}</small>
            </span>
            {left > 0 && (
              <span className="shrink-0 text-right leading-none">
                <b className="block text-[2rem] font-bold tabular-nums tracking-[-.02em]">{left}</b>
                <small className="text-[0.75rem] text-white/65">gün</small>
              </span>
            )}
          </button>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {!next && <Empty icon="cake" title="Doğum günü eklenmedi" />}

        {months.map((m) => {
          const items = all.filter((b) => b.date.startsWith(m));
          return (
            <section key={m}>
              <ListHead title={monthYear(`${m}-01`)} count={items.length} />
              <RowList>
                {items.map((b) => {
                  const isToday = b.date === today;
                  return (
                    <Row
                      key={b.id}
                      onClick={() => openBirthday({ edit: b.id })}
                      chev={false}
                      lead={
                        <span className={`flex w-11 shrink-0 flex-col items-center rounded-xl py-1.5 ${isToday ? "bg-acc text-white" : "bg-accbg text-acc"}`}>
                          <b className="text-[1.0625rem] font-bold leading-none tabular-nums">{+b.date.slice(8, 10)}</b>
                          <small className="mt-0.5 text-[0.625rem] font-semibold">{wd(b.date)}</small>
                        </span>
                      }
                      title={b.name}
                      sub={[b.age && `${b.age} yaşına giriyor`, b.note].filter(Boolean).join(" · ") || "Doğum günü"}
                      right={<span className={`text-[0.8125rem] font-semibold ${isToday ? "text-acc" : "text-mut"}`}>{leftLabel(b.date, today)}</span>}
                    />
                  );
                })}
              </RowList>
            </section>
          );
        })}
      </div>
    </main>
  );
}
