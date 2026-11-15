"use client";

import Link from "next/link";

// Ana sayfada bilgi ekranı paneli (Seyhun 2026-11-15 "ana sayfadan iki ayrı düğmeyle"): Ekran herkes (ana hesap, sporcu), Yönet yalnız ana hesap
export function BilgiTile({ owner }) {
  return (
    <section className="iph-pn" aria-label="Bilgi ekranı">
      <div className="iph-pt">Bilgi ekranı</div>
      <div className="flex gap-2">
        <Link href="/bilgi" className="btn btn-primary flex-1" data-press>
          Ekran
        </Link>
        {owner && (
          <Link href="/bilgi/yonet" className="btn btn-secondary flex-1" data-press>
            Yönet
          </Link>
        )}
      </div>
    </section>
  );
}
