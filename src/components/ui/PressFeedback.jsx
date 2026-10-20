"use client";

import { usePress } from "@/hooks/usePress";

// Basma hissi bütün uygulamada (Seyhun, 2026-10-20, WhatsApp gibi): [data-press] öğeleri parmak dururken basılı görünür
export function PressFeedback() {
  usePress();
  return null;
}
