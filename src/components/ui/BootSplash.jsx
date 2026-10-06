"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır, sonra logo hafifçe büyüyüp ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
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
        <svg className="boot-logo" viewBox="0 0 512 512" width="88" height="88" aria-hidden="true">
          <defs>
            <linearGradient id="boot-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#36907a" />
              <stop offset="1" stopColor="#1d5545" />
            </linearGradient>
            <clipPath id="boot-c">
              <rect width="512" height="512" rx="112" />
            </clipPath>
          </defs>
          <rect width="512" height="512" rx="112" fill="url(#boot-g)" />
          <g clipPath="url(#boot-c)">
            <path d="M-40 452 Q256 300 552 452 L552 560 L-40 560 Z" fill="#fff" fillOpacity=".13" />
            <path className="boot-sea" d="M-40 452 Q256 300 552 452" fill="none" stroke="#d4f7e9" strokeWidth="8" strokeOpacity=".85" />
          </g>
          <g fill="#fff">
            <rect x="140" y="194" width="32" height="64" rx="16" />
            <rect x="190" y="166" width="32" height="120" rx="16" />
            <rect x="240" y="138" width="32" height="176" rx="16" />
            <rect x="290" y="166" width="32" height="120" rx="16" />
            <rect x="340" y="194" width="32" height="64" rx="16" />
          </g>
        </svg>
        <p className="boot-name">Sesli Asistan</p>
        <span className="boot-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
