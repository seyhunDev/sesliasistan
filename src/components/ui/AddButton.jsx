"use client";

import Link from "next/link";
import { Icon } from "./Icon";

// Ortak ekle düğmesi (Seyhun 2026-11-09 onaylı "Ortak eylemler"): her sayfada lacivert üstte, başlığın sağında beyaz "+ Ad".
// Kısa ad yazılır ("Ürün", "Görev"). Ayrı sayfaya gitmez, pencere açar (href yalnız eski tam sayfa düzenleyiciler için).
// ref: iPad'de seçim listesi bu düğmenin altında açılsın diye (Sheet anchor).
export function AddButton({ children, onClick, href, label, ref, className = "" }) {
  const cls = `btn btn-primary btn-sm shrink-0 gap-1 ${className}`;
  const body = (
    <>
      <Icon name="plus" className="size-4" />
      {children}
    </>
  );
  if (href)
    return (
      <Link href={href} aria-label={label} data-press className={cls}>
        {body}
      </Link>
    );
  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={label} data-press className={cls}>
      {body}
    </button>
  );
}
