"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { savePlace } from "@/lib/place";

// Açık sayfayı kaydeder: uygulama arkadan dönüşte baştan yüklenirse aynı sayfa açılır (lib/place.js)
export function KeepPlace() {
  const path = usePathname();
  useEffect(() => {
    savePlace(location.pathname + location.search);
  }, [path]);
  return null;
}
