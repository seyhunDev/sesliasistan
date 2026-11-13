"use client";

import { useEffect } from "react";
import { markOpen } from "@/lib/openTime";

// Sayfa verilerle ilk çizildiğinde açılış süresini kaydeder (lib/openTime.js); DataProvider hazır olunca kurulur
export function OpenTimer() {
  useEffect(() => {
    const id = requestAnimationFrame(() => setTimeout(() => markOpen(), 0));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
