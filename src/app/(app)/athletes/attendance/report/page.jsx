"use client";

import { useEffect, useState } from "react";
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
          {/* Ay */}
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-card p-1.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <button onClick={() => setYm((m) => shiftMonth(m, -1))} aria-label="Önceki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
              <Icon name="back" className="size-5" />
            </button>
            <button onClick={() => setYm(thisMonth)} className="min-w-0 flex-1 text-center">
              <b className="block truncate text-[0.9375rem] font-semibold capitalize">{monthLabel(ym)}</b>
              <small className={`text-[0.75rem] ${ym === thisMonth ? "text-acc" : "text-mut"}`}>{ym === thisMonth ? "Bu ay" : "Bu aya dön"}</small>
            </button>
            <button onClick={() => setYm((m) => shiftMonth(m, 1))} disabled={ym >= thisMonth} aria-label="Sonraki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg disabled:opacity-30">
              <Icon name="chev" className="size-5" />
            </button>
          </div>

          {/* Sınıf */}
          {usedClasses.length > 1 && (
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
                <button
                  key={c.id || "all"}
                  onClick={() => setCls(c.id)}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium transition active:scale-95 ${cls === c.id ? "bg-acc text-white" : "bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {!report.days.length ? (
            <p className="mt-6 rounded-2xl bg-card px-4 py-6 text-center text-[0.875rem] text-mut">Bu ay yoklama alınmamış.</p>
          ) : (
            <>
              <button
                onClick={excel}
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card text-[0.9375rem] font-semibold text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.98] disabled:opacity-50"
              >
                <Icon name="chart" className="size-5" />
                {busy ? "Hazırlanıyor…" : "Excel'e aktar"}
              </button>

              <div className="mt-3 flex items-center gap-2 px-1 text-[0.75rem] font-semibold text-mut">
                <span className="min-w-0 flex-1">Sporcu</span>
                <span className="w-9 text-center text-ok">Geldi</span>
                <span className="w-9 text-center text-rec">Yok</span>
                <span className="w-9 text-center text-amber-600">İzin</span>
                <span className="w-11 text-right">Devam</span>
              </div>
              <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                {report.rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2.5 pl-4 pr-3 text-[0.9375rem]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-medium">{r.name}</b>
                      {!cls && r.cls && <small className="block truncate text-[0.75rem] text-mut">{r.cls}</small>}
                    </span>
                    <span className="w-9 text-center tabular-nums">{r.present}</span>
                    <span className="w-9 text-center tabular-nums">{r.absent}</span>
                    <span className="w-9 text-center tabular-nums">{r.excused}</span>
                    <b className={`w-11 text-right font-semibold tabular-nums ${rateTone(r.rate)}`}>{r.rate === null ? "—" : `%${r.rate}`}</b>
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
