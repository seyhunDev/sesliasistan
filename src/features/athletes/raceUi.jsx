"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { openInApp } from "@/features/liveScreen/InAppBack";
import { todayStr } from "@/lib/utils/format";
import { placeText } from "./RaceList";

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

// Yarış detayının sekmeleri "Sahne" (Seyhun 2026-11-25 "Yap"; örnek project-files/yaris-detay-sahne/ornek.html): kısa durumlu kutular
// [anahtar, ad, durum, eksik mi, yeni sayısı]; seçili kutu limon çerçeve, eksik durum kehribar, yeni limon. Eski bilgi şeridinin yerini aldı (tekrar yok).
export function RaceTiles({ tabs, value, onChange, className = "" }) {
  return (
    <nav aria-label="Bölümler" className={`rsh-tabs ${className}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map(([k, name, stat, warn, extra]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} data-press className="rsh-tb">
          <span>{stat ? name : ""}</span>
          <b className={`rsh-c ${extra ? "rsh-new" : warn ? "rsh-warn" : ""}`}>{stat || name}</b>
        </button>
      ))}
    </nav>
  );
}

// Yarış kartı (Sahne): tarih · yer, büyük ad; yarıştan önce sağda kalan gün, yarış günü altta iki kutu (now: [ad, değer, ek]). sub: ad altındaki kısa satır
export function RaceHero({ r, sub = "", now = null }) {
  const t = todayStr();
  const n = r.startDate ? gap(t, r.startDate) : null;
  const over = !!r.startDate && t > (r.endDate || r.startDate);
  const cnt = now ? null : over ? ["", "Bitti"] : n > 0 ? [n, "gün kaldı"] : null;
  const where = whereText(r);
  return (
    <section className="rsh-hero" aria-label={r.name || "Yarış"}>
      {where && <span className="rsh-k">{where}</span>}
      <h1 className={`rsh-c rsh-tt ${cnt ? "rsh-pr" : ""}`}>{r.name || "Yarış"}</h1>
      {sub && <span className="rsh-sub">{sub}</span>}
      {cnt && (
        <span className="rsh-cnt">
          {cnt[0] !== "" && <b className="rsh-c">{cnt[0]}</b>}
          <small className={cnt[0] === "" ? "rsh-c rsh-done" : ""}>{cnt[1]}</small>
        </span>
      )}
      {now?.length > 0 && (
        <div className="rsh-now">
          {now.map(([k, v, s]) => (
            <div key={k}>
              <span>{k}</span>
              <b className="rsh-c">{v === "" || v == null ? "–" : v}</b>
              {s ? <small>{s}</small> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// "12 Kas"
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const gap = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
// Yarış bugün sürüyor mu (başlangıçtan bitişe)
export function racing(r) {
  if (!r?.startDate) return false;
  const t = todayStr();
  return t >= r.startDate && t <= (r.endDate || r.startDate);
}
// Üst çubuğun ortası yarış günü: "Yarışta · 3. gün"
export function kickText(r) {
  return racing(r) ? `Yarışta · ${gap(r.startDate, todayStr()) + 1}. gün` : "";
}
// "8–11 Kas · Foça, İzmir"
export function whereText(r) {
  const a = r.startDate;
  const b = r.endDate && r.endDate !== a ? r.endDate : "";
  const when = !a ? "" : !b ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${shortDay(b)}` : `${shortDay(a)}–${shortDay(b)}`;
  return [when, placeText(r)].filter(Boolean).join(" · ");
}

// Tek "Canlı" düğmesi (Seyhun 2026-11-09 "harita butonuna, yayın butonuna gerek yok; bir tane canlı butonumuz var"; örnek c-telefon.png "Yap"):
// yarış sayfasının sağ üstünde ⋯ yanında beyaz hap, kırmızı nokta; kendi canlı ekranını uygulama içinde açar. Yalnız ana hesapta, yarış günlerinde.
// Bilgi ekranı düğmeleri (Seyhun 2026-11-20 "ana sayfadaki o butonlar yarış detayında da olsun"): Ekran → /bilgi, Yönet → /bilgi/yonet
// (Yönet o an canlı yarışı kendisi bulur). Canlı'nın yanında, aynı boyda cam düğmeler.
export function BilgiBtns() {
  return (
    <>
      <Link href="/bilgi" data-press className="rz-pill">
        Ekran
      </Link>
      <Link href="/bilgi/yonet" data-press className="rz-pill">
        Yönet
      </Link>
    </>
  );
}

export function LiveBtn({ id }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => openInApp(router, `/canli/${id}`)} data-press className="rz-live">
      <i aria-hidden="true" />
      Canlı
    </button>
  );
}
