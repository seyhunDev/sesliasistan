"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useData } from "@/features/data/DataProvider";
import { TLk, totalOf } from "@/lib/receipts";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// "Öde"ye basınca nasıl ödendiği sorulur: Nakit (kasadan düşer) ya da EFT (bankadan zaten görünür).
// Kişisel fiş (ör. Garanti kartıyla kendi harcaman) kulüp kasasına dokunmaz: tek "Ödendi".
function PayButtons({ id, small, personal }) {
  const { markPaid } = useData();
  const [ask, setAsk] = useState(false);
  const pad = small ? "px-3 py-1.5" : "px-3.5 py-2";
  if (personal)
    return (
      <button onClick={() => markPaid(id, true, "card")} className={`shrink-0 rounded-full bg-ok ${pad} text-[0.8125rem] font-semibold text-white`}>
        Ödendi
      </button>
    );
  if (!ask)
    return (
      <button onClick={() => setAsk(true)} className={`shrink-0 rounded-full bg-ok ${pad} text-[0.8125rem] font-semibold text-white`}>
        Öde
      </button>
    );
  return (
    <span className="flex shrink-0 gap-1.5">
      <button onClick={() => markPaid(id, true, "cash")} className={`rounded-full bg-ok ${pad} text-[0.8125rem] font-semibold text-white`}>
        Nakit
      </button>
      <button onClick={() => markPaid(id, true, "eft")} className={`rounded-full bg-ok/15 ${pad} text-[0.8125rem] font-semibold text-ok`}>
        EFT
      </button>
    </span>
  );
}

// Fiş satırındaki küçük ödeme etiketi
export function PayBadge({ r }) {
  if (r.payStatus === "pending") return <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">Ödeme bekliyor</span>;
  if (r.payStatus === "paid") return <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-ok">Ödendi</span>;
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
        <span className="min-w-0 flex-1 text-[0.875rem]">
          <b className="block font-semibold text-ok">Ödendi</b>
          <small className="text-[0.8125rem] text-mut">{[when(r.paidAt), r.paidBy?.name, r.paidVia === "cash" ? "nakit · kasadan düştü" : r.paidVia === "eft" ? "EFT" : r.paidVia === "card" ? "kart" : ""].filter(Boolean).join(" · ")}</small>
        </span>
        {!isStaff && (
          <button onClick={() => markPaid(r.id, false)} className="shrink-0 text-[0.8125rem] font-medium text-mut active:opacity-60">
            Geri al
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3">
      <Icon name="wallet" className="size-5 shrink-0 text-amber-700" />
      <span className="min-w-0 flex-1 text-[0.875rem] text-amber-900">
        <b className="block font-semibold">Ödeme bekliyor</b>
        <small className="text-[0.8125rem] opacity-80">{isStaff ? "Ana hesap ödeyince bildirim gelecek" : `${r.src === "garanti" ? `Garanti${r.card ? ` ·${r.card}` : ""}` : who || "Üye"} · ${TLk(totalOf(r))}`}</small>
      </span>
      {!isStaff && <PayButtons id={r.id} personal={r.scope === "personal"} />}
    </div>
  );
}

// Ana hesap: fiş listesinin üstünde ödeme bekleyenler (tek dokunuşla "Öde")
export function PendingPayments() {
  const { receipts, isStaff, nameOf } = useData();
  const list = receipts.filter((r) => r.payStatus === "pending").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (isStaff || !list.length) return null;
  const sum = list.reduce((a, r) => a + totalOf(r), 0);
  return (
    <section className="mt-3 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-center justify-between bg-amber-50 px-4 py-2.5 text-amber-900">
        <b className="text-[0.875rem] font-semibold">Ödeme bekleyen · {list.length}</b>
        <b className="text-[0.875rem] font-semibold tabular-nums">{TLk(sum)}</b>
      </div>
      <ul className="divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <Link href={`/receipts/${r.id}`} className="min-w-0 flex-1 active:opacity-60">
              <b className="block truncate text-[0.9375rem] font-medium">{r.merchant || "İsimsiz"}</b>
              <small className="block truncate text-[0.8125rem] text-mut">{[r.src === "garanti" ? "Garanti" : nameOf(r.createdByUid), r.scope === "personal" && "Kişisel", when(r.date)].filter(Boolean).join(" · ")}</small>
            </Link>
            <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{TLk(totalOf(r))}</span>
            <PayButtons id={r.id} small personal={r.scope === "personal"} />
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
        <b className="block text-[0.9375rem] font-semibold">{fresh.length === 1 ? `${fresh[0].merchant || "Fiş"} ödendi` : `${fresh.length} fişin ödendi`}</b>
        <small className="text-[0.8125rem] text-mut">Toplam {TLk(sum)}</small>
      </Link>
      <button onClick={() => markPaySeen(fresh.map((r) => r.id))} className="shrink-0 text-[0.8125rem] font-semibold text-ok active:opacity-60">
        Tamam
      </button>
    </div>
  );
}
