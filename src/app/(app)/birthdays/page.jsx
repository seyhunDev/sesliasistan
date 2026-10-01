"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Empty, Hero, HeroLabel, Label, card } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icon";
import { BarButton, VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useData } from "@/features/data/DataProvider";
import { daysBetween, leftLabel, monthYear, nextBirthday, upcomingBirthdays } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";

const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const longDay = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

// Doğum günleri: üstte sıradaki (kaç gün kaldı, kaç yaşına giriyor), altında yıl boyunca aya göre sıralı liste
export default function BirthdaysPage() {
  const { birthdays } = useData();
  const { openBirthday } = useBirthday();
  const { openAssistant } = useAssistant();
  const today = todayStr();
  const all = birthdays.map((b) => ({ ...b, ...nextBirthday(b, today) })).sort((a, b) => a.date.localeCompare(b.date));
  const next = all[0];
  const soon = upcomingBirthdays(birthdays, today, 30).length;
  const left = next ? daysBetween(today, next.date) : 0;
  const months = [...new Set(all.map((b) => b.date.slice(0, 7)))];

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Doğum günleri" sub={birthdays.length ? `${birthdays.length} kişi` : "Henüz yok"} />

      {next && (
        <Hero className="mt-2">
          <button type="button" onClick={() => openBirthday({ edit: next.id })} className="flex w-full items-center gap-4 text-left">
            <span className="min-w-0 flex-1">
              <HeroLabel>{left === 0 ? "BUGÜN" : "SIRADAKİ"}</HeroLabel>
              <b className="mt-1.5 block truncate text-[1.5rem] font-semibold leading-tight tracking-tight">{next.name}</b>
              <small className="mt-1 block truncate text-[0.8125rem] text-white/80">
                {[longDay(next.date), next.age && `${next.age} yaşına giriyor`].filter(Boolean).join(" · ")}
              </small>
            </span>
            <span className="grid size-[5.5rem] shrink-0 place-items-center rounded-full bg-white/10 text-center ring-4 ring-white/15">
              {left === 0 ? (
                <Icon name="cake" className="size-9" />
              ) : (
                <span>
                  <b className="block text-[1.75rem] font-semibold leading-none tabular-nums">{left}</b>
                  <small className="text-[0.6875rem] text-white/75">gün</small>
                </span>
              )}
            </span>
          </button>
          <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-[0.75rem] text-white/85">
            {soon ? `Önümüzdeki 30 günde ${soon} doğum günü var.` : "Önümüzdeki 30 günde doğum günü yok."}
          </p>
        </Hero>
      )}

      {!next && <Empty icon="cake" title="Doğum günü eklenmedi" sub="Aşağıdaki + ile ekle ya da “Ayşe’nin doğum günü 12 Mart” de." />}

      {months.map((m) => {
        const items = all.filter((b) => b.date.startsWith(m));
        return (
          <section key={m}>
            <Label right={items.length}>{monthYear(`${m}-01`).toLocaleUpperCase("tr-TR")}</Label>
            <div className={`${card} divide-y divide-line overflow-hidden`}>
              {items.map((b) => {
                const isToday = b.date === today;
                return (
                  <button key={b.id} type="button" onClick={() => openBirthday({ edit: b.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                    <span className={`flex w-11 shrink-0 flex-col items-center rounded-xl py-1.5 ${isToday ? "bg-acc text-white" : "bg-acc/10 text-acc"}`}>
                      <b className="text-[1.0625rem] font-bold leading-none tabular-nums">{+b.date.slice(8, 10)}</b>
                      <small className="mt-0.5 text-[0.625rem] font-semibold uppercase">{MON[+b.date.slice(5, 7) - 1]}</small>
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{b.name}</b>
                      <small className="block truncate text-[0.75rem] text-mut">{[b.age && `${b.age} yaşına giriyor`, b.note].filter(Boolean).join(" · ") || "Doğum günü"}</small>
                    </span>
                    <span className={`shrink-0 text-[0.75rem] font-semibold ${isToday ? "text-acc" : "text-mut"}`}>{isToday ? "Bugün 🎂" : leftLabel(b.date, today)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <VoiceTextBar
        placeholder="ör. Ayşe'nin doğum günü 12 Mart"
        onMic={() => openAssistant({ listen: true })}
        onSend={(t) => openAssistant({ text: t })}
        leading={<BarButton icon="plus" label="Doğum günü ekle" onClick={() => openBirthday()} />}
      />
    </main>
  );
}
