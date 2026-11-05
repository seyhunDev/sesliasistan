"use client";

import Link from "next/link";

// Yarışlar tek sayfa gibi (Seyhun 2026-10-28, yaris-tasarim/harita): lacivert üstte Kulübüm | Takvim. Kulübüm kulübün yarışları
// (/athletes/races), Takvim ortak yarışlar (/races). Yalnız sporcu yetkisi olanda görünür; diğerleri yalnız Takvim'i görür.
// inline: geniş ekranda başlığın sağında, dar (Seyhun 2026-11-05 iPad tasarımı)
export function RaceSwitch({ on, inline }) {
  const seg = (k, l, href) => (
    <Link href={href} replace aria-current={on === k ? "page" : undefined} data-press className={`flex h-[2.125rem] flex-1 items-center justify-center rounded-[0.6rem] text-[0.875rem] font-semibold ${on === k ? "bg-white text-[#0b1a33]" : "text-white/80"}`}>
      {l}
    </Link>
  );
  return (
    <nav aria-label="Yarışlar" className={`ck-glass flex rounded-xl p-[3px] ${inline ? "w-[17rem] shrink-0" : "mt-3.5"}`}>
      {seg("club", "Kulübüm", "/athletes/races")}
      {seg("cal", "Takvim", "/races")}
    </nav>
  );
}
