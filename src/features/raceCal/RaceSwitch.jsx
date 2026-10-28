"use client";

import Link from "next/link";

// Yarışlar tek sayfa gibi (Seyhun 2026-10-28, yaris-tasarim/harita): lacivert üstte Kulübüm | Takvim. Kulübüm kulübün yarışları
// (/athletes/races), Takvim ortak yarışlar (/races). Yalnız sporcu yetkisi olanda görünür; diğerleri yalnız Takvim'i görür.
export function RaceSwitch({ on }) {
  const seg = (k, l, href) => (
    <Link href={href} replace aria-current={on === k ? "page" : undefined} data-press className={`flex h-[2.125rem] flex-1 items-center justify-center rounded-[0.6rem] text-[0.875rem] font-semibold ${on === k ? "bg-white text-[#11203a]" : "text-white/80"}`}>
      {l}
    </Link>
  );
  return (
    <nav aria-label="Yarışlar" className="ck-glass mt-3.5 flex rounded-xl p-[3px]">
      {seg("club", "Kulübüm", "/athletes/races")}
      {seg("cal", "Takvim", "/races")}
    </nav>
  );
}
