"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SeaMap } from "./SeaMap";
import { useSea } from "./useSea";

// Ana sayfa için küçük deniz trafiği kartı (Seyhun 2026-10-23: "ana sayfada küçük bir harita, tıklayınca deniz trafiği sayfası"):
// üstte küçük harita (dokunulmaz), altta "Deniz trafiği" ve kısa özet ("7 gemi · 2 yanaşıyor"). Kartın tamamı /sea'yi açar.
// Az data: 60 sn'de bir, yalnız ekran açıkken sorar. Anahtar yoksa (AISSTREAM_KEY) kart görünmez; veri alınamazsa kart
// "Veri alınamadı" der (Seyhun 2026-10-23: kart hiç çıkmayınca "ana sayfa kartını da yap" dedi).
// Sayfadaki harita VesselFinder'ın (2026-10-23); kartta hafif kendi haritamız kalır (VesselFinder ana sayfada ağır).
// Görünüş yemek kartıyla aynı (.food-card); OwnerHome'da yemek kartının altında (ana sayfa sahibiyle 2026-10-23).
const MOVE = ["approach", "leave", "ready"];

export function SeaCard({ className = "" }) {
  const { data } = useSea(60);
  const ships = useMemo(() => data?.ships || [], [data]);
  if (!data || data.error === "nokey") return null;
  const moving = ships.filter((s) => MOVE.includes(s.state.key));
  const near = moving.filter((s) => s.state.key === "approach").length;
  const sub = !data.ships ? "Veri alınamadı" : !ships.length ? "Dikili" : [`${ships.length} gemi`, near ? `${near} yanaşıyor` : moving.length ? `${moving.length} hareketli` : ""].filter(Boolean).join(" · ");
  return (
    <Link href="/sea" data-press className={`food-card block overflow-hidden rounded-[1.375rem] ${className}`}>
      <SeaMap small ships={ships} />
      <span className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[1.0625rem] font-semibold">Deniz trafiği</b>
          <small className="block truncate text-[0.8125rem] text-white/65 tabular-nums">{sub}</small>
        </span>
        <span className="food-btn shrink-0">Aç</span>
      </span>
    </Link>
  );
}
