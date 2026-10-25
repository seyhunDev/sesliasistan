"use client";

import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";
import { ListHead, Row, RowList } from "@/components/ui/Row";

const ST = { present: ["Geldi", "text-ok"], absent: ["Gelmedi", "text-rec"], excused: ["İzinli", "text-warn"] };
const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Sporcu, öğrenci ve velinin ana sayfası: bu ayın yoklaması (geldi/gelmedi, sağda devam %), son antrenman. Dokununca Yoklamam.
// Ortak liste parçalarıyla (Row), lacivert alt alanda kendiliğinden koyu (Seyhun 2026-10-25).
// Veli birden çok sporcuya bağlıysa her biri bir satır. Kayıt yoksa ya da erişim yoksa çizilmez.
export function MyAttendanceCard({ kind }) {
  const { recs } = useMyAttendance(kind);
  if (!recs?.length) return null;
  const parent = kind === "parent";

  return (
    <section aria-label="Yoklama">
      <ListHead title={parent ? "Yoklama · bu ay" : "Yoklamam · bu ay"} href="/my-attendance" />
      <RowList>
        {recs.map((r) => {
          const m = monthOf(r);
          const last = m.last && ST[m.last[1]];
          const counts = m.rate == null ? "Bu ay yoklama yok" : `${m.present} geldi · ${m.absent} gelmedi`;
          return (
            <Row
              key={r.id}
              href="/my-attendance"
              title={parent ? r.name : counts}
              sub={
                <>
                  {parent && m.rate != null && `${counts} · `}
                  {last ? (
                    <>
                      Son: {DAY.format(new Date(`${m.last[0]}T12:00:00`))} <span className={`font-semibold ${last[1]}`}>{last[0]}</span>
                    </>
                  ) : (
                    "Henüz yoklama kaydı yok"
                  )}
                </>
              }
              right={m.rate == null ? null : `%${m.rate}`}
            />
          );
        })}
      </RowList>
    </section>
  );
}
