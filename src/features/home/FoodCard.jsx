"use client";

import Link from "next/link";
import { useNow } from "@/hooks/useNow";
import { mealLabel } from "@/lib/homeTiles";

// Kokpitin sonunda yemek önerisi (Seyhun 2026-10-23 "A · Günlerin altında kart"): solda saate göre başlık, sağda Sipariş;
// dokununca Alışveriş › Yemek ("Ne yiyelim?"). Yalnız ana hesap. Öneri (ör. "Pizza Rüzgar · Karışık") sonra src/yemek/suggest.js'ten gelecek.

export function FoodCard() {
  const now = useNow();
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
