"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { amountText, payText, shortDay } from "@/lib/invoices";

// "Fatura öde" görevinde ödeme bilgisi (görevli de görür; fatura dosyası yalnız ana hesapta)
export function TaskInvoice({ inv, owner }) {
  const toast = useToast();
  const rows = [
    ["Tutar", amountText(inv)],
    inv.due && ["Son ödeme", shortDay(inv.due)],
    inv.no && ["Fatura no", inv.no],
    inv.iban && ["IBAN", inv.iban],
  ].filter(Boolean);
  return (
    <div className="mt-3 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-center gap-2">
        <Icon name="receipt" className="size-5 shrink-0 text-acc" />
        <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{inv.seller || "Fatura"}</b>
      </div>
      <dl className="mt-2 space-y-1 text-[0.875rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-20 shrink-0 text-mut">{k}</dt>
            <dd className="min-w-0 flex-1 break-words font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.75rem] leading-snug text-mut">Ödeyince görevi tamamla; fatura ödendi olarak işaretlenir.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(payText(inv)).then(() => toast("Ödeme bilgisi kopyalandı"), () => toast("Kopyalanamadı"))}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.8125rem] font-semibold active:scale-[.98]"
        >
          <Icon name="copy" className="size-4" /> Kopyala
        </button>
        {owner && (
          <Link href="/invoices" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.8125rem] font-semibold active:scale-[.98]">
            <Icon name="note" className="size-4" /> Faturalar
          </Link>
        )}
      </div>
    </div>
  );
}
