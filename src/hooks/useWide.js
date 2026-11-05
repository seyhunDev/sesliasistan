"use client";

import { useSyncExternalStore } from "react";

// Geniş ekran (iPad ve Mac, ≥48rem = 768px): ana sayfa tek ekran düzenine geçer. Sunucuda ve ilk çizimde false (telefon düzeni).
const Q = "(min-width: 48rem)";
const sub = (cb) => {
  const m = window.matchMedia(Q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export function useWide() {
  return useSyncExternalStore(sub, () => window.matchMedia(Q).matches, () => false);
}
