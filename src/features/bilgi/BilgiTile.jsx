"use client";

import { Row, RowList } from "@/components/ui/Row";

// Ana sayfada Tekne Ekranı kutusu (eski adı "Bilgi ekranı"). Seyhun 2026-11-23: önizleme (geri sayım, pusula) kalktı, "daha minimal":
// örnek C, ana sayfadaki listeler gibi iki satır. Üst satır ekranı açar (herkes: ana hesap, sporcu), alt satır Yönet (yalnız ana hesap).
export function BilgiTile({ owner }) {
  return (
    <RowList>
      <Row href="/bilgi" title="Tekne Ekranı" sub="Start sayacı · pusula · parkur · antrenör sesi" />
      {owner && <Row href="/bilgi/yonet" title="Yönet" />}
    </RowList>
  );
}
