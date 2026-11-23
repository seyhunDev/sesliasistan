"use client";

import { useEffect, useState } from "react";

// Kaydırınca üst çubuk (Seyhun 2026-11-23 "A · Büyük başlık kayar, ince çubuk belirir", örnek ust-cubuk/ornek.html; Apple Ayarlar/Mail gibi).
// Telefon ve iPad'de (globals.css .ptb; Seyhun 2026-11-23 "iPad'de de aynı", sol menü varken menünün sağında): sayfa aşağı kayınca üstte, saat/pil çubuğunun altına kadar buzlu cam çubuk belirir; ortada küçük
// başlık, sağda tek iş (children). En üstteyken görünmez, sayfanın kendi büyük başlığı durur. at: çubuğun belireceği kaydırma (px).
// Diğer sayfalar da aynı parçayı kullanır: <ScrollBar title="Takvim">…</ScrollBar>
export function ScrollBar({ title, at = 40, children }) {
  // 0: en üstte (görünmez), 1: kaydı (buzlu zemin; içerik saatin arkasında görünmesin), 2: büyük başlık geçti (küçük başlık ve düğme)
  const [on, setOn] = useState(0);
  useEffect(() => {
    // Sayfa ya pencereyle kayar (telefon, dik iPad) ya da kendi içinde (yatay iPad: main.iph); ikisini de yakalar
    const f = (e) => {
      const el = e?.target;
      const y = el && el !== document && el.nodeType === 1 ? el.scrollTop : window.scrollY;
      setOn(y > at ? 2 : y > 2 ? 1 : 0);
    };
    f();
    document.addEventListener("scroll", f, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", f, { capture: true });
  }, [at]);
  return (
    <div className="ptb" data-bg={on ? "" : undefined} data-on={on === 2 ? "" : undefined} aria-hidden={on < 2}>
      <span className="ptb-s" />
      <b>{title}</b>
      <span className="ptb-s ptb-r">{children}</span>
    </div>
  );
}
