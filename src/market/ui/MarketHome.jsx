"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/buttonClass";
import { ListHead, RowList, Row, SkelRow } from "@/components/ui/Row";
import { AISLES, aisleName } from "../sample";
import { LOW, STATUS_NAMES, bump, cartCount, cartTotal, free, isOpenOrder, linesText, num, packOf, search, tl } from "../catalog";
import { useCart, useCatalog, useMenus, useOrders, writeCart } from "../store";
import { menuRows, rowPrice } from "../menus";
import { Img } from "@/yemek/ui/Img";
import Link from "next/link";
import { MarketCart } from "./MarketCart";
import { MarketOrder } from "./MarketOrder";

// Alışveriş › Market (Seyhun 2026-10-24, örnek 1): lacivertte arama ve reyonlar; altta açık sipariş, reyon listesi ya da
// bulunan ürünler (adet − / +). Sepet alt çubuğa yapışık şeritte (yemekteki .cartbar), sipariş kapıda ödenir.
export function MarketHome({ orgId, uid, name, tabs }) {
  const products = useCatalog(orgId);
  const orders = useOrders(orgId);
  const menus = useMenus(orgId);
  const lines = useCart();
  const [q, setQ] = useState("");
  const [aisle, setAisle] = useState("");
  const [cartPick, setCart] = useState(null);
  const [show, setShow] = useState("");
  const [menu, setMenu] = useState(false);
  // ?sepet=1: sepet açık gelir (asistan "Lazanya malzemelerini sepete ekle" sonrası, isler/market.js)
  const sepet = useSearchParams().get("sepet") === "1";
  const cart = cartPick ?? sepet;

  const all = useMemo(() => Object.values(products || {}).sort((a, b) => a.name.localeCompare(b.name, "tr")), [products]);
  const found = useMemo(() => search(all.filter((p) => !aisle || p.cat === aisle), q), [all, aisle, q]);
  const open = (orders || []).filter(isOpenOrder);
  const shown = (orders || []).find((o) => o.id === show);
  const qtyOf = (id) => lines.find((l) => l.id === id && !l.part)?.qty || 0;
  const listing = q.trim() || aisle;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+8rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Market">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Alışveriş</h1>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Market yönetimi" data-press className={buttonClass({ variant: "back" })}>
            <Icon name="more" className="size-5" />
          </button>
        </header>
        {tabs}
        <label className="ck-glass mt-3 flex h-11 items-center gap-2 rounded-xl px-3.5">
          <Icon name="search" className="size-4 shrink-0 text-white/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara: un, kıyma, domates" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Temizle" className="text-white/60"><Icon name="x" className="size-4" /></button>}
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {AISLES.map(([k, n]) => (
            <button key={k} type="button" onClick={() => setAisle((a) => (a === k ? "" : k))} aria-pressed={aisle === k}
              className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${aisle === k ? "border border-white bg-white text-[#141938]" : "ck-glass"}`}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {open.length > 0 && (
          <section>
            <ListHead title="Siparişin" />
            <RowList>
              {open.map((o) => <Row key={o.id} onClick={() => setShow(o.id)} title={STATUS_NAMES[o.status]} sub={linesText(o.lines)} right={tl(o.total)} />)}
            </RowList>
          </section>
        )}

        {!products ? (
          <RowList><SkelRow /><SkelRow /><SkelRow /></RowList>
        ) : listing ? (
          <section>
            <ListHead title={aisle && !q.trim() ? aisleName(aisle) : "Bulunanlar"} count={found.length} />
            {found.length ? (
              <RowList>
                {found.map((p) => <ProductRow key={p.id} p={p} qty={qtyOf(p.id)} onBump={(d) => writeCart(bump(lines, p, d))} />)}
              </RowList>
            ) : (
              <p className="px-1 text-[0.875rem] text-mut">Ürün bulunamadı.</p>
            )}
          </section>
        ) : (
          <>
          <section>
            <ListHead title="Hazır menüler" href="/market/menu/yeni" more="Yeni menü" />
            {!menus ? (
              <RowList><SkelRow /></RowList>
            ) : (
              <div className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {menus.map((m) => {
                  const rows = menuRows(m, all);
                  const sum = rows.reduce((s, r) => s + rowPrice(r), 0);
                  return (
                    <Link key={m.id} href={`/market/menu/${m.id}`} data-press className="w-[10.5rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-line bg-card">
                      <Img src={m.photo} w={360} alt={m.name} className="h-[5.5rem] w-full" />
                      <span className="block px-3 pb-2.5 pt-2">
                        <b className="block truncate text-[0.9375rem] font-semibold">{m.name}</b>
                        <small className="block truncate text-[0.8125rem] text-mut">{m.items.length} malzeme · {tl(sum)}</small>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
          <section>
            <ListHead title="Reyonlar" count={AISLES.length} />
            <RowList>
              {AISLES.map(([k, n]) => {
                const inAisle = all.filter((p) => p.cat === k);
                return <Row key={k} onClick={() => setAisle(k)} title={n} sub={inAisle.slice(0, 3).map((p) => p.name).join(", ")} right={inAisle.length} />;
              })}
            </RowList>
          </section>
          </>
        )}
      </div>

      {lines.length > 0 && !cart && (
        <div className="cartbar fixed inset-x-0 z-30 mx-auto w-full max-w-[30rem]">
          <div role="button" tabIndex={0} onClick={() => setCart(true)} onKeyDown={(e) => e.key === "Enter" && setCart(true)} className="flex h-[6.75rem] cursor-pointer items-start gap-3 rounded-t-[1.5rem] bg-[#11203a] px-5 pt-3.5 text-white">
            <span className="min-w-0 flex-1 leading-tight">
              <small className="block truncate text-[0.8125rem] font-semibold text-white/70">Sepet · {cartCount(lines)} ürün</small>
              <b className="block text-[1.25rem] font-bold tabular-nums tracking-[-.01em]">{tl(cartTotal(lines))}</b>
            </span>
            <span className="btn btn-primary btn-sm !h-10 shrink-0 !rounded-full !px-5">Sepete git</span>
          </div>
        </div>
      )}

      <MarketCart open={cart} onClose={() => setCart(false)} lines={lines} products={products} orgId={orgId} uid={uid} name={name} onPlaced={(id) => setShow(id)} />
      <MarketOrder order={shown} orgId={orgId} onClose={() => setShow("")} />
      <Sheet open={menu} onClose={() => setMenu(false)} title="Velora Market">
        <RowList>
          <Row href="/market/yonetim" title="Market yönetimi" sub="Ürünler, stok, siparişler" />
        </RowList>
      </Sheet>
    </main>
  );
}

// Ürün satırı: ad, marka · boyut · fiyat (tükendiyse ya da az kaldıysa amber), sağda ekle ya da − adet +
export function ProductRow({ p, qty, onBump }) {
  const left = free(p);
  const out = left <= 0;
  return (
    <div className={`flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0 ${out ? "opacity-60" : ""}`}>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{p.name}</b>
        <small className={`block truncate text-[0.8125rem] ${out || left <= LOW ? "text-warn" : "text-mut"}`}>
          {packOf(p)} · {tl(p.price)}{out ? " · Tükendi" : left <= LOW ? ` · ${num(left)} kaldı` : ""}
        </small>
      </span>
      {qty > 0 ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => onBump(-1)} aria-label={`${p.name} azalt`} data-press className="btn btn-round btn-sm"><Icon name={qty === 1 ? "trash" : "minus"} className="size-3.5" /></button>
          <b className="w-5 text-center tabular-nums">{qty}</b>
          <button type="button" onClick={() => onBump(1)} disabled={qty >= left} aria-label={`${p.name} artır`} data-press className="btn btn-round btn-sm"><Icon name="plus" className="size-3.5" /></button>
        </span>
      ) : (
        <button type="button" onClick={() => onBump(1)} disabled={out} aria-label={`${p.name} ekle`} data-press className="btn btn-round btn-sm shrink-0"><Icon name="plus" className="size-3.5" /></button>
      )}
    </div>
  );
}
