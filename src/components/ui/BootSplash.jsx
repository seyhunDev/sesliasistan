"use client";

import { useEffect, useState } from "react";
import { bootShown, kickBoot, onBoot } from "@/lib/boot";
import { MARK_DISC, MARK_V } from "@/components/ui/AppLogo";

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
// aynı kalır. Koyu lacivert zemin, ortada Velora logosu (2026-11-03): beyaz daire büyüyerek gelir, V yukarıdan inip
// daireyi oyar; yükleme sürerken daire hafifçe nefes alır. Bitince büyür, ekran solarken sayfa altından belirir; asistan kubbesi o an yükselir.
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
      // Anında açılış: ekran hiç görünmedi, çekilme ve sayfa giriş animasyonu da yok (sayfa olduğu gibi belirir)
      if ("warm" in document.documentElement.dataset) {
        setRoot("");
        setPhase("off");
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
        {/* Velora logosu (public/brand/velora-glyph.svg ile aynı çizim): daire gelir, V inip daireyi oyar */}
        <svg className="boot-logo" viewBox="18 18 64 68" aria-hidden="true">
          <defs>
            <mask id="boot-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect width="100" height="100" fill="#fff" />
              <path className="boot-v" d={MARK_V} fill="#000" />
            </mask>
          </defs>
          <g mask="url(#boot-cut)">
            <circle className="boot-disc-glow" {...MARK_DISC} fill="#3d7bff" />
            <circle className="boot-disc" {...MARK_DISC} fill="#fff" />
          </g>
        </svg>
        <p className="boot-word">Velora</p>
        <p className="boot-sub">Hazırlanıyor</p>
      </div>
    </div>
  );
}
