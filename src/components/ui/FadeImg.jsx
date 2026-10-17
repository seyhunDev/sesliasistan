"use client";

import { useState } from "react";

// Yüklenirken yavaş yavaş dolan görüntü yerine: görüntü tamamen inip çözülene kadar görünmez, sonra yumuşakça belirir
// (Seyhun: "boş açılıyor, yavaş yavaş doluyor, hoş değil"). Altındaki yer tutucu (baş harfler, kişinin renginde) o sırada görünür.
// Önbellekteki görüntü hemen gelir, belirme olmaz. className görüntünün boyu ve biçimi; kapsayıcı relative olmalı.
export function FadeImg({ src, className = "" }) {
  const [shown, setShown] = useState("");
  const on = shown === src;
  const ready = (img) => {
    if (!img || on) return;
    if (img.complete && img.naturalWidth) setShown(src);
  };
  const load = (e) => {
    const img = e.currentTarget;
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => setShown(src));
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ready}
      src={src}
      alt=""
      decoding="async"
      onLoad={load}
      className={`absolute inset-0 transition-opacity duration-300 ease-out ${on ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
