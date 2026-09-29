"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useData } from "@/features/data/DataProvider";
import { TLk, totalOf } from "@/lib/receipts";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// Fiş satırındaki küçük ödeme etiketi
export function PayBadge({ r }) {
  if (r.payStatus === "pending") return <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Ödeme bekliyor</span>;
  if (r.payStatus === "paid") return <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">Ödendi</span>;
  return null;
}

// Fiş detayında ödeme kartı: ana hesap "Ödendi" der / geri alır; çalışan durumu görür
export function PayBox({ r }) {
  const { isStaff, markPaid, nameOf } = useData();
  if (!r.payStatus) return null;
  const who = nameOf(r.createdByUid);
  if (r.payStatus === "paid") {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ok/10 px-4 py-3">
        <Icon name="check" className="size-5 shrink-0 text-ok" />
        <span className="min-w-0 flex-1 text-[14px]">
          <b className="block font-semibold text-ok">Ödendi</b>
          <small className="text-[13px] text-mut">{[when(r.paidAt), r.paidBy?.name].filter(Boolean).join(" · ")}</small>
        </span>
        {!isStaff && (
          <button onClick={() => markPaid(r.id, false)} className="shrink-0 text-[13px] font-medium text-mut active:opacity-60">
            Geri al
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3">
      <Icon name="wallet" className="size-5 shrink-0 text-amber-700" />
      <span className="min-w-0 flex-1 text-[14px] text-amber-900">
        <b className="block font-semibold">Ödeme bekliyor</b>
        <small className="text-[13px] opacity-80">{isStaff ? "Ana hesap ödeyince bildirim gelecek" : `${who || "Üye"} · ${TLk(totalOf(r))}`}</small>
      </span>
      {!isStaff && (
        <button onClick={() => markPaid(r.id)} className="shrink-0 rounded-full bg-ok px-3.5 py-2 text-[13px] font-semibold text-white active:scale-95">
          Ödendi
        </button>
      )}
    </div>
  );
}

// Ana hesap: fiş listesinin üstünde ödeme bekleyenler (tek dokunuşla "Ödendi")
export function PendingPayments() {
  const { receipts, isStaff, markPaid, nameOf } = useData();
  const list = receipts.filter((r) => r.payStatus === "pending").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (isStaff || !list.length) return null;
  const sum = list.reduce((a, r) => a + totalOf(r), 0);
  return (
    <section className="mt-3 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-center justify-between bg-amber-50 px-4 py-2.5 text-amber-900">
        <b className="text-[14px] font-semibold">Ödeme bekleyen · {list.length}</b>
        <b className="text-[14px] font-semibold tabular-nums">{TLk(sum)}</b>
      </div>
      <ul className="divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <Link href={`/receipts/${r.id}`} className="min-w-0 flex-1 active:opacity-60">
              <b className="block truncate text-[15px] font-medium">{r.merchant || "İsimsiz"}</b>
              <small className="block truncate text-[13px] text-mut">{[nameOf(r.createdByUid), when(r.date)].filter(Boolean).join(" · ")}</small>
            </Link>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">{TLk(totalOf(r))}</span>
            <button onClick={() => markPaid(r.id)} className="shrink-0 rounded-full bg-ok px-3 py-1.5 text-[13px] font-semibold text-white active:scale-95">
              Ödendi
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Çalışan: ana sayfada "ödemen yapıldı" bildirimi (görene kadar)
export function PaidNotice() {
  const { receipts, isStaff, markPaySeen } = useData();
  const fresh = receipts.filter((r) => r.payStatus === "paid" && !r.paySeenAt);
  if (!isStaff || !fresh.length) return null;
  const sum = fresh.reduce((a, r) => a + totalOf(r), 0);
  return (
    <div className="fade-in mt-4 flex items-center gap-3 rounded-2xl bg-ok/10 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok text-white">
        <Icon name="check" className="size-5" />
      </span>
      <Link href="/receipts" className="min-w-0 flex-1 active:opacity-60">
        <b className="block text-[15px] font-semibold">{fresh.length === 1 ? `${fresh[0].merchant || "Fiş"} ödendi` : `${fresh.length} fişin ödendi`}</b>
        <small className="text-[13px] text-mut">Toplam {TLk(sum)}</small>
      </Link>
      <button onClick={() => markPaySeen(fresh.map((r) => r.id))} className="shrink-0 text-[13px] font-semibold text-ok active:opacity-60">
        Tamam
      </button>
    </div>
  );
}
