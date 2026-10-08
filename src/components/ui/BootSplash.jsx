"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır. Koyu yeşil zemin (uygulamanın kubbe rengi), ortada logo çizilir: ses dalgası onay işaretine döner;
// yükleme sürerken hafifçe nefes alır, bitince büyür, ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
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
        {/* Logo (public/logo.svg) zeminsiz: tek çizgi önce ses dalgası, sonra onay işareti; çizilerek gelir */}
        <svg className="boot-logo" viewBox="120 300 790 400" aria-hidden="true">
          <path
            className="boot-line"
            d="M160 560 C173 540 212 430 240 440 C268 450 301 615 330 620 C359 625 383 463 415 470 C447 477 502 628 520 660 L870 340"
            pathLength="1"
          />
        </svg>
        <p className="boot-name">Sesli Asistan</p>
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
