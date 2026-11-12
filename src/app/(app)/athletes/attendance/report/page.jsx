"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Row, RowList } from "@/components/ui/Row";
import { Empty } from "@/components/ui/Page";
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

const rateTone = (r) => (r === null ? "text-mut" : r >= 75 ? "text-ok" : r >= 50 ? "text-warn" : "text-rec");

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

  const ready = data && !err;
  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      {/* Yeni tasarım (2026-11-03): lacivert üstte geri, ad, gün · sporcu sayısı, Excel; ay şeridi ve sınıf seçimi */}
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yoklama raporu">
        <header className="flex items-center gap-2.5">
          <BackButton href="/athletes/attendance" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Yoklama raporu</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{ready ? `${report.days.length} yoklama günü${marked.length ? ` · ${marked.length} sporcu` : ""}` : "Kulüp verisi"}</p>
          </div>
          {ready && report.days.length > 0 && (
            <button data-press onClick={excel} disabled={busy} className="btn btn-primary btn-sm shrink-0">
              {busy ? "Hazırlanıyor…" : "Excel"}
            </button>
          )}
        </header>

        {ready && (
          <>
            {/* Ay: tek ince şerit */}
            <div className="ck-glass mt-4 flex items-center rounded-2xl px-1 py-1">
              <button data-press onClick={() => setYm((m) => shiftMonth(m, -1))} aria-label="Önceki ay" className="grid size-9 place-items-center rounded-full">
                <Icon name="back" className="size-5" />
              </button>
              <button data-press onClick={() => setYm(thisMonth)} className="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold capitalize">
                {monthLabel(ym)}
                {ym !== thisMonth && <span className="ml-1.5 text-[0.75rem] font-medium normal-case text-white/65">· Bu ay</span>}
              </button>
              <button data-press onClick={() => setYm((m) => shiftMonth(m, 1))} disabled={ym >= thisMonth} aria-label="Sonraki ay" className="grid size-9 place-items-center rounded-full disabled:opacity-30">
                <Icon name="chev" className="size-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center">
              <ClassMenu classes={usedClasses} cls={cls} onCls={setCls} count={report.rows.length} />
            </div>
          </>
        )}
      </section>

      <div className="split-cols relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {err?.code === "permission-denied" ? (
          <DikiliLogin denied={!!user} onDone={reload} />
        ) : err ? (
          <RowList>
            <Row onClick={reload} title={<span className="text-rec">{err.text}</span>} sub="Tekrar dene" />
          </RowList>
        ) : !data ? (
          <Loading label="Sporcular yükleniyor" />
        ) : !report.days.length ? (
          <Empty icon="check" title="Bu ay yoklama yok" />
        ) : (
          <section>
            <div className="mb-1.5 flex items-center gap-2 px-1 text-[0.75rem] font-bold text-mut">
              <h2 className="min-w-0 flex-1 truncate tracking-[.04em]">
                SPORCULAR<span className="ml-1.5 font-semibold tabular-nums">{report.rows.length}</span>
              </h2>
              <span className="w-9 text-center text-ok">Geldi</span>
              <span className="w-9 text-center text-rec">Yok</span>
              <span className="w-9 text-center text-warn">İzin</span>
              <span className="w-11 text-right">Devam</span>
            </div>
            <RowList>
              {report.rows.map((r) => (
                <Link key={r.id} href={`/athletes/${r.id}`} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-2 border-t border-line py-2.5 text-[0.9375rem] first:border-t-0">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-semibold">{r.name}</b>
                    {!cls && r.cls && <small className="block truncate text-[0.8125rem] text-mut">{r.cls}</small>}
                  </span>
                  <span className="w-9 text-center tabular-nums">{r.present}</span>
                  <span className="w-9 text-center tabular-nums">{r.absent}</span>
                  <span className="w-9 text-center tabular-nums">{r.excused}</span>
                  <b className={`w-11 text-right font-bold tabular-nums ${rateTone(r.rate)}`}>{r.rate === null ? "—" : `%${r.rate}`}</b>
                </Link>
              ))}
            </RowList>
          </section>
        )}
      </div>
    </main>
  );
}
