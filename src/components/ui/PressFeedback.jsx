"use client";

import { useEffect } from "react";
import { usePress } from "@/hooks/usePress";
import { installTapGuard } from "@/lib/tapGuard";

// Basma hissi bütün uygulamada (Seyhun, 2026-10-20, WhatsApp gibi): [data-press] öğeleri parmak dururken basılı görünür.
// Kaydırma tıklama sayılmaz, gerçek dokunuşta hafif titreşim (2026-11-28, lib/tapGuard.js).
export function PressFeedback() {
  usePress();
  useEffect(() => installTapGuard(), []);
  return null;
}
