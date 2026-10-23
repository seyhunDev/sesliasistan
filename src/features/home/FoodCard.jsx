"use client";

import Link from "next/link";
import { useNow } from "@/hooks/useNow";
import { mealLabel, mealPhoto } from "@/lib/homeTiles";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveOrder, placeById } from "@/yemek/store";
import { liveView } from "@/yemek/demo";
import { STATUSES, STATUS_NAMES, minutesLeft } from "@/yemek/order";
import { photoUrl } from "@/yemek/photo";
import { Img } from "@/yemek/ui/Img";
import { TrackMap } from "@/yemek/ui/TrackMap";

// Kokpitin sonunda yemek önerisi (Seyhun 2026-10-23 "A · Günlerin altında kart"): solda saate göre başlık, sağda Sipariş;
// dokununca Alışveriş › Yemek ("Ne yiyelim?"). Yalnız ana hesap. Öneri (ör. "Pizza Rüzgar · Karışık") sonra src/yemek/suggest.js'ten gelecek.
// Açık sipariş varsa (Seyhun 2026-10-23) kart onu gösterir: durum, restoran, kalan dakika; dokununca takip sayfası (harita, kurye).
// Görünüm (Seyhun 2026-10-23 "kenardan içeri arka planda bir fotoğraf", globals.css .food-card): sipariş yokken sağdan içeri solan yemek
// fotoğrafı (saate göre), solda başlık ve "Sipariş ver". Siparişte üstte küçük harita (restoran, ev, yoldaysa kurye) ve durum;
// altta restoran, büyük kalan dakika, Onaylandı · Hazırlanıyor · Yolda · Teslim adımları.
const STEPS = STATUSES.slice(1);
const STEP_NAMES = { accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim" };
const CHIP = { sent: "Restorana gitti", accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Kurye yolda" };

export function FoodCard() {
  const now = useNow(20000);
  const { profile } = useAuth();
  const orders = useActiveOrder(profile?.orgId);
  const open = orders.map((o) => ({ o, v: liveView(o, placeById(o.placeId), now.getTime()) })).find(({ v }) => !["delivered", "cancelled"].includes(v.status));
  if (open) {
    const { o, v } = open;
    const place = placeById(o.placeId);
    const at = STEPS.indexOf(v.status);
    const map = place?.pos && o.address?.pos;
    return (
      <Link href={`/yemek/siparis/${o.id}`} data-press className="food-card block overflow-hidden rounded-[1.375rem]">
        {map && (
          <TrackMap small from={place.pos} to={o.address.pos} courier={v.status === "onTheWay" ? v.courier : null} route={o.route} photo={place.cover && photoUrl(place.cover, 120)} f={v.f} info={CHIP[v.status]} />
        )}
        <span className="block px-3.5 pb-3 pt-3">
          <span className="flex items-end gap-3">
            <span className="min-w-0 flex-1 leading-tight">
              <small className="block truncate text-[0.75rem] text-[#9fb0cc]">{at < 0 ? `Siparişin · ${STATUS_NAMES[v.status]}` : "Siparişin"}</small>
              <b className="mt-0.5 block truncate text-[1.0625rem] font-semibold">{o.placeName}</b>
            </span>
            <b className="shrink-0 text-[1.75rem] font-bold leading-none tracking-[-.03em] tabular-nums">
              {minutesLeft(v.eta, now)}
              <span className="ml-1 text-[0.8125rem] font-medium tracking-normal text-[#9fb0cc]">dk</span>
            </b>
          </span>
          <span className="mt-3 grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => <i key={s} className={`food-step ${i <= at ? "on" : ""}`} />)}
          </span>
          <span className="mt-1.5 grid grid-cols-4 text-[0.7rem] text-[#9fb0cc]">
            {STEPS.map((s, i) => <span key={s} className={i === at ? "font-semibold text-white" : ""}>{STEP_NAMES[s]}</span>)}
          </span>
        </span>
      </Link>
    );
  }
  const h = now.getHours();
  return (
    <Link href="/shopping?tab=yemek" data-press className="food-card relative block h-32 overflow-hidden rounded-[1.375rem]">
      <Img src={mealPhoto(h)} w={480} className="absolute inset-y-0 right-0 w-[68%] !bg-transparent" />
      <span className="food-fade absolute inset-0" />
      <span className="relative flex h-full flex-col px-4 py-3.5">
        <small className="text-[0.75rem] font-semibold text-[#22d3ee]">{mealLabel(h)}</small>
        <b className="mt-px text-[1.25rem] font-semibold tracking-[-.01em]">Ne yiyelim?</b>
        <span className="food-btn mt-auto self-start">Sipariş ver</span>
      </span>
    </Link>
  );
}
