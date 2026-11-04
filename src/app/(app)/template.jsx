"use client";

import { useState, ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { pageDir } from "@/lib/navProgress";

// Sayfa geçişi (Seyhun 2026-11-04 "geçiş animasyonları daha güzel olsun"; iPhone uygulamaları gibi): tarayıcının görünüm geçişiyle
// (React ViewTransition) eski sayfanın görüntüsü ekranda kalır, yeni sayfa sağdan üstüne kayar; geri gidince üstteki sayfa sağa çekilir,
// önceki sayfa soldan döner. Alt sekmeler arasında yumuşak geçiş. Arada boş/beyaz an olmaz. Tür <html data-nav> ile seçilir
// (lib/navProgress.js setNavKind), animasyonlar globals.css › SAYFA GEÇİŞİ. Görünüm geçişi olmayan eski tarayıcıda eski hafif kayma (page-in).
// key: aynı bölümdeki alt sayfalar arasında da (ör. /athletes → /athletes/races) geçiş oynasın.
export default function Template({ children }) {
  const [dir] = useState(pageDir);
  const path = usePathname();
  return (
    <ViewTransition key={path} enter="vt-in" exit="vt-out" default="none">
      <div className="page-in" data-dir={dir}>
        {children}
      </div>
    </ViewTransition>
  );
}
