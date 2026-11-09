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

// Üstteki bilgi şeridi (Seyhun 2026-11-09 sade öneri "üç bilgi"; 2026-11-09 Takip yeni tasarım: kutu yok, ince çizgiler arasında tek satır):
// [etiket, büyük değer, küçük ek, dokununca (isteğe bağlı), açık mı]; boş değerli hücre yazılmaz. Hava hücresi dokununca saat saat havayı açar.
export function RaceStats({ items, className = "" }) {
  const list = items.filter((x) => x && x[1] !== "" && x[1] != null);
  if (!list.length) return null;
  return (
    <div className={`rz-stats ${className}`} style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
      {list.map(([k, v, s, onTap, open]) => {
        const body = (
          <>
            <small>{k}</small>
            <b>
              {v}
              {s ? <em>{s}</em> : null}
            </b>
          </>
        );
        return onTap ? (
          <button key={k} type="button" onClick={onTap} aria-expanded={!!open} data-press className="rz-stat-b">
            {body}
          </button>
        ) : (
          <div key={k}>{body}</div>
        );
      })}
    </div>
  );
}

// İki giriş (Seyhun 2026-11-06 "hem yayını açabilmeliyim hem de kendi canlı yayın sayfamı"; yayin-canli/ornek.png onaylı): yan yana
// "Canlı ekran" (dolu mavi; kendi canlı ekranı uygulama içinde, /canli/<id>, geri kaydırınca buraya döner) ve "Yayın" (açık mavi; yönetim
// sayfası). Yalnız ana hesapta gösterilir (çağıran karar verir). Lacivert üstte (yarış kart, 2026-11-07) Canlı ekran beyaz, Yayın cam (.ck .rz-go).
// extra: yanına üçüncü düğme (yarış günü "Harita", Seyhun 2026-11-09 Takip yeni tasarım)
export function RaceGo({ id, className = "", extra = null }) {
  const router = useRouter();
  return (
    <div className={`rz-go grid ${extra ? "grid-cols-3" : "grid-cols-2"} gap-2 ${className}`}>
      <button type="button" onClick={() => openInApp(router, `/canli/${id}`)} data-press className="btn btn-primary">
        Canlı ekran
      </button>
      <Link href={`/athletes/races/${id}/yayin`} data-press className="btn rz-soft">
        Yayın
      </Link>
      {extra}
    </div>
  );
}
