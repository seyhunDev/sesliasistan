"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır. Koyu yeşil zemin (uygulamanın kubbe rengi), ortada sesle dalgalanan beş çubuk, altta yükselen ufuk;
// bitince dalga büyüyüp ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
export function BootSplash() {
  const [phase, setPhase] = useState("on"); // on | out | off

  useEffect(() => {
    let t1 = 0;
    let t2 = 0;
    const apply = (on) => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (on) {
        setRoot("on");
        setPhase("on");
        return;
      }
      setRoot("enter");
      setPhase("out");
      t1 = setTimeout(() => setPhase("off"), OUT);
      t2 = setTimeout(() => setRoot(""), OUT + 500);
    };
    const off = onBoot(apply);
    if (!bootShown()) apply(false);
    else setRoot("on");
    kickBoot();
    return () => {
      off();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "off") return null;
  return (
    <div className="boot" data-phase={phase} role="status" aria-label="Yükleniyor" aria-hidden={phase === "out" || undefined}>
      {/* Ufuk: alttan yükselen deniz ve üstünde ses dalgası (logonun büyük, canlı hâli) */}
      <svg className="boot-sea" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
        <path className="boot-sea-fill" d="M-20 120 Q200 30 420 120 L420 220 L-20 220 Z" />
        <path className="boot-sea-line" d="M-20 120 Q200 30 420 120" pathLength="1" />
      </svg>
      <div className="boot-mark">
        <div className="boot-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <p className="boot-name">Sesli Asistan</p>
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
