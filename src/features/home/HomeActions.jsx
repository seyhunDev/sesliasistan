"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { SHORTCUT_MAX, linkKey, shortcutsOf, toggleShortcut } from "@/lib/homeTiles";
import { CARD, SectionHead } from "./ui";

// Marka renkleri: yalnız tanınan sosyal medya düğmesinde (Instagram simgesi ve renk geçişi); diğerleri uygulamanın yeşil simgesi
export const BRAND = {
  instagram: "bg-[linear-gradient(45deg,#f9a03a_0%,#e9583f_30%,#d62f6c_60%,#a23ab6_100%)] text-white",
};

// Düğme: üstte yuvarlatılmış kare simge (kart görünümünde), altında tek satır ad; kutu yok, simgeler ızgarada nefes alır
const cls = "relative flex w-full flex-col items-center gap-2 text-center ";
function Body({ icon, label, brand, badge }) {
  return (
    <>
      <span className={`relative grid size-[3.75rem] shrink-0 place-items-center ${CARD} ${BRAND[brand] || "text-acc"}`}>
        <Icon name={icon} className="size-6" />
        {badge && (
          <span className={`absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full text-white ring-2 ring-bg ${badge === "add" ? "bg-acc" : "bg-rose-600"}`}>
            <Icon name={badge === "add" ? "plus" : "minus"} className="size-3" />
          </span>
        )}
      </span>
      <span className="w-full truncate whitespace-nowrap text-[0.8125rem] font-medium leading-tight tracking-[-0.01em]">{label}</span>
    </>
  );
}
function Tile({ a, onGo }) {
  if (a.href)
    return (
      <Link href={a.href} onClick={onGo} className={cls}>
        <Body {...a} />
      </Link>
    );
  return (
    <button type="button" onClick={() => (onGo?.(), a.onClick?.())} className={cls}>
      <Body {...a} />
    </button>
  );
}

// Ana sayfa › KISAYOLLAR: 4 sütunda en çok 7 düğme (simge + tek satır ad), sonuncu "Tümü".
// "Tümü" penceresi düğme sayfası: üstte açık yeşil kutuda "ANA SAYFADA n/7" (ana sayfadaki kısayollar), altında "DİĞER SAYFALAR"
// gruplu (Günlük, Kulüp, Yönetim, Sosyal), hepsi aynı düğme. "Düzenle": ana sayfadakilerde kırmızı −, diğerlerinde yeşil +;
// dokununca çıkar/ekler (users/{uid}.homeLinks). groups: homeActions() (homeTiles.js).
export function HomeActions({ groups }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  if (!groups.length) return null;
  const short = shortcutsOf(groups, profile?.homeLinks);
  const keys = short.map(linkKey);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const rest = groups.map((g) => ({ ...g, items: g.items.filter((a) => !keys.includes(linkKey(a))) })).filter((g) => g.items.length);
  const close = () => {
    setOpen(false);
    setEdit(false);
    setFull(false);
  };
  const toggle = (a) => {
    const next = toggleShortcut(keys, linkKey(a));
    if (!next) return setFull(true);
    setFull(false);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { homeLinks: next }).catch(() => {});
  };
  const cell = (a, badge) => (
    <li key={linkKey(a)}>
      {edit ? (
        <button type="button" onClick={() => toggle(a)} aria-label={badge === "add" ? `${a.label} ana sayfaya ekle` : `${a.label} ana sayfadan çıkar`} className={cls}>
          <Body {...a} badge={badge} />
        </button>
      ) : (
        <Tile a={a} onGo={close} />
      )}
    </li>
  );
  const grid = "grid grid-cols-4 gap-x-1.5 gap-y-4";
  const head = "mb-3 px-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-mut";

  return (
    <nav aria-labelledby="home-act">
      <SectionHead id="home-act" title="KISAYOLLAR" />
      <ul className={grid}>
        {short.map((a) => (
          <li key={linkKey(a)}>
            <Tile a={a} />
          </li>
        ))}
        {total > short.length && (
          <li>
            <Tile a={{ id: "all", icon: "more", label: "Tümü", onClick: () => setOpen(true) }} />
          </li>
        )}
      </ul>
      <Sheet open={open} onClose={close} title="Tüm sayfalar">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[0.8125rem] text-mut">
              {edit ? `Çıkarmak için −, eklemek için +'ya dokun. En çok ${SHORTCUT_MAX}.` : "Bir sayfayı açmak için dokun."}
            </p>
            <button type="button" onClick={() => (setEdit(!edit), setFull(false))} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold ${edit ? "bg-acc text-white" : "bg-acc/10 text-acc"}`}>
              {edit ? "Bitti" : "Düzenle"}
            </button>
          </div>
          {full && <p className="px-1 text-[0.8125rem] font-semibold text-amber-700 dark:text-amber-300">En çok {SHORTCUT_MAX} kısayol olur; önce birini çıkar.</p>}
          <section aria-label="Ana sayfada" className="rounded-[1.25rem] bg-acc/[.06] px-2 pb-4 pt-3">
            <h3 className={head}>
              Ana sayfada <span className="ml-1 text-fg/60">{short.length}/{SHORTCUT_MAX}</span>
            </h3>
            <ul className={grid}>{short.map((a) => cell(a, "remove"))}</ul>
          </section>
          {rest.length > 0 && (
            <div className="space-y-4">
              <h3 className="px-1 text-[0.75rem] font-bold uppercase tracking-[0.08em]">Diğer sayfalar</h3>
              {rest.map((g) => (
                <section key={g.title} aria-label={g.title}>
                  <h4 className={head}>{g.title}</h4>
                  <ul className={grid}>{g.items.map((a) => cell(a, "add"))}</ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </nav>
  );
}
