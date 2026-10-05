"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Ana sayfa › İŞLEMLER: sayfalara ve işlere giden düğmeler. Hepsi aynı: yuvarlak simge + kısa ad, aynı boy, 4 sütun.
// Sıra sabit (kullanıma göre kaymaz), sayı/rozet yok; bilgi ÖZET ve SENİN İÇİN'de. items: [{ href | onClick, icon, label }]
export function HomeActions({ items }) {
  if (!items.length) return null;
  const cls = "flex h-full min-h-[5.5rem] w-full flex-col items-center justify-start gap-1.5 rounded-2xl bg-card px-1 pb-2.5 pt-3 text-center shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line transition active:scale-95";
  const body = (icon, label) => (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="line-clamp-2 text-[0.8125rem] font-semibold leading-tight">{label}</span>
    </>
  );

  return (
    <nav aria-labelledby="home-act">
      <h2 id="home-act" className="mb-2.5 px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
        İŞLEMLER
      </h2>
      <ul className="grid grid-cols-4 gap-2">
        {items.map(({ href, onClick, icon, label }) => (
          <li key={href || label}>
            {href ? (
              <Link href={href} className={cls}>
                {body(icon, label)}
              </Link>
            ) : (
              <button type="button" onClick={onClick} className={cls}>
                {body(icon, label)}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
