import Link from "next/link";
import { Icon } from "./Icon";

// Ortak liste (Seyhun 2026-10-21 kokpit tasarımı, "C"): beyaz kart içinde satırlar, her satır aynı biçimde: solda ad ve altında tek kısa bilgi,
// sağda değer (sayı, tutar, "4 gün", Segments) ve ›. Dokununca o şeyin sayfası (href) ya da penceresi (onClick) açılır.
// Yeni listeler bunu kullanır; satır yüksekliği, yazı boyu ve çizgi her yerde aynı kalır.
export function RowList({ children, className = "" }) {
  return <div className={`overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5 ${className}`}>{children}</div>;
}

export function Row({ href, onClick, title, sub, right, chev = true, label }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        {sub && <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>}
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

// Bölüm başlığı (listelerin üstünde): küçük büyük harfli gri ad, sağda tek eylem ("Tümü ›" gibi)
export function ListHead({ title, href, more = "Tümü", id }) {
  return (
    <div className="mb-1.5 mt-5 flex items-center justify-between gap-3 px-1">
      <h2 id={id} className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">{title.toLocaleUpperCase("tr-TR")}</h2>
      {href && (
        <Link href={href} className="text-[0.8125rem] font-semibold text-acc">
          {more} ›
        </Link>
      )}
    </div>
  );
}
