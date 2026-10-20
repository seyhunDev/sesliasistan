"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { byId, isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { downloadExcel, monthLabel, monthReport, shiftMonth } from "@/features/athletes/attendanceReport";
import { ClassMenu } from "@/features/athletes/RollView";
import { todayStr } from "@/lib/utils/format";

// Yoklama ay raporu: sporcu başına geldi / gelmedi / izinli ve devam oranı; Excel'e aktarılabilir.
// Yalnız okur, sporcu verisini değiştirmez.
export default function AttendanceReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Report />;
}

const rateTone = (r) => (r === null ? "text-mut" : r >= 75 ? "text-ok" : r >= 50 ? "text-amber-600" : "text-rec");

function Report() {
  const toast = useToast();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const thisMonth = todayStr().slice(0, 7);
  const [ym, setYm] = useState(thisMonth);
  const [cls, setCls] = useState("");
  const [busy, setBusy] = useState(false);

  const classes = byId(data?.classes);
  const active = (data?.athletes || []).filter(isActive);
  const usedClasses = (data?.classes || []).filter((c) => active.some((a) => a.currentClassId === c.id));
  const report = monthReport(active.filter((a) => !cls || a.currentClassId === cls), ym, classes);
  const marked = report.rows.filter((r) => r.present + r.absent + r.excused > 0);

  async function excel() {
    setBusy(true);
    try {
      await downloadExcel(report, cls ? `${ym}-${classes[cls] || "sinif"}` : ym);
    } catch {
      toast("Excel dosyası hazırlanamadı");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Yoklama raporu" sub={data && !err ? `${report.days.length} yoklama günü` : "Kulüp verisi"} back="/athletes/attendance" />

      {err?.code === "permission-denied" ? (
        <DikiliLogin denied={!!user} onDone={reload} />
      ) : err ? (
        <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem]">
          <b className="block font-semibold text-rec">{err.text}</b>
          <span className="text-mut">Tekrar denemek için dokun</span>
        </button>
      ) : !data ? (
        <Loading label="Sporcular yükleniyor" />
      ) : (
        <>
          {/* Ay: tek ince satır */}
          <section className="raised mt-1 flex items-center px-1 py-1">
            <button data-press onClick={() => setYm((m) => shiftMonth(m, -1))} aria-label="Önceki ay" className="grid size-9 place-items-center rounded-full">
              <Icon name="back" className="size-5" />
            </button>
            <button data-press onClick={() => setYm(thisMonth)} className="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold capitalize">
              {monthLabel(ym)}
              {ym !== thisMonth && <span className="ml-1.5 text-[0.75rem] font-medium normal-case text-acc">· Bu aya dön</span>}
            </button>
            <button data-press onClick={() => setYm((m) => shiftMonth(m, 1))} disabled={ym >= thisMonth} aria-label="Sonraki ay" className="grid size-9 place-items-center rounded-full disabled:opacity-30">
              <Icon name="chev" className="size-5" />
            </button>
          </section>

          {/* Sınıf seçimi ve Excel aynı satırda */}
          <div className="mt-3 flex items-center gap-2 px-1">
            <ClassMenu classes={usedClasses} cls={cls} onCls={setCls} count={report.rows.length} />
            {report.days.length > 0 && (
              <button data-press onClick={excel} disabled={busy} className="raised flex h-8 shrink-0 items-center gap-1.5 px-3 text-[0.8125rem] font-semibold text-acc disabled:opacity-40">
                <Icon name="chart" className="size-4" />
                {busy ? "Hazırlanıyor…" : "Excel'e aktar"}
              </button>
            )}
          </div>

          {!report.days.length ? (
            <p className="mt-4 rounded-2xl bg-card px-4 py-6 text-center text-[0.875rem] text-mut">Bu ay yoklama alınmamış.</p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2 px-1 text-[0.75rem] font-semibold text-mut">
                <span className="min-w-0 flex-1">Sporcu</span>
                <span className="w-9 text-center text-ok">Geldi</span>
                <span className="w-9 text-center text-rec">Yok</span>
                <span className="w-9 text-center text-amber-600 dark:text-amber-400">İzin</span>
                <span className="w-11 text-right">Devam</span>
              </div>
              <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                {report.rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/athletes/${r.id}`} className="flex items-center gap-2 py-2.5 pl-4 pr-3 text-[0.9375rem]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-medium">{r.name}</b>
                      {!cls && r.cls && <small className="block truncate text-[0.75rem] text-mut">{r.cls}</small>}
                    </span>
                    <span className="w-9 text-center tabular-nums">{r.present}</span>
                    <span className="w-9 text-center tabular-nums">{r.absent}</span>
                    <span className="w-9 text-center tabular-nums">{r.excused}</span>
                    <b className={`w-11 text-right font-semibold tabular-nums ${rateTone(r.rate)}`}>{r.rate === null ? "—" : `%${r.rate}`}</b>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-center text-[0.75rem] text-mut">
                {marked.length} sporcunun yoklaması var. Devam oranında izinli günler sayılmaz.
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
