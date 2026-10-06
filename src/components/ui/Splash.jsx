"use client";

import { useEffect } from "react";
import { holdBoot } from "@/lib/boot";

// Yükleme aşaması (oturum, profil, veriler) sürerken çizilir. Kendisi bir şey göstermez: kök düzendeki tek açılış
// ekranını (BootSplash) tutar; aşamalar art arda gelse de ekran kaybolup yeniden gelmez.
export function Splash() {
  useEffect(() => holdBoot(), []);
  return <div className="min-h-dvh bg-bg" aria-hidden="true" />;
}
