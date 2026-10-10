"use client";

import { useState } from "react";
import { pageDir } from "@/lib/navProgress";

// Sayfa geçişi (iPhone uygulamaları gibi, kısa ve sakin): ileri giderken yeni sayfa sağdan hafifçe kayarak,
// geri dönünce soldan belirir; alt sekmeler arasında (Ana sayfa, Takvim, Mesajlar, Görevler) yalnız solma.
// Sabit (fixed) çubuğu olan sayfalarda kaydırma yok, yalnız solma (globals.css › SAYFA GEÇİŞİ).
export default function Template({ children }) {
  const [dir] = useState(pageDir);
  return (
    <div className="page-in" data-dir={dir}>
      {children}
    </div>
  );
}
