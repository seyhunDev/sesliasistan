"use client";

import { NewVersionBar } from "@/features/pwa/NewVersionBar";
import { useInAppBack } from "./InAppBack";
import "./canliUpdate.css";

// Canlı sayfalarda "Yeni sürüm var · Güncelle" (Seyhun 2026-11-06 "canlı yayın sayfasında çıkmıyor"): yalnız uygulamanın içinden açılınca;
// herkese açık bağlantıyla bakan izleyiciye gösterilmez. Dikeyde alt çubuğun üstünde (--vb-b, LiveScreen ScView), yatayda en altta.
export function CanliUpdate() {
  const inApp = !!useInAppBack();
  if (!inApp) return null;
  return <NewVersionBar className="nv-canli" />;
}
