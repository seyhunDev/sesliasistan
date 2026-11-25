"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useHesap } from "@/features/auth/useHesap";
import { daysTo, useMyRaces } from "@/features/athletes/myRaces";
import { todayStr } from "@/lib/utils/format";

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const span = (r) => {
  const a = DAY.format(new Date(`${r.startDate}T12:00`));
  return r.endDate && r.endDate !== r.startDate ? `${a} – ${DAY.format(new Date(`${r.endDate}T12:00`))}` : a;
};
const left = (n) => (n < 0 ? "Sürüyor" : n === 0 ? "Bugün" : n === 1 ? "Yarın" : `${n} gün`);

// Yarışlarım (Seyhun 2026-11-25 "ana hesabın yarışlar sayfası gösterilmeyecek, sporcunun katıldığı yarışları gösterebiliriz"):
// sporcu, öğrenci ve veli yalnız kayıtlı olduğu yarışları görür (/api/my-races). Yaklaşanlar kalan günle, geçmişler altta.
export default function MyRaces() {
  const h = useHesap();
  const router = useRouter();
  const allowed = h.side; // ana hesap "Sporcu gibi gör"de de açılır (liste boş: ana hesabın kayıtlı yarışı yok)
  useEffect(() => {
    if (h.profile && !allowed) router.replace("/races");
  }, [h.profile, allowed, router]);
  const races = useMyRaces(allowed);
  if (!allowed) return null;
  const today = todayStr();
  const next = (races || []).filter((r) => (r.endDate || r.startDate) >= today);
  const past = (races || []).filter((r) => (r.endDate || r.startDate) < today).reverse();
  const row = (r, soon) => (
    <Row key={r.id} title={r.name} sub={[span(r), r.place, r.who?.length ? r.who.join(", ") : ""].filter(Boolean).join(" · ")} right={soon ? left(daysTo(r, today)) : null} />
  );
  return (
    <main className="acik mx-auto min-h-dvh max-w-[40rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <div className="flex items-center gap-2.5 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <BackButton href="/" className="-my-0.5 touch-manipulation" />
        <h1 className="min-w-0 flex-1 truncate text-[1.875rem] font-bold leading-tight tracking-[-.02em]">Yarışlarım</h1>
      </div>
      {!races ? (
        <Loading className="py-10" />
      ) : !races.length ? (
        <p className="mt-10 text-center text-[0.9375rem] text-mut">Henüz kayıtlı olduğun bir yarış yok.</p>
      ) : (
        <div className="space-y-6">
          {next.length > 0 && (
            <section>
              <ListHead title="Yaklaşan" count={next.length} />
              <RowList>{next.map((r) => row(r, true))}</RowList>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <ListHead title="Geçmiş" count={past.length} />
              <RowList>{past.map((r) => row(r, false))}</RowList>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
