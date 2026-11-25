"use client";

import { useEffect } from "react";
import { holdBoot } from "@/lib/boot";

// Yükleme aşaması (oturum, profil, veriler) sürerken çizilir. Kendisi bir şey göstermez: kök düzendeki tek açılış
// ekranını (BootSplash) tutar; aşamalar art arda gelse de ekran kaybolup yeniden gelmez.
// Anında açılış kopyası (lib/warmStart.js) işe yaramadıysa (ilk giriş, başka hesap) açılış ekranı yine görünür.
export function Splash() {
  // (Hidrasyon çiziminde bir an kurulup kopyayla hemen kalkan Splash ekranı açmasın diye bir tur sonra)
  useEffect(() => {
    const t = setTimeout(() => delete document.documentElement.dataset.warm, 0);
    const release = holdBoot();
    return () => {
      clearTimeout(t);
      release();
    };
  }, []);
  return <div className="min-h-dvh bg-bg" aria-hidden="true" />;
}
