"use client";

import { CrashScreen } from "@/components/ui/CrashScreen";

// Herkese açık canlı sayfaları çökerse: aynı sade ekran, "Canlı yarışlara dön" /canli'ye gider (uygulamaya değil)
export default function CanliError(props) {
  return (
    <div className="navy min-h-dvh bg-bg text-fg">
      <CrashScreen {...props} where="canlı" />
    </div>
  );
}
