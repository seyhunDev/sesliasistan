"use client";

import Link from "next/link";
import { useNow } from "@/hooks/useNow";
import { mealLabel } from "@/lib/homeTiles";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveOrder, placeById } from "@/yemek/store";
import { liveView } from "@/yemek/demo";
import { STATUS_NAMES, minutesLeft } from "@/yemek/order";

// Kokpitin sonunda yemek önerisi (Seyhun 2026-10-23 "A · Günlerin altında kart"): solda saate göre başlık, sağda Sipariş;
// dokununca Alışveriş › Yemek ("Ne yiyelim?"). Yalnız ana hesap. Öneri (ör. "Pizza Rüzgar · Karışık") sonra src/yemek/suggest.js'ten gelecek.
// Açık sipariş varsa (Seyhun 2026-10-23) kart onu gösterir: durum, restoran, kalan dakika; dokununca takip sayfası (harita, kurye).

export function FoodCard() {
  const now = useNow(20000);
  const { profile } = useAuth();
  const orders = useActiveOrder(profile?.orgId);
  const open = orders.map((o) => ({ o, v: liveView(o, placeById(o.placeId), now.getTime()) })).find(({ v }) => !["delivered", "cancelled"].includes(v.status));
  if (open) {
    return (
      <Link href={`/yemek/siparis/${open.o.id}`} data-press className="ck-glass flex items-center gap-3 rounded-[1.125rem] py-3 pl-3.5 pr-3">
        <span className="min-w-0 flex-1 leading-tight">
          <small className="block truncate text-[0.75rem] font-bold uppercase tracking-[.05em] text-white/65">Siparişin · {STATUS_NAMES[open.v.status]}</small>
          <b className="mt-0.5 block truncate text-[1rem] font-semibold">{open.o.placeName}</b>
        </span>
        <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{minutesLeft(open.v.eta, now)} dk</b>
      </Link>
    );
  }
  return (
    <Link href="/shopping?tab=yemek" data-press className="ck-glass flex items-center gap-3 rounded-[1.125rem] py-3 pl-3.5 pr-3">
      <span className="min-w-0 flex-1 leading-tight">
        <small className="block truncate text-[0.75rem] font-bold uppercase tracking-[.05em] text-white/65">{mealLabel(now.getHours())}</small>
        <b className="mt-0.5 block truncate text-[1rem] font-semibold">Ne yiyelim?</b>
      </span>
      <span className="ck-btn shrink-0">Sipariş</span>
    </Link>
  );
}
