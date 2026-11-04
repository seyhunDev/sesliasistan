"use client";

import { useRainRadar } from "./useRainRadar";
import { hereLine } from "./rainLine";

// "Şu an" satırı (Seyhun 2026-11-04: "burada yağmıyorsa burada yağmıyor diye göstermeliyiz", "gerçekleşenleri daha net göstermeliyiz"):
// tahmin ~10 km'lik kareyi tek değer sayar; şu anki durumu radar söyler. Ana sayfa ve Hava sayfasında saat tablosunun altında, lacivert kartın içinde.
// Gösterilir: burada yağıyorsa, 30 km içinde yağış varsa ya da tahmin bugünün kalanında yağış diyorsa ("Burada ve 30 km içinde şu an yağış yok").
const HM = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function NowRain({ place, rows, radar: given }) {
  const own = useRainRadar(given === undefined ? place : null);
  const radar = given === undefined ? own : given;
  const h0 = new Date().getHours();
  const text = hereLine(radar, (rows || []).some((r) => +r.hh >= h0 && r.mm >= 0.1), HM);
  if (!text) return null;
  return (
    <p className="mt-2.5 flex items-center gap-2 whitespace-nowrap px-1 text-[0.8125rem] font-semibold text-[#ffa94d]" aria-label="Şu an">
      {/* Tek satır, turuncu (Seyhun 2026-11-04 "tek satır olarak yazmalıyız, turuncu daha dikkat çeker"); sığmazsa sonu … */}
      <span className="shrink-0 rounded-full bg-[#ffa94d] px-2 py-0.5 text-[0.6875rem] font-bold text-[#0b1a33]">Şu an</span>
      <span className="min-w-0 truncate">{text}</span>
    </p>
  );
}
