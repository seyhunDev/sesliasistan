"use client";

import { STATUS_NAMES, lineDetail } from "../order";
import { orderNo } from "../qr";
import { Img, tl } from "./Img";

// Takip › Sipariş (Seyhun 2026-10-23): arkada siparişin fotoğrafı; üstte durum ve sipariş no, altta ürünler, ödeme ve tutar
// (restoran adı lacivert başlıkta)
const PAY = { "kapıda-kart": "Kapıda kart", "kapıda-nakit": "Kapıda nakit" };

export function OrderCard({ order, status, photo }) {
  const lines = order.lines || [];
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] bg-[#11203a] text-white" aria-label="Sipariş">
      <Img src={photo} w={800} className="absolute inset-0 size-full !bg-transparent" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,32,58,.15)_0%,rgba(17,32,58,.3)_25%,rgba(17,32,58,.88)_55%,#11203a_80%)]" aria-hidden="true" />
      <div className="relative flex min-h-[15rem] flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/35 px-3 py-1.5 text-[0.8125rem] font-semibold backdrop-blur-md">{STATUS_NAMES[status]}</span>
          <span className="rounded-full bg-black/35 px-3 py-1.5 text-[0.8125rem] font-semibold tabular-nums backdrop-blur-md">#{orderNo(order.id)}</span>
        </div>
        <div className="mt-auto pt-16">
          <ul className="space-y-1">
            {lines.map((l, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[1.0625rem] font-bold">{l.qty > 1 ? `${l.qty}× ` : ""}{l.name}</b>
                  {lineDetail(l) && <small className="block truncate text-[0.8125rem] text-white/60">{lineDetail(l)}</small>}
                </span>
                <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums text-white/80">{tl(l.unit * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
            <span className="text-[0.875rem] font-semibold text-white/70">{PAY[order.pay] || ""}</span>
            <b className="text-[1.75rem] font-extrabold leading-none tracking-[-.02em] tabular-nums">{tl(order.total)}</b>
          </div>
        </div>
      </div>
    </section>
  );
}
