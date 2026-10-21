"use client";

import { useEffect } from "react";

// Seçili sekme adreste (?tab=) tutulur: iPhone sayfayı kendiliğinden yenilerse (kameradan dönüşte bellek az kalınca, yeni sürüm gelince)
// aynı sekmede açılır (Seyhun 2026-10-21: "sayfa kendi kendine yenilendi, başka bir sayfaya gitti").
export function useTabInUrl(tab) {
  useEffect(() => {
    if (!tab) return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("tab") === tab) return;
    u.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
  }, [tab]);
}
