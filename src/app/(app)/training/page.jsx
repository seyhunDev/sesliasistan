"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Row, RowList } from "@/components/ui/Row";
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
// Yeni tasarım (2026-10-21): lacivert üstte ay ve üç sayı, açık zeminde Yazılmayanlar · En çok çalışılanlar · Günlük listeleri.
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
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Antrenman günlüğü">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Antrenman günlüğü</h1>
          {racer && (
            <Link href="/training/day" data-press className="raised act-main flex h-9 shrink-0 items-center rounded-xl border px-3.5 text-[0.875rem] font-semibold">
              Bugün
            </Link>
          )}
        </header>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" aria-label="Önceki ay" onClick={() => setYm(shiftMonth(ym, -1))} data-press className="btn btn-round size-9">
            <Icon name="back" className="size-4" />
          </button>
          <b className="flex-1 text-center text-[1.0625rem] font-semibold">{monthLabel(ym)}</b>
          <button type="button" aria-label="Sonraki ay" disabled={ym >= today.slice(0, 7)} onClick={() => setYm(shiftMonth(ym, 1))} data-press className="btn btn-round size-9 disabled:opacity-40">
            <Icon name="chev" className="size-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [`${m.logged.length}/${m.total}`, "günlük yazıldı"],
            [m.minutes ? `${String(Math.round(m.minutes / 6) / 10).replace(".", ",")} sa` : "–", "toplam süre"],
            [m.avgWind ? `${m.avgWind} kn` : "–", "ort. rüzgâr"],
          ].map(([v, l]) => (
            <div key={l} className="min-w-0">
              <b className="block truncate text-[1.625rem] font-bold leading-tight tracking-[-.02em] tabular-nums">{v}</b>
              <small className="block truncate text-[0.8125rem] text-white/65">{l}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {missing.length > 0 && (
          <section>
            <ListHead title="Yazılmayanlar" count={missing.length} />
            <RowList>
              {missing.map((p) => (
                <Row key={p.id} onClick={() => open(p)} title={p.title} sub={`${dayText(p)}${p.time ? ` · ${p.time}` : ""}`} right={<span className="text-acc">Yaz</span>} chev={false} />
              ))}
            </RowList>
          </section>
        )}

        {m.topics.length > 0 && (
          <section>
            <ListHead title="En çok çalışılanlar" />
            <RowList className="py-2">
              {m.topics.map(([t, n]) => (
                <div key={t} className="flex items-center gap-3 py-1.5 text-[0.875rem]">
                  <span className="w-32 shrink-0 truncate font-semibold">{t}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                    <span className="block h-full rounded-full bg-acc" style={{ width: `${(n / top) * 100}%` }} />
                  </span>
                  <b className="w-6 text-right tabular-nums">{n}</b>
                </div>
              ))}
            </RowList>
          </section>
        )}

        <section>
          <ListHead title="Günlük" count={m.logged.length} />
          {m.logged.length === 0 ? (
            <RowList>
              <p className="py-4 text-[0.875rem] text-mut">Bu ay yazılmış günlük yok.</p>
            </RowList>
          ) : (
            <RowList>
              {m.logged.map((p) => (
                <button key={p.id} type="button" onClick={() => open(p)} data-press="row" className="block w-full border-t border-line py-3 text-left first:border-t-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-[0.9375rem] font-semibold">{p.title}</b>
                    <small className="shrink-0 text-[0.8125rem] text-mut">{dayText(p)}</small>
                  </span>
                  {logLine(p.log) && <small className="block text-[0.8125rem] text-mut">{logLine(p.log)}</small>}
                  {p.log.rating && <small className="block text-[0.75rem] font-semibold text-acc">{RATINGS.find(([k]) => k === p.log.rating)?.[1]}</small>}
                  {p.log.note && <p className="mt-1 line-clamp-3 text-[0.875rem] leading-snug">{p.log.note}</p>}
                  <LogDetails log={p.log} className="mt-1" />
                  {!p.log.athletes?.length && presentOn(athletes, p.date).length > 0 && (
                    <small className="mt-0.5 block text-[0.8125rem]"><span className="text-mut">Katılanlar:</span> {presentOn(athletes, p.date).join(", ")}</small>
                  )}
                  <Missing log={p.log} className="mt-1" />
                </button>
              ))}
            </RowList>
          )}
        </section>
      </div>
    </main>
  );
}
