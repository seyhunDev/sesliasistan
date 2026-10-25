"use client";

import { useState, useSyncExternalStore } from "react";
import { hasCamera, nativeCamera } from "@/lib/nativeIos";
import { readTimer } from "@/features/training/Countdown";

// Kayıt: iPhone'un kendi kamerasını açar (Seyhun 2026-10-22: "sarsıntısız net görüntü istiyorum, iPhone kamerasını kullanalım");
// fotoğraf ya da video kamerada seçilir. Çekildiği an startla karşılaştırılıp kayda yazılır, izlerken "Startan beri 1:35" görünür (MediaTab take).
// iPhone uygulamasında (VeloraKamera.swift) kameranın üstünde sayaç akar (Seyhun 2026-10-22: "video çekilirken kalan süreyi görebilseydim").
// Web'de ve eski kurulumda yedek: düğme bir label, dosya seçici dokunuşun içinde açılır (iPhone sonradan açılan seçiciyi engeller); sayaç görünmez.
const noop = () => () => {};
export function RecPick({ onFile, className = "", children, ...p }) {
  const app = useSyncExternalStore(noop, hasCamera, () => false);
  const [wait, setWait] = useState(false); // iPhone buluta gidecek kopyayı hazırlarken (uzun videoda birkaç saniye)
  if (app) {
    const open = async () => {
      if (wait) return;
      const t = readTimer();
      const title = t.mode === "start" ? "Yarış startı" : "Antrenman";
      const state = t.end != null ? { end: t.end, paused: false, left: 0, title } : t.left != null ? { end: 0, paused: true, left: Math.round(t.left), title } : null;
      setWait(true);
      try {
        const f = await nativeCamera(state);
        if (f) onFile(f);
      } catch (e) {
        console.warn("[kamera]", e);
      }
      setWait(false);
    };
    return (
      <button type="button" data-press onClick={open} aria-busy={wait} className={`${className} ${wait ? "animate-pulse" : ""}`} {...p}>
        {children}
      </button>
    );
  }
  return (
    <label data-press className={`cursor-pointer ${className}`} {...p}>
      {children}
      <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => (e.target.files?.[0] && onFile(e.target.files[0]), (e.target.value = ""))} />
    </label>
  );
}
