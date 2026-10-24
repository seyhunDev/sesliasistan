"use client";

import { useState } from "react";
import { photoUrl } from "../photo";

// Yemek fotoğrafı: internet bağlantısından gelir (indirilmez). Açılmazsa düz zemin kalır, kırık resim görünmez.
export function Img({ src, w = 480, alt = "", className = "" }) {
  const [bad, setBad] = useState(false);
  const url = photoUrl(src, w);
  return (
    <span className={`block overflow-hidden bg-line ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dış bağlantı (Unsplash), Next görüntü sunucusu yok */}
      {url && !bad && <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} className="size-full object-cover" />}
    </span>
  );
}

export const tl = (n) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
export const rating = (r) => String(r).replace(".", ",");
