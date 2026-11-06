"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { openInApp } from "@/features/liveScreen/InAppBack";

// Yarış sayfalarının yeni görünümü (Seyhun 2026-11-06 "tasarımı tamamen değiştir… bundan sonraki yarışla ilgili kısımları bu sade tasarım
// anlayışı, buton anlayışıyla yapacağız"; örnek yaris-detay-sade/yeni-dil/ornek.png onaylı): beyaz zemin, lacivert blok ve kart çerçevesi yok,
// satırlar ince çizgiyle ayrılır; sekmeler tek parça seçici; sayfada tek dolu mavi düğme. Renk: mavi yalnız iş, yeşil tamam, sarı eksik,
// kırmızı yaklaşan / geçersiz. Yarış sayfaları (detay, liste, yayın) bu parçaları kullanır. CSS: globals.css "Yarış sade" (main.rz).

// Açılır satır: solda ad, sağda kısa değer, dokununca altında içeriği açılır
export function Fold({ label, value, open, onToggle, children, className = "" }) {
  return (
    <div className={`rz-row-wrap ${className}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} data-press="row" className="rz-row w-full text-left">
        <span className="rz-k">{label}</span>
        {value != null && <span className="rz-v">{value}</span>}
        <span className={`rz-chev ${open ? "rz-up" : "rz-dn"}`} aria-hidden="true" />
      </button>
      {open && <div className="rz-open">{children}</div>}
    </div>
  );
}

// Sekmeler: tek parça seçici, hepsi tek satırda; eksik olanda küçük sarı nokta
export function RaceSeg({ tabs, value, onChange, className = "" }) {
  return (
    <nav aria-label="Bölümler" className={`rz-seg ${className}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map(([k, name, , warn, extra]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} data-press className="rz-seg-b">
          <span className="truncate">{name}</span>
          {extra ? <span className="rz-new">{extra}</span> : warn ? <i className="rz-dot" aria-label="eksik" /> : null}
        </button>
      ))}
    </nav>
  );
}

// İki giriş (Seyhun 2026-11-06 "hem yayını açabilmeliyim hem de kendi canlı yayın sayfamı"; yayin-canli/ornek.png onaylı): yan yana
// "Canlı ekran" (dolu mavi; kendi canlı ekranı uygulama içinde, /canli/<id>, geri kaydırınca buraya döner) ve "Yayın" (açık mavi; yönetim
// sayfası). Yalnız ana hesapta gösterilir (çağıran karar verir).
export function RaceGo({ id, className = "" }) {
  const router = useRouter();
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      <button type="button" onClick={() => openInApp(router, `/canli/${id}`)} data-press className="btn btn-primary">
        Canlı ekran
      </button>
      <Link href={`/athletes/races/${id}/yayin`} data-press className="btn rz-soft">
        Yayın
      </Link>
    </div>
  );
}
