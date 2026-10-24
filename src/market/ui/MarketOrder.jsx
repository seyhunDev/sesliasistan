"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { STATUSES, STATUS_NAMES, tl } from "../catalog";
import { setStatus } from "../store";

const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

// Market siparişi: durum adımları (saatleriyle), ürünler, adres, toplam. Yalnız "Gönderildi"yken İptal (stok geri açılır).
export function MarketOrder({ order, orgId, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const o = order;
  const steps = o ? [...STATUSES, "cancelled"].filter((s) => o.times?.[s]).reverse() : [];
  async function cancel() {
    setBusy(true);
    try {
      await setStatus(orgId, o.id, "cancelled");
    } catch {
      toast("İptal edilemedi");
    }
    setBusy(false);
  }
  return (
    <Sheet open={!!o} onClose={onClose} title={o ? `${STATUS_NAMES[o.status]} · ${tl(o.total)}` : ""}>
      {o && (
        <div className="space-y-4 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {steps.map((s) => (
              <div key={s} className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0">
                <span className={`font-semibold ${s === o.status ? "" : "text-mut"}`}>{STATUS_NAMES[s]}</span>
                <span className="tabular-nums text-mut">{hm(o.times[s])}</span>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {o.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1 truncate font-semibold">{l.name} <span className="font-normal text-mut">{l.size}</span></span>
                <span className="shrink-0 tabular-nums text-mut">×{l.qty}</span>
                <b className="w-16 shrink-0 text-right tabular-nums">{tl(l.total)}</b>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line py-2.5 text-mut">
              <span className="truncate">{o.address?.name} · {o.pay === "kapıda-nakit" ? "Kapıda nakit" : "Kapıda kart"}</span>
            </div>
          </div>
          {o.status === "sent" && <Button variant="secondary" loading={busy} onClick={cancel}>Siparişi iptal et</Button>}
        </div>
      )}
    </Sheet>
  );
}
