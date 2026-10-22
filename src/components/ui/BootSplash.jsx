"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";
import { RAYS } from "@/components/ui/AppLogo";

const OUT = 560; // çekilme animasyonu (globals.css › .boot[data-phase=out])
const FLY = 720; // giriş ekranında logonun yerine uçuşu (globals.css › .boot[data-fly])

// Altta bekleyen sayfada logo yeri varsa ([data-boot-target], giriş ekranı) açılış logosu oraya uçar ve küçülür;
// zemin ve yazılar solar, sayfa logosu uçuş bitince görünür (popüler uygulamalardaki gibi tek logo, kesintisiz).
function flyTo() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const t = document.querySelector("[data-boot-target]");
  const logo = document.querySelector(".boot-logo");
  if (!t || !logo) return false;
  const a = logo.getBoundingClientRect();
  const b = t.getBoundingClientRect();
  if (!a.width || !b.width) return false;
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  logo.style.setProperty("--fly", `translate(${dx}px, ${dy}px) scale(${b.width / a.width})`);
  document.documentElement.dataset.bootFly = "";
  return true;
}

function setRoot(v) {
  if (v) document.documentElement.dataset.boot = v;
  else delete document.documentElement.dataset.boot;
}

// Uygulamanın tek açılış ekranı: sunucu çiziminde de var (ilk karede boş ekran yok), yükleme aşamaları boyunca
// aynı kalır. Koyu lacivert zemin, ortada Velora logosu: ses çubukları sırayla ortadan dışa uzar,
// yükleme sürerken konuşur gibi kısalıp uzar ve ortadaki ışık nabız gibi atar, bitince büyür, ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
export function BootSplash() {
  const [phase, setPhase] = useState("on"); // on | out | off
  const [fly, setFly] = useState(false);

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
      const flying = flyTo();
      const out = flying ? FLY : OUT;
      setRoot("enter");
      setFly(flying);
      setPhase("out");
      t1 = setTimeout(() => {
        delete document.documentElement.dataset.bootFly;
        setPhase("off");
      }, out);
      t2 = setTimeout(() => setRoot(""), out + 500);
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
    <div className="boot" data-phase={phase} data-fly={fly || undefined} role="status" aria-label="Yükleniyor" aria-hidden={phase === "out" || undefined}>
      <div className="boot-bg" />
      <div className="boot-mark">
        {/* Velora logosu (public/brand/velora-mark.svg ile aynı çizim): çubuklar sırayla açılır, sonra ses gibi kısalıp uzar */}
        <svg className="boot-logo" viewBox="132 132 760 760" aria-hidden="true">
          <defs>
            <linearGradient id="boot-g" gradientUnits="userSpaceOnUse" x1="160" y1="160" x2="864" y2="864">
              <stop offset="0" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <g stroke="url(#boot-g)" strokeWidth="30" strokeLinecap="round">
            {RAYS.map((r, i) => (
              <g key={i} transform={`rotate(${r.angle} 512 512)`}>
                <line className="boot-ray" x1="512" y1="312" x2="512" y2={312 - r.len} style={{ "--i": i }} />
              </g>
            ))}
          </g>
          <circle className="boot-core-glow" cx="512" cy="512" r="96" fill="url(#boot-g)" />
          <circle className="boot-core" cx="512" cy="512" r="64" fill="#fff" />
        </svg>
        <p className="boot-word">Velora</p>
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
