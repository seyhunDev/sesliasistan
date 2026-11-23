"use client";

import Link from "next/link";
import { IntroTile } from "@/components/ui/IntroTile";
import { TeknePreview } from "@/features/intro/TeknePreview";

// Ana sayfada Tekne Ekranı kutusu (eski adı "Bilgi ekranı"; Seyhun 2026-11-23 "tanımlayıcı isim", örnek B canlı önizlemeli).
// Aç herkes (ana hesap, sporcu), Yönet yalnız ana hesap (2026-11-15 "iki ayrı düğmeyle").
export function BilgiTile({ owner }) {
  return (
    <IntroTile short preview={<TeknePreview />} title="Tekne Ekranı" sub="Start sayacı · pusula · parkur · antrenör sesi">
      <Link href="/bilgi" className="btn btn-primary btn-sm flex-1" data-press>
        Aç
      </Link>
      {owner && (
        <Link href="/bilgi/yonet" className="btn btn-secondary btn-sm flex-1" data-press>
          Yönet
        </Link>
      )}
    </IntroTile>
  );
}
