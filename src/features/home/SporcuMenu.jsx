"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useHesap } from "@/features/auth/useHesap";
import { useAdd } from "@/features/add/AddProvider";
import { KIND_LABEL } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";
import { liveHead } from "@/features/liveScreen/fonts";
import { usePages } from "./usePages";

// Sahne ana sayfalarının (sporcu, ana hesap, normal kullanıcı; Seyhun 2026-11-25) üst çubuğu, menüsü ve + Ekle penceresi (Seyhun 2026-11-25 "menü ikonu koyalım, tıklanınca menü; Ekle'ye basınca açılan alan
// yeni tasarıma uygun, daha modern"; örnek velora-tarama/sporcu-ana-sira.html 4 ve 5). Sahne dili: koyu, limon vurgu (sporcu.css .shm-*).
// Menü tam ekran: üstte kişi (dokununca Ayarlar), dört büyük kutu (Tekne ekranı, Fitness, İngilizce, Velora Sailing), altında Tümü'nün
// grupları liste halinde (lib/hesapGorunum.js homeActions; büyük kutudakiler listede tekrar yok), en altta Ayarlar.
export const BIG = [
  { href: "/bilgi", label: "Tekne ekranı", sub: "Start · pusula · parkur", cls: "shm-boat" },
  { href: "/fitness", label: "Fitness", sub: "Antrenmanlarım", cls: "shm-fit" },
  { href: "/english", label: "İngilizce", sub: "Kalıplar", cls: "shm-en" },
  { href: "/sailing", label: "Velora Sailing", sub: "Senaryolar", cls: "shm-sea" },
];

// Üst çubuk (Seyhun 2026-11-25 "karman çorman, menü ikonu koyalım; Ekle diğer düğmelerle aynı, sadece artı"): ☰ · tarih · ＋ · zil · profil
export function SahneTop({ inbox, onInbox, onMenu, onAdd }) {
  const { profile } = useHesap();
  const d = new Date();
  const n = inbox.count || 0;
  return (
    <header className="sh-top">
      <button type="button" data-press onClick={onMenu} aria-label="Menü" className="sh-rb">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <span className="sh-date">{d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</span>
      <button type="button" data-press onClick={onAdd} aria-label="Ekle" className="sh-rb">
        <Icon name="plus" className="size-5" />
      </button>
      <button type="button" data-press onClick={onInbox} aria-label={n ? `Bildirimler, ${n} yeni` : "Bildirimler"} className="sh-rb">
        <Icon name="bell" className="size-5" />
        {n > 0 && <em className="sh-badge num">{n > 9 ? "9+" : n}</em>}
      </button>
      <Link href="/settings" aria-label="Ayarlar" className="sh-me">
        {initials(profile?.name)}
      </Link>
    </header>
  );
}

export function useEsc(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = o;
    };
  }, [open, onClose]);
}

// big: dört büyük kutu (görünüme göre; ana hesap ve normal kullanıcınınki SahneHome.jsx). Listede href'i olmayan satır (Toplantı) düğme olur.
export function SporcuMenu({ open, onClose, big = BIG }) {
  const h = useHesap();
  const pages = usePages();
  useEsc(open, onClose);
  if (!open) return null;
  const bigHref = new Set(big.map((b) => b.href));
  const groups = (pages || []).map((g) => ({ ...g, items: g.items.filter((i) => (i.href || i.onClick) && !bigHref.has(i.href)) })).filter((g) => g.items.length);
  return (
    <div role="dialog" aria-modal="true" aria-label="Menü" data-theme="dark" className={`shm ${liveHead.variable}`}>
      <div className="shm-in">
        <div className="shm-head">
          <Link href="/settings" onClick={onClose} className="shm-me">
            <span className="shm-av">{initials(h.profile?.name)}</span>
            <span className="min-w-0">
              <b>{h.profile?.name || "Hesabım"}</b>
              <small>{KIND_LABEL[h.kind] || ""}</small>
            </span>
          </Link>
          <button type="button" data-press onClick={onClose} aria-label="Kapat" className="sh-rb">
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <div className="sh-tiles">
          {big.map((b) => (
            <Link key={b.href} href={b.href} onClick={onClose} data-press className={`sh-tile ${b.cls}`}>
              <b className="sh-t">{b.label}</b>
              <small className="sh-s">{b.sub}</small>
            </Link>
          ))}
        </div>
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="shm-g">{g.title}</h2>
            {g.items.map((i) => {
              const inner = (
                <>
                  <i>
                    <Icon name={i.icon} className="size-[1.125rem]" />
                  </i>
                  <b>{i.label}</b>
                  <Icon name="chev" className="size-4 opacity-40" />
                </>
              );
              return i.href ? (
                <Link key={i.href} href={i.href} onClick={onClose} className="shm-row">
                  {inner}
                </Link>
              ) : (
                <button
                  key={i.label}
                  type="button"
                  onClick={() => {
                    onClose();
                    i.onClick?.();
                  }}
                  className="shm-row w-full text-left"
                >
                  {inner}
                </button>
              );
            })}
          </section>
        ))}
        <Link href="/settings" onClick={onClose} className="shm-row shm-last">
          <i>
            <Icon name="sliders" className="size-[1.125rem]" />
          </i>
          <b>Ayarlar</b>
          <Icon name="chev" className="size-4 opacity-40" />
        </Link>
      </div>
    </div>
  );
}

// + Ekle: alttan açılan koyu pencere; Plan, Görev, Not (kayıt ekranı o türle açılır), Ders (Ders programı, yeni ders) ve yazarak ekleme
export const ADDS = [
  { type: "plan", label: "Plan", sub: "Saatli iş, buluşma", icon: "cal", cls: "shm-a-lime" },
  { type: "task", label: "Görev", sub: "Yapılacak", icon: "task" },
  { type: "note", label: "Not", sub: "Hızlı not", icon: "note" },
  { href: "/schedule?yeni=1", label: "Ders", sub: "Ders programı", icon: "book", cls: "shm-a-blue" },
];

export function SporcuAdd({ open, onClose, adds = ADDS }) {
  const { openAdd } = useAdd();
  const router = useRouter();
  useEsc(open, onClose);
  if (!open) return null;
  const pick = (a) => {
    onClose();
    if (a.href) router.push(a.href);
    else openAdd({ type: a.type });
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Ekle" data-theme="dark" className={`shm-dim ${liveHead.variable}`} onClick={onClose}>
      <div className="shm-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="shm-grab" aria-hidden="true" />
        <h2 className="sh-c shm-title">Ne ekleyelim?</h2>
        <div className="sh-tiles">
          {adds.map((a) => (
            <button key={a.label} type="button" data-press onClick={() => pick(a)} className={`shm-a ${a.cls || ""}`}>
              <Icon name={a.icon} className="size-5" />
              <span>
                <b className="sh-c">{a.label}</b>
                <small>{a.sub}</small>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            openAdd();
          }}
          className="shm-type"
        >
          <Icon name="keyboard" className="size-[1.125rem]" />
          Yazarak ekle…
        </button>
      </div>
    </div>
  );
}
