"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { Icon } from "./Icon";

// Ortak liste (Seyhun 2026-10-21 kokpit tasarımı, "C"): beyaz kart içinde satırlar, her satır aynı biçimde: solda ad ve altında tek kısa bilgi,
// sağda değer (sayı, tutar, "4 gün", Segments) ve ›. Dokununca o şeyin sayfası (href) ya da penceresi (onClick) açılır.
// Yeni listeler bunu kullanır; satır yüksekliği, yazı boyu ve çizgi her yerde aynı kalır.
export function RowList({ children, className = "" }) {
  return <div className={`overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5 ${className}`}>{children}</div>;
}

// lead: soldaki küçük şey (kişi yuvarlağı); warn: alt satır kehribar (gerçek uyarı)
// Kutu görünümü (ana sayfa Kulüp, Seyhun "A · Kutular" 2026-10-24): RowTiles içindeki satırlar ikili kutu olur: üstte küçük cyan ad,
// ortada büyük değer (right), altında tek satır (sub). Sayfalar aynı satırları değiştirmeden iki görünümde kullanır.
const TileCtx = createContext(false);
export function RowTiles({ children }) {
  return (
    <TileCtx.Provider value={true}>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </TileCtx.Provider>
  );
}
function Tile({ href, onClick, title, sub, right, warn, label }) {
  const body = (
    <>
      <span className="truncate text-[0.75rem] font-semibold text-[#22d3ee]">{title}</span>
      {right != null && <span className="truncate text-[1.25rem] font-bold leading-tight tracking-[-.02em] tabular-nums">{right}</span>}
      {sub && <small className={`truncate text-[0.75rem] ${warn ? "text-warn" : "text-white/60"}`}>{sub}</small>}
    </>
  );
  const cls = "food-card flex min-h-[5.25rem] min-w-0 flex-col gap-0.5 rounded-[1.125rem] px-3 py-2.5 text-left";
  if (href) return <Link href={href} data-press aria-label={label} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" data-press aria-label={label} onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

export function Row({ href, onClick, lead, title, sub, right, warn = false, chev = true, label }) {
  const tile = useContext(TileCtx);
  if (tile) return <Tile href={href} onClick={onClick} title={title} sub={sub} right={right} warn={warn} label={label} />;
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        {sub && <small className={`block truncate text-[0.8125rem] ${warn ? "text-warn" : "text-mut"}`}>{sub}</small>}
      </span>
      {right != null && <span className="shrink-0 text-[0.9375rem] font-bold tabular-nums">{right}</span>}
      {chev && (href || onClick) && <Icon name="chev" className="size-4 shrink-0 text-mut" />}
    </>
  );
  const cls = "flex min-h-[3.5rem] w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0";
  if (href) return <Link href={href} data-press="row" aria-label={label} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" data-press="row" aria-label={label} onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

// Bölüm başlığı (listelerin üstünde): küçük büyük harfli gri ad ve sayı, sağda tek eylem ("Tümü ›" gibi)
export function ListHead({ title, count, href, more = "Tümü", id }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
      <h2 id={id} className="min-w-0 truncate text-[0.8125rem] font-bold tracking-[.04em] text-mut">
        {title.toLocaleUpperCase("tr-TR")}
        {count ? <span className="ml-1.5 font-semibold tabular-nums">{count}</span> : null}
      </h2>
      {href && (
        <Link href={href} className="text-[0.8125rem] font-semibold text-acc">
          {more} ›
        </Link>
      )}
    </div>
  );
}

// Okuma sürerken satırın yerinde yanıp sönen çizgiler (.shimmer globals.css)
export function SkelRow() {
  const tile = useContext(TileCtx);
  if (tile)
    return (
      <div aria-hidden="true" className="food-card flex min-h-[5.25rem] flex-col justify-center gap-2 rounded-[1.125rem] px-3">
        <span className="shimmer block h-3 w-14 rounded-full" />
        <span className="shimmer block h-4 w-20 rounded-full" />
      </div>
    );
  return (
    <div aria-hidden="true" className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
      <span className="flex-1">
        <span className="shimmer block h-3.5 w-24 rounded-full" />
        <span className="shimmer mt-2 block h-3 w-36 rounded-full" />
      </span>
      <span className="shimmer block h-4 w-14 rounded-full" />
    </div>
  );
}

// Durum etiketi (satırın sağında): "Yaptı", "Bekliyor", "Sabit"; tone: globals.css tone-* adı
export function Tag({ tone = "gen", children }) {
  return <span className={`tone-${tone} tone-chip shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold`}>{children}</span>;
}
