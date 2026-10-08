"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır. Koyu yeşil zemin (uygulamanın kubbe rengi), ortada logo: sarı halka dolar, onay çizilir;
// bitince halka tamamlanıp logo büyür, ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
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
      <div className="boot-mark">
        {/* Logo (public/logo.svg) zeminsiz: beyaz küre, dolan sarı halka, çizilen onay işareti */}
        <svg className="boot-logo" viewBox="0 0 360 360" aria-hidden="true">
          <circle className="boot-track" cx="180" cy="180" r="150" />
          <g className="boot-spin">
            <circle className="boot-ring" cx="180" cy="180" r="150" pathLength="1" />
          </g>
          <circle className="boot-disc" cx="180" cy="180" r="104" />
          <path className="boot-check" d="M130 182 L166 216 L232 144" pathLength="1" />
        </svg>
        <p className="boot-name">Sesli Asistan</p>
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
