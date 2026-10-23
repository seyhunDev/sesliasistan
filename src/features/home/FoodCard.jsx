"use client";

import Link from "next/link";
import { useState } from "react";
import { RowList, Row } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useNow } from "@/hooks/useNow";
import { mealLabel, mealPhoto } from "@/lib/homeTiles";
import { useAuth } from "@/features/auth/AuthProvider";
import { useActiveOrder, placeById, patchOrder } from "@/yemek/store";
import { liveView } from "@/yemek/demo";
import { STATUSES, STATUS_NAMES, minutesLeft } from "@/yemek/order";
import { VEHICLES } from "@/yemek/route";
import { photoUrl } from "@/yemek/photo";
import { Img, tl } from "@/yemek/ui/Img";
import { TrackMap } from "@/yemek/ui/TrackMap";

// Kokpitin sonunda yemek önerisi (Seyhun 2026-10-23 "A · Günlerin altında kart"): solda saate göre başlık, sağda Sipariş;
// dokununca Alışveriş › Yemek ("Ne yiyelim?"). Yalnız ana hesap. Öneri (ör. "Pizza Rüzgar · Karışık") sonra src/yemek/suggest.js'ten gelecek.
// Açık sipariş varsa (Seyhun 2026-10-23) kart onu gösterir: durum, restoran, kalan dakika; dokununca takip sayfası (harita, kurye).
// Görünüm (Seyhun 2026-10-23 "kenardan içeri arka planda bir fotoğraf", globals.css .food-card): sipariş yokken sağdan içeri solan yemek
// fotoğrafı (saate göre), solda başlık ve "Sipariş ver". Siparişte üstte küçük harita (restoran, ev, yoldaysa kurye) ve durum;
// altta restoran, büyük kalan dakika, Onaylandı · Hazırlanıyor · Yolda · Teslim adımları.
// Sipariş kartı (Seyhun 2026-10-23 "Yap", örnek siparis.html): haritanın alt kenarında büyük kalan süre ve varış saati; restoran fotoğrafı,
// ürün sayısı · tutar · ödeme; adımlar; altta Takip · Yeni sipariş · Yardım. Yardım alttan pencere: restoranı / kuryeyi ara, sipariş, iptal
// (yalnız kurye yola çıkmadan, onay ister). Sonraki yardım satırları bu pencereye eklenir.
const STEPS = STATUSES.slice(1);
const STEP_NAMES = { accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Yolda", delivered: "Teslim" };
const CHIP = { sent: "Restorana gitti", accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Kurye yolda" };
const PAY = { "kapıda-kart": "Kapıda kart", "kapıda-nakit": "Kapıda nakit" };
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const tel = (n) => `tel:${String(n || "").replace(/\s/g, "")}`;

export function FoodCard() {
  const now = useNow(20000);
  const { profile } = useAuth();
  const orders = useActiveOrder(profile?.orgId);
  const open = orders.map((o) => ({ o, v: liveView(o, placeById(o.placeId), now.getTime()) })).find(({ v }) => !["delivered", "cancelled"].includes(v.status));
  if (open) return <OrderCard o={open.o} v={open.v} now={now} orgId={profile?.orgId} />;
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

function OrderCard({ o, v, now, orgId }) {
  const [help, setHelp] = useState(false);
  const [noMap, setNoMap] = useState(false);
  const toast = useToast();
  const place = placeById(o.placeId);
  const at = STEPS.indexOf(v.status);
  const map = place?.pos && o.address?.pos && !noMap;
  const c = v.status === "onTheWay" ? v.courier : null;
  const count = (o.lines || []).reduce((n, l) => n + (l.qty || 1), 0);
  const href = `/yemek/siparis/${o.id}`;
  async function cancel() {
    if (!window.confirm("Sipariş iptal edilsin mi?")) return;
    try {
      await patchOrder(orgId, o.id, { status: "cancelled", times: { ...v.times, cancelled: new Date().toISOString() } });
      setHelp(false);
    } catch {
      toast("İptal edilemedi");
    }
  }
  return (
    <div className="food-card overflow-hidden rounded-[1.5rem]">
      <Link href={href} data-press="row" className="block">
        {map && (
          <TrackMap small from={place.pos} to={o.address.pos} courier={c} route={o.route} photo={place.cover && photoUrl(place.cover, 120)} f={v.f} onFail={() => setNoMap(true)}
            info={c ? `${c.name} · ${VEHICLES[c.vehicle || "motor"]}${o.route ? ` · ${String(o.route.km).replace(".", ",")} km` : ""}` : CHIP[v.status]} />
        )}
        <span className={`relative block px-3.5 ${map ? "-mt-16 bg-gradient-to-b from-transparent to-[#182a48] to-70% pt-5" : "pt-3.5"}`}>
          <b className="text-[2.5rem] font-extrabold leading-none tracking-[-.04em] tabular-nums">{minutesLeft(v.eta, now)}</b>
          <span className="ml-1 text-[0.9375rem] font-semibold text-[#9fb0cc]">dk</span>
          <small className="mt-1 block text-[0.75rem] text-[#9fb0cc]">Tahmini varış {hm(v.eta)}</small>
        </span>
        <span className="mt-2.5 flex items-center gap-2.5 px-3.5">
          <Img src={place?.cover} w={120} className="size-[2.375rem] shrink-0 rounded-xl !bg-white/10" />
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[1rem] font-semibold">{o.placeName}</b>
            <small className="block truncate text-[0.78rem] text-[#9fb0cc]">{[count && `${count} ürün`, o.total && tl(o.total), PAY[o.pay]].filter(Boolean).join(" · ")}</small>
          </span>
        </span>
        <span className="mt-3 grid grid-cols-4 gap-1 px-3.5">
          {STEPS.map((s, i) => <i key={s} className={`food-step ${i <= at ? "on" : ""}`} />)}
        </span>
        <span className="mt-1.5 grid grid-cols-4 px-3.5 text-[0.7rem] text-[#9fb0cc]">
          {STEPS.map((s, i) => <span key={s} className={i === at ? "font-semibold text-white" : ""}>{at < 0 && i === 0 ? STATUS_NAMES.sent : STEP_NAMES[s]}</span>)}
        </span>
      </Link>
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 p-3.5 pt-3.5">
        <Link href={href} data-press className="food-btn !h-10 !px-2">Takip</Link>
        <Link href="/shopping?tab=yemek" data-press className="food-btn food-btn2 !h-10 !px-2">Yeni sipariş</Link>
        <button type="button" data-press onClick={() => setHelp(true)} className="food-btn food-btn2 !h-10 !px-2">Yardım</button>
      </div>
      <Sheet open={help} onClose={() => setHelp(false)} title="Yardım" navy>
        <RowList>
          {place?.phone && <Row href={tel(place.phone)} title="Restoranı ara" right={<span className="text-[0.8125rem] font-medium text-mut">{place.phone}</span>} chev={false} />}
          {c?.phone && <Row href={tel(c.phone)} title="Kuryeyi ara" right={<span className="text-[0.8125rem] font-medium text-mut">{c.name}</span>} chev={false} />}
          <Row href={href} title="Sipariş" sub={(o.lines || []).map((l) => `${l.qty > 1 ? `${l.qty}× ` : ""}${l.name}`).join(", ")} />
          {v.status !== "onTheWay" && <Row onClick={cancel} title={<span className="text-[#f08b80]">Siparişi iptal et</span>} chev={false} />}
        </RowList>
      </Sheet>
    </div>
  );
}
