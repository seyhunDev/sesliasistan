"use client";

import { useEffect, useState } from "react";

// Kaydırınca üst çubuk (Seyhun 2026-11-23 "A · Büyük başlık kayar, ince çubuk belirir", örnek ust-cubuk/ornek.html; Apple Ayarlar/Mail gibi).
// Telefonda (globals.css .ptb, 48rem altı): sayfa aşağı kayınca üstte, saat/pil çubuğunun altına kadar buzlu cam çubuk belirir; ortada küçük
// başlık, sağda tek iş (children). En üstteyken görünmez, sayfanın kendi büyük başlığı durur. at: çubuğun belireceği kaydırma (px).
// Diğer sayfalar da aynı parçayı kullanır: <ScrollBar title="Takvim">…</ScrollBar>
export function ScrollBar({ title, at = 40, children }) {
  // 0: en üstte (görünmez), 1: kaydı (buzlu zemin; içerik saatin arkasında görünmesin), 2: büyük başlık geçti (küçük başlık ve düğme)
  const [on, setOn] = useState(0);
  useEffect(() => {
    const f = () => setOn(window.scrollY > at ? 2 : window.scrollY > 2 ? 1 : 0);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [at]);
  return (
    <div className="ptb" data-bg={on ? "" : undefined} data-on={on === 2 ? "" : undefined} aria-hidden={on < 2}>
      <span className="ptb-s" />
      <b>{title}</b>
      <span className="ptb-s ptb-r">{children}</span>
    </div>
  );
}
