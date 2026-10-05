"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Marka renkleri: yalnız tanınan sosyal medya düğmesinde (Instagram simgesi ve renk geçişi); diğerleri uygulamanın yeşil simgesi
export const BRAND = {
  instagram: "bg-[linear-gradient(45deg,#f9a03a_0%,#e9583f_30%,#d62f6c_60%,#a23ab6_100%)] text-white",
};

// Ana sayfa › İŞLEMLER: gruplar (Günlük, Kulüp, Yönetim, Sosyal: Instagram, Etkinlikler), her grupta aynı düğmeler: yuvarlak simge + tek satır ad,
// aynı boy, 3 sütun (en uzun ad da tek satıra sığsın). Sıra sabit, sayı/rozet yok; bilgi ÖZET ve SENİN İÇİN'de. groups: homeActions() (homeTiles.js), toplantıda onClick.
export function HomeActions({ groups }) {
  if (!groups.length) return null;
  const cls = "flex h-[5.25rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-card px-0.5 text-center shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line transition active:scale-95";
  const body = (icon, label, brand) => (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${BRAND[brand] || "bg-acc/10 text-acc"}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="w-full truncate whitespace-nowrap text-[0.8125rem] font-semibold leading-tight tracking-[-0.01em]">{label}</span>
    </>
  );

  return (
    <nav aria-labelledby="home-act" className="space-y-4">
      <h2 id="home-act" className="px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
        İŞLEMLER
      </h2>
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="mb-2 px-1 text-[0.8125rem] font-semibold text-fg/70">{g.title}</h3>
          <ul className="grid grid-cols-3 gap-2">
            {g.items.map(({ href, onClick, icon, label, brand }) => (
              <li key={href || label}>
                {href ? (
                  <Link href={href} className={cls}>
                    {body(icon, label, brand)}
                  </Link>
                ) : (
                  <button type="button" onClick={onClick} className={cls}>
                    {body(icon, label, brand)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
