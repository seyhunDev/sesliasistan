"use client";

import Link from "next/link";
import { useState } from "react";
import { preconnect } from "react-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNow } from "@/hooks/useNow";
import { mealPhoto } from "@/lib/homeTiles";
import { SANAL_URL } from "@/lib/sanal";
import { STATUSES, STATUS_NAMES, cartCount, isOpenOrder, tl } from "@/market/catalog";
import { useOrders } from "@/market/store";
import { MarketOrder } from "@/market/ui/MarketOrder";
import { Img } from "@/yemek/ui/Img";
import { FoodOrder } from "./FoodCard";

// Ana sayfada yan yana Yemek · Market · Giyim (Seyhun 2026-10-25, örnek "A · Yan yana"): aynı görünümde üç kart, arkada solan fotoğraf.
// Yemek → Alışveriş › Yemek; Market → /sanal (Velora Sanal Velora'nın içinde gömülü, şifresiz giriş); Giyim hazırlanıyor, şimdilik bir yere gitmez.
// Açık yemek ya da market siparişi varsa kartların üstünde sipariş kartı çıkar, teslim edilince / iptalde kaybolur.
const GROCERY = "photo-1542838132-92c53300491e";
const CLOTHES = "photo-1489987707025-afc232f7ea0f";
const PAY = { "kapıda-kart": "Kapıda kart", "kapıda-nakit": "Kapıda nakit" };

function Tile({ photo, title, sub, href, off = false }) {
  const inner = (
    <>
      <Img src={photo} w={360} className={`absolute inset-0 !bg-transparent ${off ? "opacity-35" : "opacity-60"}`} />
      <span className="shop-fade absolute inset-0" />
      <span className="relative mt-auto block min-w-0 px-3 pb-2.5">
        <b className="block truncate text-[1.0625rem] font-semibold tracking-[-.01em]">{title}</b>
        <small className="block truncate text-[0.75rem] font-semibold text-[#22d3ee]">{sub}</small>
      </span>
    </>
  );
  const cls = "food-card relative flex h-28 min-w-0 flex-col overflow-hidden rounded-[1.25rem] text-left";
  if (href) return <Link href={href} data-press className={cls}>{inner}</Link>;
  return <div className={cls} aria-disabled={off || undefined}>{inner}</div>;
}

export function ShopCards() {
  const now = useNow(60000);
  preconnect(SANAL_URL); // Market'e basınca Sanal'a bağlantı hazır olsun (Seyhun 2026-10-26 "yavaş açılıyor")
  return (
    <div className="space-y-3">
      <FoodOrder />
      <MarketOrderCard />
      <div className="grid grid-cols-3 gap-2.5">
        <Tile photo={mealPhoto(now.getHours())} title="Yemek" sub="Sipariş ver" href="/shopping?tab=yemek" />
        <Tile photo={GROCERY} title="Market" sub="Velora Sanal" href="/sanal" />
        <Tile photo={CLOTHES} title="Giyim" sub="Yakında" off />
      </div>
    </div>
  );
}

// Açık market siparişi (orgs/{org}/marketSiparisler, ana hesap hepsini okur): durum, ürün · tutar · ödeme, adımlar; Takip siparişi açar
function MarketOrderCard() {
  const { profile } = useAuth();
  const orgId = profile?.orgId;
  const orders = useOrders(orgId, 5);
  const [show, setShow] = useState(false);
  const o = (orders || []).find(isOpenOrder);
  if (!o) return null;
  const at = STATUSES.indexOf(o.status);
  return (
    <div className="food-card overflow-hidden rounded-[1.5rem]">
      <button type="button" data-press="row" onClick={() => setShow(true)} className="block w-full px-3.5 pt-3.5 text-left">
        <small className="block text-[0.75rem] font-semibold text-[#22d3ee]">Market siparişi</small>
        <b className="mt-0.5 block text-[1.5rem] font-bold leading-tight tracking-[-.02em]">{STATUS_NAMES[o.status]}</b>
        <small className="mt-0.5 block truncate text-[0.78rem] text-[#9fb0cc]">{[`${cartCount(o.lines || [])} ürün`, tl(o.total || 0), PAY[o.pay]].filter(Boolean).join(" · ")}</small>
        <span className="mt-3 grid grid-cols-4 gap-1">
          {STATUSES.map((s, i) => <i key={s} className={`food-step ${i <= at ? "on" : ""}`} />)}
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2 p-3.5">
        <button type="button" data-press onClick={() => setShow(true)} className="food-btn !h-10 !px-2">Takip</button>
        <Link href="/sanal" data-press className="food-btn food-btn2 !h-10 !px-2">Yeni sipariş</Link>
      </div>
      <MarketOrder order={show ? o : null} orgId={orgId} onClose={() => setShow(false)} />
    </div>
  );
}
