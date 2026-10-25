"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { Gauge } from "@/components/ui/Gauge";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useKind } from "@/features/auth/useKind";
import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";
import { isAthleteSide } from "@/lib/kinds";

const ST = {
  present: { label: "Geldi", text: "text-[#9fe7c6]" },
  absent: { label: "Gelmedi", text: "text-[#f3a39a]" },
  excused: { label: "İzinli", text: "text-[#e3b46c]" },
};
const MONTH = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Bir sporcunun yoklaması (Seyhun 2026-10-25 lacivert tasarım): üstte bu ayın devamı (yay) ve geldi / gelmedi / izinli sayıları,
// altında ay ay günler (gün + durum). Devam oranında izinli sayılmaz (ana sayfadaki Yoklama kartıyla aynı: monthOf).
function Card({ rec }) {
  const days = Object.entries(rec.att || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const m = monthOf(rec);
  const groups = days.reduce((g, [d, v]) => {
    const k = d.slice(0, 7);
    (g[k] = g[k] || []).push([d, v]);
    return g;
  }, {});
  return (
    <section className="space-y-6">
      <div className="food-card flex items-center gap-4 rounded-[1.375rem] px-4 py-4">
        <Gauge dark value={m.rate || 0} label={m.rate == null ? "—" : `%${m.rate}`} sub="Bu ay devam" size={104} className="shrink-0" />
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-center">
          {["present", "absent", "excused"].map((s) => (
            <span key={s} className="min-w-0">
              <b className={`block text-[1.375rem] font-bold tabular-nums ${ST[s].text}`}>{m[s]}</b>
              <small className="block truncate text-[0.75rem] text-white/65">{ST[s].label}</small>
            </span>
          ))}
        </div>
      </div>
      {days.length === 0 ? (
        <p className="px-1 text-[0.9375rem] text-mut">Henüz yoklama kaydı yok.</p>
      ) : (
        Object.entries(groups)
          .slice(0, 6)
          .map(([k, list]) => (
            <div key={k}>
              <ListHead title={MONTH.format(new Date(`${k}-15T12:00:00`))} count={list.length} />
              <RowList>
                {list.map(([d, v]) => (
                  <Row key={d} title={DAY.format(new Date(`${d}T12:00:00`))} right={<span className={`text-[0.875rem] font-semibold ${ST[v]?.text || "text-mut"}`}>{ST[v]?.label || v}</span>} />
                ))}
              </RowList>
            </div>
          ))
      )}
    </section>
  );
}

// Yoklamam: sporcu kendi yoklamasını, veli bağlı olduğu sporcuların yoklamasını görür (salt okunur).
// Yalnızca sporcu, öğrenci ve veli açar; diğerleri (ana hesap, çalışan, aile) ana sayfaya yönlenir.
export default function MyAttendance() {
  const kind = useKind();
  const router = useRouter();
  const allowed = isAthleteSide(kind);
  useEffect(() => {
    if (kind && !allowed) router.replace("/");
  }, [kind, allowed, router]);
  if (!allowed) return null;
  return <Attendance kind={kind} />;
}

function Attendance({ kind }) {
  const { recs, err } = useMyAttendance(kind);
  const parent = kind === "parent";

  return (
    <main data-theme="dark" className="navy page-navy mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <div className="flex items-center gap-2.5 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <BackButton href="/" className="-my-0.5 touch-manipulation" />
        <h1 className="min-w-0 flex-1 truncate text-[1.875rem] font-bold leading-tight tracking-[-.02em]">{parent ? "Yoklama" : "Yoklamam"}</h1>
      </div>
      {!recs ? (
        <Loading className="py-10" />
      ) : recs.length ? (
        <div className="space-y-8">
          {recs.map((r) => (
            <div key={r.id}>
              {parent && <h2 className="mb-2 px-1 text-[1.125rem] font-semibold">{r.name}</h2>}
              <Card rec={r} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-[0.9375rem] text-mut">{err || "Henüz yoklama bilgisi yok."}</p>
      )}
    </main>
  );
}
