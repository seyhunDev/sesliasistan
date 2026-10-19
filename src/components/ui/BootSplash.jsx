"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır. Beyaz zemin, ortada VOCA logosu: dalgalar soldan sağa akarak açılır,
// yükleme sürerken üstünden ışık geçer ve hafifçe süzülür, bitince büyür, ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
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
        {/* VOCA logosu (public/brand): dalgalar soldan sağa akarak açılır, üstünden ışık geçer; altta yazı belirir */}
        <div className="boot-logo">
          <img className="boot-waves" src="/brand/voca-mark.webp" alt="" width={800} height={404} draggable={false} />
          <span className="boot-sheen" aria-hidden="true" />
        </div>
        <img className="boot-word" src="/brand/voca-word.webp" alt="VOCA" width={600} height={98} draggable={false} />
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
