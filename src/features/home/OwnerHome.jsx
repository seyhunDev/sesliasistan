"use client";

import { OwnerSahne } from "./SahneHome";

// ÜÇ ANA SAYFA (Seyhun 2026-11-25): ana hesap (bu dosya), normal kullanıcı (NormalHome), sporcu (SporcuHome); üçü de koyu "Sahne" dilinde.
// Kim neyi görür lib/hesapGorunum.js'te; görünüm useHesap'tan (ana hesap "… gibi gör" ile ötekilerine bakar).
// Ana hesap ve normal kullanıcı aynı çerçeve: SahneHome.jsx (hava, gün şeridi, planlar; ana hesapta Kulüp kokpiti).
// Eski açık tema iPad/telefon çerçevesi (IpadHome) artık ana sayfada kullanılmıyor; Bekleyen (Waiting) oradan.
export function OwnerHome() {
  return <OwnerSahne />;
}
