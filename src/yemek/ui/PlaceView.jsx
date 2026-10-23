"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { cartTotals } from "../order";
import { openNow, placeById, useFood, useCart, writeCart } from "../store";
import { Img, tl, rating } from "./Img";
import { ItemSheet } from "./ItemSheet";
import { CartSheet } from "./CartSheet";

// Restoran sayfası (müşteri; örnek B): kapak fotoğrafı, lacivert kategori şeridi, ürünler (yazı solda, fotoğraf sağda).
// Ürüne dokununca seçenek penceresi; altta sepet düğmesi. ?urun=… o ürünü, ?sepet=1 sepeti açar.
export function PlaceView({ orgId, uid, name, id }) {
  const place = placeById(id);
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const food = useFood(orgId);
  const cart = useCart();
  const [item, setItem] = useState(() => (place && sp.get("urun") ? place.menu.flatMap((c) => c.items).find((i) => i.id === sp.get("urun")) || null : null));
  const [cartOpen, setCartOpen] = useState(() => !!sp.get("sepet"));
  const [cat, setCat] = useState(0);
  const refs = useRef([]);

  const lastIds = useMemo(() => new Set((food?.history || []).filter((o) => o.placeId === id).slice(0, 1).flatMap((o) => o.lines.map((l) => l.itemId))), [food, id]);
  if (!place) return <p className="p-10 text-center text-mut">Restoran bulunamadı.</p>;
  const on = openNow(place, food?.settings);
  const mine = cart.placeId === place.id ? cart.lines : [];
  const totals = cartTotals(place, mine);
  const count = mine.reduce((n, l) => n + l.qty, 0);

  function add(line) {
    if (cart.placeId && cart.placeId !== place.id && cart.lines.length) {
      const other = placeById(cart.placeId)?.name || "başka restoran";
      if (!window.confirm(`Sepette ${other} ürünleri var. Sepet boşaltılıp ${place.name} ürünü eklensin mi?`)) return;
      writeCart({ placeId: place.id, lines: [line] });
    } else writeCart({ placeId: place.id, lines: [...mine, line] });
    setItem(null);
    toast("Sepete eklendi");
  }
  const go = (i) => {
    setCat(i);
    refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="mx-auto max-w-[30rem] pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]">
      <section className="relative h-[13.5rem] overflow-hidden bg-deep">
        <Img src={place.cover} w={900} alt={place.name} className="absolute inset-0 size-full" />
        <span className="absolute inset-0 bg-gradient-to-b from-[#0f2c45]/10 via-transparent to-[#0f2c45]" />
        <div className="ck absolute left-5 top-[calc(0.75rem+env(safe-area-inset-top))]" style={{ background: "none" }}><BackButton href="/shopping?tab=yemek" /></div>
        <div className="absolute inset-x-5 bottom-3 text-white">
          <h1 className="truncate text-[1.5rem] font-bold tracking-[-.02em]">{place.name}</h1>
          <p className="truncate text-[0.8125rem] font-semibold text-white/80">
            ★ {rating(place.rating)} · {place.prepMin + 10} dk · Min {tl(place.minOrder)} · {place.fee ? `Teslim ${tl(place.fee)}` : "Teslim ücretsiz"}{on ? "" : ` · Kapalı, ${place.hours[0]}'da açılır`}
          </p>
        </div>
      </section>
      <nav className="ck sticky top-0 z-20 flex gap-2 overflow-x-auto px-5 pb-3 pt-2 [scrollbar-width:none]">
        {place.menu.map((c, i) => (
          <button key={c.name} type="button" onClick={() => go(i)} aria-pressed={cat === i} className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold ${cat === i ? "border border-white bg-white text-[#141938]" : "ck-glass text-white"}`}>
            {c.name}
          </button>
        ))}
      </nav>
      <div className="space-y-6 px-5 pt-4">
        {place.menu.map((c, i) => (
          <section key={c.name} ref={(el) => (refs.current[i] = el)} className="scroll-mt-16">
            <h2 className="mb-1.5 px-1 text-[0.8125rem] font-bold tracking-[.04em] text-mut">{c.name.toLocaleUpperCase("tr-TR")}</h2>
            <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
              {c.items.map((it) => (
                <button key={it.id} type="button" disabled={!it.available} onClick={() => setItem(it)} data-press="row" className="flex w-full items-center gap-3 border-t border-line px-3.5 py-3 text-left first:border-t-0 disabled:opacity-50">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{it.name}</b>
                    {it.desc && <small className="line-clamp-2 block text-[0.8125rem] text-mut">{it.desc}</small>}
                    <span className="mt-1 flex items-center gap-2">
                      <b className="text-[0.9375rem] font-bold tabular-nums">{tl(it.price)}</b>
                      {lastIds.has(it.id) ? <Tagx>Son aldığın</Tagx> : it.tags.includes("popüler") ? <Tagx>Popüler</Tagx> : null}
                    </span>
                  </span>
                  <Img src={it.photo} w={240} alt={it.name} className="size-[5.25rem] shrink-0 rounded-2xl" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--dome-h,var(--stage-h,5.5rem))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">
          <Button onClick={() => setCartOpen(true)} className="!justify-between !px-4">
            <span>Sepet · {count} ürün</span>
            <span className="tabular-nums">{tl(totals.subtotal)}</span>
          </Button>
        </div>
      )}

      <ItemSheet place={place} item={item} onClose={() => setItem(null)} onAdd={add} closed={!on} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} place={place} lines={mine} food={food} orgId={orgId} uid={uid} name={name} hemen={sp.get("hemen") === "1"} adres={sp.get("adres") || ""} onPlaced={(oid) => router.replace(`/yemek/siparis/${oid}`)} />
    </main>
  );
}

const Tagx = ({ children }) => <span className="rounded-md bg-accbg px-1.5 py-0.5 text-[0.6875rem] font-semibold text-acc">{children}</span>;
