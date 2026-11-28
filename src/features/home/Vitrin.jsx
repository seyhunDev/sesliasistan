"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBilgi, useTekneler } from "@/features/bilgi/bilgiStore";
import { membersOf } from "@/lib/bilgi";
import { bilgiOrg } from "@/lib/kinds";
import { useNow } from "@/hooks/useNow";

// VİTRİN KARTLARI (Seyhun 2026-11-28 "Velora Sailing'i sadece bir buton olarak değil, güzel bir tasarımla, telefonda yatayda full göstermek istiyorum;
// Yönet de aynı şekilde; arka fonları, solukluk, yazı güzel alanlar olmalı"; örnek yonetim-paneli/ornek.html v2).
// Ana hesap ve normal kullanıcının ana sayfasında (SahneHome.jsx, pano.css .vt). v3 (2026-11-28 örnek yonetim-paneli/vitrin2): solda yazı ve Başlat,
// sağda animasyon (Sailing'in gerçek senaryosu, Yönet'te parkur haritası). Hareket azaltılmışsa (iOS ayarı) durağan kare.
function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const f = () => setStill(m.matches);
    f();
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, []);
  return still;
}

// Velora Sailing: Velora Sailing'in kendi "A1 · Start çizgisi avantajı" senaryosu, Sailing kodu (engine, rules, boat-draw, thumbs) ile
// kare kare çizilip 8 sn'lik döngü videosu yapıldı (public/vitrin/sailing-a1.mp4, 130 KB; Seyhun 2026-11-28 "gerçek animasyonlardan, bizim senaryolardan").
// Hareket azaltılmışsa yalnız durağan kare (poster).
function SailArt({ still }) {
  if (still) return <img className="vt-art" src="/vitrin/sailing-a1.jpg" alt="" aria-hidden="true" />;
  return <video className="vt-art vt-vid" src="/vitrin/sailing-a1.mp4" poster="/vitrin/sailing-a1.jpg" autoPlay muted loop playsInline preload="auto" aria-hidden="true" />;
}

// Yönet: Yönet haritasındaki gibi parkur (start hattı, hakem botu, orsa şamandırası, layline) ve yön üçgeniyle tramola atarak orsaya çıkan tekneler
const GRID = Array.from({ length: 11 }, (_, i) => i * 20);
const LEGS = ["M85 160 L60 128 L96 92 L80 76 L112 44", "M120 162 L150 132 L118 100 L140 78 L120 50", "M100 166 L80 140 L112 108 L96 92 L114 60", "M140 165 L118 140 L150 110 L128 88 L124 62"];
function YonetArt({ still }) {
  return (
    <svg className="vt-art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="200" fill="#0b1530" />
      <g stroke="#3d8bff" strokeOpacity=".07">
        {GRID.map((x) => (
          <path key={x} d={`M${x} 0V200M0 ${x}H200`} />
        ))}
      </g>
      <path d="M118 28 L58 88 M118 28 L178 88" stroke="#9cc2ff" strokeOpacity=".25" strokeDasharray="3 4" fill="none" />
      <line x1="62" y1="170" x2="160" y2="172" stroke="#ffd166" strokeWidth="1.4" strokeDasharray="4 3" opacity=".85" />
      <circle cx="62" cy="170" r="3.5" fill="#ff8c42" />
      <rect x="158" y="166" width="12" height="12" rx="3" fill="#e9edf7" opacity=".85" />
      <circle cx="118" cy="28" r="4.5" fill="#ff8c42" stroke="#fff" strokeWidth="1" />
      <path d="M186 10 v14 m-4 -5 l4 5 l4 -5" stroke="#9cc2ff" strokeWidth="1.5" fill="none" opacity=".7" />
      {LEGS.map((p, i) => (
        <g key={p} transform={still ? `translate(${p.match(/L(\d+) (\d+)/).slice(1).join(" ")}) rotate(-60)` : undefined}>
          <path d="M5 0 L-4 -3.5 L-2 0 L-4 3.5Z" fill={i ? "#3d8bff" : "#fff"} />
          {!still && <animateMotion dur={`${9 + i}s`} begin={`-${i * 2}s`} repeatCount="indefinite" rotate="auto" path={p} />}
        </g>
      ))}
    </svg>
  );
}

const PLAY = (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.5 1.5v9l8-4.5z" fill="currentColor" />
  </svg>
);

// Kart: solda küçük üst yazı, net başlık, tek satır ve hemen altında Başlat; sağda animasyon (Seyhun 2026-11-28 "gereksiz boşluk kullanmayalım")
function Card({ href, cls, art, top, title, line, chip }) {
  return (
    <Link href={href} data-press className={`vt ${cls}`}>
      {art}
      {chip}
      <span className="vt-in">
        <span className="vt-top">{top}</span>
        <b className="vt-t">{title}</b>
        <span className="vt-l">{line}</span>
        <span className="vt-go">
          {PLAY}
          Başlat
        </span>
      </span>
    </Link>
  );
}

// Yönet kartı: kanal açıkken düğmenin yanında "Açık · 5 tekne" (son 90 sn'de konum veren tekneler; tekneler yalnız kanal açıkken dinlenir)
function YonetCard({ profile, still }) {
  const org = bilgiOrg(profile);
  const b = useBilgi(org);
  const k = b?.kanal?.open ? b.kanal : null;
  const boats = useTekneler(k ? org : "");
  const now = useNow(30000).getTime();
  const n = k ? membersOf(boats, k.id, now).length : 0;
  return (
    <Card
      href="/bilgi/yonet"
      cls="vt-yon"
      art={<YonetArt still={still} />}
      top="Su üstü"
      title="Yönet"
      line="Tekneler ve parkur tek haritada."
      chip={k ? <em className="vt-live">{n ? `${n} tekne` : "Açık"}</em> : null}
    />
  );
}

export function Vitrin({ yonet, profile }) {
  const still = useStill();
  return (
    <div className="vt-row">
      <Card href="/sailing" cls="vt-sail" art={<SailArt still={still} />} top="Simülatör" title="Velora Sailing" line="Taktik ve kural senaryoları." />
      {yonet && <YonetCard profile={profile} still={still} />}
    </div>
  );
}
