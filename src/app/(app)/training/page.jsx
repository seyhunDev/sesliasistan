"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { LogDetails, Missing } from "@/features/training/LogDetails";
import { monthLabel, shiftMonth } from "@/features/athletes/attendanceReport";
import { RATINGS, isTraining, logLine, monthLog, presentOn } from "@/lib/trainingLog";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthletes } from "@/features/athletes/data";
import { todayStr } from "@/lib/utils/format";

// Antrenman günlüğü: ay ay antrenman sayısı, günlüğü yazılanlar, toplam süre, ortalama rüzgâr, en çok çalışılan konular.
// Kayıtlar antrenman planlarının log alanından (cihazdaki planlar; ek okuma yok). Satıra dokununca plan açılır.
// Günlük ana asistanla da yazılır (bu sayfada alttaki kubbe: antrenmanı anlat); eksik alanlar satırda "Eksik: …" görünür.
const dayText = (p) => new Date(`${p.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

export default function TrainingPage() {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const { profile } = useAuth();
  // Katılanlar yoklamadan (sporcu yetkisi olanda; liste bellekteki kopyadan, ek okuma 3 dakikada en çok bir kez)
  const racer = canSeeAthletes(profile?.email);
  const [athletes, setAthletes] = useState([]);
  useEffect(() => {
    if (!racer) return;
    let live = true;
    loadAthletes()
      .then((d) => live && setAthletes(d.athletes || []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [racer]);
  const today = todayStr();
  const [ym, setYm] = useState(today.slice(0, 7));
  const m = monthLog(plans, ym);
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });
  const missing = plans
    .filter((p) => isTraining(p) && p.status !== "cancelled" && !p.log && (p.date || "").startsWith(ym) && p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const top = m.topics[0]?.[1] || 1;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Antrenman günlüğü" />
      <div className="mt-2 flex items-center justify-between rounded-2xl bg-card px-2 py-2 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <button type="button" aria-label="Önceki ay" onClick={() => setYm(shiftMonth(ym, -1))} className="grid size-10 place-items-center rounded-full active:scale-95">
          <Icon name="back" className="size-5" />
        </button>
        <b className="text-[1rem] font-semibold">{monthLabel(ym)}</b>
        <button type="button" aria-label="Sonraki ay" disabled={ym >= today.slice(0, 7)} onClick={() => setYm(shiftMonth(ym, 1))} className="grid size-10 place-items-center rounded-full active:scale-95 disabled:opacity-30">
          <Icon name="chev" className="size-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          [`${m.logged.length}/${m.total}`, "günlük / antrenman"],
          [m.minutes ? `${Math.round(m.minutes / 6) / 10} sa` : "–", "toplam süre"],
          [m.avgWind ? `${m.avgWind} kn` : "–", "ortalama rüzgâr"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-card px-2 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <b className="block text-[1.25rem] font-semibold tabular-nums">{v}</b>
            <small className="text-[0.75rem] text-mut">{l}</small>
          </div>
        ))}
      </div>

      {m.topics.length > 0 && (
        <section className="mt-4 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          <p className="text-[0.8125rem] font-semibold text-mut">EN ÇOK ÇALIŞILANLAR</p>
          <ul className="mt-2 space-y-1.5">
            {m.topics.map(([t, n]) => (
              <li key={t} className="flex items-center gap-2 text-[0.875rem]">
                <span className="w-32 shrink-0 truncate">{t}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                  <span className="block h-full rounded-full bg-acc" style={{ width: `${(n / top) * 100}%` }} />
                </span>
                <b className="w-6 text-right tabular-nums">{n}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missing.length > 0 && (
        <section className="mt-4">
          <p className="px-1 text-[0.8125rem] font-semibold text-mut">GÜNLÜĞÜ YAZILMAYANLAR</p>
          <ul className="mt-2 divide-y divide-line rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            {missing.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => open(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-60">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{p.title}</b>
                    <small className="text-[0.8125rem] text-mut">{dayText(p)}{p.time ? ` · ${p.time}` : ""}</small>
                  </span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold text-acc">Yaz</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <p className="px-1 text-[0.8125rem] font-semibold text-mut">GÜNLÜK</p>
        {m.logged.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-card px-4 py-4 text-[0.875rem] text-mut shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            Bu ay yazılmış günlük yok. Asistana antrenmanı anlat (“dünkü antrenmanda 12 knot poyraz vardı, start çalıştık”) ya da antrenman planını açıp alttaki “Antrenman günlüğü”nü doldur.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            {m.logged.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => open(p)} className="block w-full px-4 py-3 text-left active:opacity-60">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-[0.9375rem] font-semibold">{p.title}</b>
                    <small className="shrink-0 text-[0.75rem] text-mut">{dayText(p)}</small>
                  </span>
                  {logLine(p.log) && <small className="block text-[0.8125rem] text-mut">{logLine(p.log)}</small>}
                  {p.log.rating && <small className="block text-[0.75rem] font-medium text-acc">{RATINGS.find(([k]) => k === p.log.rating)?.[1]}</small>}
                  {p.log.note && <p className="mt-1 line-clamp-3 text-[0.875rem] leading-snug">{p.log.note}</p>}
                  <LogDetails log={p.log} className="mt-1" />
                  {!p.log.athletes?.length && presentOn(athletes, p.date).length > 0 && (
                    <small className="mt-0.5 block text-[0.8125rem]"><span className="text-mut">Katılanlar (yoklama):</span> {presentOn(athletes, p.date).join(", ")}</small>
                  )}
                  <Missing log={p.log} className="mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
